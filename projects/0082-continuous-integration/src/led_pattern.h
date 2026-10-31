/* led_pattern.h: pure timing logic for the blink. No hardware access, so the host
 * unit tests (host-tests/) can check it on the PC (lesson 82). */
#ifndef LED_PATTERN_H
#define LED_PATTERN_H

#include <stdint.h>

/* Half of one full on/off cycle, in milliseconds. Never returns 0: a zero delay
 * would make the loop run flat out and hide the blink from the eye. Periods below
 * 2 ms are clamped to 1 ms. */
uint32_t led_half_period_ms(uint32_t period_ms);

#endif /* LED_PATTERN_H */
