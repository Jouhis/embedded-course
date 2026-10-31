/* ui.h: the menu state machine and the alarm, from Lab 3 and Lab 4.
 *
 * Button A moves to the next screen. Button B acts on the current screen. The buttons no longer
 * poll: the UI task receives each falling edge as an event, and ui_on_button() debounces it by
 * time (30 ms), so one click is one press even when the switch bounces. */
#ifndef UI_H
#define UI_H

#include <stdbool.h>
#include <stdint.h>

#include "hal.h"

typedef enum {
    UI_LIVE,         /* current temperature and alarm state */
    UI_MINMAX,       /* minimum and maximum since the last reset */
    UI_SETPOINT,     /* alarm threshold, adjusted with button B */
    UI_SCREEN_COUNT
} ui_screen_t;

#define ALARM_MIN_C     20     /* threshold wraps from ALARM_MAX_C back to here */
#define ALARM_MAX_C     35
#define SETPOINT_START_C 28

typedef struct {
    ui_screen_t screen;
    bool        have_sample;   /* false until the first reading */
    int32_t     last;          /* newest reading, hundredths of a degree */
    int32_t     min;           /* since the last reset */
    int32_t     max;
    bool        alarm;         /* last reading above the threshold */
    int32_t     setpoint;      /* alarm threshold, whole degrees C */
} ui_status_t;

/* Reset the menu to LIVE and clear the readings. */
void ui_init(void);

/* A button fell at time now_ms (tick count). Debounces, then acts. Returns true if the screen
 * changed. Call from the UI task only. */
bool ui_on_button(hal_pin_t pin, uint32_t now_ms);

/* Feed a new temperature in hundredths of a degree: updates min, max and the alarm. */
void ui_on_sample(int32_t centi);

/* Draw the current screen into the display framebuffer. Call display_flush() afterwards. */
void ui_draw(bool sensor_error);

/* A snapshot for the logger. */
ui_status_t ui_status(void);
const char *ui_screen_name(ui_screen_t screen);

#endif /* UI_H */
