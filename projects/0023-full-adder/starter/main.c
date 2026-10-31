#include <stdbool.h>
#include <stdio.h>
#include "pico/stdlib.h"

/*
 * The Pico is the test bench for a full adder. It drives the three inputs A, B and CIN,
 * reads the sum and the carry out, and checks all eight rows against integer addition.
 *
 * A full adder adds three bits: a + b + cin = 2 * cout + sum.
 */

#define PIN_A       2     // GPIO output: input A
#define PIN_B       3     // GPIO output: input B
#define PIN_CIN     4     // GPIO output: carry in
#define PIN_SUM     10    // GPIO input: sum output
#define PIN_COUT    11    // GPIO input: carry-out output
#define SETTLE_US   100   // simulated gates need a moment to settle
#define REPEAT_MS   2000  // how often the table is printed again

// Expected results, computed the way a programmer would: with ordinary integer arithmetic.
static bool expected_sum(int a, int b, int cin) {
    return (a + b + cin) & 1;       // the low bit of the total is the sum
}

static bool expected_cout(int a, int b, int cin) {
    return (a + b + cin) >> 1;      // the high bit of the total is the carry out
}

static bool check_row(int a, int b, int cin) {
    gpio_put(PIN_A, a);
    gpio_put(PIN_B, b);
    gpio_put(PIN_CIN, cin);
    sleep_us(SETTLE_US);
    bool sum = gpio_get(PIN_SUM);
    bool cout = gpio_get(PIN_COUT);
    bool ok = (sum == expected_sum(a, b, cin)) && (cout == expected_cout(a, b, cin));
    printf("A=%d B=%d CIN=%d -> SUM=%d COUT=%d %s\n", a, b, cin, sum, cout, ok ? "ok" : "WRONG");
    return ok;
}

static void run_truth_table(void) {
    bool all_ok = true;
    for (int a = 0; a < 2; a++) {
        for (int b = 0; b < 2; b++) {
            for (int cin = 0; cin < 2; cin++) {
                all_ok = check_row(a, b, cin) && all_ok;
            }
        }
    }
    printf(all_ok ? "FULL ADDER OK\n" : "FULL ADDER FAILED\n");
}

int main(void) {
    stdio_init_all();

    gpio_init(PIN_A);
    gpio_set_dir(PIN_A, GPIO_OUT);
    gpio_init(PIN_B);
    gpio_set_dir(PIN_B, GPIO_OUT);
    gpio_init(PIN_CIN);
    gpio_set_dir(PIN_CIN, GPIO_OUT);
    gpio_init(PIN_SUM);
    gpio_set_dir(PIN_SUM, GPIO_IN);
    gpio_init(PIN_COUT);
    gpio_set_dir(PIN_COUT, GPIO_IN);

    while (true) {
        // The expected results above are complete. The task is the circuit in diagram.json:
        // one wire is missing, so one gate input floats. Find it and add the wire.
        run_truth_table();
        sleep_ms(REPEAT_MS);
    }
}
