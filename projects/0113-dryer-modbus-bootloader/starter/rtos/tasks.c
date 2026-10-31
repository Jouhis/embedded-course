/* tasks.c: the dryer as five FreeRTOS tasks (lessons 112 and 113).
 *
 *   safety_task   priority 4, every 50 ms: independent checks on the published state; a trip cuts
 *                 the heater and latches the fault. Kicks the watchdog when all tasks checked in.
 *   control_task  priority 3, every 100 ms: sensor, filter, state machine, PID, outputs.
 *   comms_task    priority 2, event-driven: Modbus RTU frames from USART1 (lesson 99 framing).
 *   ui_task       priority 2, every 20 ms: buttons, the press queue; redraws every 200 ms.
 *   logger_task   priority 1, every 100 ms: the status line, once a second, when logging is on.
 *
 * Shared state:
 *   state_mutex   protects the snapshot (control writes; safety, comms, ui and logger read) and the latch
 *   i2c_mutex     the I2C bus (only the UI task uses it today; the mutex is the rule for a second device)
 *   event_queue   presses and Modbus commands, into the control task
 *   checkin       event group: each monitored task sets its bit each cycle; the safety task kicks the
 *                 watchdog only when all bits are set (lesson 84)
 *
 * Rate-monotonic: the shorter the period, the higher the priority (lesson 91). */
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "FreeRTOS.h"
#include "event_groups.h"
#include "queue.h"
#include "semphr.h"
#include "task.h"

#include "boot/app_image.h"
#include "buttons.h"
#include "controller.h"
#include "crc16.h"
#include "display.h"
#include "format.h"
#include "hal.h"
#include "modbus.h"
#include "regmap.h"
#include "safety.h"
#include "sensor.h"
#include "tasks.h"
#include "ui.h"

/* Set to 1 to print the status line each second. It is off in this stage: the USART1 line is the
 * Modbus bus, and a status line between two frames would corrupt the master's reply (lesson 99). */
#define DRYER_LOG_STATUS   0

#define SAFETY_PERIOD_MS   50u
#define CONTROL_PERIOD_MS  100u
#define UI_PERIOD_MS       20u
#define UI_DRAW_EVERY      10u     /* 10 x 20 ms = a redraw every 200 ms */
#define LOGGER_PERIOD_MS   100u
#define LOGGER_EVERY       10u     /* 10 x 100 ms = one line per second */
#define FRAME_GAP_MS       2u      /* a frame ends after 2 ms of silence (1.75 ms is needed at 115200 baud) */
#define MODBUS_ADDRESS     1u

#define PRIO_SAFETY        4U
#define PRIO_CONTROL       3U
#define PRIO_COMMS         2U
#define PRIO_UI            2U
#define PRIO_LOGGER        1U

#define STACK_SAFETY_WORDS  160U
#define STACK_CONTROL_WORDS 256U
#define STACK_COMMS_WORDS   256U
#define STACK_UI_WORDS      256U
#define STACK_LOGGER_WORDS  192U

#define CHECK_CONTROL      (1U << 0)
#define CHECK_UI           (1U << 1)
#define CHECK_LOGGER       (1U << 2)
#define CHECK_COMMS        (1U << 3)
#define CHECK_ALL          (CHECK_CONTROL | CHECK_UI | CHECK_LOGGER | CHECK_COMMS)

#define EVENT_QUEUE_LEN    8U

typedef enum {
    EV_START,            /* the start/stop button, or the Modbus command register */
    EV_MATERIAL_BUTTON,  /* the material button: cycle the material while idle */
    EV_MATERIAL_SET,     /* a Modbus write to the material register: value holds the index */
} event_kind_t;

typedef struct {
    uint8_t kind;
    uint8_t value;
} event_t;

/* Everything the other tasks need to know about the control loop. Copied under state_mutex. */
typedef struct {
    uint32_t    sample_ms;
    int32_t     temp_centi;
    bool        sensor_ok;
    dryer_t     dryer;
    dryer_out_t dout;
    uint16_t    heater_permille;
    fault_t     latched;
} snapshot_t;

static snapshot_t snap;
static SemaphoreHandle_t state_mutex;
static SemaphoreHandle_t i2c_mutex;
static QueueHandle_t event_queue;
static EventGroupHandle_t checkin;

static void check_in(EventBits_t bit) {
    xEventGroupSetBits(checkin, bit);
}

static snapshot_t read_snapshot(void) {
    snapshot_t s;
    xSemaphoreTake(state_mutex, portMAX_DELAY);
    s = snap;
    xSemaphoreGive(state_mutex);
    return s;
}

static void post_event(event_kind_t kind, uint8_t value) {
    event_t e = { (uint8_t)kind, value };
    (void)xQueueSend(event_queue, &e, 0);       /* a full queue drops the event; a human presses again */
}

