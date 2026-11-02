/* ui.h: the menu state machine, the buttons and the alarm for Lab 3.
 *
 * Button A (GP14) moves to the next screen. Button B acts on the current screen.
 * The buttons raise interrupts, and the ISR only records the press. ui_poll_buttons()
 * does the work in the main loop. */
#ifndef UI_H
#define UI_H

#include <stdbool.h>

typedef enum {
    UI_LIVE,         /* current temperature and alarm state */
    UI_MINMAX,       /* minimum and maximum since the last reset */
    UI_SETPOINT,     /* alarm threshold, adjusted with button B */
    UI_SCREEN_COUNT
} ui_screen_t;

#define ALARM_MIN_C     20    /* threshold wraps from ALARM_MAX_C back to here */
#define ALARM_MAX_C     35

typedef struct {
    ui_screen_t screen;
    bool        have_sample;   /* false until the first reading */
    float       last;          /* newest reading, degrees Celsius */
    float       min;           /* since the last reset */
    float       max;
    bool        alarm;         /* last reading above the threshold */
    int         setpoint;      /* alarm threshold, degrees Celsius */
} ui_status_t;

/* Configure GP14 and GP15 as inputs with pull-ups and falling-edge interrupts. */
bool ui_init(void);

/* Main loop: act on the presses the ISR recorded. Returns true if the screen changed. */
bool ui_poll_buttons(void);

/* Feed a new temperature: updates min, max and the alarm. */
void ui_on_sample(float celsius);

/* Draw the current screen into the display framebuffer. Call display_flush() afterwards. */
void ui_draw(bool sensor_error);

/* A snapshot for the logger. */
ui_status_t ui_status(void);
const char *ui_screen_name(ui_screen_t screen);

#endif /* UI_H */
