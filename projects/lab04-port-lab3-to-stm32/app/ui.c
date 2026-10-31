/* ui.c: buttons (polled, debounced by time), the three-screen menu and the alarm.
 * The menu and the alarm are the Lab 3 logic. The button handling differs: Lab 3 used
 * interrupts, and this port reads the pins with hal_gpio_read() instead. */
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "display.h"
#include "format.h"
#include "hal.h"
#include "ui.h"

#define DEBOUNCE_MS     30u    /* presses closer than this on one button are one press */

typedef struct {
    uint8_t  prev_raw;         /* the pin level at the last poll: 1 = pressed */
    bool     has_accept;       /* false until the first accepted press */
    uint32_t accepted_ms;      /* time of the last accepted press */
} button_t;

static button_t btn_a;
static button_t btn_b;

static ui_screen_t screen = UI_LIVE;
static bool have_sample = false;
static bool have_range = false;
static int32_t last_centi = 0;
static int32_t min_centi = 0;
static int32_t max_centi = 0;
static bool alarm = false;
static int32_t setpoint = SETPOINT_START_C;

/* A new press is a rising edge of the "pressed" level that is not a bounce. */
static bool button_pressed(button_t *b, uint8_t raw, uint32_t now_ms) {
    bool fresh = (raw != 0U) && (b->prev_raw == 0U);
    b->prev_raw = raw;
    if (!fresh) {
        return false;
    }
    if (b->has_accept && (uint32_t)(now_ms - b->accepted_ms) < DEBOUNCE_MS) {
        return false;          /* a bounce of the press we already counted */
    }
    b->has_accept = true;
    b->accepted_ms = now_ms;
    return true;
}

void ui_init(void) {
    screen = UI_LIVE;
    have_sample = false;
    have_range = false;
    alarm = false;
    setpoint = SETPOINT_START_C;
    btn_a = (button_t){0};
    btn_b = (button_t){0};
}

bool ui_poll(uint32_t now_ms) {
    bool changed = false;
    if (button_pressed(&btn_a, hal_gpio_read(HAL_PIN_BTN_A), now_ms)) {
        screen = (ui_screen_t)((screen + 1) % UI_SCREEN_COUNT);
        changed = true;
    }
    if (button_pressed(&btn_b, hal_gpio_read(HAL_PIN_BTN_B), now_ms)) {
        if (screen == UI_MINMAX) {
            have_range = false;                 /* the next sample starts a new range */
        } else if (screen == UI_SETPOINT) {
            setpoint = (setpoint >= ALARM_MAX_C) ? ALARM_MIN_C : setpoint + 1;
        }
    }
    return changed;
}

void ui_on_sample(int32_t centi) {
    last_centi = centi;
    have_sample = true;
    if (!have_range) {
        min_centi = max_centi = centi;
        have_range = true;
    } else {
        if (centi < min_centi) min_centi = centi;
        if (centi > max_centi) max_centi = centi;
    }
    alarm = centi > setpoint * 100;     /* the threshold is in whole degrees */
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
        .last = last_centi,
        .min = min_centi,
        .max = max_centi,
        .alarm = alarm,
        .setpoint = setpoint,
    };
    return s;
}

/* Build "label value C" into line and draw it on the given page. */
static void draw_value_line(uint8_t page, const char *label, int32_t centi) {
    char num[16];
    char line[24];
    size_t len = 0U;
    line[0] = '\0';
    len = str_append(line, sizeof line, len, label);
    len = str_append(line, sizeof line, len, " ");
    fmt_centi(num, sizeof num, centi);
    len = str_append(line, sizeof line, len, num);
    str_append(line, sizeof line, len, " C");
    display_text(page, 0, line);
}

void ui_draw(bool sensor_error) {
    display_clear();

    switch (screen) {
        case UI_LIVE:
            display_text(0, 0, "LIVE");
            if (sensor_error) {
                display_text(2, 0, "SENSOR ERR");
            } else if (have_sample) {
                draw_value_line(2, "T", last_centi);
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
                draw_value_line(2, "MIN", min_centi);
                draw_value_line(4, "MAX", max_centi);
            } else {
                display_text(2, 0, "NO DATA");
            }
            display_text(7, 0, "A NEXT B RESET");
            break;

        case UI_SETPOINT: {
            char num[12];
            char line[24];
            size_t len = str_append(line, sizeof line, 0U, "SET ");
            fmt_int(num, sizeof num, setpoint);
            len = str_append(line, sizeof line, len, num);
            str_append(line, sizeof line, len, " C");
            display_text(0, 0, "ALARM SET");
            display_text(2, 0, line);
            if (have_sample) {
                draw_value_line(4, "T", last_centi);
            }
            display_text(7, 0, "A NEXT B UP");
            break;
        }

        default:
            break;
    }
}
