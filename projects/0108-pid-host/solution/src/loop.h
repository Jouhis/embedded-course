/* Closed loop: a PID controller driving the simulated heater to a setpoint (lesson 108).
 * Shared by the host tests and by app/pid_sim.c, which prints the trace as CSV.
 */
#ifndef LOOP_H
#define LOOP_H

#define SIM_AMBIENT_C    25.0f    /* room temperature at the start and the cooling target */
#define SIM_GAIN_C       80.0f    /* plant: degrees of rise at full power */
#define SIM_TAU_S        60.0f    /* plant: thermal time constant */
#define SIM_SETPOINT_C   60.0f    /* the temperature the controller must reach */
#define SIM_DT_S         1.0f     /* sample period of the controller and the plant */
#define SIM_STEPS        1200     /* simulated seconds */
#define SIM_TOL_C        1.0f     /* "settled" means within this many degrees of the setpoint */

typedef struct {
    float final_temp;   /* temperature at the end of the run */
    float overshoot;    /* degrees above the setpoint (0 if the temperature never went above it) */
    int   settle_s;     /* first second after which the temperature stays within tolerance; -1 if never */
} loop_metrics_t;

/* Optional per-step callback (lesson 49): called after each simulated second, or pass NULL. */
typedef void (*loop_trace_fn)(int t_s, float setpoint, float temp, float power);

loop_metrics_t run_closed_loop(float kp, float ki, float kd, loop_trace_fn trace);

#endif
