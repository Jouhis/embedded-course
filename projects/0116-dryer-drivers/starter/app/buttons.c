/* buttons.c: debounced button events (lesson 116). The debounce is the lesson 80 module. */
#include "buttons.h"
#include "hal.h"

void buttons_init(buttons_t *b) {
    debounce_init(&b->start);
    debounce_init(&b->material);
    b->start_event = false;
    b->material_event = false;
}

void buttons_sample(buttons_t *b) {
    uint8_t start_before = b->start.stable;
    uint8_t material_before = b->material.stable;
    uint8_t start_now = debounce_update(&b->start, hal_button_pressed(HAL_BUTTON_START));
    uint8_t material_now = debounce_update(&b->material, hal_button_pressed(HAL_BUTTON_MATERIAL));
    /* An event is a change from released (0) to pressed (1) of the debounced level, once per press. */
    if (start_now && !start_before) {
        b->start_event = true;
    }
    if (material_now && !material_before) {
        b->material_event = true;
    }
}

bool buttons_take_start(buttons_t *b) {
    bool e = b->start_event;
    b->start_event = false;
    return e;
}

bool buttons_take_material(buttons_t *b) {
    bool e = b->material_event;
    b->material_event = false;
    return e;
}
