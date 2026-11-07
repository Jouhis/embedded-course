/* hal_pico2.c: the Raspberry Pi Pico 2 board file for hal.h (bench lab 18).
 *
 * It implements the same functions as hw/hal_bluepill.c of lesson 116, so app/ and main.c
 * build unchanged. The pin map in hal.h is the Blue Pill's; this is the Pico 2's:
 *   GP26  ADC0        NTC divider (10 kOhm to 3V3, NTC to GND), 12-bit
 *   GP15  PWM7 B      heater: 1 kHz PWM to the gate of a logic-level MOSFET (or to an LED in Wokwi)
 *   GP16  GPIO out    fan (or an LED)
 *   GP14  GPIO in     start/stop button to GND, internal pull-up (active low)
 *   GP13  GPIO in     material button to GND, internal pull-up (active low)
 *   GP4   I2C0 SDA    SSD1306 OLED (4.7 kOhm pull-ups to 3V3)
 *   GP5   I2C0 SCL
 *   GP0   UART0 TX    serial log, 115200 baud (also on USB through stdio)
 *
 * Only this file touches the Pico SDK's hardware APIs. */
#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/adc.h"
#include "hardware/clocks.h"
#include "hardware/i2c.h"
#include "hardware/pwm.h"
#include "hal.h"

#define NTC_PIN            26u
#define NTC_INPUT          0u       /* adc_select_input() takes the channel, not the GPIO */
#define HEATER_PIN         15u
#define FAN_PIN            16u
#define BTN_START_PIN      14u
#define BTN_MATERIAL_PIN   13u
#define I2C_BUS            i2c0
#define SDA_PIN            4u
#define SCL_PIN            5u
#define I2C_HZ             100000u  /* the Blue Pill build ran the OLED at 100 kHz; keep it */
#define I2C_TIMEOUT_US     100000u  /* 100 ms, as HAL_I2C's timeout in the Blue Pill file */
#define PWM_WRAP           999u     /* 1000 counts per period: one count per 0.1 % of duty */
#define PWM_HZ             1000u

static uint heater_slice;

void hal_init(void) {
    stdio_init_all();

    adc_init();
    adc_gpio_init(NTC_PIN);               /* digital input off: the pin is analog */

    /* Heater PWM: 1 kHz with 1000 steps. clk_sys / (divider * 1000) = 1 kHz. At 150 MHz the
     * divider is 150, inside the 8.4 fractional divider's range (1 to 255). */
    gpio_set_function(HEATER_PIN, GPIO_FUNC_PWM);
    heater_slice = pwm_gpio_to_slice_num(HEATER_PIN);
    pwm_config cfg = pwm_get_default_config();
    pwm_config_set_wrap(&cfg, PWM_WRAP);
    pwm_config_set_clkdiv(&cfg, (float)clock_get_hz(clk_sys) / (float)(PWM_HZ * (PWM_WRAP + 1u)));
    pwm_init(heater_slice, &cfg, false);
    pwm_set_gpio_level(HEATER_PIN, 0);    /* heater off before the output starts */
    pwm_set_enabled(heater_slice, true);

    gpio_init(FAN_PIN);
    gpio_set_dir(FAN_PIN, GPIO_OUT);
    gpio_put(FAN_PIN, 0);

    const uint buttons[] = { BTN_START_PIN, BTN_MATERIAL_PIN };
    for (unsigned i = 0; i < 2; i++) {
        gpio_init(buttons[i]);
        gpio_set_dir(buttons[i], GPIO_IN);
        gpio_pull_up(buttons[i]);         /* pull-up, never pull-down: bench lab 2 */
    }

    i2c_init(I2C_BUS, I2C_HZ);
    gpio_set_function(SDA_PIN, GPIO_FUNC_I2C);
    gpio_set_function(SCL_PIN, GPIO_FUNC_I2C);
}

void hal_log(const char *line) {
    puts(line);                           /* stdio adds the newline; both UART0 and USB get it */
}

uint16_t hal_adc_read_ntc(void) {
    adc_select_input(NTC_INPUT);
    return adc_read();                    /* 12 bits, 0 to 4095, like the STM32's ADC */
}

void hal_heater_set_permille(uint16_t permille) {
    if (permille > 1000u) {
        permille = 1000u;
    }
    /* Level above WRAP keeps the output high for the whole period, as CCR > ARR did on TIM3. */
    pwm_set_gpio_level(HEATER_PIN, permille);
}

void hal_fan_set(uint8_t on) {
    gpio_put(FAN_PIN, on != 0u);
}

uint8_t hal_button_pressed(hal_button_t button) {
    uint pin = (button == HAL_BUTTON_START) ? BTN_START_PIN : BTN_MATERIAL_PIN;
    return gpio_get(pin) ? 0u : 1u;       /* active low */
}

uint32_t hal_millis(void) {
    return to_ms_since_boot(get_absolute_time());
}

int hal_i2c_write(uint8_t addr7, const uint8_t *data, size_t len) {
    int n = i2c_write_timeout_us(I2C_BUS, addr7, data, len, false, I2C_TIMEOUT_US);
    return (n == (int)len) ? 0 : -1;      /* NACK and timeout both come back as negative codes */
}

int hal_i2c_read(uint8_t addr7, uint8_t *data, size_t len) {
    int n = i2c_read_timeout_us(I2C_BUS, addr7, data, len, false, I2C_TIMEOUT_US);
    return (n == (int)len) ? 0 : -1;
}
