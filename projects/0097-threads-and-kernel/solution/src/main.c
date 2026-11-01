// EXPECT: THREADS OK
/* Three threads and the kernel objects that connect them:
 *   button_thread  polls GP14 and puts one event on button_q (a message queue) per press.
 *   ui_thread      takes events off button_q, counts presses under a mutex, and prints them.
 *   blink_thread   waits on tick_sem (a semaphore) once a second and toggles the LED.
 * A software timer gives the semaphore every second, and its expiry also submits work to the
 * system work queue, which prints the total under the same mutex. */
#include <zephyr/kernel.h>
#include <zephyr/drivers/gpio.h>
#include <zephyr/sys/printk.h>

/* Lower number = more urgent. These are preemptive priorities: a higher-priority thread that
 * becomes ready interrupts a lower one at once (lesson 97). */
#define BUTTON_PRIO   K_PRIO_PREEMPT(2)
#define UI_PRIO       K_PRIO_PREEMPT(5)
#define BLINK_PRIO    K_PRIO_PREEMPT(7)
#define THREAD_STACK  1024

#define BUTTON_POLL_MS  10
#define QUEUE_DEPTH     8

struct button_event {
    uint32_t uptime_ms;     /* when the press was seen, so the UI can print it */
};

/* A message queue holds copies of fixed-size messages. Put and get never share memory with
 * the sender: the queue owns its buffer (K_MSGQ_DEFINE reserves it at build time). */
K_MSGQ_DEFINE(button_q, sizeof(struct button_event), QUEUE_DEPTH, 4);

/* A semaphore is a counter. The timer gives it once a second, the blink thread takes it. */
K_SEM_DEFINE(tick_sem, 0, 1);

/* A mutex protects a shared variable. Only one thread may hold it at a time. */
K_MUTEX_DEFINE(stats_lock);
static uint32_t total_presses;      /* written by ui_thread, read by the work handler */

static const struct gpio_dt_spec led0 = GPIO_DT_SPEC_GET(DT_ALIAS(led0), gpios);
static const struct gpio_dt_spec button = GPIO_DT_SPEC_GET(DT_ALIAS(sw0), gpios);

/* Work handler: runs in the system work queue thread, not in the timer interrupt. */
static void report_handler(struct k_work *work)
{
    ARG_UNUSED(work);
    k_mutex_lock(&stats_lock, K_FOREVER);
    uint32_t n = total_presses;
    k_mutex_unlock(&stats_lock);
    printk("total presses %u\n", n);
}
K_WORK_DEFINE(report_work, report_handler);

/* Timer expiry runs in interrupt context. It may only do ISR-safe things: give a semaphore
 * and submit work. It must not take a mutex or call printk() for long. */
static void tick_expired(struct k_timer *timer)
{
    ARG_UNUSED(timer);
    k_sem_give(&tick_sem);
    k_work_submit(&report_work);
}
K_TIMER_DEFINE(tick_timer, tick_expired, NULL);

static void button_thread(void *p1, void *p2, void *p3)
{
    ARG_UNUSED(p1);
    ARG_UNUSED(p2);
    ARG_UNUSED(p3);
    bool was_pressed = false;
    while (1) {
        /* gpio_pin_get_dt() is the logical level, so 1 means pressed (active low). */
        bool pressed = gpio_pin_get_dt(&button) == 1;
        if (pressed && !was_pressed) {
            struct button_event ev = { .uptime_ms = k_uptime_get_32() };
            /* K_NO_WAIT: if the queue is full, drop the event rather than block here. */
            if (k_msgq_put(&button_q, &ev, K_NO_WAIT) != 0) {
                printk("button queue full, press dropped\n");
            }
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
        /* K_FOREVER: the thread sleeps until a message arrives, using no CPU. */
        k_msgq_get(&button_q, &ev, K_FOREVER);

        k_mutex_lock(&stats_lock, K_FOREVER);
        total_presses++;
        uint32_t n = total_presses;
        k_mutex_unlock(&stats_lock);

        printk("press %u at %u ms\n", n, ev.uptime_ms);
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

    /* The first expiry is after 1 s, then one every second. */
    k_timer_start(&tick_timer, K_SECONDS(1), K_SECONDS(1));

    printk("THREADS OK\n");
    /* Returning from main() ends only this thread. The three threads above keep running. */
    return 0;
}
