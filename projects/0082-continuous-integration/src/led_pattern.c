/* led_pattern.c: see led_pattern.h. */
#include "led_pattern.h"

uint32_t led_half_period_ms(uint32_t period_ms) {
    uint32_t half = period_ms / 2U;   /* integer division rounds odd periods down */
    return (half == 0U) ? 1U : half;
}
