#include "unity.h"
#include "control.h"

/* Bang-bang control with hysteresis (lesson 115). Setpoint 45.00 C, band 1.00 C either side. */

static bangbang_t b;

void setUp(void) {
    bangbang_init(&b);
}

void tearDown(void) {}

static void test_heats_when_clearly_below_the_band(void) {
    TEST_ASSERT_EQUAL_UINT16(CONTROL_FULL, bangbang_step(&b, true, 4500, 4300));
}

static void test_keeps_its_state_inside_the_band(void) {
    bangbang_step(&b, true, 4500, 4300);                              /* on */
    TEST_ASSERT_EQUAL_UINT16(CONTROL_FULL, bangbang_step(&b, true, 4500, 4520));  /* inside: stays on */
    bangbang_step(&b, true, 4500, 4700);                              /* above the band: off */
    TEST_ASSERT_EQUAL_UINT16(0u, bangbang_step(&b, true, 4500, 4520));            /* inside: stays off */
}

static void test_turns_off_above_the_band(void) {
    bangbang_step(&b, true, 4500, 4300);
    TEST_ASSERT_EQUAL_UINT16(0u, bangbang_step(&b, true, 4500, 4650));   /* 46.50 C: above 46.00 C */
}

static void test_disabled_is_always_off(void) {
    bangbang_step(&b, true, 4500, 4300);
    TEST_ASSERT_EQUAL_UINT16(0u, bangbang_step(&b, false, 4500, 4300));
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_heats_when_clearly_below_the_band);
    RUN_TEST(test_keeps_its_state_inside_the_band);
    RUN_TEST(test_turns_off_above_the_band);
    RUN_TEST(test_disabled_is_always_off);
    return UNITY_END();
}
