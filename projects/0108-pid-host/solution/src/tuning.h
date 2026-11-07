/* The controller's gains. Change these, rebuild, and watch the tests and the CSV.
 * Gains are per the units in pid.h: kp per degree, ki per degree-second, kd per degree-per-second. */
#ifndef TUNING_H
#define TUNING_H

#define TUNED_KP   0.04f     /* proportional: the main response */
#define TUNED_KI   0.0005f   /* integral: removes the steady offset a P-only loop leaves */
#define TUNED_KD   0.5f      /* derivative on measurement: damps the approach to the setpoint */

#endif
