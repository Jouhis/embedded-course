#include "pid.h"

/* pid_init is done for you. Write pid_update so the tests in test/test_pid.c pass.
 * Work through the tests in order: the P term first, then clamping, the I term with
 * anti-windup, and finally derivative on measurement. */

void pid_init(pid_t *p, float kp, float ki, float kd, float dt, float out_min, float out_max) {
    p->kp = kp;
    p->ki = ki;
    p->kd = kd;
    p->dt = dt;
    p->out_min = out_min;
    p->out_max = out_max;
    p->integral = 0.0f;
    p->last_meas = 0.0f;
    p->first = true;
}

float pid_update(pid_t *p, float setpoint, float measurement) {
    /* TODO(learner): error = setpoint - measurement.
       P term = kp * error.
       I term: integral += ki * error * dt, then clamp integral to [out_min, out_max] (anti-windup).
       D term: -kd * (measurement - last_meas) / dt, but 0 on the first call. Store last_meas and first.
       Return P + I + D clamped to [out_min, out_max]. */
    (void)p;
    (void)setpoint;
    (void)measurement;
    return 0.0f;   /* placeholder: no control at all */
}
