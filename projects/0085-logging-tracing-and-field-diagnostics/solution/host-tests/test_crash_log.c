/* test_crash_log.c: host tests for the crash log ring (lesson 85). */
#include <string.h>

#include "unity.h"
#include "crash_log.h"

static crash_log_t log_ram;   /* stands in for the .noinit RAM on the PC */

void setUp(void) {
    memset(&log_ram, 0xA5, sizeof log_ram);   /* junk, like power-on RAM */
}
void tearDown(void) {}

static void test_power_on_junk_is_cleared(void) {
    TEST_ASSERT_FALSE(crash_log_boot(&log_ram, 0u));
    TEST_ASSERT_EQUAL_UINT32(CRASH_LOG_MAGIC, log_ram.magic);
    TEST_ASSERT_EQUAL_UINT32(0u, log_ram.count);
    TEST_ASSERT_EQUAL_UINT32(1u, log_ram.boot_count);
}

static void test_lines_survive_a_reset(void) {
    crash_log_boot(&log_ram, 0u);
    crash_log_add(&log_ram, "tick 1");
    crash_log_add(&log_ram, "tick 2");
    TEST_ASSERT_TRUE(crash_log_boot(&log_ram, 0x10000000u));   /* second boot, same RAM */
    TEST_ASSERT_EQUAL_UINT32(2u, log_ram.boot_count);
    TEST_ASSERT_EQUAL_UINT32(0x10000000u, log_ram.reset_flags);
    TEST_ASSERT_EQUAL_STRING("tick 1", crash_log_line(&log_ram, 0));
    TEST_ASSERT_EQUAL_STRING("tick 2", crash_log_line(&log_ram, 1));
    TEST_ASSERT_NULL(crash_log_line(&log_ram, 2));
}

static void test_long_line_is_cut(void) {
    crash_log_boot(&log_ram, 0u);
    crash_log_add(&log_ram, "0123456789012345678901234567890123456789");
    TEST_ASSERT_EQUAL_STRING("01234567890123456789012", crash_log_line(&log_ram, 0));
    TEST_ASSERT_EQUAL_UINT32(23u, strlen(crash_log_line(&log_ram, 0)));
}

static void test_ring_keeps_the_newest_lines(void) {
    char text[16];
    crash_log_boot(&log_ram, 0u);
    for (unsigned i = 0; i < 10u; i++) {   /* 10 lines into a ring of 8 */
        strcpy(text, "line ");
        text[5] = (char)('0' + i);
        text[6] = '\0';
        crash_log_add(&log_ram, text);
    }
    TEST_ASSERT_EQUAL_UINT32(CRASH_LOG_LINES, log_ram.count);
    TEST_ASSERT_EQUAL_STRING("line 2", crash_log_line(&log_ram, 0));   /* oldest kept */
    TEST_ASSERT_EQUAL_STRING("line 9", crash_log_line(&log_ram, 7));   /* newest */
}

static void test_line_order_after_wrap(void) {
    /* Three lines after the ring has wrapped: the oldest sits in the middle of the array. */
    char text[16];
    crash_log_boot(&log_ram, 0u);
    for (unsigned i = 0; i < 9u; i++) {
        strcpy(text, "line ");
        text[5] = (char)('0' + i);
        text[6] = '\0';
        crash_log_add(&log_ram, text);
    }
    TEST_ASSERT_EQUAL_STRING("line 1", crash_log_line(&log_ram, 0));
    TEST_ASSERT_EQUAL_STRING("line 8", crash_log_line(&log_ram, 7));
}

static void test_corrupt_indices_are_cleared(void) {
    crash_log_boot(&log_ram, 0u);
    log_ram.head = 99u;   /* impossible: head must be below CRASH_LOG_LINES */
    TEST_ASSERT_FALSE(crash_log_boot(&log_ram, 0u));
    TEST_ASSERT_EQUAL_UINT32(0u, log_ram.count);
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_power_on_junk_is_cleared);
    RUN_TEST(test_lines_survive_a_reset);
    RUN_TEST(test_long_line_is_cut);
    RUN_TEST(test_ring_keeps_the_newest_lines);
    RUN_TEST(test_line_order_after_wrap);
    RUN_TEST(test_corrupt_indices_are_cleared);
    return UNITY_END();
}
