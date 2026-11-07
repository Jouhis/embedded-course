// EXPECT: DRYER DRIVERS OK
/* main.c: the filament dryer with its drivers, run as a superloop (lesson 116).
 *
 * The superloop has no RTOS yet. Three jobs run at their own rate, using the millisecond clock:
 *   every 20 ms   read and debounce the buttons
 *   every 100 ms  read the NTC, run the state machine, the safety checks and the heater control
 *   every 200 ms  redraw the OLED
 * Lesson 117 turns these three jobs into FreeRTOS tasks with vTaskDelayUntil(). */
#include <stdbool.h>
#include "buttons.h"
#include "control.h"
#include "dryer.h"
#include "display.h"
#include "hal.h"
#include "safety.h"
#include "sensor.h"
#include "ui.h"

#define BUTTON_PERIOD_MS   20u
#define CONTROL_PERIOD_MS  100u
#define DRAW_PERIOD_MS     200u

static buttons_t  buttons;
static dryer_t    dryer;
static bangbang_t heater_ctl;
static runaway_t  runaway;
static int32_t    last_temp = 0;
static bool       last_sensor_ok = false;

static void control_step(uint32_t now) {
    uint16_t raw = 0u;
    int32_t centi = 0;
    bool ok = sensor_read(&raw, &centi);
    last_temp = centi;
    last_sensor_ok = ok;

    dryer_in_t in = {
        .now_ms = now,
        .temp_centi = centi,
        .sensor_ok = ok,
        .start_pressed = buttons_take_start(&buttons),
        .material_pressed = buttons_take_material(&buttons),
        .safety_fault = FAULT_NONE,
    };
    dryer_out_t out;

    /* First pass: the state machine says whether heat is wanted; the controller picks the duty. */
    dryer_step(&dryer, &in, &out);
    uint16_t duty = bangbang_step(&heater_ctl, out.heater_enabled, out.setpoint_centi, centi);

    /* The safety check looks at the heater as it is about to be driven. */
    safety_in_t s = {
        .now_ms = now,
        .temp_centi = centi,
        .sensor_ok = ok,
        .heater_enabled = out.heater_enabled,
        .heater_full = (duty == CONTROL_FULL),
        .setpoint_centi = out.setpoint_centi,
        .sample_age_ms = 0u,
    };
    fault_t f = safety_check(&s, &runaway);
    if (f != FAULT_NONE) {
        duty = 0u;                       /* cut the heater now; the state machine latches FAULT next */
        in.safety_fault = f;
        in.start_pressed = false;        /* the presses were applied in the first pass: never twice */
        in.material_pressed = false;
        dryer_step(&dryer, &in, &out);
    }

    hal_heater_set_permille((uint16_t)duty);
    hal_fan_set(out.fan_on ? 1u : 0u);
}

static void draw(void) {
    char lines[UI_LINES][UI_LINE_CHARS];
    dryer_out_t out;
    dryer_in_t none = { 0 };
    dryer_step(&dryer, &none, &out);     /* a refresh with no press: the state does not change */
    ui_compose(&dryer, &out, last_temp, last_sensor_ok, lines);
    display_clear();
    for (uint8_t i = 0; i < UI_LINES; i++) {
        display_text((uint8_t)(i * 2u), 0u, lines[i]);
    }
    (void)display_flush();
}

int main(void) {
    hal_init();
    buttons_init(&buttons);
    dryer_init(&dryer);
    bangbang_init(&heater_ctl);
    runaway_reset(&runaway);
    bool display_ok = display_init();
    /* The pass line needs both drivers: the display answered, and one NTC reading converts. */
    uint16_t raw0 = 0u;
    int32_t centi0 = 0;
    bool sensor_ok = sensor_read(&raw0, &centi0);
    hal_log(!display_ok ? "DRYER DRIVERS: display missing"
            : !sensor_ok ? "DRYER DRIVERS: no valid NTC reading"
            : "DRYER DRIVERS OK");

    uint32_t next_btn = hal_millis();
    uint32_t next_ctl = hal_millis();
    uint32_t next_draw = hal_millis();
    for (;;) {
        uint32_t now = hal_millis();
        if ((int32_t)(now - next_btn) >= 0) {
            next_btn += BUTTON_PERIOD_MS;
            buttons_sample(&buttons);
        }
        if ((int32_t)(now - next_ctl) >= 0) {
            next_ctl += CONTROL_PERIOD_MS;
            control_step(now);
        }
        if ((int32_t)(now - next_draw) >= 0) {
            next_draw += DRAW_PERIOD_MS;
            draw();
        }
    }
}
