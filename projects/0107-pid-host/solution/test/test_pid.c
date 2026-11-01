#include <math.h>
#include "unity.h"
#include "pid.h"
#include "plant.h"
#include "loop.h"
#include "tuning.h"

/* Part A: the controller's arithmetic, one term at a time, with exact numbers. */
/* Part B: the plant, a first-order heater model.                                  */
/* Part C: the closed loop, judged on settling time and overshoot.                 */

static pid_t pid;

void setUp(void) {
    pid_init(&pid, 0.0f, 0.0f, 0.0f, 1.0f, -10.0f, 10.0f);
}

void tearDown(void) {}

/* Part A ------------------------------------------------------------------ */

static void test_p_term_is_kp_times_error(void) {
    pid_init(&pid, 0.02f, 0.0f, 0.0f, 1.0f, 0.0f, 1.0f);
    TEST_ASSERT_FLOAT_WITHIN(1e-5f, 0.1f, pid_update(&pid, 30.0f, 25.0f));   /* 0.02 * 5 */
}

static void test_output_is_clamped_to_the_actuator_range(void) {
    pid_init(&pid, 10.0f, 0.0f, 0.0f, 1.0f, 0.0f, 1.0f);
    TEST_ASSERT_FLOAT_WITHIN(1e-5f, 1.0f, pid_update(&pid, 30.0f, 25.0f));   /* 50 clamped to 1 */
    TEST_ASSERT_FLOAT_WITHIN(1e-5f, 0.0f, pid_update(&pid, 0.0f, 25.0f));    /* -250 clamped to 0 */
}

static void test_integral_adds_error_times_dt(void) {
    pid_init(&pid, 0.0f, 0.1f, 0.0f, 1.0f, -10.0f, 10.0f);
    pid_update(&pid, 26.0f, 25.0f);
    pid_update(&pid, 26.0f, 25.0f);
    TEST_ASSERT_FLOAT_WITHIN(1e-5f, 0.3f, pid_update(&pid, 26.0f, 25.0f));   /* 3 steps of 0.1 */
}

static void test_anti_windup_stops_the_integral_at_the_limit(void) {
    pid_init(&pid, 0.0f, 1.0f, 0.0f, 1.0f, 0.0f, 1.0f);
    for (int i = 0; i < 100; i++) {
        pid_update(&pid, 10.0f, 0.0f);          /* saturated: the output sits at 1 */
    }
    /* Without the clamp the integral would be 1000 and the output would stay at 1 for 100 more
       steps. With the clamp the integral is 1, so one step of -10 error brings it to 0. */
    TEST_ASSERT_FLOAT_WITHIN(1e-5f, 0.0f, pid_update(&pid, 0.0f, 10.0f));
}

static void test_setpoint_step_does_not_kick_the_output(void) {
    pid_init(&pid, 0.0f, 0.0f, 1.0f, 1.0f, -10.0f, 10.0f);
    pid_update(&pid, 0.0f, 0.0f);               /* first call: no previous measurement */
    TEST_ASSERT_FLOAT_WITHIN(1e-5f, 0.0f, pid_update(&pid, 10.0f, 0.0f));   /* setpoint moved, measurement did not */
}

static void test_derivative_reacts_to_the_measurement_change(void) {
    pid_init(&pid, 0.0f, 0.0f, 1.0f, 1.0f, -10.0f, 10.0f);
    pid_update(&pid, 0.0f, 0.0f);
    TEST_ASSERT_FLOAT_WITHIN(1e-5f, -0.5f, pid_update(&pid, 0.0f, 0.5f));   /* rising measurement: negative */
}

/* Part B ------------------------------------------------------------------ */

static void test_plant_relaxes_to_ambient_with_no_power(void) {
    plant_t p;
    plant_init(&p, 25.0f, 80.0f, 60.0f, 80.0f);
    for (int i = 0; i < 600; i++) {
        plant_step(&p, 0.0f, 1.0f);
    }
    TEST_ASSERT_FLOAT_WITHIN(0.01f, 25.0f, p.temp);   /* 80 is 55 above ambient; e^-10 of that is tiny */
}

static void test_plant_full_power_settles_at_ambient_plus_gain(void) {
    plant_t p;
    plant_init(&p, 25.0f, 80.0f, 60.0f, 25.0f);
    for (int i = 0; i < 2000; i++) {
        plant_step(&p, 1.0f, 1.0f);
    }
    TEST_ASSERT_FLOAT_WITHIN(0.01f, 105.0f, p.temp);  /* 25 + 80 */
}

/* Part C ------------------------------------------------------------------ */

static void test_p_only_leaves_an_offset(void) {
    loop_metrics_t m = run_closed_loop(0.05f, 0.0f, 0.0f, NULL);
    TEST_ASSERT_FLOAT_WITHIN(0.1f, 53.0f, m.final_temp);   /* P alone settles short of 60 */
    TEST_ASSERT_EQUAL_INT(-1, m.settle_s);                 /* and never gets within 1 degree */
}

static void test_tuned_loop_settles_within_ten_minutes(void) {
    loop_metrics_t m = run_closed_loop(TUNED_KP, TUNED_KI, TUNED_KD, NULL);
    TEST_ASSERT_TRUE(m.settle_s >= 0);
    TEST_ASSERT_TRUE_MESSAGE(m.settle_s <= 600, "settling time must be 600 s or less");
}

static void test_tuned_loop_overshoot_is_at_most_three_degrees(void) {
    loop_metrics_t m = run_closed_loop(TUNED_KP, TUNED_KI, TUNED_KD, NULL);
    TEST_ASSERT_TRUE_MESSAGE(m.overshoot <= 3.0f, "overshoot must be 3 degrees or less");
}

static void test_tuned_loop_ends_near_the_setpoint(void) {
    loop_metrics_t m = run_closed_loop(TUNED_KP, TUNED_KI, TUNED_KD, NULL);
    TEST_ASSERT_FLOAT_WITHIN(SIM_TOL_C, SIM_SETPOINT_C, m.final_temp);
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_p_term_is_kp_times_error);
    RUN_TEST(test_output_is_clamped_to_the_actuator_range);
    RUN_TEST(test_integral_adds_error_times_dt);
    RUN_TEST(test_anti_windup_stops_the_integral_at_the_limit);
    RUN_TEST(test_setpoint_step_does_not_kick_the_output);
    RUN_TEST(test_derivative_reacts_to_the_measurement_change);
    RUN_TEST(test_plant_relaxes_to_ambient_with_no_power);
    RUN_TEST(test_plant_full_power_settles_at_ambient_plus_gain);
    RUN_TEST(test_p_only_leaves_an_offset);
    RUN_TEST(test_tuned_loop_settles_within_ten_minutes);
    RUN_TEST(test_tuned_loop_overshoot_is_at_most_three_degrees);
    RUN_TEST(test_tuned_loop_ends_near_the_setpoint);
    return UNITY_END();
}
