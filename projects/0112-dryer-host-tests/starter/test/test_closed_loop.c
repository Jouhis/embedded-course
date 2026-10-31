#include <math.h>
#include <stdio.h>
#include "unity.h"
#include "controller.h"
#include "ntc.h"
#include "plant.h"
#include "tuning.h"

/* The closed loop (lesson 112). The REAL control code (controller_step: filter, state machine,
 * PID, safety checks) drives the thermal plant of lesson 105. Only the sensor is simulated:
 * the plant's temperature is turned into an ADC code through the NTC divider and the Beta equation,
 * then through the firmware's own ntc_centi_from_raw(). So the path under test is the firmware's.
 *
 * Plant: ambient 25 C, gain 80 C at full power, time constant 60 s (the same numbers as lesson 105).
 * Controller period: 0.1 s, the firmware's control task. The press at 0.5 s starts a PLA cycle
 * (setpoint 45 C). "Settled" means the plant stays within 1 C of the setpoint from then on. */

#define SIM_AMBIENT_C   25.0f
#define SIM_GAIN_C      80.0f
#define SIM_TAU_S       60.0f
#define SIM_RUN_S       1200
#define SIM_PRESS_STEP  5           /* the start button is pressed at 0.5 s */
#define SIM_PLA_C       45.0f
#define SIM_TOL_C       1.0f

typedef struct {
    float    overshoot_c;   /* highest temperature above the setpoint */
    float    settle_s;      /* from the press until the temperature stays within 1 C; -1 if it never does */
    float    final_c;       /* the temperature at the end of the run */
    fault_t  fault;         /* the first fault the state machine reported */
    float    fault_s;       /* when it happened, in seconds; -1 if none */
} loop_result_t;

/* The thermistor divider: 10 kOhm NTC (Beta 3950, 10 kOhm at 25 C) below a 10 kOhm resistor
 * from 3.3 V. The 12-bit ADC reads the mid-point. */
static uint16_t adc_code_for(double celsius) {
    double t = celsius + 273.15;
    double r = 10000.0 * exp(3950.0 * (1.0 / t - 1.0 / 298.15));
    double code = 4095.0 * r / (r + 10000.0);
    if (code < 0.0) code = 0.0;
    if (code > 4095.0) code = 4095.0;
    return (uint16_t)lround(code);
}

static loop_result_t run_loop(float plant_gain, int seconds) {
    controller_t ctl;
    controller_init(&ctl);
    plant_t p;
    plant_init(&p, SIM_AMBIENT_C, plant_gain, SIM_TAU_S, SIM_AMBIENT_C);

    loop_result_t r;
    r.overshoot_c = 0.0f;
    r.fault = FAULT_NONE;
    r.fault_s = -1.0f;
    int last_outside = -1;

    int steps = seconds * 10;
    for (int k = 0; k < steps; k++) {
        control_in_t in = { 0 };
        uint16_t code = adc_code_for(p.temp);
        int32_t centi = 0;
        in.sensor_ok = ntc_centi_from_raw(code, &centi);
        in.raw_centi = centi;
        in.now_ms = (uint32_t)k * 100u;
        in.start_pressed = (k == SIM_PRESS_STEP);

        control_out_t out;
        controller_step(&ctl, &in, &out);

        float power = (float)out.heater_permille / 1000.0f;
        float t = plant_step(&p, power, CONTROL_DT_S);

        if (k >= SIM_PRESS_STEP) {
            float over = t - SIM_PLA_C;
            if (over > r.overshoot_c) r.overshoot_c = over;
            if (fabsf(over) > SIM_TOL_C) last_outside = k;
        }
        if (out.dryer.fault != FAULT_NONE && r.fault == FAULT_NONE) {
            r.fault = out.dryer.fault;
            r.fault_s = (float)k / 10.0f;
        }
    }
    r.final_c = p.temp;
    r.settle_s = (last_outside < 0) ? (float)(SIM_PRESS_STEP) / 10.0f
                 : (float)(last_outside + 1) / 10.0f - (float)SIM_PRESS_STEP / 10.0f;
    if (last_outside >= steps - 1) {
        r.settle_s = -1.0f;   /* still outside the band at the end */
    }
    return r;
}

void setUp(void) {}
void tearDown(void) {}

static void test_pla_settles_within_ten_minutes(void) {
    loop_result_t r = run_loop(SIM_GAIN_C, SIM_RUN_S);
    printf("[closed loop] PLA 45 C: settle %.1f s, overshoot %.2f C, final %.2f C\n",
           r.settle_s, r.overshoot_c, r.final_c);
    TEST_ASSERT_TRUE_MESSAGE(r.settle_s >= 0.0f, "the temperature never settled within 1 C");
    TEST_ASSERT_TRUE_MESSAGE(r.settle_s <= 600.0f, "settling time must be 600 s or less");
}

static void test_pla_overshoot_is_at_most_two_degrees(void) {
    loop_result_t r = run_loop(SIM_GAIN_C, SIM_RUN_S);
    TEST_ASSERT_TRUE_MESSAGE(r.overshoot_c <= 2.0f, "overshoot must be 2 C or less");
}

static void test_ends_at_the_setpoint(void) {
    loop_result_t r = run_loop(SIM_GAIN_C, SIM_RUN_S);
    TEST_ASSERT_FLOAT_WITHIN(SIM_TOL_C, SIM_PLA_C, r.final_c);
    TEST_ASSERT_EQUAL_INT(FAULT_NONE, r.fault);
}

static void test_dead_heater_is_caught_as_runaway(void) {
    /* A heater with no gain: full power, no rise. The runaway check must latch FAULT_RUNAWAY,
     * and it must do so within a few minutes, not after the drying time. */
    loop_result_t r = run_loop(0.0f, 600);
    printf("[closed loop] dead heater: runaway latched at %.1f s\n", r.fault_s);
    TEST_ASSERT_EQUAL_INT(FAULT_RUNAWAY, r.fault);
    TEST_ASSERT_TRUE_MESSAGE(r.fault_s <= 300.0f, "runaway must be detected within 300 s");
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_pla_settles_within_ten_minutes);
    RUN_TEST(test_pla_overshoot_is_at_most_two_degrees);
    RUN_TEST(test_ends_at_the_setpoint);
    RUN_TEST(test_dead_heater_is_caught_as_runaway);
    return UNITY_END();
}
