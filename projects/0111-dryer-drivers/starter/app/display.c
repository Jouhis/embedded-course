/* display.c: thin wrapper over the SSD1306 driver, as in Lab 3. The UI calls these
 * functions, and they pass straight through to ssd1306.c. */
#include "display.h"
#include "ssd1306.h"

bool display_init(void) {
    return ssd1306_init();
}

void display_clear(void) {
    ssd1306_clear();
}

void display_text(uint8_t page, uint8_t col, const char *text) {
    ssd1306_draw_text(page, col, text);
}

bool display_flush(void) {
    return ssd1306_flush();
}
