/* buttons.h: the two buttons with debouncing (lesson 116). Each press produces one event. */
#ifndef BUTTONS_H
#define BUTTONS_H

#include <stdbool.h>
#include "debounce.h"

typedef struct {
    debounce_t start;
    debounce_t material;
    bool start_event;      /* set on a confirmed press, cleared by buttons_take_*() */
    bool material_event;
} buttons_t;

void buttons_init(buttons_t *b);
/* Sample both buttons once. Call at a fixed rate (20 ms in the superloop: lesson 116). */
void buttons_sample(buttons_t *b);
bool buttons_take_start(buttons_t *b);      /* true once per press */
bool buttons_take_material(buttons_t *b);

#endif /* BUTTONS_H */
