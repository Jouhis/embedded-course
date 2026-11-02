/* Bench lab 17: mains hum on the ADC.
 *
 * GP26 (ADC0) has a 30 cm wire on it and nothing else, plus a 1 Mohm resistor to GND so the
 * input sits near 0 V. The wire is an antenna for the electric field of the mains wiring in the
 * room, so on the bench the readings carry a 50 Hz (or 60 Hz) wave. In Wokwi the input is clean.
 *
 * The program samples at 20 samples per mains period (1000 Hz for 50 Hz mains), and once a
 * second prints the peak-to-peak size of three signals:
 *   raw    the ADC codes as read;
 *   iir    lesson 106's exponential moving average, k = 3 (a time constant of about 8 samples);
 *   ma20   a moving average whose window you choose (TODO below).
 * It also counts upward crossings of the block's mean, an estimate of the hum frequency.
 */
#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/adc.h"
#include "filters.h"

#define ADC_PIN        26u
#define ADC_INPUT      0u
#define MAINS_HZ       50u          // 60 in the Americas and parts of Asia
#define PER_PERIOD     20u          // samples per mains period
#define SAMPLE_HZ      (MAINS_HZ * PER_PERIOD)
#define SAMPLE_US      (1000000u / SAMPLE_HZ)
#define WARMUP         100u         // samples before the filters have settled
#define IIR_K          3u
#define HYSTERESIS     8          // codes: noise smaller than this does not count as a crossing

typedef struct { int32_t min, max; } span_t;
static void span_reset(span_t *s) { s->min = INT32_MAX; s->max = INT32_MIN; }
static void span_add(span_t *s, int32_t v) {
    if (v < s->min) s->min = v;
    if (v > s->max) s->max = v;
}

int main(void) {
    stdio_init_all();
    adc_init();
    adc_gpio_init(ADC_PIN);
    adc_select_input(ADC_INPUT);

    moving_avg_t ma;
    ema_t iir;
    /* TODO(learner): the window that cancels the hum. Try 16 first and compare. */
    ma_init(&ma, 16u);
    ema_init(&iir, IIR_K);
    printf("BENCH17 sampling at %u Hz (%u samples per %u Hz period)\n", SAMPLE_HZ, PER_PERIOD, MAINS_HZ);

    absolute_time_t next = get_absolute_time();
    int32_t last_mean = -1;
    for (unsigned block = 0;; block++) {
        span_t raw, f_iir, f_ma;
        span_reset(&raw); span_reset(&f_iir); span_reset(&f_ma);
        int64_t sum = 0;
        unsigned crossings = 0;
        bool above = false;
        for (unsigned i = 0; i < SAMPLE_HZ; i++) {     // one second
            next = delayed_by_us(next, SAMPLE_US);
            sleep_until(next);                         // fixed rate: no drift from print time
            int32_t x = (int32_t)adc_read();
            int32_t y_iir = ema_update(&iir, x);
            int32_t y_ma = ma_update(&ma, x);
            sum += x;
            if (block == 0 && i < WARMUP) {
                continue;
            }
            span_add(&raw, x); span_add(&f_iir, y_iir); span_add(&f_ma, y_ma);
            if (last_mean >= 0) {          // count a crossing only when x clears the band
                if (!above && x > last_mean + HYSTERESIS) {
                    above = true;
                    crossings++;
                } else if (above && x < last_mean - HYSTERESIS) {
                    above = false;
                }
            }
        }
        last_mean = (int32_t)(sum / SAMPLE_HZ);
        printf("BENCH17 block %u: mean=%ld p-p raw=%ld iir=%ld ma20=%ld codes; ~%u Hz\n", block + 1,
               (long)last_mean, (long)(raw.max - raw.min), (long)(f_iir.max - f_iir.min),
               (long)(f_ma.max - f_ma.min), crossings);
    }
}
