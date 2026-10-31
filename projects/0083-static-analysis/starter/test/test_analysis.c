/* test_analysis.c: host tests for src/analysis.c. The starter's tests do not cover
 * checksum() or the terminate path of frame_build(). Static analysis finds those. */
#include "unity.h"
#include "analysis.h"

void setUp(void) {}
void tearDown(void) {}

static void test_sum_of_three_samples(void) {
    const int16_t s[] = { 1, 2, 3 };
    TEST_ASSERT_EQUAL_INT32(6, sum_samples(s, 3));
}

static void test_first_negative_index(void) {
    const int16_t s[] = { 4, -2, 7 };
    TEST_ASSERT_EQUAL_INT(1, find_first_negative(s, 3));
}

static void test_no_negative_returns_minus_one(void) {
    const int16_t s[] = { 1, 2 };
    TEST_ASSERT_EQUAL_INT(-1, find_first_negative(s, 2));
}

static void test_status_idle(void) {
    TEST_ASSERT_EQUAL_STRING("idle", status_name(0));
}

static void test_status_fault(void) {
    TEST_ASSERT_EQUAL_STRING("fault", status_name(2));
}

static void test_frame_without_marker(void) {
    uint8_t out[4] = { 9, 9, 9, 9 };
    frame_build(0x12, 0x34, 0, out);
    TEST_ASSERT_EQUAL_HEX8(0x12, out[0]);
    TEST_ASSERT_EQUAL_HEX8(0x34, out[1]);
    TEST_ASSERT_EQUAL_HEX8(0x00, out[2]);
    TEST_ASSERT_EQUAL_HEX8(0x00, out[3]);
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_sum_of_three_samples);
    RUN_TEST(test_first_negative_index);
    RUN_TEST(test_no_negative_returns_minus_one);
    RUN_TEST(test_status_idle);
    RUN_TEST(test_status_fault);
    RUN_TEST(test_frame_without_marker);
    return UNITY_END();
}
