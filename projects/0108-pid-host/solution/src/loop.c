#include <math.h>
#include "loop.h"
#include "pid.h"
#include "plant.h"

loop_metrics_t run_closed_loop(float kp, float ki, float kd, loop_trace_fn trace) {
    plant_t heater;
    pid_t controller;
    plant_init(&heater, SIM_AMBIENT_C, SIM_GAIN_C, SIM_TAU_S, SIM_AMBIENT_C);
    pid_init(&controller, kp, ki, kd, SIM_DT_S, 0.0f, 1.0f);   /* the heater is 0 to 100 % */

    loop_metrics_t m;
    m.overshoot = 0.0f;
    int last_outside = -1;   /* the last second the temperature was outside the tolerance band */

    for (int t = 0; t < SIM_STEPS; t++) {
        /* Read the temperature, decide the power, then let the plant respond for one step. */
        float power = pid_update(&controller, SIM_SETPOINT_C, heater.temp);
        float temp = plant_step(&heater, power, SIM_DT_S);

        if (fabsf(temp - SIM_SETPOINT_C) > SIM_TOL_C) {
            last_outside = t;
        }
        if (temp - SIM_SETPOINT_C > m.overshoot) {
            m.overshoot = temp - SIM_SETPOINT_C;
        }
        if (trace) {
            trace(t + 1, SIM_SETPOINT_C, temp, power);
        }
    }

    m.final_temp = heater.temp;
    /* Settled from the second after the last out-of-band sample; -1 if the last sample was out of band. */
    m.settle_s = (last_outside + 1 < SIM_STEPS) ? last_outside + 1 : -1;
    return m;
}
