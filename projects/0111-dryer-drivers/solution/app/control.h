/* control.h: the heater controller of lesson 111, a bang-bang (on/off) controller with hysteresis.
 * Lesson 112 replaces it with the PID controller. Keeping the same call shape makes the swap small. */
#ifndef CONTROL_H
#define CONTROL_H

#include <stdbool.h>
#include <stdint.h>

#define CONTROL_HYST_CENTI  100u   /* switch off above setpoint + 1.00 C, on below setpoint - 1.00 C */
#define CONTROL_FULL        1000u  /* heater duty in permille: 1000 is full power */

typedef struct {
    bool on;   /* the output state, which the hysteresis remembers between calls */
} bangbang_t;

void     bangbang_init(bangbang_t *b);
/* Returns the heater duty in permille: 0 or CONTROL_FULL. */
uint16_t bangbang_step(bangbang_t *b, bool enabled, int32_t setpoint_centi, int32_t temp_centi);

#endif /* CONTROL_H */
