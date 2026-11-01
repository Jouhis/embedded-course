#include "unity.h"
#include "controller.h"
#include "ntc.h"

/* One control cycle at a time (lesson 116): the outputs the heater and the state machine get. */

static controller_t c;

void setUp(void) {
    controller_init(&c);
}

void tearDown(void) {}

static control_in_t sample(uint32_t k, int32_t temp_centi) {
    control_in_t in = { 0 };
    in.now_ms = k * 100u;
    in.sensor_ok = true;
    in.raw_centi = temp_centi;
    return in;
}

static void test_idle_heater_is_off(void) {
    control_out_t out;
    control_in_t in = sample(0u, 2500);
    controller_step(&c, &in, &out);
    TEST_ASSERT_EQUAL_UINT16(0u, out.heater_permille);
    TEST_ASSERT_FALSE(out.dryer.fan_on);
}

static void test_start_heats_with_pid_output_in_range(void) {
    control_out_t out;
    control_in_t in = sample(0u, 2500);
    in.start_pressed = true;
    controller_step(&c, &in, &out);
    TEST_ASSERT_EQUAL_INT(DRYER_HEATING, c.dryer.state);
    /* 20 C below the 45 C setpoint with kp = 0.04: about 80 %, so the output is clearly on and not saturated */
    TEST_ASSERT_TRUE(out.heater_permille > 700u);
    TEST_ASSERT_TRUE(out.heater_permille <= CONTROL_FULL_PERMILLE);
}

static void test_sensor_fault_cuts_the_heater(void) {
    control_out_t out;
    control_in_t in = sample(0u, 2500);
    in.start_pressed = true;
    controller_step(&c, &in, &out);
    in = sample(1u, 0);
    in.sensor_ok = false;
    controller_step(&c, &in, &out);
    TEST_ASSERT_EQUAL_INT(DRYER_FAULT, c.dryer.state);
    TEST_ASSERT_EQUAL_UINT16(0u, out.heater_permille);
    TEST_ASSERT_EQUAL_INT(FAULT_SENSOR, out.dryer.fault);
}

static void test_monitor_latch_forces_fault_and_acknowledge_clears_it(void) {
    control_out_t out;
    control_in_t in = sample(0u, 2500);
    in.latched_fault = FAULT_OVERTEMP;                 /* the safety monitor tripped */
    controller_step(&c, &in, &out);
    TEST_ASSERT_EQUAL_INT(DRYER_FAULT, c.dryer.state);
    TEST_ASSERT_FALSE(out.clear_latch);

    in = sample(1u, 3000);                             /* cool (30 C) and the operator presses start */
    in.latched_fault = FAULT_OVERTEMP;
    in.start_pressed = true;
    controller_step(&c, &in, &out);
    TEST_ASSERT_TRUE(out.clear_latch);
    TEST_ASSERT_EQUAL_INT(DRYER_IDLE, c.dryer.state);
}

static void test_own_overtemperature_check_cuts_the_heater(void) {
    control_out_t out;
    control_in_t in = sample(0u, 2500);
    in.start_pressed = true;
    controller_step(&c, &in, &out);                    /* heating */
    /* The filter is slow (k = 2): feed hot readings until the filtered value passes 90 C. */
    for (uint32_t k = 1; k < 40; k++) {
        in = sample(k, 9500);
        controller_step(&c, &in, &out);
    }
    TEST_ASSERT_EQUAL_INT(FAULT_OVERTEMP, out.dryer.fault);
    TEST_ASSERT_EQUAL_UINT16(0u, out.heater_permille);
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_idle_heater_is_off);
    RUN_TEST(test_start_heats_with_pid_output_in_range);
    RUN_TEST(test_sensor_fault_cuts_the_heater);
    RUN_TEST(test_monitor_latch_forces_fault_and_acknowledge_clears_it);
    RUN_TEST(test_own_overtemperature_check_cuts_the_heater);
    return UNITY_END();
}
