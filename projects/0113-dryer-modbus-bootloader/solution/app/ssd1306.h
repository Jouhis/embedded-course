/* ssd1306.h: driver for a 128 x 64 SSD1306 OLED on I2C (the lesson 61 driver, ported to hal.h).
 * The panel is reached only through hal_i2c_write(). */
#ifndef SSD1306_H
#define SSD1306_H

#include <stdbool.h>
#include <stdint.h>

#define SSD1306_ADDR   0x3C    /* 0111100 with SA0 = 0 (SSD1306 datasheet, section 8.1.5) */
#define SSD1306_WIDTH  128     /* columns (SEG0 to SEG127) */
#define SSD1306_PAGES  8       /* 64 rows, 8 rows per page: one byte per column per page */

/* Send the initialisation sequence. Returns false when the panel does not acknowledge. */
bool ssd1306_init(void);
void ssd1306_clear(void);                                   /* clears the framebuffer, not the panel */
void ssd1306_draw_char(uint8_t page, uint8_t x, char c);    /* one 5x7 glyph plus a blank column */
void ssd1306_draw_text(uint8_t page, uint8_t x, const char *s);
bool ssd1306_flush(void);                                   /* copies the framebuffer to the panel */

#endif /* SSD1306_H */
