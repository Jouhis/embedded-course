#ifndef FONT_H
#define FONT_H
#include <stdint.h>

// A tiny 5x7 font. Each glyph is 5 columns; bit 0 of a column is the top row.
// Only the characters used by the menu are defined. Any other character draws a space.
const uint8_t *font_glyph(char c);

#endif
