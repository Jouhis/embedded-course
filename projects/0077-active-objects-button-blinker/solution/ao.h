/* ao.h: a minimal active-object framework (lesson 77).
 *
 * An active object (AO) owns its state and one event queue. Other code never touches the
 * state; it posts an event to the queue. ao_dispatch_all() takes one event from a queue and
 * runs the AO's handler to completion before it takes the next one. Nothing preempts a handler,
 * so a handler needs no locks on a single core. This is the pattern of QP/C (state-machine.com),
 * in about 80 lines, so you can read all of it. */
#ifndef AO_H
#define AO_H

#include <stdbool.h>
#include <stdint.h>

#define AO_QUEUE_SIZE 8u   /* power of two; one slot stays empty, so a queue holds 7 events */
#define AO_MAX        4u   /* how many active objects the program may start */

/* The signals this program uses. A signal is a name for an event, one bit each in a subscription mask. */
enum { SIG_TICK = 0, SIG_PRESS = 1 };

typedef struct { uint8_t sig; } event_t;

typedef struct ao ao_t;
typedef void (*ao_handler_t)(ao_t *me, const event_t *e);

struct ao {
    ao_handler_t handler;           /* the state machine: called once per event */
    uint32_t subscribed;            /* bit n set = this AO receives signal n from ao_publish() */
    event_t queue[AO_QUEUE_SIZE];   /* ring buffer, as in lesson 70 */
    uint8_t head;                   /* next free slot: written by the poster */
    uint8_t tail;                   /* next event to take: written by the dispatcher */
};

#define AO_SUB(sig) (1u << (sig))

void ao_start(ao_t *me, ao_handler_t handler, uint32_t subscribed);
bool ao_post(ao_t *me, event_t e);      /* false when the queue is full: the event is dropped */
void ao_publish(event_t e);             /* post to every AO subscribed to e.sig */
void ao_dispatch_all(void);             /* run every queued event, one handler call at a time */
uint32_t ao_dropped(void);              /* events lost to full queues: check it while debugging */

#endif /* AO_H */
