#include <stdint.h>
#include <stdio.h>
#include "pico/stdlib.h"
#include "ao.h"
#include "button_ao.h"
#include "blinker_ao.h"

// EXPECT: AO OK

#define TICK_MS 10u

// main.c no longer knows about the button or the LED. It makes a 10 ms tick, publishes it,
// and runs the dispatcher. Everything else happens inside the two active objects.
int main(void) {
    stdio_init_all();
    button_ao_init();
    blinker_ao_init();
    puts("AO OK");

    uint32_t next = to_ms_since_boot(get_absolute_time()) + TICK_MS;
    while (true) {
        uint32_t now = to_ms_since_boot(get_absolute_time());
        if ((int32_t)(now - next) >= 0) {     /* wrap-safe comparison, as in lesson 73 */
            next += TICK_MS;
            ao_publish((event_t){ .sig = SIG_TICK });
        }
        ao_dispatch_all();
    }
}
