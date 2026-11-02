/* display.c: thin wrapper over the lesson 61 SSD1306 driver (ssd1306.c, font.c).
 *
 * The lab's UI calls these functions. They pass straight through to the driver,
 * which owns the framebuffer, the init sequence and the 5x7 font. */
#include "hardware/i2c.h"
#include "display.h"
#include "ssd1306.h"

#define DISPLAY_BUS    i2c0

bool display_init(void) {
    /* The lesson 61 driver does not report a missing acknowledge, so this cannot return false. */
    ssd1306_init(DISPLAY_BUS);
    return true;
}

void display_clear(void) {
    ssd1306_clear();
}

void display_text(uint8_t page, uint8_t col, const char *text) {
    ssd1306_draw_text(page, col, text);
}

void display_flush(void) {
    ssd1306_flush();
}
