#include "unity.h"
#include "debounce.h"

// Each test is one behaviour of the module, written before the code that makes it pass.
// setUp() runs before every test, so no test sees the state a previous test left behind.

static debounce_t d;

void setUp(void) {
    debounce_init(&d);
}

void tearDown(void) {
}

static void test_starts_released(void) {
    TEST_ASSERT_EQUAL_UINT8(0, debounce_update(&d, 0));
}

static void test_one_press_sample_is_not_enough(void) {
    TEST_ASSERT_EQUAL_UINT8(0, debounce_update(&d, 1));
}

static void test_three_presses_confirm_the_press(void) {
    debounce_update(&d, 1);
    debounce_update(&d, 1);
    TEST_ASSERT_EQUAL_UINT8(1, debounce_update(&d, 1));
}

static void test_bounce_never_confirms(void) {
    TEST_ASSERT_EQUAL_UINT8(0, debounce_update(&d, 1));
    TEST_ASSERT_EQUAL_UINT8(0, debounce_update(&d, 0));
    TEST_ASSERT_EQUAL_UINT8(0, debounce_update(&d, 1));
    TEST_ASSERT_EQUAL_UINT8(0, debounce_update(&d, 0));
    TEST_ASSERT_EQUAL_UINT8(0, debounce_update(&d, 1));
    TEST_ASSERT_EQUAL_UINT8(0, debounce_update(&d, 0));
}

static void test_release_needs_three_lows(void) {
    debounce_update(&d, 1);
    debounce_update(&d, 1);
    debounce_update(&d, 1);
    TEST_ASSERT_EQUAL_UINT8(1, debounce_update(&d, 0));
    TEST_ASSERT_EQUAL_UINT8(1, debounce_update(&d, 0));
    TEST_ASSERT_EQUAL_UINT8(0, debounce_update(&d, 0));
}

static void test_long_press_does_not_add_extra_credit(void) {
    for (int i = 0; i < 10; i++) {
        debounce_update(&d, 1);
    }
    /* The counter saturates at DEBOUNCE_MAX, so release still takes exactly three lows. */
    debounce_update(&d, 0);
    debounce_update(&d, 0);
    TEST_ASSERT_EQUAL_UINT8(0, debounce_update(&d, 0));
}

static void test_bounce_during_press_keeps_it_pressed(void) {
    debounce_update(&d, 1);
    debounce_update(&d, 1);
    debounce_update(&d, 1);
    debounce_update(&d, 0);
    debounce_update(&d, 1);
    debounce_update(&d, 0);
    TEST_ASSERT_EQUAL_UINT8(1, debounce_update(&d, 1));
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_starts_released);
    RUN_TEST(test_one_press_sample_is_not_enough);
    RUN_TEST(test_three_presses_confirm_the_press);
    RUN_TEST(test_bounce_never_confirms);
    RUN_TEST(test_release_needs_three_lows);
    RUN_TEST(test_long_press_does_not_add_extra_credit);
    RUN_TEST(test_bounce_during_press_keeps_it_pressed);
    return UNITY_END();
}
