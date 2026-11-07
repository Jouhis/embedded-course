/* test_settings.c: the settings store against the fake flash.
 *
 * Each test starts from blank flash. A "reboot" needs no code: the store keeps nothing in RAM,
 * so the next settings_load() sees only what the flash holds, as after a real power-up.
 */
#include "unity.h"
#include "fake_flash.h"
#include "settings.h"

void setUp(void) { fake_flash_reset(); }
void tearDown(void) {}

/* Saves with a power cut armed. Returns true if the power went during the save. */
static bool save_with_cut(uint16_t setpoint_c, fake_flash_cut_t when) {
    fake_flash_cut(when);
    if (setjmp(fake_flash_power_back) == 0) {
        settings_save(setpoint_c);
        fake_flash_cut(CUT_NONE);
        return false;
    }
    return true;   /* the power came back: carry on as after a reboot */
}

static uint16_t load(void) {
    uint16_t sp = 0;
    settings_load(&sp);
    return sp;
}

static void save_range(uint16_t first, uint16_t last) {
    for (uint16_t v = first; v <= last; v++) {
        settings_save(v);
    }
}

static void test_blank_flash_gives_the_default(void) {
    uint16_t sp = 0;
    TEST_ASSERT_FALSE(settings_load(&sp));
    TEST_ASSERT_EQUAL_UINT16(DEFAULT_SETPOINT_C, sp);
}

static void test_a_saved_setpoint_loads_back(void) {
    settings_save(60);
    uint16_t sp = 0;
    TEST_ASSERT_TRUE(settings_load(&sp));
    TEST_ASSERT_EQUAL_UINT16(60, sp);
}

static void test_the_newest_save_wins(void) {
    save_range(60, 62);
    TEST_ASSERT_EQUAL_UINT16(62, load());
}

static void test_21_saves_cost_at_most_2_erases(void) {
    save_range(60, 80);
    TEST_ASSERT_LESS_OR_EQUAL_UINT(2, fake_flash_erases(0) + fake_flash_erases(1));
}

static void test_100_saves_wrap_around_and_share_the_wear(void) {
    save_range(1, 100);
    TEST_ASSERT_EQUAL_UINT16(100, load());
    TEST_ASSERT_LESS_OR_EQUAL_UINT(4, fake_flash_erases(0));
    TEST_ASSERT_LESS_OR_EQUAL_UINT(4, fake_flash_erases(1));
}

static void test_a_cut_during_a_write_keeps_the_previous_setpoint(void) {
    save_range(60, 80);
    TEST_ASSERT_TRUE(save_with_cut(81, CUT_ON_PROGRAM));
    TEST_ASSERT_EQUAL_UINT16(80, load());
}

static void test_a_cut_after_an_erase_keeps_the_previous_setpoint(void) {
    save_range(60, 75);   /* 16 saves fill the first sector, so the next save erases */
    TEST_ASSERT_TRUE(save_with_cut(76, CUT_ON_ERASE));
    TEST_ASSERT_EQUAL_UINT16(75, load());
}

static void test_a_save_after_a_cut_sticks(void) {
    save_range(60, 80);
    TEST_ASSERT_TRUE(save_with_cut(81, CUT_ON_PROGRAM));
    settings_save(82);
    TEST_ASSERT_EQUAL_UINT16(82, load());
    settings_save(83);
    TEST_ASSERT_EQUAL_UINT16(83, load());
}

static void test_a_flipped_bit_falls_back_to_the_older_record(void) {
    save_range(60, 61);
    /* 61 is in the second slot; its setpoint is at byte 8 of the record. */
    fake_flash_flip_bit(FLASH_PORT_PAGE_BYTES + 8u, 3);
    TEST_ASSERT_EQUAL_UINT16(60, load());
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_blank_flash_gives_the_default);
    RUN_TEST(test_a_saved_setpoint_loads_back);
    RUN_TEST(test_the_newest_save_wins);
    RUN_TEST(test_21_saves_cost_at_most_2_erases);
    RUN_TEST(test_100_saves_wrap_around_and_share_the_wear);
    RUN_TEST(test_a_cut_during_a_write_keeps_the_previous_setpoint);
    RUN_TEST(test_a_cut_after_an_erase_keeps_the_previous_setpoint);
    RUN_TEST(test_a_save_after_a_cut_sticks);
    RUN_TEST(test_a_flipped_bit_falls_back_to_the_older_record);
    return UNITY_END();
}
