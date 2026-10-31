#include <stdio.h>
#include "pico/stdlib.h"

/* A tiny event dispatcher. Each event has one handler, which is a function pointer.
 * Registering a callback means storing its address in a table; dispatching means
 * calling the address stored for that event. The same idea runs in the vector table:
 * an array of function pointers that the core jumps through on each exception. */

typedef enum {
    EV_TICK,
    EV_BUTTON,
    EV_COUNT          /* number of events: keep last */
} Event;

typedef void (*Handler)(Event ev);

static Handler handlers[EV_COUNT];   /* zero-initialised: every entry starts as NULL */

static void register_handler(Event ev, Handler h) {
    handlers[ev] = h;
}

static void dispatch(Event ev) {
    /* TODO(learner): this runs whatever address is in the table. Think about what the
     * table holds before anyone registers a handler for this event. */
    handlers[ev](ev);
}

static void on_tick(Event ev) {
    (void)ev;
    printf("tick\n");
}

int main(void) {
    stdio_init_all();

    register_handler(EV_TICK, on_tick);

    dispatch(EV_TICK);
    dispatch(EV_BUTTON);     /* no handler registered for the button */
    dispatch(EV_TICK);

    printf("done\n");        /* the expected final line */
    while (true) {
        sleep_ms(1000);
    }
}
