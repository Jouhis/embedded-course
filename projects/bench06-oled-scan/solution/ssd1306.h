#ifndef SSD1306_H
#define SSD1306_H

#include <stdbool.h>
#include <stdint.h>
#include "hardware/i2c.h"

#define SSD1306_ADDR_SA0_LOW   0x3C   // 0111100 with SA0 = 0 (SSD1306 datasheet, section 8.1.5)
#define SSD1306_ADDR_SA0_HIGH  0x3D   // 0111101 with SA0 = 1
#define SSD1306_WIDTH  128    // columns (SEG0 to SEG127)
#define SSD1306_PAGES  8      // 64 rows, 8 rows per page: one byte per column per page

// Bench lab 6: the address is a parameter, so the caller can use the one a bus scan found.
// Returns false if the panel does not acknowledge its address.
bool ssd1306_init(i2c_inst_t *bus, uint8_t addr);
void ssd1306_clear(void);                                  // clears the framebuffer, not the panel
void ssd1306_draw_char(uint8_t page, uint8_t x, char c);    // one 5x7 glyph plus a blank column
void ssd1306_draw_text(uint8_t page, uint8_t x, const char *s);
void ssd1306_flush(void);                                  // copies the framebuffer to the panel

#endif
