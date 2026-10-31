#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include "filters.h"
#include "hardware/adc.h"
#include "pico/stdlib.h"

#define POT_PIN       26     // GP26 = ADC0 (AINSEL 0): the potentiometer wiper
#define POT_INPUT     0      // adc_select_input() takes the AINSEL number, not the GPIO number
#define SAMPLE_MS     50     // one sample every 50 ms: 20 samples per second
#define MA_WINDOW     8      // moving average over the last 8 samples
#define EMA_SHIFT     3      // alpha = 1/8: the IIR time constant is about 7.5 samples
#define SPIKE_EVERY   25     // add a spike to every 25th sample, like a loose wire or EMI
#define SPIKE_COUNTS  600    // size of each spike, in ADC codes
#define ADC_MAX       4095   // 12-bit ADC: readings are 0 to 4095

// Wokwi's potentiometer is perfectly steady, so real noise never appears in the simulator.
// This linear congruential generator adds pseudo-random noise of about +/-16 codes, standing in
// for the noise a real sensor shows. It is seeded, so every run prints the same sequence.
static uint32_t lcg_state = 12345u;

static int32_t noise_codes(void) {
    lcg_state = lcg_state * 1103515245u + 12345u;
    return (int32_t)((lcg_state >> 16) & 0x1Fu) - 16;   // 0..31 minus 16: -16 to +15
}

int main(void) {
    stdio_init_all();
    adc_init();
    adc_gpio_init(POT_PIN);
    adc_select_input(POT_INPUT);

    median3_t med;
    moving_avg_t ma;
    ema_t ema;
    median3_init(&med);
    ma_init(&ma, MA_WINDOW);
    ema_init(&ema, EMA_SHIFT);

    // TODO(learner): print "FILTER OK" once, after the moving average's window is full (MA_WINDOW samples).
    printf("ms,raw,median,ma8,ema\n");   // CSV header: the Serial Plotter and any spreadsheet read this

    uint32_t sample = 0;
    while (true) {
        int32_t raw = (int32_t)adc_read() + noise_codes();
        if (sample % SPIKE_EVERY == 0) {
            raw += SPIKE_COUNTS;
        }
        if (raw < 0) raw = 0;                 // keep the value inside the ADC range
        if (raw > ADC_MAX) raw = ADC_MAX;

        // TODO(learner): feed raw through median3_update, then ma_update, then ema_update.
        // Until you do, the three columns just repeat the raw value.
        int32_t m = raw;
        int32_t a = raw;
        int32_t e = raw;

        printf("%lu,%ld,%ld,%ld,%ld\n",
               (unsigned long)(sample * SAMPLE_MS), (long)raw, (long)m, (long)a, (long)e);
        sample++;
        sleep_ms(SAMPLE_MS);
    }
}
