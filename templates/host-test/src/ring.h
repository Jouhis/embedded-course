#ifndef RING_H
#define RING_H
#include <stdbool.h>
#include <stdint.h>

#define RING_SIZE 8u   /* must be a power of two */

typedef struct {
    uint8_t buf[RING_SIZE];
    uint8_t head;   /* next slot to write */
    uint8_t tail;   /* next slot to read */
} ring_t;

void ring_init(ring_t *r);
bool ring_put(ring_t *r, uint8_t value);
bool ring_get(ring_t *r, uint8_t *value);

#endif
