/* ao.c: the framework. Single core, and every post and dispatch runs in the main loop, so
 * head and tail need no volatile and no lock. An ISR that posts would need both (lesson 57). */
#include "ao.h"

static ao_t *s_registry[AO_MAX];
static uint8_t s_count = 0;
static uint32_t s_dropped = 0;

void ao_start(ao_t *me, ao_handler_t handler, uint32_t subscribed) {
    me->handler = handler;
    me->subscribed = subscribed;
    me->head = 0;
    me->tail = 0;
    if (s_count < AO_MAX) {         /* the registry is fixed size; a missing AO shows as a missing line */
        s_registry[s_count++] = me;
    }
}

bool ao_post(ao_t *me, event_t e) {
    uint8_t next = (uint8_t)((me->head + 1u) & (AO_QUEUE_SIZE - 1u));
    if (next == me->tail) {
        s_dropped++;                /* full: one slot always stays empty */
        return false;
    }
    me->queue[me->head] = e;
    me->head = next;
    return true;
}

void ao_publish(event_t e) {
    for (uint8_t i = 0; i < s_count; i++) {
        if (s_registry[i]->subscribed & AO_SUB(e.sig)) {
            ao_post(s_registry[i], e);
        }
    }
}

static bool take(ao_t *me, event_t *out) {
    if (me->tail == me->head) {
        return false;              /* empty */
    }
    *out = me->queue[me->tail];
    me->tail = (uint8_t)((me->tail + 1u) & (AO_QUEUE_SIZE - 1u));
    return true;
}

void ao_dispatch_all(void) {
    for (uint8_t i = 0; i < s_count; i++) {
        event_t e;
        while (take(s_registry[i], &e)) {
            s_registry[i]->handler(s_registry[i], &e);   /* run to completion */
        }
    }
}

uint32_t ao_dropped(void) {
    return s_dropped;
}
