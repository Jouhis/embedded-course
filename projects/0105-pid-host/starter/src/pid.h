/* PID controller in discrete time (lesson 105).
 *
 * Called once per sample period dt. The output is a fraction of full power, clamped to
 * [out_min, out_max]. Nothing here touches hardware, so the same file runs on the PC and the Pico.
 */
#ifndef PID_H
#define PID_H

#include <stdbool.h>

typedef struct {
    float kp;          /* proportional gain: output per degree of error */
    float ki;          /* integral gain: output per degree-second of error */
    float kd;          /* derivative gain: output per degree per second of measurement change */
    float dt;          /* sample period in seconds: the step of the discrete equations */
    float out_min;     /* actuator limits: the output never leaves this range */
    float out_max;
    float integral;    /* the I term, kept inside [out_min, out_max] (anti-windup clamp) */
    float last_meas;   /* previous measurement, for derivative on measurement */
    bool  first;       /* true until the first update, which has no previous measurement */
} pid_t;

void  pid_init(pid_t *p, float kp, float ki, float kd, float dt, float out_min, float out_max);
float pid_update(pid_t *p, float setpoint, float measurement);

#endif
