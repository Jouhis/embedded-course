/* ui.c: buttons (interrupt-driven, debounced), the three-screen menu and the alarm.
 *
 * Data shared with the ISR is one byte of pending events, written by the ISR and
 * read and cleared by the main loop. The main loop clears it with interrupts off, so
 * a press that arrives during the clear is not lost (lesson 57). */
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

/* Written only by the ISR, so no volatile is needed. Index 0 is button A, 1 is B. */
static uint32_t last_accepted_ms[2];

static ui_screen_t screen = UI_LIVE;
static bool have_sample = false;
static bool have_range = false;
static float last_c, min_c, max_c;
static bool alarm = false;
static int setpoint = 28;

static void on_button_edge(uint gpio, uint32_t events) {
    if (!(events & GPIO_IRQ_EDGE_FALL)) {
        return;                   /* buttons are wired active low */
    }
    uint index;
    uint8_t bit;
    if (gpio == PIN_BTN_A) {
        index = 0;
        bit = EVT_A;
    } else if (gpio == PIN_BTN_B) {
        index = 1;
        bit = EVT_B;
    } else {
        return;
    }

    /* Debounce: a mechanical button bounces for a few milliseconds. Edges within 30 ms
     * of the last accepted edge are the bounce, not a new press. */
    uint32_t now = to_ms_since_boot(get_absolute_time());
    if (now - last_accepted_ms[index] < DEBOUNCE_MS) {
        return;
    }
    last_accepted_ms[index] = now;
    pending_events |= bit;        /* a short read-modify-write, safe because only the ISR writes here */
}

bool ui_init(void) {
    gpio_init(PIN_BTN_A);
    gpio_set_dir(PIN_BTN_A, GPIO_IN);
    gpio_pull_up(PIN_BTN_A);
    gpio_init(PIN_BTN_B);
    gpio_set_dir(PIN_BTN_B, GPIO_IN);
    gpio_pull_up(PIN_BTN_B);

    /* One callback serves both pins. The first call installs it; the second only enables. */
    gpio_set_irq_enabled_with_callback(PIN_BTN_A, GPIO_IRQ_EDGE_FALL, true, on_button_edge);
    gpio_set_irq_enabled(PIN_BTN_B, GPIO_IRQ_EDGE_FALL, true);
    return true;
}

bool ui_poll_buttons(void) {
    /* Take the events with interrupts off, so the ISR cannot write between our read and clear. */
    uint32_t saved = save_and_disable_interrupts();
    uint8_t events = pending_events;
    pending_events = 0;
    restore_interrupts(saved);

    bool changed = false;
    if (events & EVT_A) {
        screen = (ui_screen_t)((screen + 1) % UI_SCREEN_COUNT);
        changed = true;
    }
    if (events & EVT_B) {
        if (screen == UI_MINMAX) {
            have_range = false;               /* the next sample starts a new range */
        } else if (screen == UI_SETPOINT) {
            setpoint = (setpoint >= ALARM_MAX_C) ? ALARM_MIN_C : setpoint + 1;
        }
    }
    return changed;
}

void ui_on_sample(float celsius) {
    last_c = celsius;
    have_sample = true;
    if (!have_range) {
        min_c = max_c = celsius;
        have_range = true;
    } else {
        if (celsius < min_c) min_c = celsius;
        if (celsius > max_c) max_c = celsius;
    }
    alarm = celsius > (float)setpoint;
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

void ui_draw(bool sensor_error) {
    char line[24];
    display_clear();

    switch (screen) {
        case UI_LIVE:
            display_text(0, 0, "LIVE");
            if (sensor_error) {
                display_text(2, 0, "SENSOR ERR");
            } else if (have_sample) {
                snprintf(line, sizeof line, "T %5.2f C", last_c);
                display_text(2, 0, line);
            } else {
                display_text(2, 0, "NO DATA");
            }
            if (alarm) {
                display_text(4, 0, "ALARM");
            }
            display_text(7, 0, "A NEXT");
            break;

        case UI_MINMAX:
            display_text(0, 0, "MIN MAX");
            if (have_range) {
                snprintf(line, sizeof line, "MIN %5.2f C", min_c);
                display_text(2, 0, line);
                snprintf(line, sizeof line, "MAX %5.2f C", max_c);
                display_text(4, 0, line);
            } else {
                display_text(2, 0, "NO DATA");
            }
            display_text(7, 0, "A NEXT B RESET");
            break;

        case UI_SETPOINT:
            display_text(0, 0, "ALARM SET");
            snprintf(line, sizeof line, "SET %d C", setpoint);
            display_text(2, 0, line);
            if (have_sample) {
                snprintf(line, sizeof line, "T %5.2f C", last_c);
                display_text(4, 0, line);
            }
            display_text(7, 0, "A NEXT B UP");
            break;

        default:
            break;
    }
}
