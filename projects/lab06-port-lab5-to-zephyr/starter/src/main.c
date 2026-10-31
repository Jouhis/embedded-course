/* Lab 6 starter: the Lab 4 monitor as threads. The application code in
 * ../../lab04-port-lab3-to-stm32/app is the same as the solution's. Your job is the thread
 * bodies marked TODO(learner), and the start-up sequence in main(). */
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

#define PRIO_BUTTON   K_PRIO_PREEMPT(2)
#define PRIO_UI       K_PRIO_PREEMPT(5)
#define PRIO_SENSOR   K_PRIO_PREEMPT(6)

K_MSGQ_DEFINE(button_q, sizeof(uint8_t), 8, 1);
K_MSGQ_DEFINE(sample_q, sizeof(int32_t), 4, 4);
static atomic_t sensor_error = ATOMIC_INIT(0);

/* Start gate: main() gives it once the devices are up, and each thread passes through. */
K_SEM_DEFINE(app_ready, 0, 1);

static void wait_for_start(void)
{
    k_sem_take(&app_ready, K_FOREVER);
    k_sem_give(&app_ready);
}

static bool due(uint32_t now, uint32_t deadline)
{
    return (int32_t)(now - deadline) >= 0;
}

static void button_thread(void *p1, void *p2, void *p3)
{
    ARG_UNUSED(p1);
    ARG_UNUSED(p2);
    ARG_UNUSED(p3);
    wait_for_start();
    /* TODO(learner): every BUTTON_SCAN_MS, read HAL_PIN_BTN_A and HAL_PIN_BTN_B with
     * hal_gpio_read(), pack them into a bit mask (bit 0 = A, bit 1 = B), and when the mask
     * changes, put it on button_q with k_msgq_put(&button_q, &mask, K_NO_WAIT). Then k_msleep(). */
    while (1) {
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
    /* TODO(learner): every SAMPLE_PERIOD_MS, call sensor_poll(&centi). On SENSOR_NEW_SAMPLE,
     * put centi on sample_q and clear sensor_error. On SENSOR_ERROR, set sensor_error to 1
     * with atomic_set(). Then k_msleep(). */
    while (1) {
        k_msleep(SAMPLE_PERIOD_MS);
    }
}
K_THREAD_DEFINE(sensor_tid, THREAD_STACK, sensor_thread, NULL, NULL, NULL,
                PRIO_SENSOR, 0, 0);

static void ui_thread(void *p1, void *p2, void *p3)
{
    ARG_UNUSED(p1);
    ARG_UNUSED(p2);
    ARG_UNUSED(p3);
    wait_for_start();
    /* TODO(learner): this loop replaces app_run()'s super-loop. Each pass:
     *   1. k_msgq_get(&button_q, ..., K_MSEC(BUTTON_SCAN_MS)) as the wait point;
     *   2. drain sample_q with k_msgq_get(..., K_NO_WAIT) and call ui_on_sample() for each;
     *   3. now = hal_millis(); ui_poll(now);
     *   4. if due(now, next_draw): ui_draw(sensor_error), display_flush(), and set the LED from
     *      ui_status().alarm; then advance next_draw by DRAW_PERIOD_MS;
     *   5. if due(now, next_log): build the LAB6 status line (see app/app.c log_status()) and
     *      call hal_log(); then advance next_log by LOG_PERIOD_MS. */
    while (1) {
        k_msleep(BUTTON_SCAN_MS);
    }
}
K_THREAD_DEFINE(ui_tid, THREAD_STACK, ui_thread, NULL, NULL, NULL,
                PRIO_UI, 0, 0);

int main(void)
{
    hal_init();
    ui_init();

    /* TODO(learner): the start-up sequence. Call sensor_init() and display_init(). If either
     * returns false, hal_log("LAB6 init failed") and return. Otherwise hal_log("LAB6 OK") and
     * open the gate with k_sem_give(&app_ready). */
    (void)sensor_init;
    (void)display_init;
    return 0;
}
