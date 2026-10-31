#include <stdint.h>
#include <stdio.h>
#include "hardware/adc.h"
#include "hardware/clocks.h"
#include "hardware/pwm.h"
#include "pico/stdlib.h"

#define POT_PIN       26     // GP26 = ADC0: potentiometer wiper
#define LED_PIN       18     // PWM slice 1, channel A (RP2040 datasheet, Table 515)
#define SERVO_PIN     16     // PWM slice 0, channel A
#define BUZZER_PIN    22     // PWM slice 3, channel A

#define LED_HZ        1000   // above flicker: the LED looks dimmed, not blinking
#define SERVO_HZ      50     // a hobby servo expects one 20 ms frame
#define SERVO_MIN_US  1000   // 1 ms pulse = 0 degrees
#define SERVO_MAX_US  2000   // 2 ms pulse = 180 degrees
#define TONE_HZ       440    // A4
#define TICK_HZ       1000000u // servo slice counts 1 us per tick: easy to read the pulse width in us
#define POT_FULL      4095   // 12-bit ADC full scale
#define TONE_DIV      8.0f   // a divider that keeps TOP inside 16 bits for 440 Hz (see below)

// Frequency = clk_sys / (DIV * (TOP + 1)), from RP2040 datasheet section 4.5.2.6 and the SDK's pwm.h
// (the counter runs at clk_sys / DIV). DIV is 8.4 fixed point: 1.0 to 255.9375.
// TOP is a 16-bit wrap value, so TOP + 1 must fit in 65536 counts per period.
static void pwm_start(uint gpio, float div, uint16_t top) {
    gpio_set_function(gpio, GPIO_FUNC_PWM);
    uint slice = pwm_gpio_to_slice_num(gpio);
    pwm_config cfg = pwm_get_default_config();
    pwm_config_set_clkdiv(&cfg, div);
    pwm_config_set_wrap(&cfg, top);
    pwm_init(slice, &cfg, true);
}

static uint16_t read_pot(void) {
    adc_select_input(0);
    return adc_read();
}

int main(void) {
    stdio_init_all();
    adc_init();
    adc_gpio_init(POT_PIN);

    uint32_t sys_hz = clock_get_hz(clk_sys);   // usually 125 MHz, but read it, do not assume it

    // LED: 1 kHz, TOP = sys / (div * 1 kHz) - 1, with div chosen so the tick is 1 MHz.
    float tick_div = (float)sys_hz / (float)TICK_HZ;   // 125 MHz / 1 MHz = 125
    uint16_t led_top = (uint16_t)(TICK_HZ / LED_HZ - 1);   // 1000 ticks per period: TOP = 999
    pwm_start(LED_PIN, tick_div, led_top);

    // Servo: 50 Hz on the 1 MHz tick. TOP + 1 = 1,000,000 / 50 = 20,000 ticks, so TOP = 19999.
    uint16_t servo_top = (uint16_t)(TICK_HZ / SERVO_HZ - 1);
    pwm_start(SERVO_PIN, tick_div, servo_top);

    // Buzzer: 440 Hz with a 50 % duty cycle. Its TOP is found from the frequency, not guessed.
    uint16_t tone_top = (uint16_t)((float)sys_hz / (TONE_DIV * TONE_HZ) - 1.0f);
    pwm_start(BUZZER_PIN, TONE_DIV, tone_top);
    pwm_set_gpio_level(BUZZER_PIN, (tone_top + 1) / 2);

    printf("PWM OK\n");   // EXPECT: PWM OK
    while (true) {
        uint16_t pot = read_pot();

        // LED duty: pot 0..4095 maps to level 0..TOP+1. A level equal to TOP+1 would be 100 %.
        uint32_t led_level = (uint32_t)pot * (led_top + 1) / (POT_FULL + 1);
        pwm_set_gpio_level(LED_PIN, (uint16_t)led_level);

        // Servo: the pulse width is the level in ticks (1 us each). Map the pot to 1000..2000 us.
        uint32_t servo_us = SERVO_MIN_US + (uint32_t)pot * (SERVO_MAX_US - SERVO_MIN_US) / POT_FULL;
        pwm_set_gpio_level(SERVO_PIN, (uint16_t)servo_us);

        printf("pot=%u led=%u servo_us=%u\n", pot, (unsigned)led_level, (unsigned)servo_us);
        sleep_ms(200);
    }
}
