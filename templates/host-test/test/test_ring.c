#include "unity.h"
#include "fff.h"
#include "ring.h"

DEFINE_FFF_GLOBALS;
/* An example fake: a hardware function the code under test might call. */
FAKE_VALUE_FUNC(int, hal_gpio_read, int);

static ring_t ring;

void setUp(void) { ring_init(&ring); RESET_FAKE(hal_gpio_read); }
void tearDown(void) {}

static void test_get_from_empty_ring_fails(void) {
    uint8_t value;
    TEST_ASSERT_FALSE(ring_get(&ring, &value));
}

static void test_ring_holds_size_minus_one(void) {
    for (uint8_t i = 0; i < RING_SIZE - 1u; i++) {
        TEST_ASSERT_TRUE(ring_put(&ring, i));
    }
    TEST_ASSERT_FALSE(ring_put(&ring, 99));
}

static void test_values_come_out_in_order(void) {
    uint8_t value;
    ring_put(&ring, 10);
    ring_put(&ring, 20);
    TEST_ASSERT_TRUE(ring_get(&ring, &value));
    TEST_ASSERT_EQUAL_UINT8(10, value);
    TEST_ASSERT_TRUE(ring_get(&ring, &value));
    TEST_ASSERT_EQUAL_UINT8(20, value);
}

static void test_fake_records_calls(void) {
    hal_gpio_read_fake.return_val = 1;
    TEST_ASSERT_EQUAL_INT(1, hal_gpio_read(3));
    TEST_ASSERT_EQUAL_UINT(1, hal_gpio_read_fake.call_count);
    TEST_ASSERT_EQUAL_INT(3, hal_gpio_read_fake.arg0_val);
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_get_from_empty_ring_fails);
    RUN_TEST(test_ring_holds_size_minus_one);
    RUN_TEST(test_values_come_out_in_order);
    RUN_TEST(test_fake_records_calls);
    return UNITY_END();
}
