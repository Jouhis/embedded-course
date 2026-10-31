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
#define CHAR_ADVANCE    6

static i2c_inst_t *s_bus;
static uint8_t s_fb[SSD1306_PAGES][SSD1306_WIDTH];

static void send_cmd(uint8_t cmd) {
    uint8_t buf[2] = {CTRL_CMD, cmd};
    i2c_write_blocking(s_bus, SSD1306_ADDR, buf, 2, false);
}

// Initialisation for a 128x64 panel. Values follow the pico-examples i2c/ssd1306_i2c driver
// (BSD-3-Clause, Raspberry Pi). Provided in full: it is the same sequence as the solution.
void ssd1306_init(i2c_inst_t *bus) {
    s_bus = bus;
    static const uint8_t init[] = {
        0xAE, 0xD5, 0x80, 0xA8, 0x3F, 0xD3, 0x00, 0x40,
        0x8D, 0x14, 0x20, 0x02, 0xA1, 0xC8, 0xDA, 0x12,
        0x81, 0xFF, 0xD9, 0xF1, 0xDB, 0x30, 0xA4, 0xA6,
        0x2E, 0xAF,
    };
    for (size_t i = 0; i < sizeof init; i++) {
        send_cmd(init[i]);
    }
}

void ssd1306_clear(void) {
    memset(s_fb, 0, sizeof s_fb);
}

// TODO(learner): write one glyph into the framebuffer. Use font_glyph(c) for the five
// column bytes, copy them to s_fb[page][x..x+4], and leave column x+5 blank.
// Drop the character if page or x is off the panel (check before writing).
void ssd1306_draw_char(uint8_t page, uint8_t x, char c) {
    (void)page;
    (void)x;
    (void)c;
}

// TODO(learner): call ssd1306_draw_char for each character of s, advancing x by CHAR_ADVANCE,
// and stop at the end of the string or the edge of the panel.
void ssd1306_draw_text(uint8_t page, uint8_t x, const char *s) {
    (void)page;
    (void)x;
    (void)s;
}

// Page addressing: for each page, set the page and column pointer, then send 128 data bytes.
void ssd1306_flush(void) {
    static uint8_t frame[1 + SSD1306_WIDTH];
    for (uint8_t page = 0; page < SSD1306_PAGES; page++) {
        send_cmd(CMD_PAGE_START | page);
        send_cmd(CMD_COL_LOW);
        send_cmd(CMD_COL_HIGH);
        frame[0] = CTRL_DATA;
        memcpy(&frame[1], s_fb[page], SSD1306_WIDTH);
        i2c_write_blocking(s_bus, SSD1306_ADDR, frame, sizeof frame, false);
    }
}
