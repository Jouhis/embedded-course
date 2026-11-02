/* debounce.h: an integrator debounce (lesson 52) as a plain C module with no hardware in it.
 *
 * The caller reads the pin and passes the raw level in. The module returns the stable level.
 * The stable level changes only after DEBOUNCE_MAX samples in a row agree with the new level,
 * so a bounce shorter than that never reaches the output. */
#ifndef DEBOUNCE_H
#define DEBOUNCE_H

#include <stdint.h>

#define DEBOUNCE_MAX 3u          /* consecutive agreeing samples needed to change the output */

typedef struct {
    uint8_t count;               /* the integrator: 0 .. DEBOUNCE_MAX, never beyond */
    uint8_t stable;              /* the output: 1 = pressed, 0 = released */
} debounce_t;

void debounce_init(debounce_t *d);                              /* starts released */
uint8_t debounce_update(debounce_t *d, uint8_t raw_pressed);    /* one sample in, stable level out */

#endif /* DEBOUNCE_H */
