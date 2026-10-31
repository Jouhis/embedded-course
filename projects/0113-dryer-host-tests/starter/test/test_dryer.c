#include "unity.h"
#include "dryer.h"

/* The drying state machine (lesson 111). Each test runs a short story: press, time passes,
 * the state changes. Temperatures are hundredths of a degree; times are milliseconds. */

#define MIN_MS   60000u
#define HOUR_MS  3600000u

static dryer_t d;
static dryer_out_t out;

void setUp(void) {
    dryer_init(&d);
}

void tearDown(void) {}

static dryer_in_t make_in(uint32_t now_ms, int32_t temp) {
    dryer_in_t in = {
        .now_ms = now_ms,
        .temp_centi = temp,
        .sensor_ok = true,
        .start_pressed = false,
        .material_pressed = false,
        .safety_fault = FAULT_NONE,
    };
    return in;
}

static void step(const dryer_in_t *in) {
    dryer_step(&d, in, &out);
}

static void test_starts_idle_with_heater_and_fan_off(void) {
    dryer_in_t in = make_in(0u, 2500);
    step(&in);
    TEST_ASSERT_EQUAL_INT(DRYER_IDLE, d.state);
    TEST_ASSERT_FALSE(out.heater_enabled);
    TEST_ASSERT_FALSE(out.fan_on);
}

static void test_material_button_cycles_pla_petg_abs(void) {
    dryer_in_t in = make_in(0u, 2500);
    in.material_pressed = true;
    step(&in);
    TEST_ASSERT_EQUAL_INT(6500, out.setpoint_centi);     /* PETG: 65 C */
    in.material_pressed = true;
    step(&in);
    TEST_ASSERT_EQUAL_INT(8000, out.setpoint_centi);     /* ABS: 80 C */
    in.material_pressed = true;
    step(&in);
    TEST_ASSERT_EQUAL_INT(4500, out.setpoint_centi);     /* wraps back to PLA: 45 C */
}

static void test_start_heats_with_the_selected_material(void) {
    dryer_in_t in = make_in(0u, 2500);
    in.start_pressed = true;
    step(&in);
    TEST_ASSERT_EQUAL_INT(DRYER_HEATING, d.state);
    TEST_ASSERT_TRUE(out.heater_enabled);
    TEST_ASSERT_TRUE(out.fan_on);
    TEST_ASSERT_EQUAL_UINT16(240u, out.remaining_min);   /* PLA: 4 hours */
}

static void test_reaching_the_setpoint_starts_the_hold(void) {
    dryer_in_t in = make_in(0u, 2500);
    in.start_pressed = true;
    step(&in);
    in = make_in(10 * MIN_MS, 4390);                     /* 43.90 C: more than 1 C below 45 C, not yet */
    step(&in);
    TEST_ASSERT_EQUAL_INT(DRYER_HEATING, d.state);
    in = make_in(11 * MIN_MS, 4450);                     /* 44.50 C: inside the 1 C band, so HOLDING */
    step(&in);
    TEST_ASSERT_EQUAL_INT(DRYER_HOLDING, d.state);
}

static void test_hold_ends_after_the_drying_time_and_cools_down(void) {
    dryer_in_t in = make_in(0u, 2500);
    in.start_pressed = true;
    step(&in);
    in = make_in(0u, 4500);
    step(&in);                                           /* HOLDING starts at t = 0 */
    in = make_in(4 * HOUR_MS - 1u, 4500);
    step(&in);
    TEST_ASSERT_EQUAL_INT(DRYER_HOLDING, d.state);
    in = make_in(4 * HOUR_MS, 4500);
    step(&in);
    TEST_ASSERT_EQUAL_INT(DRYER_COOLDOWN, d.state);
    TEST_ASSERT_FALSE(out.heater_enabled);
    TEST_ASSERT_TRUE(out.fan_on);
}

static void test_cooldown_ends_at_40_degrees(void) {
    dryer_in_t in = make_in(0u, 2500);
    in.start_pressed = true;
    step(&in);
    in = make_in(MIN_MS, 4500);
    step(&in);
    in = make_in(2 * MIN_MS, 2500);                      /* stop: go to COOLDOWN */
    in.start_pressed = true;
    step(&in);
    TEST_ASSERT_EQUAL_INT(DRYER_COOLDOWN, d.state);
    in = make_in(3 * MIN_MS, 4100);                      /* still above 40 C */
    step(&in);
    TEST_ASSERT_EQUAL_INT(DRYER_COOLDOWN, d.state);
    in = make_in(4 * MIN_MS, 3990);                      /* below 40 C */
    step(&in);
    TEST_ASSERT_EQUAL_INT(DRYER_IDLE, d.state);
}

