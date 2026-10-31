#include "menu.h"
#include <stddef.h>
#include "ssd1306.h"

#define TITLE_PAGE       0
#define FIRST_ITEM_PAGE  1
#define LABEL_X          12

// TODO(learner) BUG: this is a plain increment. After the last item the cursor points past
// the end of the item array, and menu_select() then calls a garbage pointer. Wrap the cursor
// with the item count, and say in a comment why the modulo keeps it in range.
void menu_next(menu_t *m) {
    m->cursor++;
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
