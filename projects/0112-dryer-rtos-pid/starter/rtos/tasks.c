/* tasks.c: the dryer as four FreeRTOS tasks (lesson 112).
 *
 *   safety_task   priority 4, every 50 ms (vTaskDelayUntil): independent checks on the published
 *                 state; trips cut the heater and latch the fault. Kicks the watchdog.
 *   control_task  priority 3, every 100 ms: sensor, filter, state machine, PID, outputs.
 *   ui_task       priority 2, every 20 ms: buttons (debounced), the press queue; redraws every 200 ms.
 *   logger_task   priority 1, every 100 ms: one status line per second on the serial log.
 *
 * Shared state:
 *   state_mutex   protects the snapshot (control writes, safety/ui/logger read) and the fault latch
 *   i2c_mutex     the I2C bus. Only the UI task uses it today; the mutex is what lets a second
 *                 I2C device be added without a race (lesson 90)
 *   event_queue   button presses from the UI task to the control task
 *   checkin       event group: each monitored task sets its bit each cycle. The safety task
 *                 kicks the watchdog only when all bits are set (lesson 84)
 *
 * The rates are rate-monotonic: the shorter the period, the higher the priority (lesson 91).
 * The safety monitor is the fastest and the most urgent, so it has the highest priority. */
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "FreeRTOS.h"
#include "event_groups.h"
#include "queue.h"
#include "semphr.h"
#include "task.h"

#include "buttons.h"
#include "controller.h"
#include "display.h"
#include "format.h"
#include "hal.h"
#include "safety.h"
#include "sensor.h"
#include "tasks.h"
#include "ui.h"

#define SAFETY_PERIOD_MS   50u
#define CONTROL_PERIOD_MS  100u
#define UI_PERIOD_MS       20u
#define UI_DRAW_EVERY      10u     /* 10 x 20 ms = a redraw every 200 ms */
#define LOGGER_PERIOD_MS   100u
#define LOGGER_EVERY       10u     /* 10 x 100 ms = one status line per second */

#define PRIO_SAFETY        4U      /* highest: the monitor must run even when the control loop is busy */
#define PRIO_CONTROL       3U
#define PRIO_UI            2U
#define PRIO_LOGGER        1U

#define STACK_SAFETY_WORDS 192U
#define STACK_CONTROL_WORDS 320U
#define STACK_UI_WORDS     256U
#define STACK_LOGGER_WORDS 256U

#define CHECK_CONTROL      (1U << 0)
#define CHECK_UI           (1U << 1)
#define CHECK_LOGGER       (1U << 2)
#define CHECK_ALL          (CHECK_CONTROL | CHECK_UI | CHECK_LOGGER)

#define EVENT_START        1U
#define EVENT_MATERIAL     2U
#define EVENT_QUEUE_LEN    8U

/* Everything the other tasks need to know about the control loop. Copied under state_mutex. */
typedef struct {
    uint32_t    sample_ms;        /* when the control task last ran */
    int32_t     temp_centi;
    bool        sensor_ok;
    dryer_t     dryer;
    dryer_out_t dout;
    uint16_t    heater_permille;
    fault_t     latched;          /* the safety monitor's latch, cleared by an acknowledged start */
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

/* Safety monitor: independent of the control code. It only needs the published numbers, so a bug
 * in the control logic cannot switch it off. A trip cuts the heater and the fan runs to cool. */
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
                snap.latched = f;           /* the first cause is kept until the operator acknowledges */
            }
            xSemaphoreGive(state_mutex);
        }

        /* Kick the watchdog only when every monitored task has checked in since the last kick. */
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

        control_in_t in = { .now_ms = hal_millis(), .start_pressed = false, .material_pressed = false };
        uint8_t ev;
        while (xQueueReceive(event_queue, &ev, 0) == pdTRUE) {
            if (ev == EVENT_START) {
                in.start_pressed = true;
            } else {
                in.material_pressed = true;
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

/* Draw the four lines and send them to the panel. The flush holds the I2C mutex. */
static void draw(void) {
    snapshot_t s = read_snapshot();
    char lines[UI_LINES][UI_LINE_CHARS];
    ui_compose(&s.dryer, &s.dout, s.temp_centi, s.sensor_ok, lines);

    xSemaphoreTake(i2c_mutex, portMAX_DELAY);
    display_clear();
    for (uint8_t i = 0; i < UI_LINES; i++) {
        display_text((uint8_t)(i * 2U), 0U, lines[i]);
    }
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
        uint8_t ev;
        if (buttons_take_start(&buttons)) {
            ev = EVENT_START;
            (void)xQueueSend(event_queue, &ev, 0);      /* a full queue drops a press; a human presses again */
        }
        if (buttons_take_material(&buttons)) {
            ev = EVENT_MATERIAL;
            (void)xQueueSend(event_queue, &ev, 0);
        }

        if (++n >= UI_DRAW_EVERY) {
            n = 0U;
            draw();
        }
        check_in(CHECK_UI);
    }
}

/* One status line per second: state, setpoint, temperature and heater duty. */
static void send_status_line(void) {
    snapshot_t s = read_snapshot();
    char num[16];
    char line[96];
    size_t len = str_append(line, sizeof line, 0U, "DRYER ");
    len = str_append(line, sizeof line, len, dryer_state_name(s.dout.heater_enabled ? s.dryer.state : s.dryer.state));
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

static void logger_task(void *arg) {
    (void)arg;
    TickType_t last = xTaskGetTickCount();
    uint8_t n = 0U;
    for (;;) {
        vTaskDelayUntil(&last, pdMS_TO_TICKS(LOGGER_PERIOD_MS));
        /* Check in on every cycle, not once a second: the watchdog window is about 262 ms. */
        check_in(CHECK_LOGGER);
        if (++n >= LOGGER_EVERY) {
            n = 0U;
            send_status_line();
        }
    }
}

/* Kernel hooks, enabled in FreeRTOSConfig.h. A stack overflow or a failed allocation is a bug:
 * stop here, so the debugger shows where it happened. */
void vApplicationStackOverflowHook(TaskHandle_t t, char *name) { (void)t; (void)name; for (;;) {} }
void vApplicationMallocFailedHook(void) { for (;;) {} }

void tasks_start(void) {
    event_queue = xQueueCreate(EVENT_QUEUE_LEN, sizeof(uint8_t));
    state_mutex = xSemaphoreCreateMutex();
    i2c_mutex = xSemaphoreCreateMutex();
    checkin = xEventGroupCreate();

    /* Before the first control sample, the snapshot says "sensor fine, sample just taken", so the
     * monitor does not trip on a value nobody has measured yet. */
    snap.sample_ms = hal_millis();
    snap.sensor_ok = true;
    snap.latched = FAULT_NONE;

    xTaskCreate(safety_task, "safety", STACK_SAFETY_WORDS, NULL, PRIO_SAFETY, NULL);
    xTaskCreate(control_task, "control", STACK_CONTROL_WORDS, NULL, PRIO_CONTROL, NULL);
    xTaskCreate(ui_task, "ui", STACK_UI_WORDS, NULL, PRIO_UI, NULL);
    xTaskCreate(logger_task, "logger", STACK_LOGGER_WORDS, NULL, PRIO_LOGGER, NULL);

    hal_wdg_start();                  /* from here on, a stalled task resets the chip */
    vTaskStartScheduler();
    for (;;) {}                       /* only reached if the heap is too small */
}
