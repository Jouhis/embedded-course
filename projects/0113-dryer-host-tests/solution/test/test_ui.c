#include <string.h>
#include "unity.h"
#include "ui.h"

/* The OLED text (lesson 111): the lines are what the learner sees, so they are tested exactly. */

static dryer_t d;
static dryer_out_t out;
static char lines[UI_LINES][UI_LINE_CHARS];

void setUp(void) {
    dryer_init(&d);
    out.heater_enabled = false;
    out.fan_on = false;
    out.setpoint_centi = 4500;
    out.remaining_min = 240u;
    out.fault = FAULT_NONE;
}

void tearDown(void) {}

static void test_idle_screen_shows_material_temperature_and_time(void) {
    ui_compose(&d, &out, 2534, true, lines);
    TEST_ASSERT_EQUAL_STRING("DRYER PLA", lines[0]);
    TEST_ASSERT_EQUAL_STRING("TEMP 25.34 C", lines[1]);
    TEST_ASSERT_EQUAL_STRING("IDLE", lines[2]);
    TEST_ASSERT_EQUAL_STRING("LEFT 240 MIN", lines[3]);
}

static void test_sensor_fault_replaces_the_temperature(void) {
    ui_compose(&d, &out, 0, false, lines);
    TEST_ASSERT_EQUAL_STRING("SENSOR FAULT", lines[1]);
}

static void test_fault_shows_its_code(void) {
    d.state = DRYER_FAULT;
    out.fault = FAULT_OVERTEMP;
    ui_compose(&d, &out, 9100, true, lines);
    TEST_ASSERT_EQUAL_STRING("FAULT 1", lines[2]);
}

static void test_longest_line_fits_the_display(void) {
    d.state = DRYER_COOLDOWN;
    d.material = 2u;                                     /* ABS, the longest name */
    ui_compose(&d, &out, 12345, true, lines);
    for (int i = 0; i < UI_LINES; i++) {
        TEST_ASSERT_TRUE(strlen(lines[i]) <= 21u);       /* 128 pixels / 6 per character = 21 */
    }
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_idle_screen_shows_material_temperature_and_time);
    RUN_TEST(test_sensor_fault_replaces_the_temperature);
    RUN_TEST(test_fault_shows_its_code);
    RUN_TEST(test_longest_line_fits_the_display);
    return UNITY_END();
}
