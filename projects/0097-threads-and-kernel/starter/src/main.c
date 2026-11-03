/* Threads and kernel objects. The button, the message queue, the mutex and the work queue are
 * wired up. Your job is the bodies marked TODO(learner). See lesson 97 for each one. */
#include <zephyr/kernel.h>
#include <zephyr/drivers/gpio.h>
#include <zephyr/sys/printk.h>

#define BUTTON_PRIO   K_PRIO_PREEMPT(2)
#define UI_PRIO       K_PRIO_PREEMPT(5)
#define BLINK_PRIO    K_PRIO_PREEMPT(7)
#define THREAD_STACK  1024

#define BUTTON_POLL_MS  10
#define QUEUE_DEPTH     8

struct button_event {
    uint32_t uptime_ms;
};

K_MSGQ_DEFINE(button_q, sizeof(struct button_event), QUEUE_DEPTH, 4);
K_SEM_DEFINE(tick_sem, 0, 1);
K_MUTEX_DEFINE(stats_lock);
static uint32_t total_presses;

static const struct gpio_dt_spec led0 = GPIO_DT_SPEC_GET(DT_ALIAS(led0), gpios);
static const struct gpio_dt_spec button = GPIO_DT_SPEC_GET(DT_ALIAS(sw0), gpios);

static void report_handler(struct k_work *work)
{
    ARG_UNUSED(work);
    /* TODO(learner): lock stats_lock, copy total_presses into a local, unlock, then printk
     * "total presses N". Lock before reading, so the read is not torn by ui_thread. */
}
K_WORK_DEFINE(report_work, report_handler);

static void tick_expired(struct k_timer *timer)
{
    ARG_UNUSED(timer);
    k_sem_give(&tick_sem);
    /* TODO(learner): submit report_work to the system work queue with k_work_submit(). */
}
K_TIMER_DEFINE(tick_timer, tick_expired, NULL);

static void button_thread(void *p1, void *p2, void *p3)
{
    ARG_UNUSED(p1);
    ARG_UNUSED(p2);
    ARG_UNUSED(p3);
    bool was_pressed = false;
    while (1) {
        bool pressed = gpio_pin_get_dt(&button) == 1;
        if (pressed && !was_pressed) {
            struct button_event ev = { .uptime_ms = k_uptime_get_32() };
            /* TODO(learner): put ev on button_q with k_msgq_put(), using K_NO_WAIT. */
            (void)ev;
        }
        was_pressed = pressed;
        k_msleep(BUTTON_POLL_MS);
    }
}
K_THREAD_DEFINE(button_tid, THREAD_STACK, button_thread, NULL, NULL, NULL,
                BUTTON_PRIO, 0, 0);

static void ui_thread(void *p1, void *p2, void *p3)
{
    ARG_UNUSED(p1);
    ARG_UNUSED(p2);
    ARG_UNUSED(p3);
    while (1) {
        struct button_event ev;
        /* TODO(learner): take one event from button_q with k_msgq_get(), waiting forever.
         * Then lock stats_lock, add 1 to total_presses, unlock, and printk the press. */
        (void)ev;
        k_msleep(1000);     /* placeholder so this thread does not spin; remove it when done */
    }
}
K_THREAD_DEFINE(ui_tid, THREAD_STACK, ui_thread, NULL, NULL, NULL,
                UI_PRIO, 0, 0);

static void blink_thread(void *p1, void *p2, void *p3)
{
    ARG_UNUSED(p1);
    ARG_UNUSED(p2);
    ARG_UNUSED(p3);
    while (1) {
        k_sem_take(&tick_sem, K_FOREVER);
        gpio_pin_toggle_dt(&led0);
    }
}
K_THREAD_DEFINE(blink_tid, THREAD_STACK, blink_thread, NULL, NULL, NULL,
                BLINK_PRIO, 0, 0);

int main(void)
{
    if (!gpio_is_ready_dt(&led0) || !gpio_is_ready_dt(&button)) {
        printk("a device is not ready\n");
        return 0;
    }
    if (gpio_pin_configure_dt(&led0, GPIO_OUTPUT_INACTIVE) < 0 ||
        gpio_pin_configure_dt(&button, GPIO_INPUT) < 0) {
        printk("pin configuration failed\n");
        return 0;
    }
    /* TODO(learner): start tick_timer with k_timer_start(), first expiry after 1 s, then
     * every 1 s (K_SECONDS(1) for both arguments). Then printk "THREADS OK" once, here. */
    return 0;
}
