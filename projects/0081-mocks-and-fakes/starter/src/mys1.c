/* mys1.c: driver for the MYS-1 sensor. It uses only i2c_write and i2c_read,
 * so the host tests can fake the bus (lesson 81).
 *
 * reg_write and reg_read are done for you. Your job is the three public functions
 * at the bottom. The tests in test/test_mys1.c say exactly what each one must do. */
#include <stddef.h>

#include "i2c_bus.h"
#include "mys1.h"

#define TEMP_LSB_PER_C  64.0f   /* datasheet section 4.1: 1/64 degC per count */

/* Write one register: a two-byte frame [pointer, value], then a STOP. */
static bool reg_write(uint8_t reg, uint8_t value) {
    uint8_t frame[2] = { reg, value };
    return i2c_write(MYS1_ADDR, frame, sizeof frame, true) == (int)sizeof frame;
}

/* Set the register pointer, then read. The pointer write must NOT send a STOP
 * (stop = false): the read follows as a repeated start (datasheet section 3.2). */
static bool reg_read(uint8_t reg, uint8_t *buf, size_t len) {
    if (i2c_write(MYS1_ADDR, &reg, 1, false) != 1) {
        return false;   /* NACK on the pointer: do not start a read */
    }
    return i2c_read(MYS1_ADDR, buf, len) == (int)len;
}

/* TODO(learner): write CTRL with MYS1_CTRL_MEAS_EN. One line: return reg_write(...). */
bool mys1_start(void) {
    return false;
}

/* TODO(learner): read WHO_AM_I into *id. One line: reg_read(...). */
bool mys1_whoami(uint8_t *id) {
    (void)id;
    return false;
}

/* TODO(learner): return the temperature in degrees Celsius.
 *  1. Poll STATUS with reg_read, up to MYS1_MAX_POLLS times. Stop when
 *     MYS1_STATUS_DRDY is set. If it never is set, return false.
 *  2. Read TEMP_L and TEMP_H with one reg_read(MYS1_REG_TEMP_L, raw, 2).
 *  3. Combine the bytes into an int16_t (raw[1] is the high byte), then divide
 *     by TEMP_LSB_PER_C. */
bool mys1_read_celsius(float *celsius) {
    (void)celsius;
    return false;
}