static void safety_task(void *arg) {
    (void)arg;
    runaway_t runaway;
    runaway_reset(&runaway);
    TickType_t last = xTaskGetTickCount();
    for (;;) {
        vTaskDelayUntil(&last, pdMS_TO_TICKS(SAFETY_PERIOD_MS));

        snapshot_t s = read_snapshot();
        uint32_t now = hal_millis();
        safety_in_t in = {
            .now_ms = now,
            .temp_centi = s.temp_centi,
            .sensor_ok = s.sensor_ok,
            .heater_enabled = s.dout.heater_enabled,
            .heater_full = (s.heater_permille >= 1000U),
            .setpoint_centi = s.dout.setpoint_centi,
            .sample_age_ms = now - s.sample_ms,
        };
        fault_t f = safety_check(&in, &runaway);
        if (f != FAULT_NONE) {
            hal_heater_set_permille(0U);
            hal_fan_set(1U);
            xSemaphoreTake(state_mutex, portMAX_DELAY);
            if (snap.latched == FAULT_NONE) {
                snap.latched = f;
            }
            xSemaphoreGive(state_mutex);
        }

        EventBits_t bits = xEventGroupGetBits(checkin);
        if ((bits & CHECK_ALL) == CHECK_ALL) {
            xEventGroupClearBits(checkin, CHECK_ALL);
            hal_wdg_kick();
        }
    }
}

static void control_task(void *arg) {
    (void)arg;
    static controller_t ctl;
    controller_init(&ctl);
    TickType_t last = xTaskGetTickCount();
    for (;;) {
        vTaskDelayUntil(&last, pdMS_TO_TICKS(CONTROL_PERIOD_MS));

        control_in_t in = { .now_ms = hal_millis() };
        event_t e;
        while (xQueueReceive(event_queue, &e, 0) == pdTRUE) {
            switch ((event_kind_t)e.kind) {
                case EV_START:           in.start_pressed = true; break;
                case EV_MATERIAL_BUTTON: in.material_pressed = true; break;
                case EV_MATERIAL_SET:    in.material_set_valid = true; in.material_set = e.value; break;
            }
        }
        uint16_t raw = 0U;
        int32_t centi = 0;
        in.sensor_ok = sensor_read(&raw, &centi);
        in.raw_centi = centi;
        in.latched_fault = read_snapshot().latched;

        control_out_t out;
        controller_step(&ctl, &in, &out);
        hal_heater_set_permille(out.heater_permille);
        hal_fan_set(out.dryer.fan_on ? 1U : 0U);

        xSemaphoreTake(state_mutex, portMAX_DELAY);
        snap.sample_ms = in.now_ms;
        snap.temp_centi = out.temp_centi;
        snap.sensor_ok = in.sensor_ok;
        snap.dryer = ctl.dryer;
        snap.dout = out.dryer;
        snap.heater_permille = out.heater_permille;
        if (out.clear_latch) {
            snap.latched = FAULT_NONE;
        }
        xSemaphoreGive(state_mutex);

        check_in(CHECK_CONTROL);
    }
}

/* The Modbus RTU slave (lesson 99): frames from USART1, the register map (regmap.c), the replies. */
static void handle_frame(modbus_slave_t *slave, uint16_t *regs, const uint8_t *frame, size_t n) {
    uint8_t rsp[MODBUS_MAX_FRAME];
    snapshot_t s = read_snapshot();
    regmap_publish(regs, &s.dryer, &s.dout, s.temp_centi, s.heater_permille);

    size_t len = modbus_process(slave, frame, n, rsp);
    if (len > 0U) {
        hal_uart_write(rsp, len);
    }

    if (regmap_take_command(regs)) {
        post_event(EV_START, 0U);
    }
    /* A material write changes the register away from the published value: pass it on. The control
     * task applies it only while IDLE, and the next publish shows what was actually applied. */
    if (regs[REG_MATERIAL] != s.dryer.material && regs[REG_MATERIAL] < MATERIAL_COUNT) {
        post_event(EV_MATERIAL_SET, (uint8_t)regs[REG_MATERIAL]);
    }
}

static void comms_task(void *arg) {
    (void)arg;
    static uint16_t regs[REG_COUNT];
    modbus_slave_t slave = { MODBUS_ADDRESS, regs, REG_COUNT, regmap_check_write };
    uint8_t frame[MODBUS_MAX_FRAME];
    size_t n = 0U;
    for (;;) {
        uint8_t b;
        if (hal_uart_getc(&b, FRAME_GAP_MS)) {
            if (n < MODBUS_MAX_FRAME) {
                frame[n++] = b;                  /* an overlong frame fails its CRC and gets no reply */
            }
        } else if (n > 0U) {
            handle_frame(&slave, regs, frame, n);   /* 2 ms of silence: the frame is complete */
            n = 0U;
        }
        check_in(CHECK_COMMS);
    }
}

