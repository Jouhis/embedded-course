/* control.c: bang-bang heater control with hysteresis (lesson 116). */
#include "control.h"

void bangbang_init(bangbang_t *b) {
    b->on = false;
}

uint16_t bangbang_step(bangbang_t *b, bool enabled, int32_t setpoint_centi, int32_t temp_centi) {
    if (!enabled) {
        b->on = false;                    /* disabled: the heater is off and the memory is cleared */
    } else if (temp_centi < setpoint_centi - (int32_t)CONTROL_HYST_CENTI) {
        b->on = true;                     /* clearly below: heat */
    } else if (temp_centi > setpoint_centi + (int32_t)CONTROL_HYST_CENTI) {
        b->on = false;                    /* clearly above: stop */
    }                                     /* inside the band: keep the previous state (hysteresis) */
    return b->on ? CONTROL_FULL : 0u;
}
