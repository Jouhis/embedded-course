#include "unity.h"
#include "fff.h"
#include "buttons.h"
#include "hal.h"
#include "sensor.h"

/* The driver services with the hardware replaced by FFF fakes (lesson 81). The services in
 * app/sensor.c and app/buttons.c call hal.h only, so the fakes stand in for the Blue Pill. */

DEFINE_FFF_GLOBALS;
FAKE_VALUE_FUNC(uint16_t, hal_adc_read_ntc);
FAKE_VALUE_FUNC(uint8_t, hal_button_pressed, hal_button_t);

/* The button level is scripted per test through a custom fake, so each sample sees a level. */
static uint8_t start_level;
static uint8_t material_level;

static uint8_t level_of(hal_button_t b) {
    return (b == HAL_BUTTON_START) ? start_level : material_level;
}

static buttons_t buttons;

void setUp(void) {
    RESET_FAKE(hal_adc_read_ntc);
    RESET_FAKE(hal_button_pressed);
    FFF_RESET_HISTORY();
    hal_button_pressed_fake.custom_fake = level_of;
    start_level = 0;
    material_level = 0;
    buttons_init(&buttons);
}

void tearDown(void) {}

static void test_sensor_read_converts_a_good_reading(void) {
    hal_adc_read_ntc_fake.return_val = 2048u;          /* about 25 C */
    uint16_t raw = 0u;
    int32_t centi = 0;
    TEST_ASSERT_TRUE(sensor_read(&raw, &centi));
    TEST_ASSERT_EQUAL_UINT16(2048u, raw);
    TEST_ASSERT_INT32_WITHIN(5, 2499, centi);
    TEST_ASSERT_EQUAL_INT(1, hal_adc_read_ntc_fake.call_count);
}

static void test_sensor_read_reports_an_open_ntc(void) {
    hal_adc_read_ntc_fake.return_val = 4095u;          /* OUT pulled to 3.3 V: the NTC is open */
    uint16_t raw = 0u;
    int32_t centi = 0;
    TEST_ASSERT_FALSE(sensor_read(&raw, &centi));
    TEST_ASSERT_EQUAL_UINT16(4095u, raw);              /* the raw code is still reported for the log */
}

static void test_a_held_press_is_one_event(void) {
    start_level = 1;
    for (int i = 0; i < 10; i++) {
        buttons_sample(&buttons);
    }
    TEST_ASSERT_TRUE(buttons_take_start(&buttons));
    TEST_ASSERT_FALSE(buttons_take_start(&buttons));   /* the event is consumed; holding adds no more */
}

static void test_bounce_is_not_a_press(void) {
    uint8_t bounce[] = { 1, 0, 1, 0, 1, 0 };
    for (unsigned i = 0; i < sizeof bounce; i++) {
        start_level = bounce[i];
        buttons_sample(&buttons);
    }
    TEST_ASSERT_FALSE(buttons_take_start(&buttons));
}

static void test_material_button_is_independent_of_start(void) {
    material_level = 1;
    for (int i = 0; i < 4; i++) {
        buttons_sample(&buttons);
    }
    TEST_ASSERT_FALSE(buttons_take_start(&buttons));
    TEST_ASSERT_TRUE(buttons_take_material(&buttons));
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_sensor_read_converts_a_good_reading);
    RUN_TEST(test_sensor_read_reports_an_open_ntc);
    RUN_TEST(test_a_held_press_is_one_event);
    RUN_TEST(test_bounce_is_not_a_press);
    RUN_TEST(test_material_button_is_independent_of_start);
    return UNITY_END();
}
