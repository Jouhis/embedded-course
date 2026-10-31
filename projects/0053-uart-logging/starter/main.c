#include <stdint.h>
#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/clocks.h"
#include "hardware/uart.h"

#define LOG_LEVEL_ERROR  0
#define LOG_LEVEL_WARN   1
#define LOG_LEVEL_INFO   2
#define LOG_LEVEL_DEBUG  3
#define LOG_LEVEL        LOG_LEVEL_INFO   // messages above this level are dropped

#define BAUD_RATE        115200u

static char log_tag(int level) {
    static const char tags[] = {'E', 'W', 'I', 'D'};
    return tags[level];
}

// TODO(learner): write LOG(level, ...). Print "[E] ", "[W] ", "[I] " or "[D] " (from log_tag),
// then the printf-style message and a newline. Print nothing if level > LOG_LEVEL.
// Put the check first, so the arguments are not evaluated for dropped messages.
#define LOG(level, ...) ((void)0)

// Datasheet 4.2.3.2.1: UARTCLK / (16 * baud) = integer part + fractional part.
// The UART stores the fraction in 6 bits, so work in 64ths.
static void print_baud_divisor(uint32_t clk_hz, uint32_t baud) {
    // TODO(learner): compute total64 = round(clk_hz * 4 / baud) with integer maths only
    // (add baud/2 before dividing, which rounds). Then ibrd = total64 / 64 and fbrd = total64 % 64.
    // LOG(LOG_LEVEL_INFO, ...) the clock, the baud rate, ibrd and fbrd.
    (void)clk_hz;
    (void)baud;
}

int main(void) {
    stdio_init_all();   // sets up UART0 on GP0 (TX) and GP1 (RX) at 115200 baud

    printf("UART log starter\n");
    print_baud_divisor(clock_get_hz(clk_peri), BAUD_RATE);

    uint32_t tick = 0;
    while (true) {
        tick++;
        LOG(LOG_LEVEL_INFO, "tick %lu", (unsigned long)tick);
        LOG(LOG_LEVEL_DEBUG, "this line is filtered out at INFO");
        if (tick % 5u == 0u) {
            LOG(LOG_LEVEL_WARN, "every fifth tick is a warning");
        }
        sleep_ms(1000);
    }
}
