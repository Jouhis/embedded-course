#include <stdbool.h>
#include <stdio.h>
#include "pico/stdlib.h"

/*
 * The Pico is the test bench for a D flip-flop. It drives D and CLK, and reads Q.
 * A D flip-flop copies D to Q only on the rising edge of CLK. Between edges, Q holds.
 * The test checks both behaviours: a change of D with CLK low must not reach Q,
 * and a rising edge must copy D to Q.
 */

#define PIN_D        2     // GPIO output: data input D
#define PIN_CLK      3     // GPIO output: clock input CLK
#define PIN_Q        10    // GPIO input: output Q
#define HALF_CLK_US  200   // time CLK stays high, and time it stays low

// TODO(learner): make one clock cycle with a rising edge. Start with CLK low, drive it high
// (the rising edge), then drive it low again. Use gpio_put() and sleep_us(), as the comments say.
static void pulse_clock(void) {
}

static bool check(const char *what, bool got, bool want) {
    printf("%s -> Q=%d %s\n", what, got, got == want ? "ok" : "WRONG");
    return got == want;
}

static void run_test(void) {
    bool all_ok = true;

    // Load a known state first: clock a 0 in, so the starting value of Q does not matter.
    gpio_put(PIN_D, 0);
    pulse_clock();
    all_ok = check("load D=0 with a clock edge", gpio_get(PIN_Q), false) && all_ok;

    const bool sequence[] = {1, 0, 1, 1, 0};
    bool q = false;   // what Q should hold before each test step
    for (unsigned i = 0; i < sizeof sequence / sizeof sequence[0]; i++) {
        bool d = sequence[i];

        // Step 1: change D while CLK is low. Q must not change (no edge, so no copy).
        gpio_put(PIN_D, d);
        sleep_us(HALF_CLK_US);
        all_ok = check("D changed, CLK low (must hold)", gpio_get(PIN_Q), q) && all_ok;

        // Step 2: a rising edge copies D to Q.
        pulse_clock();
        q = d;
        all_ok = check("rising edge (must copy D)", gpio_get(PIN_Q), q) && all_ok;
    }

    printf(all_ok ? "D FLIP-FLOP OK\n" : "D FLIP-FLOP FAILED\n");
}

int main(void) {
    stdio_init_all();

    gpio_init(PIN_D);
    gpio_set_dir(PIN_D, GPIO_OUT);
    gpio_init(PIN_CLK);
    gpio_set_dir(PIN_CLK, GPIO_OUT);
    gpio_init(PIN_Q);
    gpio_set_dir(PIN_Q, GPIO_IN);

    while (true) {
        run_test();
        sleep_ms(2000);
    }
}
