#include <math.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include "hardware/adc.h"
#include "pico/stdlib.h"

#define NTC_PIN         26      // GP26 = ADC0 (AINSEL 0): the thermistor divider output (Wokwi OUT)
#define POT_PIN         27      // GP27 = ADC1 (AINSEL 1): potentiometer wiper (Wokwi SIG)
#define NTC_INPUT       0       // adc_select_input() takes the AINSEL number, not the GPIO number
#define POT_INPUT       1
#define ADC_FULL_SCALE  1023    // TODO(learner): this is the 10-bit value from Wokwi's docs. The Pico ADC is 12-bit.
#define ADC_VREF        3.3f    // volts: ADC_AVDD is a nominal 3.3 V (RP2040 datasheet, Table 591)
#define ADC_CODES       4096.0f // 2^12
#define OVERSAMPLE      1       // TODO(learner): set this to 16 once read_averaged() averages
#define NTC_BETA        3950.0f
#define T0_KELVIN       298.15f

// TODO(learner): this takes one conversion. Make it take OVERSAMPLE conversions, add them
// up in a uint32_t, and return the average. Explain in a comment why the sum is 32 bits.
static uint16_t read_averaged(uint input) {
    adc_select_input(input);
    return adc_read();
}

static float ntc_celsius(uint16_t raw) {
    if (raw == 0 || raw >= ADC_FULL_SCALE) {
        return NAN;
    }
    float inv_t = logf(1.0f / ((float)ADC_FULL_SCALE / (float)raw - 1.0f)) / NTC_BETA
                  + 1.0f / T0_KELVIN;
    return 1.0f / inv_t - 273.15f;
}

int main(void) {
    stdio_init_all();
    adc_init();
    adc_gpio_init(NTC_PIN);
    adc_gpio_init(POT_PIN);

    bool announced = false;
    while (true) {
        uint16_t ntc_raw = read_averaged(NTC_INPUT);
        uint16_t pot_raw = read_averaged(POT_INPUT);
        float celsius = ntc_celsius(ntc_raw);
        float pot_volts = pot_raw * ADC_VREF / ADC_CODES;

        // TODO(learner): once ntc_raw is correct, the first line is the check: print "ADC OK" once.
        if (!announced) {
            announced = true;
        }
        printf("ntc raw=%u T=%.1f C  pot raw=%u V=%.3f\n",
               ntc_raw, celsius, pot_raw, pot_volts);
        sleep_ms(500);
    }
}
