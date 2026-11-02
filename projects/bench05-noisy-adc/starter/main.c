/* Bench lab 5: the noisy ADC.
 *
 * A potentiometer's wiper is on GP27 (ADC1), and GP28 (ADC2) is wired to AGND as a zero
 * reference. Every 2 s the program takes BLOCK readings of the wiper and prints their spread:
 * minimum, maximum and standard deviation, in ADC codes. In Wokwi the spread is 0: the
 * simulated ADC returns the same code every time. On a Pico 2 it is several codes.
 *
 * TODO(learner): measure the spread on the board first. Then try the three remedies in the
 * Pico 2 datasheet, section 5.3, one at a time, and record the sd after each.
 */
#include <math.h>
#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/adc.h"

#define POT_PIN       27u     // ADC1
#define ZERO_PIN      28u     // ADC2, wired to AGND
#define POT_INPUT     1u
#define ZERO_INPUT    2u
#define SMPS_PS_PIN   23u     // Pico 2: SMPS power-save control (datasheet section 3.1)
#define BLOCK         256u    // values per statistics block
#define OVERSAMPLE    1u      // conversions averaged per value; 1 = no averaging

static float read_value(unsigned input) {
    adc_select_input(input);
    uint32_t sum = 0;
    for (unsigned i = 0; i < OVERSAMPLE; i++) {
        sum += adc_read();
    }
    return (float)sum / OVERSAMPLE;
}

static void report(void) {
    float min = 1e9f, max = -1e9f, sum = 0, sum_sq = 0;
    for (unsigned i = 0; i < BLOCK; i++) {
        float v = read_value(POT_INPUT);
        min = fminf(min, v);
        max = fmaxf(max, v);
        sum += v;
        sum_sq += v * v;
    }
    float mean = sum / BLOCK;
    float sd = sqrtf(fmaxf(sum_sq / BLOCK - mean * mean, 0.0f));
    float zero = read_value(ZERO_INPUT);
    printf("BENCH5 x%u: mean=%.1f min=%.1f max=%.1f sd=%.2f codes; zero channel=%.1f; corrected=%.1f\n",
           OVERSAMPLE, mean, min, max, sd, zero, mean - zero);
}

int main(void) {
    stdio_init_all();
    (void)SMPS_PS_PIN;                 // TODO(learner): remedy 1 goes here
    adc_init();
    adc_gpio_init(POT_PIN);            // analog pins: digital input off (datasheet section 12.4.3)
    adc_gpio_init(ZERO_PIN);

    for (bool first = true;; first = false) {
        report();
        if (first) {
            printf("BENCH5 report done\n");
        }
        sleep_ms(2000);
    }
}