/* The version of this image, read from its header in flash (boot/app_image.h). */
static void draw(void) {
    snapshot_t s = read_snapshot();
    char lines[UI_LINES][UI_LINE_CHARS];
    ui_compose(&s.dryer, &s.dout, s.temp_centi, s.sensor_ok, lines);

    const app_header_t *hdr = (const app_header_t *)(uintptr_t)APP_BASE_ADDR;
    char num[16];
    char version[UI_LINE_CHARS];
    size_t len = str_append(version, sizeof version, 0U, "FW ");
    fmt_int(num, sizeof num, (int32_t)(hdr->version >> 16));
    len = str_append(version, sizeof version, len, num);
    len = str_append(version, sizeof version, len, ".");
    fmt_int(num, sizeof num, (int32_t)(hdr->version & 0xFFFFU));
    (void)str_append(version, sizeof version, len, num);

    xSemaphoreTake(i2c_mutex, portMAX_DELAY);
    display_clear();
    for (uint8_t i = 0; i < UI_LINES; i++) {
        display_text((uint8_t)(i * 2U), 0U, lines[i]);
    }
    display_text(7U, 0U, version);           /* page 7 is free: the version of the image */
    (void)display_flush();
    xSemaphoreGive(i2c_mutex);
}

static void ui_task(void *arg) {
    (void)arg;
    static buttons_t buttons;
    buttons_init(&buttons);
    TickType_t last = xTaskGetTickCount();
    uint8_t n = 0U;
    for (;;) {
        vTaskDelayUntil(&last, pdMS_TO_TICKS(UI_PERIOD_MS));

        buttons_sample(&buttons);
        if (buttons_take_start(&buttons)) {
            post_event(EV_START, 0U);
        }
        if (buttons_take_material(&buttons)) {
            post_event(EV_MATERIAL_BUTTON, 0U);
        }

        if (++n >= UI_DRAW_EVERY) {
            n = 0U;
            draw();
        }
        check_in(CHECK_UI);
    }
}

#if DRYER_LOG_STATUS
static void send_status_line(void) {
    snapshot_t s = read_snapshot();
    char num[16];
    char line[96];
    size_t len = str_append(line, sizeof line, 0U, "DRYER ");
    len = str_append(line, sizeof line, len, dryer_state_name(s.dryer.state));
    len = str_append(line, sizeof line, len, " SP=");
    fmt_centi(num, sizeof num, s.dout.setpoint_centi);
    len = str_append(line, sizeof line, len, num);
    len = str_append(line, sizeof line, len, " T=");
    fmt_centi(num, sizeof num, s.temp_centi);
    len = str_append(line, sizeof line, len, num);
    len = str_append(line, sizeof line, len, " PWM=");
    fmt_int(num, sizeof num, (int32_t)(s.heater_permille / 10U));
    len = str_append(line, sizeof line, len, num);
    (void)str_append(line, sizeof line, len, "%");
    hal_log(line);
}
#endif

static void logger_task(void *arg) {
    (void)arg;
    TickType_t last = xTaskGetTickCount();
    uint8_t n = 0U;
    for (;;) {
        vTaskDelayUntil(&last, pdMS_TO_TICKS(LOGGER_PERIOD_MS));
        check_in(CHECK_LOGGER);
#if DRYER_LOG_STATUS
        if (++n >= LOGGER_EVERY) {
            n = 0U;
            send_status_line();
        }
#else
        (void)n;                          /* logging is off: the task only checks in with the watchdog */
#endif
    }
}

void vApplicationStackOverflowHook(TaskHandle_t t, char *name) { (void)t; (void)name; for (;;) {} }
void vApplicationMallocFailedHook(void) { for (;;) {} }

void tasks_start(void) {
    event_queue = xQueueCreate(EVENT_QUEUE_LEN, sizeof(event_t));
    state_mutex = xSemaphoreCreateMutex();
    i2c_mutex = xSemaphoreCreateMutex();
    checkin = xEventGroupCreate();

    snap.sample_ms = hal_millis();
    snap.sensor_ok = true;
    snap.latched = FAULT_NONE;

    /* A failed create would leave a task silently missing, and then the watchdog resets the chip. */
    bool created = (xTaskCreate(safety_task, "safety", STACK_SAFETY_WORDS, NULL, PRIO_SAFETY, NULL) == pdPASS) &&
                   (xTaskCreate(control_task, "control", STACK_CONTROL_WORDS, NULL, PRIO_CONTROL, NULL) == pdPASS) &&
                   (xTaskCreate(comms_task, "comms", STACK_COMMS_WORDS, NULL, PRIO_COMMS, NULL) == pdPASS) &&
                   (xTaskCreate(ui_task, "ui", STACK_UI_WORDS, NULL, PRIO_UI, NULL) == pdPASS) &&
                   (xTaskCreate(logger_task, "logger", STACK_LOGGER_WORDS, NULL, PRIO_LOGGER, NULL) == pdPASS);
    if (!created) {
        hal_log("DRYER task create failed: heap too small");
        for (;;) {}
    }

    hal_wdg_start();
    vTaskStartScheduler();
    for (;;) {}
}
