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
#define ADC_FULL_SCALE  4095    // 12-bit ADC: codes 0 to 4095. Wokwi's docs formula uses 1023 (10-bit)
#define ADC_VREF        3.3f    // volts: ADC_AVDD, the ADC's reference, is 3.3 V on the Pico (RP2040 datasheet, section 4.9)
#define ADC_CODES       4096.0f // 2^12: the same factor the SDK's adc_console example uses
#define OVERSAMPLE      16      // readings averaged per output value
#define NTC_BETA        3950.0f // Wokwi part default; the thermistor's beta coefficient
#define T0_KELVIN       298.15f // 25 C in kelvin, the reference temperature of the beta equation

// Average OVERSAMPLE conversions of one input. Each conversion takes 96 ADC clock cycles
// (about 2 us at 48 MHz), so 16 reads cost about 32 us. Averaging N reads reduces random noise
// by about sqrt(N), which recovers resolution only while the noise is larger than one code.
static uint16_t read_averaged(uint input) {
    adc_select_input(input);
    uint32_t sum = 0;
    for (int i = 0; i < OVERSAMPLE; i++) {
        sum += adc_read();
    }
    return (uint16_t)(sum / OVERSAMPLE);
}

// Wokwi's NTC formula, from https://docs.wokwi.com/parts/wokwi-ntc-temperature-sensor, with the
// full-scale constant changed from 1023 to 4095 for the Pico's 12-bit ADC.
// The formula assumes the NTC is the lower resistor of the divider (between OUT and GND).
static float ntc_celsius(uint16_t raw) {
    // The formula divides by (full/raw - 1) and takes a log: raw 0 and raw full-scale are invalid.
    if (raw == 0 || raw >= ADC_FULL_SCALE) {
        return NAN;
    }
    float inv_t = logf(1.0f / ((float)ADC_FULL_SCALE / (float)raw - 1.0f)) / NTC_BETA
                  + 1.0f / T0_KELVIN;
    return 1.0f / inv_t - 273.15f;
}

int main(void) {
    stdio_init_all();
    adc_init();              // powers up the ADC and enables its clock (see lesson 58 explainer)
    adc_gpio_init(NTC_PIN);  // disables the pin's digital input so the analog level is not fought
    adc_gpio_init(POT_PIN);

    bool announced = false;
    while (true) {
        uint16_t ntc_raw = read_averaged(NTC_INPUT);
        uint16_t pot_raw = read_averaged(POT_INPUT);
        float celsius = ntc_celsius(ntc_raw);
        float pot_volts = pot_raw * ADC_VREF / ADC_CODES;   // code to volts: one code = 3.3 V / 4096

        if (!announced) {
            printf("ADC OK\n");   // EXPECT: ADC OK
            announced = true;
        }
        printf("ntc raw=%u T=%.1f C  pot raw=%u V=%.3f\n",
               ntc_raw, celsius, pot_raw, pot_volts);
        sleep_ms(500);
    }
}
