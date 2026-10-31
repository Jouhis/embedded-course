#include "menu.h"
#include <stddef.h>
#include "ssd1306.h"

#define TITLE_PAGE       0
#define FIRST_ITEM_PAGE  1   // item i is on page 1 + i, so each row is one 8-pixel page
#define LABEL_X          12  // column after the cursor and a gap

void menu_next(menu_t *m) {
    // Wrap with the count, not a plain increment, so the cursor always stays below count.
    m->cursor = (uint8_t)((m->cursor + 1) % m->count);
}

void menu_select(menu_t *m) {
    if (m->cursor < m->count && m->items[m->cursor].action != NULL) {
        m->items[m->cursor].action();
    }
}

void menu_draw(const menu_t *m) {
    ssd1306_clear();
    ssd1306_draw_text(TITLE_PAGE, 0, "MENU");
    for (uint8_t i = 0; i < m->count; i++) {
        uint8_t page = FIRST_ITEM_PAGE + i;
        ssd1306_draw_char(page, 0, i == m->cursor ? '>' : ' ');
        ssd1306_draw_text(page, LABEL_X, m->items[i].label);
    }
}
