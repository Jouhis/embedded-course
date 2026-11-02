/* display.h: the OLED interface for Lab 3. A thin wrapper over the lesson 61 driver.
 *
 * Drawing happens in RAM: display_clear() and display_text() change the
 * framebuffer only. display_flush() sends the whole framebuffer over I2C. */
#ifndef DISPLAY_H
#define DISPLAY_H

#include <stdbool.h>
#include <stdint.h>

#define DISPLAY_WIDTH   128u
#define DISPLAY_PAGES   8u     /* 64 rows, eight rows of 8 pixels each */

/* Initialise the panel at address 0x3C on I2C0. Call after sensor_init(), which brings up the bus. */
bool display_init(void);

/* Clear the framebuffer (RAM only). */
void display_clear(void);

/* Draw text with the 5x7 font. page is 0 to 7 (top to bottom), col is a pixel column. The
 * font covers digits, space, and the uppercase letters used by the UI. Other characters
 * draw as a space. */
void display_text(uint8_t page, uint8_t col, const char *text);

/* Send the framebuffer to the panel. */
void display_flush(void);

#endif /* DISPLAY_H */
