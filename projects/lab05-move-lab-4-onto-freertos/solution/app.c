/* app.c: the environment monitor as four FreeRTOS tasks (Lab 5).
 *
 *   sensor_task  priority 3, every 200 ms (vTaskDelayUntil): polls the sensor over I2C
 *   ui_task      priority 2, owns the menu and the display. Waits on ui_queue for samples,
 *                button presses and sensor errors, and redraws every 500 ms
 *   logger_task  priority 1, the only task that calls hal_log(). Other tasks queue lines
 *   stats_task   priority 1, prints each task's stack high-water mark at start and at 5 s
 *
 * Shared resources:
 *   i2c_mutex    the I2C bus: the sensor task and the UI task both use it (mutex, lesson 91)
 *   ui_queue     events into the UI task: samples, sensor errors, and button presses from the ISR
 *   log_queue    text lines into the logger task */
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "FreeRTOS.h"
#include "queue.h"
#include "semphr.h"
#include "task.h"

#include "app.h"
#include "display.h"
#include "format.h"
#include "hal.h"
#include "sensor.h"
#include "ui.h"

#define SAMPLE_PERIOD_MS   200U
#define DRAW_PERIOD_MS     500U
#define LOG_PERIOD_MS      1000U
#define STATS_DELAY_MS     5000U
#define UI_QUEUE_LEN       8U
#define LOG_QUEUE_LEN      8U
#define LOG_LINE_CHARS     96U

#define SENSOR_STACK_WORDS 192U
#define UI_STACK_WORDS     256U
#define LOGGER_STACK_WORDS 192U
#define STATS_STACK_WORDS  160U

#define PRIO_SENSOR        3U      /* the periodic sampling is the most urgent work */
#define PRIO_UI            2U
#define PRIO_LOGGER        1U
#define PRIO_STATS         1U

typedef enum {
    EV_SAMPLE,        /* centi holds a new reading */
    EV_SENSOR_ERR,    /* the sensor did not answer */
    EV_BUTTON         /* pin holds the button; now holds the tick of the press */
} event_kind_t;

typedef struct {
    event_kind_t kind;
    hal_pin_t    pin;
    int32_t      centi;
    uint32_t     now;
} ui_event_t;

typedef struct {
    char text[LOG_LINE_CHARS];
} log_msg_t;

static QueueHandle_t ui_queue;
static QueueHandle_t log_queue;
static SemaphoreHandle_t i2c_mutex;
static TaskHandle_t sensor_handle;
static TaskHandle_t ui_handle;
static TaskHandle_t logger_handle;
static TaskHandle_t stats_handle;

/* Queue a line for the logger. Lines wait if the logger is busy; they are never dropped. */
static void log_send(const char *text) {
    log_msg_t m;
    (void)str_append(m.text, sizeof m.text, 0U, text);
    xQueueSend(log_queue, &m, portMAX_DELAY);
}

/* Button interrupt callback. Runs in interrupt context: FromISR calls only. */
static int button_isr(hal_pin_t pin) {
    ui_event_t ev = { .kind = EV_BUTTON, .pin = pin, .centi = 0, .now = (uint32_t)xTaskGetTickCountFromISR() };
    BaseType_t woken = pdFALSE;
    xQueueSendFromISR(ui_queue, &ev, &woken);
    return woken == pdTRUE;
}

static void sensor_task(void *arg) {
    (void)arg;
    TickType_t last_wake = xTaskGetTickCount();
    for (;;) {
        vTaskDelayUntil(&last_wake, pdMS_TO_TICKS(SAMPLE_PERIOD_MS));

        int32_t centi = 0;
        xSemaphoreTake(i2c_mutex, portMAX_DELAY);
        sensor_status_t st = sensor_poll(&centi);
        xSemaphoreGive(i2c_mutex);

        ui_event_t ev = { .kind = EV_SAMPLE, .pin = HAL_PIN_LED, .centi = centi, .now = 0U };
        if (st == SENSOR_NEW_SAMPLE) {
            xQueueSend(ui_queue, &ev, portMAX_DELAY);
        } else if (st == SENSOR_ERROR) {
            ev.kind = EV_SENSOR_ERR;
            xQueueSend(ui_queue, &ev, portMAX_DELAY);
        }
    }
}

/* Draw the framebuffer and send it. The transfer holds the bus, so the sensor waits for it. */
static void draw_frame(bool sensor_error) {
    ui_draw(sensor_error);
    xSemaphoreTake(i2c_mutex, portMAX_DELAY);
    (void)display_flush();                     /* a failed transfer skips this frame */
    xSemaphoreGive(i2c_mutex);
    hal_gpio_write(HAL_PIN_LED, ui_status().alarm ? 1U : 0U);
}

