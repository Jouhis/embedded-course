#include <stdint.h>
#include <stdio.h>
#include "pico/stdlib.h"

/*
 * Sum the integers 1..n. Small on purpose, so the disassembly is short enough to read.
 *
 * noinline keeps sum_to as its own function with its own symbol, so you can find it in
 * `arm-none-eabi-objdump -d build/blink.elf`. Without it the compiler may fold the call
 * into main() and the function disappears from the listing.
 */
__attribute__((noinline))
uint32_t sum_to(uint32_t n) {
    uint32_t total = 0;
    for (uint32_t i = 1; i <= n; i++) {
        total += i;
    }
    return total;
}

int main(void) {
    stdio_init_all();

    /* The serial monitor shows this line, so you can tell the program ran. */
    uint32_t result = sum_to(100);
    printf("sum_to(100) = %lu\n", (unsigned long)result);

    while (true) {
        sleep_ms(1000);   /* nothing else to do: keep the CPU parked between prints */
    }
}
