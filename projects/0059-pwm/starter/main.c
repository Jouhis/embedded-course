#include <stdint.h>
#include <stdio.h>
#include "hardware/adc.h"
#include "hardware/clocks.h"
#include "hardware/pwm.h"
#include "pico/stdlib.h"

#define POT_PIN       26     // GP26 = ADC0: potentiometer wiper
#define LED_PIN       18     // PWM slice 1, channel A
#define SERVO_PIN     16     // PWM slice 0, channel A
#define BUZZER_PIN    22     // PWM slice 3, channel A

#define LED_HZ        1000
#define SERVO_HZ      50
#define SERVO_MIN_US  1000
#define SERVO_MAX_US  2000
#define TONE_HZ       440
#define TICK_HZ       1000000u
#define POT_FULL      4095
#define TONE_DIV      8.0f

// Frequency = clk_sys / (DIV * (TOP + 1)). DIV is 8.4 fixed point, 1.0 to 255.9375.
// TOP is 16 bits, so TOP + 1 must not exceed 65536.
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

    uint32_t sys_hz = clock_get_hz(clk_sys);
    float tick_div = (float)sys_hz / (float)TICK_HZ;

    // LED: TODO(learner): the LED is set up below. Check its TOP: it should give 1 kHz.
    uint16_t led_top = (uint16_t)(TICK_HZ / LED_HZ - 1);
    pwm_start(LED_PIN, tick_div, led_top);

    // Servo: TODO(learner) BUG. This TOP gives a 500 Hz frame, not 50 Hz. The servo needs
    // TOP + 1 = 20,000 ticks at 1 us each. Fix the TOP, and explain it in a comment.
    uint16_t servo_top = 1999;
    pwm_start(SERVO_PIN, tick_div, servo_top);

    // Buzzer: TODO(learner): compute the TOP for 440 Hz from sys_hz and TONE_DIV, start the
    // slice, and set the level to half of TOP + 1 for a 50 % duty cycle.
    (void)BUZZER_PIN;
    (void)TONE_HZ;
    (void)TONE_DIV;

    // TODO(learner): print "PWM OK" once, after the three slices run.
    while (true) {
        uint16_t pot = read_pot();

        // TODO(learner): set the LED level from the pot (0..POT_FULL maps to 0..led_top+1).
        // TODO(learner): set the servo level in microseconds, from SERVO_MIN_US to SERVO_MAX_US.
        (void)pot;
        sleep_ms(200);
    }
}
