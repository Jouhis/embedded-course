/* safety.c: the safety checks (lesson 116). STARTER: the checks are yours to write.
 *
 * TODO(learner): implement safety_check() in this order, returning the first fault found:
 *   1. the sensor is not ok              -> FAULT_SENSOR
 *   2. temp_centi >= SAFETY_CUTOFF_CENTI -> FAULT_OVERTEMP
 *   3. sample_age_ms > SAFETY_STALE_MS   -> FAULT_STALE
 *   4. the heater runaway check (Klipper's verify_heater, see the comment in the solution):
 *      while heater_enabled && heater_full && temp is more than SAFETY_RUNAWAY_BAND_CENTI below
 *      the setpoint, open a window at (now, temp); if the temp rises by SAFETY_RUNAWAY_GAIN_CENTI
 *      restart the window; if SAFETY_RUNAWAY_MS passes without that rise -> FAULT_RUNAWAY.
 *      Otherwise reset the window with runaway_reset().
 * Then run the host tests: test_safety must pass. */
#include "safety.h"

void runaway_reset(runaway_t *r) {
    r->armed = false;
    r->ref_ms = 0u;
    r->ref_centi = 0;
}

fault_t safety_check(const safety_in_t *in, runaway_t *r) {
    (void)in;
    (void)r;
    return FAULT_NONE;   /* TODO(learner): replace with the checks above */
}
