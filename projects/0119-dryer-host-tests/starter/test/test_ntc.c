#include "unity.h"
#include "ntc.h"

/* The NTC conversion (lesson 114). The expected values come from an independent calculation of
 * the same Beta equation (Python, double precision): raw 1000 -> 52.80 C, raw 2048 -> 24.99 C,
 * raw 3000 -> 3.92 C. The tolerance is 0.05 C, which is the float rounding plus the ADC step. */

void setUp(void) {}
void tearDown(void) {}

static int32_t centi_of(uint16_t raw) {
    int32_t c = -99999;
    TEST_ASSERT_TRUE(ntc_centi_from_raw(raw, &c));
    return c;
}

static void test_half_scale_is_about_25_degrees(void) {
    /* A divider with equal resistors is at R_ntc = 10 kOhm, which is the 25 C reference point. */
    TEST_ASSERT_INT32_WITHIN(5, 2499, centi_of(2048));
}

static void test_known_value_hot(void) {
    TEST_ASSERT_INT32_WITHIN(5, 5280, centi_of(1000));
}

static void test_known_value_cold(void) {
    TEST_ASSERT_INT32_WITHIN(5, 392, centi_of(3000));
}

static void test_low_code_is_hot_high_code_is_cold(void) {
    /* The NTC falls in resistance as it warms, so the divider's OUT node falls: a lower code is hotter. */
    TEST_ASSERT_TRUE(centi_of(1000) > centi_of(2000));
}

static void test_shorted_sensor_is_a_fault(void) {
    int32_t c = 0;
    TEST_ASSERT_FALSE(ntc_centi_from_raw(0u, &c));
    TEST_ASSERT_FALSE(ntc_centi_from_raw(15u, &c));
}

static void test_open_sensor_is_a_fault(void) {
    int32_t c = 0;
    TEST_ASSERT_FALSE(ntc_centi_from_raw(4080u, &c));
    TEST_ASSERT_FALSE(ntc_centi_from_raw(4095u, &c));
}

static void test_limits_are_valid_readings(void) {
    int32_t c = 0;
    TEST_ASSERT_TRUE(ntc_centi_from_raw(16u, &c));     /* the lowest valid code */
    TEST_ASSERT_TRUE(ntc_centi_from_raw(4079u, &c));   /* the highest valid code */
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_half_scale_is_about_25_degrees);
    RUN_TEST(test_known_value_hot);
    RUN_TEST(test_known_value_cold);
    RUN_TEST(test_low_code_is_hot_high_code_is_cold);
    RUN_TEST(test_shorted_sensor_is_a_fault);
    RUN_TEST(test_open_sensor_is_a_fault);
    RUN_TEST(test_limits_are_valid_readings);
    return UNITY_END();
}
