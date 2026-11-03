#include <stdint.h>
#include <stdio.h>
#include "pico/stdlib.h"

/*
 * The Pico drives a 74HC595 serial-in, parallel-out shift register, which lights 8 LEDs.
 *
 *   DS    (serial data)   <- GP2   one bit per SHCP pulse
 *   SHCP  (shift clock)   <- GP3   rising edge shifts DS into the register
 *   STCP  (latch clock)   <- GP4   rising edge copies the register to Q0..Q7
 *   MR, OE                 fixed: MR high (no reset), OE low (outputs enabled)
 *
 * Two clocks are the point: the shift clock fills the register, the latch clock shows the
 * whole byte at once, so the LEDs never flicker while a new byte is being shifted in.
 */

#define PIN_DS        2     // serial data
#define PIN_SHCP      3     // shift clock
#define PIN_STCP      4     // storage (latch) clock
#define PULSE_US      10    // width of each clock pulse; the 74HC595 needs only a short pulse
#define STEP_MS       150   // time each pattern stays on screen

// TODO(learner): send 8 bits of value, most significant bit first. For each bit:
//   1. put the bit on PIN_DS,
//   2. make a rising edge on PIN_SHCP (high, then low), with PULSE_US between the steps.
// The first bit sent ends up in Q7 after 8 shifts, so bit n of the value lights Qn.
static void shift_out_msb_first(uint8_t value) {
    (void)value;
}

// TODO(learner): copy the shift register to the outputs. Make one rising edge on PIN_STCP.
static void latch_outputs(void) {
}

static void show(uint8_t pattern) {
    shift_out_msb_first(pattern);
    latch_outputs();
    printf("LEDS=0x%02X\n", pattern);
}

int main(void) {
    stdio_init_all();

    gpio_init(PIN_DS);
    gpio_set_dir(PIN_DS, GPIO_OUT);
    gpio_init(PIN_SHCP);
    gpio_set_dir(PIN_SHCP, GPIO_OUT);
    gpio_init(PIN_STCP);
    gpio_set_dir(PIN_STCP, GPIO_OUT);

    while (true) {
        // A chase: one LED at a time, from Q0 to Q7.
        for (int i = 0; i < 8; i++) {
            show((uint8_t)(1u << i));
            sleep_ms(STEP_MS);
        }
        // A pattern with alternate LEDs on, then all off.
        show(0xA5);
        sleep_ms(STEP_MS * 4);
        show(0x00);
        sleep_ms(STEP_MS * 2);
        // TODO(learner): once the LEDs show the chase, then 0xA5, then all off, print "SHIFT OK" here.
    }
}
