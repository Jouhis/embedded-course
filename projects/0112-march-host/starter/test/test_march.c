#include "unity.h"
#include "march.h"
#include "ram_sim.h"

/* Fault injection: a stuck bit is planted in the simulated RAM, then the test must find it.
 * A test that only checks healthy memory passes even when the code is broken, so each fault
 * case below is a test that would fail if march_c_minus() returned -1 too early. */

static ram_sim_t ram;
static mem_iface_t iface;

void setUp(void) {
    ram_sim_init(&ram);
    iface = ram_sim_iface(&ram);
}

void tearDown(void) {}

static void test_healthy_ram_passes(void) {
    TEST_ASSERT_EQUAL_INT(-1, march_c_minus(&iface));
}

static void test_stuck_at_zero_bit_is_detected(void) {
    ram_sim_stick_bit(&ram, 17, 3, 0);               /* bit 3 of address 17 always reads 0 */
    TEST_ASSERT_EQUAL_INT(17, march_c_minus(&iface));
}

static void test_stuck_at_one_bit_is_detected(void) {
    ram_sim_stick_bit(&ram, 40, 0, 1);               /* bit 0 of address 40 always reads 1 */
    TEST_ASSERT_EQUAL_INT(40, march_c_minus(&iface));
}

static void test_fault_at_the_last_address_is_detected(void) {
    ram_sim_stick_bit(&ram, RAM_SIM_SIZE - 1u, 7, 0);
    TEST_ASSERT_EQUAL_INT((int)RAM_SIM_SIZE - 1, march_c_minus(&iface));
}

static void test_several_bits_in_one_byte_are_detected(void) {
    ram_sim_stick_bit(&ram, 5, 1, 1);
    ram_sim_stick_bit(&ram, 5, 6, 0);
    TEST_ASSERT_EQUAL_INT(5, march_c_minus(&iface));
}

static void test_stuck_bit_reads_back_as_forced(void) {
    /* Sanity check on the simulator itself: the injected fault must be visible to a plain read. */
    ram_sim_write(&ram, 9, 0xFFu);
    ram_sim_stick_bit(&ram, 9, 4, 0);
    TEST_ASSERT_EQUAL_HEX8(0xEFu, ram_sim_read(&ram, 9));
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_healthy_ram_passes);
    RUN_TEST(test_stuck_at_zero_bit_is_detected);
    RUN_TEST(test_stuck_at_one_bit_is_detected);
    RUN_TEST(test_fault_at_the_last_address_is_detected);
    RUN_TEST(test_several_bits_in_one_byte_are_detected);
    RUN_TEST(test_stuck_bit_reads_back_as_forced);
    return UNITY_END();
}
