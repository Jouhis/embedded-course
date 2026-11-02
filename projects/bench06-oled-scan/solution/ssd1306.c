#include "ssd1306.h"
#include <stddef.h>
#include <string.h>
#include "font.h"
#include "pico/stdlib.h"

// Control byte (SSD1306 datasheet, section 8.1.5.1): bit 7 is Co, bit 6 is D/C#.
#define CTRL_CMD        0x80   // Co = 1, D/C# = 0: one command byte follows
#define CTRL_DATA       0x40   // Co = 0, D/C# = 1: a stream of data bytes follows

// Page addressing mode (datasheet 10.1.3, set with 0x20 0x02). The pointer is set once per page.
#define CMD_PAGE_START  0xB0   // 0xB0 | page     (10.1.13)
#define CMD_COL_LOW     0x00   // 0x00 | low nibble of the column   (10.1.1)
#define CMD_COL_HIGH    0x10   // 0x10 | high nibble of the column  (10.1.2)

#define GLYPH_WIDTH     5
#define CHAR_ADVANCE    6      // glyph plus one blank column

static i2c_inst_t *s_bus;
static uint8_t s_addr;
static uint8_t s_fb[SSD1306_PAGES][SSD1306_WIDTH];   // 1 KB of RAM: the whole picture

// One command: a control byte with Co = 1 and D/C# = 0, then the command byte.
static bool send_cmd(uint8_t cmd) {
    uint8_t buf[2] = {CTRL_CMD, cmd};
    return i2c_write_blocking(s_bus, s_addr, buf, 2, false) == 2;
}

// Initialisation for a 128x64 panel. The values follow the pico-examples i2c/ssd1306_i2c
// driver (BSD-3-Clause, Raspberry Pi), which is checked against the SSD1306 datasheet.
bool ssd1306_init(i2c_inst_t *bus, uint8_t addr) {
    s_bus = bus;
    s_addr = addr;
    static const uint8_t init[] = {
        0xAE,        // display off while configuring
        0xD5, 0x80,  // clock divide ratio 1, default oscillator frequency
        0xA8, 0x3F,  // multiplex ratio 64 (rows - 1)
        0xD3, 0x00,  // display offset 0
        0x40,        // display start line 0
        0x8D, 0x14,  // charge pump on: the panel's high voltage comes from the chip
        0x20, 0x02,  // memory addressing mode: page addressing
        0xA1,        // segment remap: column 127 on SEG0
        0xC8,        // COM scan from COM[N-1] down to COM0
        0xDA, 0x12,  // COM pin layout for 128x64
        0x81, 0xFF,  // contrast, maximum
        0xD9, 0xF1,  // pre-charge period
        0xDB, 0x30,  // VCOMH deselect level
        0xA4,        // show the framebuffer, not all pixels on
        0xA6,        // normal, not inverted
        0x2E,        // scrolling off: memory writes are corrupted while scrolling
        0xAF,        // display on
    };
    for (size_t i = 0; i < sizeof init; i++) {
        if (!send_cmd(init[i])) {
            return false;   // NACK: no panel at this address (or the bus is stuck)
        }
    }
    return true;
}

void ssd1306_clear(void) {
    memset(s_fb, 0, sizeof s_fb);
}

void ssd1306_draw_char(uint8_t page, uint8_t x, char c) {
    if (page >= SSD1306_PAGES || x + CHAR_ADVANCE > SSD1306_WIDTH) {
        return;   // off the panel: drop it rather than write past the array
    }
    const uint8_t *cols = font_glyph(c);
    for (uint8_t i = 0; i < GLYPH_WIDTH; i++) {
        s_fb[page][x + i] = cols[i];
    }
    s_fb[page][x + GLYPH_WIDTH] = 0x00;   // the blank column between characters
}

void ssd1306_draw_text(uint8_t page, uint8_t x, const char *s) {
    for (; *s != '\0' && x + CHAR_ADVANCE <= SSD1306_WIDTH; s++, x += CHAR_ADVANCE) {
        ssd1306_draw_char(page, x, *s);
    }
}

// Page addressing: for each page, set the page and column pointer, then send 128 data bytes.
void ssd1306_flush(void) {
    static uint8_t frame[1 + SSD1306_WIDTH];   // the control byte, then one page of data
    for (uint8_t page = 0; page < SSD1306_PAGES; page++) {
        send_cmd(CMD_PAGE_START | page);
        send_cmd(CMD_COL_LOW);
        send_cmd(CMD_COL_HIGH);
        frame[0] = CTRL_DATA;
        memcpy(&frame[1], s_fb[page], SSD1306_WIDTH);
        i2c_write_blocking(s_bus, s_addr, frame, sizeof frame, false);
    }
}
