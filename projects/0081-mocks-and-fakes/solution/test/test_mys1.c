/* test_mys1.c: host tests for the MYS-1 driver, with the bus replaced by FFF fakes.
 *
 * The driver calls i2c_write and i2c_read. FAKE_VALUE_FUNC generates a fake for each
 * one: it records every call (call_count, argN_val, argN_history) and returns a value
 * you choose (return_val, return_val_seq). custom_fake replaces the body, so the fake
 * can behave like the sensor: it keeps a register pointer and a register file. */
#include <string.h>

#include "unity.h"
#include "fff.h"
#include "i2c_bus.h"
#include "mys1.h"

DEFINE_FFF_GLOBALS;
FAKE_VALUE_FUNC(int, i2c_write, uint8_t, const uint8_t *, size_t, bool);
FAKE_VALUE_FUNC(int, i2c_read, uint8_t, uint8_t *, size_t);

/* A fake sensor behind the fake bus. dev_ptr is the register pointer (datasheet 3.2):
 * the first byte of each write sets it, and it increments after every byte. */
static uint8_t dev_regs[0x40];
static uint8_t dev_ptr;
static int status_reads;        /* how many times the driver read STATUS */
static int status_ready_after;  /* STATUS reports DRDY from this poll on */

static int fake_bus_write(uint8_t addr, const uint8_t *data, size_t len, bool stop) {
    (void)addr;
    (void)stop;
    dev_ptr = data[0];
    for (size_t i = 1; i < len; i++) {
        dev_regs[dev_ptr++] = data[i];
    }
    return (int)len;
}

static int fake_bus_read(uint8_t addr, uint8_t *data, size_t len) {
    (void)addr;
    for (size_t i = 0; i < len; i++) {
        if (dev_ptr == MYS1_REG_STATUS) {
            status_reads++;
            data[i] = (status_reads >= status_ready_after) ? MYS1_STATUS_DRDY : 0u;
        } else {
            data[i] = dev_regs[dev_ptr];
        }
        dev_ptr++;
    }
    return (int)len;
}

void setUp(void) {
    RESET_FAKE(i2c_write);
    RESET_FAKE(i2c_read);
    memset(dev_regs, 0, sizeof dev_regs);
    dev_regs[MYS1_REG_WHO_AM_I] = MYS1_WHO_AM_I_VALUE;
    dev_ptr = 0;
    status_reads = 0;
    status_ready_after = 1;     /* data ready on the first poll unless a test changes it */
    i2c_write_fake.custom_fake = fake_bus_write;
    i2c_read_fake.custom_fake = fake_bus_read;
}

void tearDown(void) {}

/* ---- Writing the CTRL register ---- */

static void test_start_sets_measurement_enable(void) {
    TEST_ASSERT_TRUE(mys1_start());
    TEST_ASSERT_EQUAL_UINT(1, i2c_write_fake.call_count);
    TEST_ASSERT_EQUAL_HEX8(MYS1_ADDR, i2c_write_fake.arg0_val);
    TEST_ASSERT_EQUAL_HEX8(MYS1_CTRL_MEAS_EN, dev_regs[MYS1_REG_CTRL]);
}

static void test_start_reports_bus_error(void) {
    /* return_val_seq answers the calls in order. custom_fake would take precedence,
     * so clear it first. */
    static int nack[] = { -1 };
    i2c_write_fake.custom_fake = NULL;
    SET_RETURN_SEQ(i2c_write, nack, 1);
    TEST_ASSERT_FALSE(mys1_start());
}

/* ---- Reading WHO_AM_I: the repeated-start rule is checked on the call history ---- */

static void test_whoami_returns_identity(void) {
    uint8_t id = 0;
    TEST_ASSERT_TRUE(mys1_whoami(&id));
    TEST_ASSERT_EQUAL_HEX8(MYS1_WHO_AM_I_VALUE, id);
}

static void test_whoami_pointer_write_has_no_stop(void) {
    uint8_t id = 0;
    mys1_whoami(&id);
    TEST_ASSERT_EQUAL_UINT(1, i2c_write_fake.call_count);
    TEST_ASSERT_EQUAL_HEX8(MYS1_REG_WHO_AM_I, i2c_write_fake.arg1_val[0]);
    TEST_ASSERT_FALSE(i2c_write_fake.arg3_val);   /* stop = false: repeated start */
    TEST_ASSERT_EQUAL_UINT(1, i2c_read_fake.call_count);
}

static void test_whoami_does_not_read_after_nack(void) {
    static int nack[] = { -1 };
    uint8_t id = 0;
    i2c_write_fake.custom_fake = NULL;
    SET_RETURN_SEQ(i2c_write, nack, 1);
    TEST_ASSERT_FALSE(mys1_whoami(&id));
    TEST_ASSERT_EQUAL_UINT(0, i2c_read_fake.call_count);   /* no read after a failed pointer */
}

/* ---- Reading temperature ---- */

static void test_read_positive_temperature(void) {
    float t = 0.0f;
    dev_regs[MYS1_REG_TEMP_L] = 0xA0;   /* 0x05A0 = 1440 counts = 22.50 degC */
    dev_regs[MYS1_REG_TEMP_L + 1] = 0x05;
    TEST_ASSERT_TRUE(mys1_read_celsius(&t));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 22.5f, t);
}

static void test_read_negative_temperature(void) {
    float t = 0.0f;
    dev_regs[MYS1_REG_TEMP_L] = 0xC0;   /* 0xFFC0 = -64 counts = -1.00 degC */
    dev_regs[MYS1_REG_TEMP_L + 1] = 0xFF;
    TEST_ASSERT_TRUE(mys1_read_celsius(&t));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, -1.0f, t);
}

static void test_read_waits_for_data_ready(void) {
    float t = 0.0f;
    status_ready_after = 3;             /* the sample is ready on the third poll */
    dev_regs[MYS1_REG_TEMP_L] = 0xA0;
    dev_regs[MYS1_REG_TEMP_L + 1] = 0x05;
    TEST_ASSERT_TRUE(mys1_read_celsius(&t));
    TEST_ASSERT_EQUAL_INT(3, status_reads);
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 22.5f, t);
}

static void test_read_times_out_without_hanging(void) {
    float t = 0.0f;
    status_ready_after = 1000;          /* never ready */
    TEST_ASSERT_FALSE(mys1_read_celsius(&t));
    TEST_ASSERT_EQUAL_INT(MYS1_MAX_POLLS, status_reads);
    /* Only the status polls ran: no temperature read was attempted. */
    TEST_ASSERT_EQUAL_UINT(MYS1_MAX_POLLS, i2c_write_fake.call_count);
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_start_sets_measurement_enable);
    RUN_TEST(test_start_reports_bus_error);
    RUN_TEST(test_whoami_returns_identity);
    RUN_TEST(test_whoami_pointer_write_has_no_stop);
    RUN_TEST(test_whoami_does_not_read_after_nack);
    RUN_TEST(test_read_positive_temperature);
    RUN_TEST(test_read_negative_temperature);
    RUN_TEST(test_read_waits_for_data_ready);
    RUN_TEST(test_read_times_out_without_hanging);
    return UNITY_END();
}
