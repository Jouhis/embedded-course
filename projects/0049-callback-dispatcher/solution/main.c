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
static unsigned handled_count;
static unsigned ignored_count;

static void register_handler(Event ev, Handler h) {
    if ((unsigned)ev < EV_COUNT) {   /* reject an out-of-range event before indexing */
        handlers[ev] = h;
    }
}

static void dispatch(Event ev) {
    if ((unsigned)ev >= EV_COUNT) {
        ignored_count++;
        return;
    }
    /* A NULL entry means nobody registered a handler. Calling it would jump to address 0,
     * so check first and count the event as ignored. */
    if (handlers[ev] == NULL) {
        ignored_count++;
        return;
    }
    handlers[ev](ev);
    handled_count++;
}

static void on_tick(Event ev) {
    (void)ev;
    printf("tick\n");
}

int main(void) {
    stdio_init_all();

    register_handler(EV_TICK, on_tick);

    dispatch(EV_TICK);
    dispatch(EV_BUTTON);     /* no handler registered for the button: ignored */
    dispatch(EV_TICK);

    printf("DISPATCH OK handled=%u ignored=%u\n", handled_count, ignored_count);
    while (true) {
        sleep_ms(1000);
    }
}