static void test_stop_while_holding_goes_to_cooldown(void) {
    dryer_in_t in = make_in(0u, 4500);
    in.start_pressed = true;
    step(&in);
    in = make_in(0u, 4500);
    step(&in);
    TEST_ASSERT_EQUAL_INT(DRYER_HOLDING, d.state);
    in = make_in(MIN_MS, 4500);
    in.start_pressed = true;
    step(&in);
    TEST_ASSERT_EQUAL_INT(DRYER_COOLDOWN, d.state);
}

static void test_overtemperature_latches_fault_and_cuts_the_heater(void) {
    dryer_in_t in = make_in(0u, 4500);
    in.start_pressed = true;
    step(&in);
    in = make_in(MIN_MS, 9000);
    in.safety_fault = FAULT_OVERTEMP;
    step(&in);
    TEST_ASSERT_EQUAL_INT(DRYER_FAULT, d.state);
    TEST_ASSERT_EQUAL_INT(FAULT_OVERTEMP, out.fault);
    TEST_ASSERT_FALSE(out.heater_enabled);
    TEST_ASSERT_TRUE(out.fan_on);                        /* the fan keeps running to cool the chamber */
}

static void test_fault_stays_latched_until_cool_and_acknowledged(void) {
    dryer_in_t in = make_in(0u, 4500);
    in.start_pressed = true;
    step(&in);
    in = make_in(MIN_MS, 6500);
    in.safety_fault = FAULT_OVERTEMP;
    step(&in);
    in = make_in(2 * MIN_MS, 6500);                      /* the cause is gone, but still 65 C: not yet */
    in.start_pressed = true;
    step(&in);
    TEST_ASSERT_EQUAL_INT(DRYER_FAULT, d.state);
    in = make_in(3 * MIN_MS, 5000);                      /* cool (50 C) and acknowledged: back to IDLE */
    in.start_pressed = true;
    step(&in);
    TEST_ASSERT_EQUAL_INT(DRYER_IDLE, d.state);
    TEST_ASSERT_EQUAL_INT(FAULT_NONE, out.fault);
}

static void test_sensor_fault_while_idle_blocks_start(void) {
    dryer_in_t in = make_in(0u, 2500);
    in.sensor_ok = false;
    in.start_pressed = true;
    step(&in);
    TEST_ASSERT_EQUAL_INT(DRYER_FAULT, d.state);
    TEST_ASSERT_EQUAL_INT(FAULT_SENSOR, out.fault);
    TEST_ASSERT_FALSE(out.heater_enabled);
}

static void test_remaining_minutes_count_down_while_holding(void) {
    dryer_in_t in = make_in(0u, 4500);
    in.start_pressed = true;
    step(&in);
    in = make_in(0u, 4500);
    step(&in);                                           /* HOLDING from t = 0 */
    in = make_in(30 * MIN_MS, 4500);
    step(&in);
    TEST_ASSERT_EQUAL_UINT16(210u, out.remaining_min);   /* 240 minutes minus 30 */
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_starts_idle_with_heater_and_fan_off);
    RUN_TEST(test_material_button_cycles_pla_petg_abs);
    RUN_TEST(test_start_heats_with_the_selected_material);
    RUN_TEST(test_reaching_the_setpoint_starts_the_hold);
    RUN_TEST(test_hold_ends_after_the_drying_time_and_cools_down);
    RUN_TEST(test_cooldown_ends_at_40_degrees);
    RUN_TEST(test_stop_while_holding_goes_to_cooldown);
    RUN_TEST(test_overtemperature_latches_fault_and_cuts_the_heater);
    RUN_TEST(test_fault_stays_latched_until_cool_and_acknowledged);
    RUN_TEST(test_sensor_fault_while_idle_blocks_start);
    RUN_TEST(test_remaining_minutes_count_down_while_holding);
    return UNITY_END();
}