/* One status line, the same format as Lab 4 with the prefix LAB5. */
static void send_status_line(void) {
    ui_status_t s = ui_status();
    char num[16];
    char line[LOG_LINE_CHARS];
    size_t len = 0U;

    line[0] = '\0';
    if (s.have_sample) {
        len = str_append(line, sizeof line, len, "LAB5 T=");
        fmt_centi(num, sizeof num, s.last);
        len = str_append(line, sizeof line, len, num);
        len = str_append(line, sizeof line, len, " MIN=");
        fmt_centi(num, sizeof num, s.min);
        len = str_append(line, sizeof line, len, num);
        len = str_append(line, sizeof line, len, " MAX=");
        fmt_centi(num, sizeof num, s.max);
        len = str_append(line, sizeof line, len, num);
        len = str_append(line, sizeof line, len, s.alarm ? " ALARM=1" : " ALARM=0");
    } else {
        len = str_append(line, sizeof line, len, "LAB5 T=none");
    }
    len = str_append(line, sizeof line, len, " SET=");
    fmt_int(num, sizeof num, s.setpoint);
    len = str_append(line, sizeof line, len, num);
    len = str_append(line, sizeof line, len, " SCREEN=");
    (void)str_append(line, sizeof line, len, ui_screen_name(s.screen));
    log_send(line);
}

static void ui_task(void *arg) {
    (void)arg;
    bool sensor_error = false;
    TickType_t next_draw = xTaskGetTickCount() + pdMS_TO_TICKS(DRAW_PERIOD_MS);
    TickType_t next_log = xTaskGetTickCount() + pdMS_TO_TICKS(LOG_PERIOD_MS);

    for (;;) {
        ui_event_t ev;
        /* Wait at most one draw period, so the screen is redrawn even when nothing happens. */
        if (xQueueReceive(ui_queue, &ev, pdMS_TO_TICKS(DRAW_PERIOD_MS)) == pdTRUE) {
            switch (ev.kind) {
                case EV_SAMPLE:
                    ui_on_sample(ev.centi);
                    sensor_error = false;
                    break;
                case EV_SENSOR_ERR:
                    sensor_error = true;
                    break;
                case EV_BUTTON:
                    if (ui_on_button(ev.pin, ev.now)) {
                        draw_frame(sensor_error);   /* a screen change is shown at once */
                        next_draw = xTaskGetTickCount() + pdMS_TO_TICKS(DRAW_PERIOD_MS);
                    }
                    break;
            }
        }

        TickType_t now = xTaskGetTickCount();
        if ((int32_t)(now - next_draw) >= 0) {
            next_draw += pdMS_TO_TICKS(DRAW_PERIOD_MS);
            draw_frame(sensor_error);
        }
        if ((int32_t)(now - next_log) >= 0) {
            next_log += pdMS_TO_TICKS(LOG_PERIOD_MS);
            send_status_line();
        }
    }
}

static void logger_task(void *arg) {
    (void)arg;
    for (;;) {
        log_msg_t m;
        xQueueReceive(log_queue, &m, portMAX_DELAY);
        hal_log(m.text);                       /* the only UART writer once the scheduler runs */
    }
}

/* Queue one task's stack high-water mark: the fewest words it ever had free. */
static void send_stack_line(const char *name, TaskHandle_t h) {
    char num[16];
    char line[LOG_LINE_CHARS];
    size_t len = str_append(line, sizeof line, 0U, "LAB5 stack ");
    len = str_append(line, sizeof line, len, name);
    len = str_append(line, sizeof line, len, " free=");
    fmt_int(num, sizeof num, (int32_t)uxTaskGetStackHighWaterMark(h));
    len = str_append(line, sizeof line, len, num);
    (void)str_append(line, sizeof line, len, " words");
    log_send(line);
}

static void report_stacks(void) {
    send_stack_line("sensor", sensor_handle);
    send_stack_line("ui", ui_handle);
    send_stack_line("logger", logger_handle);
    send_stack_line("stats", stats_handle);
}

static void stats_task(void *arg) {
    (void)arg;
    report_stacks();                           /* at startup */
    vTaskDelay(pdMS_TO_TICKS(STATS_DELAY_MS));
    report_stacks();                           /* 5 s later: the peak use so far */
    vTaskDelete(NULL);
}

/* Kernel hooks, enabled in FreeRTOSConfig.h. A stack overflow or a failed allocation is a bug:
 * stop here, so the stats report and the debugger show where it happened. */
void vApplicationStackOverflowHook(TaskHandle_t t, char *name) { (void)t; (void)name; for (;;) {} }
void vApplicationMallocFailedHook(void) { for (;;) {} }

void app_start(void) {
    ui_queue = xQueueCreate(UI_QUEUE_LEN, sizeof(ui_event_t));
    log_queue = xQueueCreate(LOG_QUEUE_LEN, sizeof(log_msg_t));
    i2c_mutex = xSemaphoreCreateMutex();
    hal_set_button_callback(button_isr);

    xTaskCreate(sensor_task, "sensor", SENSOR_STACK_WORDS, NULL, PRIO_SENSOR, &sensor_handle);
    xTaskCreate(ui_task, "ui", UI_STACK_WORDS, NULL, PRIO_UI, &ui_handle);
    xTaskCreate(logger_task, "logger", LOGGER_STACK_WORDS, NULL, PRIO_LOGGER, &logger_handle);
    xTaskCreate(stats_task, "stats", STATS_STACK_WORDS, NULL, PRIO_STATS, &stats_handle);
    vTaskStartScheduler();
    for (;;) {}                                /* only reached if the heap was too small */
}
