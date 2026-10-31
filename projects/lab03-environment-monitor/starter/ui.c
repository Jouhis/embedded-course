/* ui.c: buttons (interrupt-driven, debounced), the three-screen menu and the alarm.
 *
 * Data shared with the ISR is one byte of pending events, written by the ISR and
 * read and cleared by the main loop. The main loop clears it with interrupts off.
 * The state, the drawing helpers and ui_status() are done for you. The four TODO
 * functions are yours: the ISR, the button setup, the presses and the samples. */
#include <stdio.h>

#include "hardware/gpio.h"
#include "hardware/sync.h"
#include "pico/time.h"
#include "display.h"
#include "ui.h"

#define PIN_BTN_A       14u
#define PIN_BTN_B       15u
#define DEBOUNCE_MS     30u     /* ignore edges closer than this to the last accepted one */

#define EVT_A           (1u << 0)
#define EVT_B           (1u << 1)

static volatile uint8_t pending_events;   /* ISR writes, main loop reads and clears */

/* Written only by the ISR. Index 0 is button A, 1 is B. */
static uint32_t last_accepted_ms[2];

static ui_screen_t screen = UI_LIVE;
static bool have_sample = false;
static bool have_range = false;
static float last_c, min_c, max_c;
static bool alarm = false;
static int setpoint = 28;

/* TODO(learner): the interrupt handler. Lesson 57 explains the rules: keep it short,
 * and do not print, sleep or call the display from here.
 *  1. Ignore rising edges: check (events & GPIO_IRQ_EDGE_FALL).
 *  2. Map gpio to a bit: PIN_BTN_A sets EVT_A, PIN_BTN_B sets EVT_B. Other pins: return.
 *  3. Debounce: now = to_ms_since_boot(get_absolute_time()). If now is less than
 *     DEBOUNCE_MS after last_accepted_ms[index], return. Otherwise store now there.
 *  4. Set the bit in pending_events. */
static void on_button_edge(uint gpio, uint32_t events) {
    (void)gpio;
    (void)events;
}

/* TODO(learner): configure GP14 and GP15 as inputs with pull-ups, and enable falling-edge
 * interrupts with on_button_edge. Use gpio_init(), gpio_set_dir(), gpio_pull_up(),
 * gpio_set_irq_enabled_with_callback() for the first pin and gpio_set_irq_enabled() for
 * the second. Return true when all of that is done. */
bool ui_init(void) {
    return false;
}

/* TODO(learner): act on the recorded presses.
 *  1. Take the events with interrupts off: save_and_disable_interrupts(), read
 *     pending_events, clear it, then restore_interrupts().
 *  2. EVT_A: advance screen, wrapping at UI_SCREEN_COUNT. Set changed = true.
 *  3. EVT_B on UI_MINMAX: clear have_range, so the next sample starts a new range.
 *     EVT_B on UI_SETPOINT: raise setpoint by 1, wrapping from ALARM_MAX_C to ALARM_MIN_C.
 *  4. Return changed. */
bool ui_poll_buttons(void) {
    return false;
}

/* TODO(learner): a new temperature arrived.
 *  1. Store it in last_c and set have_sample.
 *  2. Min and max: if have_range is false, start both at this value and set have_range.
 *     Otherwise keep the smaller in min_c and the larger in max_c.
 *  3. alarm = the reading is above the setpoint (cast setpoint to float). */
void ui_on_sample(float celsius) {
    (void)celsius;
}

const char *ui_screen_name(ui_screen_t s) {
    switch (s) {
        case UI_LIVE:     return "LIVE";
        case UI_MINMAX:   return "MINMAX";
        case UI_SETPOINT: return "SETPOINT";
        default:          return "?";
    }
}

ui_status_t ui_status(void) {
    ui_status_t s = {
        .screen = screen,
        .have_sample = have_sample,
        .last = last_c,
        .min = min_c,
        .max = max_c,
        .alarm = alarm,
        .setpoint = setpoint,
    };
    return s;
}

/* TODO(learner): draw the current screen into the framebuffer. The solution has three
 * screens: LIVE, MINMAX and SETPOINT. Use display_clear(), then display_text(page, col, text)
 * for each line, and snprintf() into a small buffer for numbers. The font has digits,
 * space, and the uppercase letters A to X used in these strings. Other letters draw as spaces.
 *  - LIVE: the title, the temperature (or SENSOR ERR, or NO DATA), ALARM when alarm is set.
 *  - MINMAX: the title, min and max (or NO DATA), footer "A NEXT B RESET".
 *  - SETPOINT: the title, "SET nn C", the temperature, footer "A NEXT B UP". */
void ui_draw(bool sensor_error) {
    (void)sensor_error;
    display_clear();
}
