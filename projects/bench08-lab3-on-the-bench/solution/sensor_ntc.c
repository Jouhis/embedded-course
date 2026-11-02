/* sensor_ntc.c: Lab 3's sensor interface (sensor.h), implemented with an NTC thermistor.
 *
 * The MYS-1 of lessons 63 and Lab 3 is a custom Wokwi chip: it exists only in the simulator.
 * On the bench the same interface is served by a 10 kohm NTC thermistor in a divider on ADC0
 * (GP26): 10 kohm from 3V3 to GP26, the NTC from GP26 to GND. That is the wiring of Wokwi's
 * wokwi-ntc-temperature-sensor, so the conversion below is lesson 58's, unchanged.
 * Nothing above this file changes: main.c, ui.c and display.c are Lab 3's.
 *
 * sensor_init() still brings up I2C0, because the OLED shares the init order of Lab 3.
 */
#include <math.h>
#include "hardware/adc.h"
#include "hardware/gpio.h"
#include "hardware/i2c.h"
#include "pico/stdlib.h"
#include "sensor.h"

#define BUS             i2c0
#define PIN_SDA         4u
#define PIN_SCL         5u
#define BUS_BAUD_HZ     400000u
#define NTC_PIN         26u          // ADC0
#define NTC_INPUT       0u
#define SAMPLE_MS       500u         // one new sample every 500 ms, like the MYS-1
#define OVERSAMPLE      16u          // bench lab 5: averaging shrinks the ADC noise
#define FULL_SCALE      4095
#define OPEN_OR_SHORT   16           // codes from either end: the NTC is missing or shorted
#define BETA            3950.0f      // check your thermistor's datasheet: 3380 and 3950 are common
#define T0_KELVIN       298.15f      // 25 C, where the NTC is 10 kohm

static uint32_t next_sample_ms;

bool sensor_init(void) {
    i2c_init(BUS, BUS_BAUD_HZ);
    gpio_set_function(PIN_SDA, GPIO_FUNC_I2C);
    gpio_set_function(PIN_SCL, GPIO_FUNC_I2C);
    gpio_pull_up(PIN_SDA);
    gpio_pull_up(PIN_SCL);
    adc_init();
    adc_gpio_init(NTC_PIN);
    next_sample_ms = to_ms_since_boot(get_absolute_time());
    return true;
}

sensor_status_t sensor_poll(float *celsius) {
    uint32_t now = to_ms_since_boot(get_absolute_time());
    if ((int32_t)(now - next_sample_ms) < 0) {
        return SENSOR_IDLE;              // not time for a new sample: return at once
    }
    next_sample_ms += SAMPLE_MS;

    adc_select_input(NTC_INPUT);
    uint32_t sum = 0;
    for (unsigned i = 0; i < OVERSAMPLE; i++) {
        sum += adc_read();               // about 2 us each: 16 reads are about 32 us
    }
    int raw = (int)(sum / OVERSAMPLE);
    if (raw < OPEN_OR_SHORT || raw > FULL_SCALE - OPEN_OR_SHORT) {
        return SENSOR_ERROR;             // a broken wire shows as an error, not as -40 or 150 C
    }
    float inv_t = logf(1.0f / ((float)FULL_SCALE / (float)raw - 1.0f)) / BETA + 1.0f / T0_KELVIN;
    *celsius = 1.0f / inv_t - 273.15f;
    return SENSOR_NEW_SAMPLE;
}
