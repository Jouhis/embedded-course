/* display.c: the OLED wrapper for Lab 3. It sits on the lesson 61 driver (ssd1306.c, font.c).
 *
 * display_clear and display_text are done for you. The two TODO functions are the
 * bus-level steps: the init sequence and the flush. The driver has the functions you need. */
#include "hardware/i2c.h"
#include "display.h"
#include "ssd1306.h"

#define DISPLAY_BUS    i2c0

/* TODO(learner): initialise the panel. Lesson 61's ssd1306_init(bus) sends the init
 * sequence. Call it with DISPLAY_BUS, then return true. */
bool display_init(void) {
    return false;
}

void display_clear(void) {
    ssd1306_clear();
}

void display_text(uint8_t page, uint8_t col, const char *text) {
    ssd1306_draw_text(page, col, text);
}

/* TODO(learner): send the framebuffer to the panel. One call to ssd1306_flush(). */
void display_flush(void) {
}
