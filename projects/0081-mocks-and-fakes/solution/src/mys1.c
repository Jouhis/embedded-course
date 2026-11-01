/* mys1.c: driver for the MYS-1 sensor. It uses only i2c_write and i2c_read,
 * so the host tests can fake the bus (lesson 81). */
#include <stddef.h>

#include "i2c_bus.h"
#include "mys1.h"

#define TEMP_LSB_PER_C  64.0f   /* datasheet section 4.1: 1/64 degC per count */

/* Write one register: a two-byte frame [pointer, value], then a STOP. */
static bool reg_write(uint8_t reg, uint8_t value) {
    uint8_t frame[2] = { reg, value };
    return i2c_write(MYS1_ADDR, frame, sizeof frame, true) == (int)sizeof frame;
}

/* Set the register pointer, then read. The pointer write sends no STOP
 * (stop = false), so the read follows as a repeated start. The MYS-1 accepts a STOP
 * and a new START too, but the datasheet (section 3.2) asks for the repeated start:
 * a STOP would let another master use the bus in between, and it costs time. */
static bool reg_read(uint8_t reg, uint8_t *buf, size_t len) {
    if (i2c_write(MYS1_ADDR, &reg, 1, false) != 1) {
        return false;   /* NACK on the pointer: do not start a read */
    }
    return i2c_read(MYS1_ADDR, buf, len) == (int)len;
}

bool mys1_start(void) {
    return reg_write(MYS1_REG_CTRL, MYS1_CTRL_MEAS_EN);
}

bool mys1_whoami(uint8_t *id) {
    return reg_read(MYS1_REG_WHO_AM_I, id, 1);
}

bool mys1_read_celsius(float *celsius) {
    uint8_t status = 0;
    unsigned polls;
    for (polls = 0; polls < MYS1_MAX_POLLS; polls++) {
        if (!reg_read(MYS1_REG_STATUS, &status, 1)) {
            return false;
        }
        if (status & MYS1_STATUS_DRDY) {
            break;
        }
    }
    if (polls == MYS1_MAX_POLLS) {
        return false;   /* no sample ready: a missing sensor must not hang the caller */
    }

    /* One burst read, TEMP_L then TEMP_H, so both bytes come from the same sample. */
    uint8_t raw[2];
    if (!reg_read(MYS1_REG_TEMP_L, raw, sizeof raw)) {
        return false;
    }
    /* Signed 16-bit, LSB first on the wire. Cast before dividing so that negative
     * temperatures come out right (lesson 45). */
    int16_t counts = (int16_t)(((uint16_t)raw[1] << 8) | raw[0]);
    *celsius = (float)counts / TEMP_LSB_PER_C;
    return true;
}
