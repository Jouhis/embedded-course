#include <stdio.h>
#include "pico/stdlib.h"
#include "board.h"

/* Event names come from one list (an X-macro). Add a name in one place, and the enum
 * and the string table both get it. No two lists can drift apart. */
#define EVENT_LIST(X)  \
    X(OK)              \
    X(TIMEOUT)         \
    X(BAD_CRC)

#define AS_ENUM(name)   EV_##name,
#define AS_STRING(name) #name,

typedef enum { EVENT_LIST(AS_ENUM) EV_COUNT } Event;
static const char *const event_names[] = { EVENT_LIST(AS_STRING) };

/* TODO(learner): is SQUARE safe for every argument? Test SQUARE(2 + 1) and compare
 * it with the value you expect. Then decide what should replace this macro. */
#define SQUARE(x) x * x

int main(void) {
    stdio_init_all();
    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);

    printf("board=%s\n", BOARD_NAME);
    printf("square(2+1)=%d expected 9\n", SQUARE(2 + 1));
    printf("event %d is %s\n", (int)EV_TIMEOUT, event_names[EV_TIMEOUT]);

    while (true) {
        gpio_xor_mask(1u << LED_PIN);
        sleep_ms(500);
    }
}
