/* hal_pico2.c: the Raspberry Pi Pico 2 board file for hal.h (bench lab 18).
 *
 * TODO(learner): implement every function of hal.h for the Pico 2, using the Pico SDK, so that
 * app/ and main.c build and run unchanged. Use this pin map (hal.h lists the Blue Pill's):
 *   GP26  ADC0        NTC divider (10 kOhm to 3V3, NTC to GND), 12-bit
 *   GP15  PWM7 B      heater: 1 kHz PWM, 0 to 1000 per mille
 *   GP16  GPIO out    fan
 *   GP14  GPIO in     start/stop button to GND, internal pull-up (active low)
 *   GP13  GPIO in     material button to GND, internal pull-up (active low)
 *   GP4   I2C0 SDA    SSD1306 OLED
 *   GP5   I2C0 SCL
 *   GP0   UART0 TX    serial log (printf, through stdio)
 * Work through the lab's parts in order: log and millis, buttons and fan, ADC, PWM, I2C.
 */
#include <stdio.h>
#include "pico/stdlib.h"
#include "hal.h"

void hal_init(void) {
    stdio_init_all();
}

void hal_log(const char *line) {
    puts(line);
}

uint16_t hal_adc_read_ntc(void) {
    return 0u;                            /* reads as a shorted NTC: the dryer reports a fault */
}

void hal_heater_set_permille(uint16_t permille) {
    (void)permille;
}

void hal_fan_set(uint8_t on) {
    (void)on;
}

uint8_t hal_button_pressed(hal_button_t button) {
    (void)button;
    return 0u;
}

uint32_t hal_millis(void) {
    return to_ms_since_boot(get_absolute_time());
}

int hal_i2c_write(uint8_t addr7, const uint8_t *data, size_t len) {
    (void)addr7; (void)data; (void)len;
    return -1;
}

int hal_i2c_read(uint8_t addr7, uint8_t *data, size_t len) {
    (void)addr7; (void)data; (void)len;
    return -1;
}
