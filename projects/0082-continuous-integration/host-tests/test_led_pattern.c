/* test_led_pattern.c: host unit tests for src/led_pattern.c.
 * Runs on the PC with the MinGW or system gcc. No hardware, no simulator. */
#include "unity.h"
#include "led_pattern.h"

void setUp(void) {}
void tearDown(void) {}

static void test_even_period_gives_half(void) {
    TEST_ASSERT_EQUAL_UINT32(500U, led_half_period_ms(1000U));
}

static void test_odd_period_rounds_down(void) {
    TEST_ASSERT_EQUAL_UINT32(2U, led_half_period_ms(5U));
}

static void test_never_returns_zero(void) {
    TEST_ASSERT_EQUAL_UINT32(1U, led_half_period_ms(0U));
    TEST_ASSERT_EQUAL_UINT32(1U, led_half_period_ms(1U));
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_even_period_gives_half);
    RUN_TEST(test_odd_period_rounds_down);
    RUN_TEST(test_never_returns_zero);
    return UNITY_END();
}
