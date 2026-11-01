#include "unity.h"
#include "safety.h"

/* The safety checks (lesson 115). Each test feeds the check a situation and asserts the fault.
 * Times are in milliseconds; temperatures in hundredths of a degree (9000 = 90.00 C). */

static runaway_t r;

void setUp(void) {
    runaway_reset(&r);
}

void tearDown(void) {}

static safety_in_t calm(uint32_t now_ms, int32_t temp) {
    safety_in_t in = {
        .now_ms = now_ms,
        .temp_centi = temp,
        .sensor_ok = true,
        .heater_enabled = false,
        .heater_full = false,
        .setpoint_centi = 6500,
        .sample_age_ms = 0u,
    };
    return in;
}

static void test_sensor_fault_is_reported(void) {
    safety_in_t in = calm(0u, 2500);
    in.sensor_ok = false;
    TEST_ASSERT_EQUAL_INT(FAULT_SENSOR, safety_check(&in, &r));
}

static void test_cutoff_at_90_degrees(void) {
    safety_in_t in = calm(0u, 9000);
    TEST_ASSERT_EQUAL_INT(FAULT_OVERTEMP, safety_check(&in, &r));
}

static void test_just_below_cutoff_is_fine(void) {
    safety_in_t in = calm(0u, 8999);
    TEST_ASSERT_EQUAL_INT(FAULT_NONE, safety_check(&in, &r));
}

static void test_stale_sample_is_reported(void) {
    safety_in_t in = calm(0u, 2500);
    in.sample_age_ms = 600u;
    TEST_ASSERT_EQUAL_INT(FAULT_STALE, safety_check(&in, &r));
}

static void test_runaway_trips_after_a_minute_without_a_rise(void) {
    safety_in_t in = calm(0u, 2500);
    in.heater_enabled = true;
    in.heater_full = true;                       /* 25 C, setpoint 65 C: far below and at full power */
    TEST_ASSERT_EQUAL_INT(FAULT_NONE, safety_check(&in, &r));   /* opens the window */
    in.now_ms = 59000u;
    TEST_ASSERT_EQUAL_INT(FAULT_NONE, safety_check(&in, &r));
    in.now_ms = 60000u;
    TEST_ASSERT_EQUAL_INT(FAULT_RUNAWAY, safety_check(&in, &r));
}

static void test_a_rise_of_two_degrees_restarts_the_window(void) {
    safety_in_t in = calm(0u, 2500);
    in.heater_enabled = true;
    in.heater_full = true;
    safety_check(&in, &r);                       /* window opens at 25.00 C */
    in.now_ms = 30000u;
    in.temp_centi = 2700;                        /* 27.00 C: a rise of 2 C, so the window restarts */
    TEST_ASSERT_EQUAL_INT(FAULT_NONE, safety_check(&in, &r));
    in.now_ms = 60000u;                          /* only 30 s since the restart */
    TEST_ASSERT_EQUAL_INT(FAULT_NONE, safety_check(&in, &r));
    in.now_ms = 90000u;                          /* 60 s since the restart, still no rise */
    TEST_ASSERT_EQUAL_INT(FAULT_RUNAWAY, safety_check(&in, &r));
}

static void test_no_runaway_when_heater_is_not_at_full_power(void) {
    safety_in_t in = calm(0u, 2500);
    in.heater_enabled = true;
    in.heater_full = false;                      /* proportional output below 100 %: not verified */
    safety_check(&in, &r);
    in.now_ms = 120000u;
    TEST_ASSERT_EQUAL_INT(FAULT_NONE, safety_check(&in, &r));
}

static void test_no_runaway_near_the_setpoint(void) {
    safety_in_t in = calm(0u, 6200);             /* within 5 C of 65 C: the check is off */
    in.heater_enabled = true;
    in.heater_full = true;
    safety_check(&in, &r);
    in.now_ms = 120000u;
    TEST_ASSERT_EQUAL_INT(FAULT_NONE, safety_check(&in, &r));
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_sensor_fault_is_reported);
    RUN_TEST(test_cutoff_at_90_degrees);
    RUN_TEST(test_just_below_cutoff_is_fine);
    RUN_TEST(test_stale_sample_is_reported);
    RUN_TEST(test_runaway_trips_after_a_minute_without_a_rise);
    RUN_TEST(test_a_rise_of_two_degrees_restarts_the_window);
    RUN_TEST(test_no_runaway_when_heater_is_not_at_full_power);
    RUN_TEST(test_no_runaway_near_the_setpoint);
    return UNITY_END();
}
