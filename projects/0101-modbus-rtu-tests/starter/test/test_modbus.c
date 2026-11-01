/* Host tests for the CRC-16/MODBUS and the Modbus RTU frame handler.
 * The expected frames were computed by an independent Python implementation
 * (projects/0101-modbus-rtu-slave/master_modbus.py), so the tests do not share code with the C. */
#include "unity.h"
#include "crc16.h"
#include "modbus.h"

static uint16_t regs[3];
static modbus_slave_t slave;
static uint8_t rsp[MODBUS_MAX_FRAME];

void setUp(void) {
    regs[0] = 0x1234u;
    regs[1] = 0xABCDu;
    regs[2] = 0x0007u;
    slave.address = 1u;
    slave.regs = regs;
    slave.nregs = 3u;
}

void tearDown(void) {}

static void test_crc_modbus_check_value(void) {
    /* The standard check value for CRC-16/MODBUS over ASCII "123456789". */
    TEST_ASSERT_EQUAL_HEX16(0x4B37u, crc16_modbus((const uint8_t *)"123456789", 9));
}

static void test_crc_modbus_empty_is_init(void) {
    TEST_ASSERT_EQUAL_HEX16(0xFFFFu, crc16_modbus((const uint8_t *)"", 0));
}

static void test_read_two_registers(void) {
    static const uint8_t req[] = {0x01, 0x03, 0x00, 0x00, 0x00, 0x02, 0xC4, 0x0B};
    static const uint8_t expect[] = {0x01, 0x03, 0x04, 0x12, 0x34, 0xAB, 0xCD, 0x00, 0x20};
    size_t n = modbus_process(&slave, req, sizeof req, rsp);
    TEST_ASSERT_EQUAL_UINT(sizeof expect, n);
    TEST_ASSERT_EQUAL_UINT8_ARRAY(expect, rsp, n);
}

static void test_write_single_register_echoes_request(void) {
    static const uint8_t req[] = {0x01, 0x06, 0x00, 0x01, 0x00, 0x2A, 0x59, 0xD5};
    size_t n = modbus_process(&slave, req, sizeof req, rsp);
    TEST_ASSERT_EQUAL_UINT(8u, n);
    TEST_ASSERT_EQUAL_UINT8_ARRAY(req, rsp, n);
    TEST_ASSERT_EQUAL_HEX16(0x002Au, regs[1]);
}

static void test_other_address_gets_no_reply(void) {
    static const uint8_t req[] = {0x02, 0x03, 0x00, 0x00, 0x00, 0x02, 0xC4, 0x38};
    TEST_ASSERT_EQUAL_UINT(0u, modbus_process(&slave, req, sizeof req, rsp));
}

static void test_bad_crc_gets_no_reply(void) {
    /* The same request as the read test, with the last CRC byte changed. */
    static const uint8_t req[] = {0x01, 0x03, 0x00, 0x00, 0x00, 0x02, 0xC4, 0x0A};
    TEST_ASSERT_EQUAL_UINT(0u, modbus_process(&slave, req, sizeof req, rsp));
}

static void test_read_past_end_is_illegal_address(void) {
    static const uint8_t req[] = {0x01, 0x03, 0x00, 0x05, 0x00, 0x01, 0x94, 0x0B};
    static const uint8_t expect[] = {0x01, 0x83, 0x02, 0xC0, 0xF1};
    size_t n = modbus_process(&slave, req, sizeof req, rsp);
    TEST_ASSERT_EQUAL_UINT(sizeof expect, n);
    TEST_ASSERT_EQUAL_UINT8_ARRAY(expect, rsp, n);
}

static void test_zero_quantity_is_illegal_value(void) {
    static const uint8_t req[] = {0x01, 0x03, 0x00, 0x00, 0x00, 0x00, 0x45, 0xCA};
    size_t n = modbus_process(&slave, req, sizeof req, rsp);
    TEST_ASSERT_EQUAL_UINT(5u, n);
    TEST_ASSERT_EQUAL_UINT8(0x83u, rsp[1]);
    TEST_ASSERT_EQUAL_UINT8(MODBUS_EXC_ILLEGAL_VALUE, rsp[2]);
}

static void test_unknown_function_is_illegal_function(void) {
    static const uint8_t req[] = {0x01, 0x10, 0x00, 0x00, 0x00, 0x01, 0x01, 0xC9};
    static const uint8_t expect[] = {0x01, 0x90, 0x01, 0x8D, 0xC0};
    size_t n = modbus_process(&slave, req, sizeof req, rsp);
    TEST_ASSERT_EQUAL_UINT(sizeof expect, n);
    TEST_ASSERT_EQUAL_UINT8_ARRAY(expect, rsp, n);
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_crc_modbus_check_value);
    RUN_TEST(test_crc_modbus_empty_is_init);
    RUN_TEST(test_read_two_registers);
    RUN_TEST(test_write_single_register_echoes_request);
    RUN_TEST(test_other_address_gets_no_reply);
    RUN_TEST(test_bad_crc_gets_no_reply);
    RUN_TEST(test_read_past_end_is_illegal_address);
    RUN_TEST(test_zero_quantity_is_illegal_value);
    RUN_TEST(test_unknown_function_is_illegal_function);
    return UNITY_END();
}
