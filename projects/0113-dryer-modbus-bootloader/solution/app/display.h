/* display.h: the OLED interface for the monitor. A thin wrapper over ssd1306.c.
 *
 * Drawing happens in RAM: display_clear() and display_text() change the framebuffer only.
 * display_flush() sends the whole framebuffer over I2C (about 90 ms at 100 kHz). */
#ifndef DISPLAY_H
#define DISPLAY_H

#include <stdbool.h>
#include <stdint.h>

#define DISPLAY_WIDTH   128u
#define DISPLAY_PAGES   8u     /* 64 rows, eight rows of 8 pixels each */

/* Initialise the panel. Call after hal_init(). Returns false if the panel does not answer. */
bool display_init(void);

/* Clear the framebuffer (RAM only). */
void display_clear(void);

/* Draw text with the 5x7 font. page is 0 to 7 (top to bottom), col is a pixel column. */
void display_text(uint8_t page, uint8_t col, const char *text);

/* Send the framebuffer to the panel. */
bool display_flush(void);

#endif /* DISPLAY_H */
