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

/* A static inline function instead of a macro. The argument is evaluated once, and
 * it follows the normal rules of C: square(2 + 1) is square(3), which is 9.
 * The macro SQUARE(x) x * x expanded to 2 + 1 * 2 + 1, which is 5. */
static inline int square(int x) {
    return x * x;
}

int main(void) {
    stdio_init_all();
    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);

    printf("MULTI-TARGET OK board=%s square=%d event=%s(%d)\n",
           BOARD_NAME, square(2 + 1), event_names[EV_TIMEOUT], (int)EV_TIMEOUT);

    while (true) {
        gpio_xor_mask(1u << LED_PIN);
        sleep_ms(500);
    }
}
