// EXPECT: LAB6 OK
/* Lab 6: the Lab 4 monitor on Zephyr, split into threads. The application code in
 * ../../lab04-port-lab3-to-stm32/app is unchanged. Its app_run() is one super-loop, so this
 * file runs the same jobs as separate threads, and each thread calls the app's public functions:
 *
 *   button_thread  polls the two buttons every 5 ms, and posts a message on button_q when a level
 *                  changes. The message is only a doorbell: ui_poll() reads the buttons itself.
 *   sensor_thread  every 200 ms, reads the MYS-1 and posts a new sample on sample_q.
 *   ui_thread      wakes on button_q (or every 5 ms), feeds the samples to the UI, redraws the
 *                  OLED every 500 ms and logs one status line every second.
 *   log thread     lives in hal_zephyr.c and prints the lines that hal_log() queues.
 *
 * The threads wait at the start gate (app_ready) until the devices are up. */
#include <stdbool.h>
#include <stdint.h>

#include <zephyr/kernel.h>
#include <zephyr/sys/atomic.h>

#include "display.h"
#include "format.h"
#include "hal.h"
#include "sensor.h"
#include "ui.h"

#define SAMPLE_PERIOD_MS   200u
#define DRAW_PERIOD_MS     500u
#define LOG_PERIOD_MS      1000u
#define BUTTON_SCAN_MS     5
#define THREAD_STACK       2048

#define PRIO_BUTTON   K_PRIO_PREEMPT(2)   /* most urgent: it wakes the UI for a press */
#define PRIO_UI       K_PRIO_PREEMPT(5)
#define PRIO_SENSOR   K_PRIO_PREEMPT(6)

/* A bit mask of both buttons' levels: bit 0 is A, bit 1 is B. */
K_MSGQ_DEFINE(button_q, sizeof(uint8_t), 8, 1);
/* Samples are in hundredths of a degree, as sensor.h defines them. */
K_MSGQ_DEFINE(sample_q, sizeof(int32_t), 4, 4);

/* Set by the sensor thread, read by the UI thread: 1 while the sensor does not answer. */
static atomic_t sensor_error = ATOMIC_INIT(0);

/* The start gate. main() gives it once the devices are up. K_THREAD_DEFINE can start a thread
 * after a delay, but only a millisecond count, so the gate is what holds the threads back.
 * Each thread takes the gate and gives it back, so all of them pass once main() has run. */
K_SEM_DEFINE(app_ready, 0, 1);

static void wait_for_start(void)
{
    k_sem_take(&app_ready, K_FOREVER);
    k_sem_give(&app_ready);
}

/* Wrap-safe deadline check (lesson 73), as in app/app.c. */
static bool due(uint32_t now, uint32_t deadline)
{
    return (int32_t)(now - deadline) >= 0;
}

static uint8_t read_buttons(void)
{
    uint8_t mask = 0U;
    if (hal_gpio_read(HAL_PIN_BTN_A)) {
        mask |= 0x01U;
    }
    if (hal_gpio_read(HAL_PIN_BTN_B)) {
        mask |= 0x02U;
    }
    return mask;
}

static void button_thread(void *p1, void *p2, void *p3)
{
    ARG_UNUSED(p1);
    ARG_UNUSED(p2);
    ARG_UNUSED(p3);
    wait_for_start();
    uint8_t last = read_buttons();
    while (1) {
        uint8_t now = read_buttons();
        if (now != last) {
            last = now;
            /* K_NO_WAIT: the UI also wakes every 5 ms, so a dropped doorbell costs nothing. */
            (void)k_msgq_put(&button_q, &now, K_NO_WAIT);
        }
        k_msleep(BUTTON_SCAN_MS);
    }
}
K_THREAD_DEFINE(button_tid, THREAD_STACK, button_thread, NULL, NULL, NULL,
                PRIO_BUTTON, 0, 0);

static void sensor_thread(void *p1, void *p2, void *p3)
{
    ARG_UNUSED(p1);
    ARG_UNUSED(p2);
    ARG_UNUSED(p3);
    wait_for_start();
    while (1) {
        int32_t centi = 0;
        switch (sensor_poll(&centi)) {
            case SENSOR_NEW_SAMPLE:
                (void)k_msgq_put(&sample_q, &centi, K_NO_WAIT);
                atomic_set(&sensor_error, 0);
                break;
            case SENSOR_ERROR:
                atomic_set(&sensor_error, 1);
                break;
            case SENSOR_IDLE:
                break;
        }
        k_msleep(SAMPLE_PERIOD_MS);
    }
}
K_THREAD_DEFINE(sensor_tid, THREAD_STACK, sensor_thread, NULL, NULL, NULL,
                PRIO_SENSOR, 0, 0);

/* The same status line as app/app.c's log_status(), which is static there, so the port repeats
 * it here. That repetition is one of the costs of splitting the super-loop (see Lab 6). */
static void log_status(void)
{
    ui_status_t s = ui_status();
    char num[16];
    char line[96];
    size_t len = 0U;

    line[0] = '\0';
    if (s.have_sample) {
        len = str_append(line, sizeof line, len, "LAB6 T=");
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
        len = str_append(line, sizeof line, len, "LAB6 T=none");
    }
    len = str_append(line, sizeof line, len, " SET=");
    fmt_int(num, sizeof num, s.setpoint);
    len = str_append(line, sizeof line, len, num);
    len = str_append(line, sizeof line, len, " SCREEN=");
    str_append(line, sizeof line, len, ui_screen_name(s.screen));
    hal_log(line);
}

static void ui_thread(void *p1, void *p2, void *p3)
{
    ARG_UNUSED(p1);
    ARG_UNUSED(p2);
    ARG_UNUSED(p3);
    wait_for_start();
    uint32_t start = hal_millis();
    uint32_t next_draw = start;
    uint32_t next_log = start;

    while (1) {
        /* Sleep until a button message arrives, or for 5 ms. Either way, the loop then polls. */
        uint8_t levels;
        (void)k_msgq_get(&button_q, &levels, K_MSEC(BUTTON_SCAN_MS));

        int32_t centi;
        while (k_msgq_get(&sample_q, &centi, K_NO_WAIT) == 0) {
            ui_on_sample(centi);
        }

        uint32_t now = hal_millis();
        (void)ui_poll(now);

        if (due(now, next_draw)) {
            next_draw += DRAW_PERIOD_MS;
            ui_draw(atomic_get(&sensor_error) != 0);
            (void)display_flush();          /* a failed transfer skips this frame */
            hal_gpio_write(HAL_PIN_LED, ui_status().alarm ? 1U : 0U);
        }

        if (due(now, next_log)) {
            next_log += LOG_PERIOD_MS;
            log_status();
        }
    }
}
K_THREAD_DEFINE(ui_tid, THREAD_STACK, ui_thread, NULL, NULL, NULL,
                PRIO_UI, 0, 0);

int main(void)
{
    hal_init();
    ui_init();

    if (!sensor_init() || !display_init()) {
        hal_log("LAB6 init failed");
        return 0;       /* the threads never start, so nothing else runs */
    }
    hal_log("LAB6 OK");

    k_sem_give(&app_ready);     /* open the gate: the three threads start now */
    return 0;
}
