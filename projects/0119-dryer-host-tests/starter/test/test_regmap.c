#include "unity.h"
#include "dryer.h"
#include "regmap.h"
#include "materials.h"
#include "crc16.h"
#include "modbus.h"

/* The Modbus register map (lesson 117): what the master reads and writes. The fields are the
 * contract with master_dryer.py, so each one is tested with a known value. */

static dryer_t d;
static dryer_out_t out;
static uint16_t regs[REG_COUNT];

void setUp(void) {
    dryer_init(&d);
    out.heater_enabled = true;
    out.fan_on = true;
    out.setpoint_centi = 6500;     /* PETG */
    out.remaining_min = 200u;
    out.fault = FAULT_NONE;
    for (int i = 0; i < REG_COUNT; i++) {
        regs[i] = 0xEEEEu;         /* a sentinel: every field must be written */
    }
}

void tearDown(void) {}

static void test_publish_writes_every_read_only_register(void) {
    d.state = DRYER_HOLDING;
    d.material = 1u;
    regmap_publish(regs, &d, &out, 6512, 1000u);
    TEST_ASSERT_EQUAL_UINT16(65u, regs[REG_SETPOINT_C]);
    TEST_ASSERT_EQUAL_UINT16(2u, regs[REG_STATE]);          /* HOLDING */
    TEST_ASSERT_EQUAL_UINT16(651u, regs[REG_TEMP_X10]);     /* 65.12 C in tenths: 651 */
    TEST_ASSERT_EQUAL_UINT16(100u, regs[REG_PWM_PCT]);
    TEST_ASSERT_EQUAL_UINT16(0u, regs[REG_FAULT_CODE]);
    TEST_ASSERT_EQUAL_UINT16(200u, regs[REG_REMAINING_MIN]);
    TEST_ASSERT_EQUAL_UINT16(1u, regs[REG_MATERIAL]);
}

static void test_negative_temperature_is_twos_complement(void) {
    regmap_publish(regs, &d, &out, -500, 0u);              /* -5.00 C */
    TEST_ASSERT_EQUAL_HEX16(0xFFCEu, regs[REG_TEMP_X10]);  /* -50 tenths */
}

static void test_fault_code_is_published(void) {
    out.fault = FAULT_RUNAWAY;
    regmap_publish(regs, &d, &out, 2500, 0u);
    TEST_ASSERT_EQUAL_UINT16(3u, regs[REG_FAULT_CODE]);
}

static void test_start_stop_command_is_taken_once(void) {
    regs[REG_COMMAND] = REGMAP_CMD_START_STOP;
    TEST_ASSERT_TRUE(regmap_take_command(regs));
    TEST_ASSERT_EQUAL_UINT16(0u, regs[REG_COMMAND]);
    TEST_ASSERT_FALSE(regmap_take_command(regs));
}

static void test_other_command_values_are_cleared_without_action(void) {
    regs[REG_COMMAND] = 7u;
    TEST_ASSERT_FALSE(regmap_take_command(regs));
    TEST_ASSERT_EQUAL_UINT16(0u, regs[REG_COMMAND]);
}

/* The material register reaches the state machine: a Modbus write selects it while IDLE only. */
static void test_modbus_material_is_applied_only_while_idle(void) {
    dryer_in_t in = { .now_ms = 0u, .temp_centi = 2500, .sensor_ok = true };
    in.material_set_valid = true;
    in.material_set = 2u;                                  /* ABS */
    dryer_step(&d, &in, &out);
    TEST_ASSERT_EQUAL_UINT8(2u, d.material);
    TEST_ASSERT_EQUAL_INT(8000, out.setpoint_centi);

    in.start_pressed = true;                               /* start: HEATING with ABS */
    dryer_step(&d, &in, &out);
    TEST_ASSERT_EQUAL_INT(DRYER_HEATING, d.state);

    in.start_pressed = false;
    in.material_set = 0u;                                  /* ignored: not idle */
    dryer_step(&d, &in, &out);
    TEST_ASSERT_EQUAL_UINT8(2u, d.material);
}

static void test_write_to_read_only_register_is_refused(void) {
    TEST_ASSERT_EQUAL_UINT8(MODBUS_EXC_ILLEGAL_ADDRESS, regmap_check_write(REG_TEMP_X10, 999u));
    TEST_ASSERT_EQUAL_UINT8(MODBUS_EXC_ILLEGAL_ADDRESS, regmap_check_write(REG_STATE, 0u));
}

static void test_out_of_range_values_are_refused(void) {
    TEST_ASSERT_EQUAL_UINT8(MODBUS_EXC_ILLEGAL_VALUE, regmap_check_write(REG_COMMAND, 7u));
    TEST_ASSERT_EQUAL_UINT8(MODBUS_EXC_ILLEGAL_VALUE, regmap_check_write(REG_MATERIAL, MATERIAL_COUNT));
}

static void test_valid_writes_are_allowed(void) {
    TEST_ASSERT_EQUAL_UINT8(0u, regmap_check_write(REG_COMMAND, REGMAP_CMD_START_STOP));
    TEST_ASSERT_EQUAL_UINT8(0u, regmap_check_write(REG_MATERIAL, 0u));
}

static void test_slave_answers_exception_02_for_read_only_write(void) {
    uint16_t regs[REG_COUNT] = {0};
    modbus_slave_t slave = { 1u, regs, REG_COUNT, regmap_check_write };
    uint8_t req[8] = { 1u, 0x06u, 0x00u, (uint8_t)REG_TEMP_X10, 0x03u, 0xE7u, 0u, 0u };
    uint16_t crc = crc16_modbus(req, 6u);
    req[6] = (uint8_t)(crc & 0xFFu);
    req[7] = (uint8_t)(crc >> 8);
    uint8_t rsp[MODBUS_MAX_FRAME];
    size_t n = modbus_process(&slave, req, sizeof req, rsp);
    TEST_ASSERT_EQUAL_size_t(5u, n);                                   /* addr, fc|0x80, code, CRC */
    TEST_ASSERT_EQUAL_HEX8(0x86u, rsp[1]);
    TEST_ASSERT_EQUAL_HEX8(MODBUS_EXC_ILLEGAL_ADDRESS, rsp[2]);
    TEST_ASSERT_EQUAL_UINT16(0u, regs[REG_TEMP_X10]);                  /* unchanged */
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_publish_writes_every_read_only_register);
    RUN_TEST(test_negative_temperature_is_twos_complement);
    RUN_TEST(test_fault_code_is_published);
    RUN_TEST(test_start_stop_command_is_taken_once);
    RUN_TEST(test_other_command_values_are_cleared_without_action);
    RUN_TEST(test_modbus_material_is_applied_only_while_idle);
    RUN_TEST(test_write_to_read_only_register_is_refused);
    RUN_TEST(test_out_of_range_values_are_refused);
    RUN_TEST(test_valid_writes_are_allowed);
    RUN_TEST(test_slave_answers_exception_02_for_read_only_write);
    return UNITY_END();
}
