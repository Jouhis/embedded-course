#ifndef MENU_H
#define MENU_H

#include <stdint.h>

// An action is a callback (lesson 49): the menu calls it with no arguments when an item is selected.
typedef void (*menu_action_t)(void);

typedef struct {
    const char *label;
    menu_action_t action;
} menu_item_t;

typedef struct {
    const menu_item_t *items;
    uint8_t count;    // number of items
    uint8_t cursor;   // index of the selected item, 0 to count - 1
} menu_t;

void menu_next(menu_t *m);         // moves the cursor down, wrapping after the last item
void menu_select(menu_t *m);       // calls the selected item's action
void menu_draw(const menu_t *m);   // draws the title and the items into the framebuffer

#endif
