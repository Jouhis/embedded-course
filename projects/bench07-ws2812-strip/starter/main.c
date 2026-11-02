/* Bench lab 7: the flaky LED strip.
 *
 * Eight WS2812 LEDs on GP2. The PIO program in ws2812.pio makes the 800 kHz waveform; this file
 * only packs colours and feeds the FIFO. The test cycles the whole strip through red, green,
 * blue and white, one second each, so a wrong colour or a flickering pixel is easy to see.
 *
 * The firmware is the same in Wokwi and on the bench. What differs is the wiring: a WS2812B
 * powered from 5 V needs a data high of at least 0.7 x VDD = 3.5 V (WS2812B datasheet,
 * electrical characteristics), and a Pico 2 pin gives at most 3.3 V. The fix is a 74HCT125
 * buffer powered from 5 V between GP2 and DIN (its input high threshold is 2 V: TI SN74HCT125
 * datasheet, section 5.2).
 */
#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/pio.h"
#include "ws2812.pio.h"

#define DATA_PIN    2u
#define NUM_PIXELS  8u
#define BIT_HZ      800000.0f   // WS2812 data rate
#define RESET_US    300u        // low for >= 50 us latches the colours (datasheet "RES"); 300 us is a wide margin

/* The WS2812 takes green first, then red, then blue, 8 bits each, most significant bit first.
 * The PIO shifts left from bit 31, so the 24 bits go in the top of the word. */
static uint32_t grb(uint8_t r, uint8_t g, uint8_t b) {
    /* TODO(learner): pack the colour for the WS2812 (datasheet: "data transmission method").
     * This placeholder sends red in the first byte, which the strip reads as green. */
    return ((uint32_t)r << 24) | ((uint32_t)g << 16) | ((uint32_t)b << 8);
}

static void show_all(PIO pio, uint sm, uint32_t colour) {
    for (unsigned i = 0; i < NUM_PIXELS; i++) {
        pio_sm_put_blocking(pio, sm, colour);
    }
    sleep_us(RESET_US);
}

int main(void) {
    stdio_init_all();
    PIO pio = pio0;
    uint sm = pio_claim_unused_sm(pio, true);
    uint offset = pio_add_program(pio, &ws2812_program);
    ws2812_program_init(pio, sm, offset, DATA_PIN, BIT_HZ);

    // Quarter brightness: plenty to see, and 8 pixels at full white could draw about 0.5 A.
    const uint32_t colours[] = { grb(64, 0, 0), grb(0, 64, 0), grb(0, 0, 64), grb(64, 64, 64) };
    const char *names[] = { "red", "green", "blue", "white" };
    for (unsigned frame = 1;; frame++) {
        unsigned c = (frame - 1) % 4u;
        show_all(pio, sm, colours[c]);
        printf("BENCH7 frame %u: all %s\n", frame, names[c]);
        sleep_ms(1000);
    }
}
