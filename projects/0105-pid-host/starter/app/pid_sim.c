/* Prints the closed-loop response as CSV on stdout, one row per simulated second.
 * Run:  build\pid_sim.exe > response.csv
 * Metrics go to stderr, so the CSV stays clean. See the lesson for how to plot it.
 */
#include <stdio.h>
#include "loop.h"
#include "tuning.h"

static void print_row(int t_s, float setpoint, float temp, float power) {
    printf("%d,%.3f,%.3f,%.4f\n", t_s, setpoint, temp, power);
}

int main(void) {
    printf("t_s,setpoint_c,temp_c,power\n");
    loop_metrics_t m = run_closed_loop(TUNED_KP, TUNED_KI, TUNED_KD, print_row);
    fprintf(stderr, "final=%.2f C overshoot=%.2f C settle=%d s\n",
            m.final_temp, m.overshoot, m.settle_s);
    return 0;
}
