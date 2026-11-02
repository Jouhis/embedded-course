/* sensor_ntc.c: Lab 3's sensor interface (sensor.h), implemented with an NTC thermistor.
 *
 * The MYS-1 of lesson 63 and Lab 3 is a custom Wokwi chip: it exists only in the simulator.
 * On the bench the same interface is served by a 10 kohm NTC thermistor in a divider on ADC0
 * (GP26): 10 kohm from 3V3 to GP26, the NTC from GP26 to GND (the wiring of Wokwi's
 * wokwi-ntc-temperature-sensor, so lesson 58's conversion applies).
 * Nothing above this file should change: main.c, ui.c and display.c are Lab 3's.
 */
#include "hardware/gpio.h"
#include "hardware/i2c.h"
#include "pico/stdlib.h"
#include "sensor.h"

#define BUS             i2c0
#define PIN_SDA         4u
#define PIN_SCL         5u
#define BUS_BAUD_HZ     400000u

bool sensor_init(void) {
    /* Lab 3's init order: the sensor brings up I2C0, which the OLED shares. Keep that. */
    i2c_init(BUS, BUS_BAUD_HZ);
    gpio_set_function(PIN_SDA, GPIO_FUNC_I2C);
    gpio_set_function(PIN_SCL, GPIO_FUNC_I2C);
    gpio_pull_up(PIN_SDA);
    gpio_pull_up(PIN_SCL);
    /* TODO(learner): set up ADC0 on GP26. */
    return true;
}

sensor_status_t sensor_poll(float *celsius) {
    /* TODO(learner): return SENSOR_IDLE until 500 ms have passed since the last sample, then
     * read the NTC (averaged), convert it to degrees Celsius, and return SENSOR_NEW_SAMPLE.
     * Return SENSOR_ERROR if the reading says the thermistor is missing or shorted. */
    (void)celsius;
    return SENSOR_ERROR;
}
