/* safety.h: the safety checks of the dryer (lesson 116). Pure logic: each check takes its inputs
 * as a struct, so a test can feed in any temperature, time or sensor state.
 *
 * A check returns the first fault it finds. The state machine (dryer.c) latches it in FAULT.
 * The checks are: over-temperature hard cutoff, sensor fault, heater runaway, stale sample. */
#ifndef SAFETY_H
#define SAFETY_H

#include <stdbool.h>
#include <stdint.h>

typedef enum {
    FAULT_NONE = 0,
    FAULT_OVERTEMP = 1,   /* the chamber reached the hard cutoff */
    FAULT_SENSOR = 2,     /* the NTC is open or shorted */
    FAULT_RUNAWAY = 3,    /* the heater is at full power but the temperature does not rise */
    FAULT_STALE = 4,      /* the control loop has not produced a new sample in time */
} fault_t;

#define SAFETY_CUTOFF_CENTI        9000    /* hard cutoff: 90.00 C (spec, lesson 113) */
#define SAFETY_RUNAWAY_MS          60000u  /* time allowed at full power for the gain below */
#define SAFETY_RUNAWAY_GAIN_CENTI  200     /* the minimum rise in that time: 2.00 C (Klipper heating_gain) */
#define SAFETY_RUNAWAY_BAND_CENTI  500     /* within 5.00 C of the setpoint the check is off (Klipper hysteresis) */
#define SAFETY_STALE_MS            500u    /* a sample older than this means the control loop stalled */

typedef struct {
    bool     armed;        /* a heating window is open */
    uint32_t ref_ms;       /* when the window opened (or last gained the required rise) */
    int32_t  ref_centi;    /* the temperature at that moment */
} runaway_t;

typedef struct {
    uint32_t now_ms;
    int32_t  temp_centi;       /* filtered chamber temperature */
    bool     sensor_ok;        /* from ntc_centi_from_raw() */
    bool     heater_enabled;   /* the state machine wants heat now */
    bool     heater_full;      /* the actual heater command is 100 % */
    int32_t  setpoint_centi;
    uint32_t sample_age_ms;    /* time since the control loop last produced a sample */
} safety_in_t;

void     runaway_reset(runaway_t *r);
fault_t  safety_check(const safety_in_t *in, runaway_t *r);

#endif /* SAFETY_H */
