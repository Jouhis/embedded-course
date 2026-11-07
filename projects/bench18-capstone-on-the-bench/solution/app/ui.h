/* ui.h: the text on the 128 x 64 OLED (lesson 116). Pure: it builds the lines, the driver draws them.
 * Four lines of up to 21 characters (5x7 glyphs plus one blank column, 6 pixels each: 128 / 6 = 21). */
#ifndef UI_H
#define UI_H

#include <stdbool.h>
#include <stdint.h>
#include "dryer.h"

#define UI_LINES       4
#define UI_LINE_CHARS  22    /* 21 characters and the terminating NUL */

void ui_compose(const dryer_t *d, const dryer_out_t *out, int32_t temp_centi, bool sensor_ok,
                char lines[UI_LINES][UI_LINE_CHARS]);

#endif /* UI_H */
