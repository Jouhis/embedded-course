#include "ring.h"

void ring_init(ring_t *r) { r->head = 0; r->tail = 0; }

bool ring_put(ring_t *r, uint8_t value) {
    uint8_t next = (uint8_t)((r->head + 1u) & (RING_SIZE - 1u));
    if (next == r->tail) {
        return false;            /* full: one slot always stays empty */
    }
    r->buf[r->head] = value;
    r->head = next;
    return true;
}

bool ring_get(ring_t *r, uint8_t *value) {
    if (r->head == r->tail) {
        return false;            /* empty */
    }
    *value = r->buf[r->tail];
    r->tail = (uint8_t)((r->tail + 1u) & (RING_SIZE - 1u));
    return true;
}
