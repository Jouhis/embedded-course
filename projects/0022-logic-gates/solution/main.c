// EXPECT: TRUTH TABLE OK
#include <stdbool.h>
#include <stdio.h>
#include "pico/stdlib.h"

/*
 * The Pico is the test bench. It drives the two inputs of the gate circuit in diagram.json,
 * reads the output, and compares every row of the truth table with the expected function.
 *
 * Circuit: OUT = (A OR B) AND NOT (A AND B), which is exclusive OR.
 */

#define PIN_A       2     // GPIO output: drives gate input A
#define PIN_B       3     // GPIO output: drives gate input B
#define PIN_OUT     10    // GPIO input: reads the circuit output
#define SETTLE_US   100   // the simulated gates need a moment to settle; real gates take nanoseconds
#define REPEAT_MS   2000  // how often the table is printed again

// The function the circuit must implement. Exclusive OR is 1 when the inputs differ.
static bool expected_out(bool a, bool b) {
    return a != b;
}

// Drive one row, read the output and print the result. Returns true if the row matches.
static bool check_row(bool a, bool b) {
    gpio_put(PIN_A, a);
    gpio_put(PIN_B, b);
    sleep_us(SETTLE_US);
    bool out = gpio_get(PIN_OUT);
    bool ok = (out == expected_out(a, b));
    printf("A=%d B=%d -> OUT=%d %s\n", a, b, out, ok ? "ok" : "WRONG");
    return ok;
}

static void run_truth_table(void) {
    bool all_ok = true;
    for (int a = 0; a < 2; a++) {
        for (int b = 0; b < 2; b++) {
            all_ok = check_row(a, b) && all_ok;
        }
    }
    printf(all_ok ? "TRUTH TABLE OK\n" : "TRUTH TABLE FAILED\n");
}

int main(void) {
    stdio_init_all();

    gpio_init(PIN_A);
    gpio_set_dir(PIN_A, GPIO_OUT);
    gpio_init(PIN_B);
    gpio_set_dir(PIN_B, GPIO_OUT);
    gpio_init(PIN_OUT);
    gpio_set_dir(PIN_OUT, GPIO_IN);

    while (true) {
        run_truth_table();
        sleep_ms(REPEAT_MS);
    }
}
