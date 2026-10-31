#include "pid.h"

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

static float clampf(float x, float lo, float hi) {
    if (x < lo) return lo;
    if (x > hi) return hi;
    return x;
}

float pid_update(pid_t *p, float setpoint, float measurement) {
    float error = setpoint - measurement;

    /* P: reacts to the error now. */
    float p_term = p->kp * error;

    /* I: sums the error over time (rectangle rule: error times dt). The clamp is the anti-windup:
       while the output is saturated the sum cannot grow past the limit, so it unwinds quickly. */
    p->integral += p->ki * error * p->dt;
    p->integral = clampf(p->integral, p->out_min, p->out_max);

    /* D on measurement: differentiate the measurement, not the error. A setpoint step changes
       the error at once, which would kick the output; the measurement only moves as the plant
       responds. The minus sign is there because a rising measurement must reduce the output. */
    float d_term = 0.0f;
    if (!p->first) {
        d_term = -p->kd * (measurement - p->last_meas) / p->dt;
    }
    p->first = false;
    p->last_meas = measurement;

    return clampf(p_term + p->integral + d_term, p->out_min, p->out_max);
}
