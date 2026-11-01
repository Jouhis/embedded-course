/* safety.c: the safety checks (lesson 115). */
#include "safety.h"

void runaway_reset(runaway_t *r) {
    r->armed = false;
    r->ref_ms = 0u;
    r->ref_centi = 0;
}

/* Heater runaway, as Klipper's verify_heater does it (klipper3d.org Config_Reference, [verify_heater]):
 * while the heater is at full power and far below the setpoint, the temperature must rise by a
 * minimum amount within a time window. If it does not, the heater or its sensor is not working.
 * The window restarts each time the required rise happens, so a slow but healthy rise never trips. */
static fault_t runaway_check(const safety_in_t *in, runaway_t *r) {
    bool far_below = in->temp_centi < in->setpoint_centi - SAFETY_RUNAWAY_BAND_CENTI;
    if (!in->heater_enabled || !in->heater_full || !far_below) {
        runaway_reset(r);                  /* not heating at full power: nothing to verify */
        return FAULT_NONE;
    }
    if (!r->armed) {
        r->armed = true;                   /* the first full-power sample opens the window */
        r->ref_ms = in->now_ms;
        r->ref_centi = in->temp_centi;
        return FAULT_NONE;
    }
    if (in->temp_centi >= r->ref_centi + SAFETY_RUNAWAY_GAIN_CENTI) {
        r->ref_ms = in->now_ms;            /* the heater did its job: start a new window */
        r->ref_centi = in->temp_centi;
        return FAULT_NONE;
    }
    if (in->now_ms - r->ref_ms >= SAFETY_RUNAWAY_MS) {
        return FAULT_RUNAWAY;              /* unsigned subtraction: correct across the 32-bit wrap */
    }
    return FAULT_NONE;
}

fault_t safety_check(const safety_in_t *in, runaway_t *r) {
    if (!in->sensor_ok) {
        return FAULT_SENSOR;
    }
    if (in->temp_centi >= SAFETY_CUTOFF_CENTI) {
        return FAULT_OVERTEMP;
    }
    if (in->sample_age_ms > SAFETY_STALE_MS) {
        return FAULT_STALE;
    }
    return runaway_check(in, r);
}
