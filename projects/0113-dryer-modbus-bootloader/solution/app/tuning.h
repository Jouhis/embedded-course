/* tuning.h: the heater PID gains (lesson 112). Units are per the pid.h comments: kp per degree C,
 * ki per degree-second, kd per degree-per-second. The controller runs at CONTROL_DT_S, the 10 Hz
 * control period of the control task. The gains are the lesson 105 values, unchanged. The host
 * closed-loop test (test/test_closed_loop.c) checks them against the thermal plant of lesson 105:
 * PLA 45 C settles in 75.6 s with 0.36 C overshoot. Change them there first, not on the printer. */
#ifndef TUNING_H
#define TUNING_H

#define CONTROL_DT_S   0.1f     /* 10 Hz control period */
#define TUNED_KP       0.04f    /* proportional: the main response */
#define TUNED_KI       0.0005f  /* integral: removes the steady offset */
#define TUNED_KD       0.5f     /* derivative on measurement: damps the approach */

#endif /* TUNING_H */
