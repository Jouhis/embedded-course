/* sensor.c: MYS-1 driver for the monitor, ported from Lab 3 (lesson 63) to hal.h.
 *
 * Register map: CTRL 0x20 (bit 0 starts measuring), STATUS 0x27 (bit 0 is data-ready),
 * TEMP_L 0x28 and TEMP_H 0x29, a signed 16-bit count of 64 counts per degree C. Reading
 * TEMP_L latches the sample, and reading TEMP_H clears data-ready (the mystery chip's
 * behaviour, lesson 63). The device is at 0x48 on the board's I2C bus. */
#include <stdbool.h>
#include <stdint.h>

#include "hal.h"
#include "sensor.h"

#define SENSOR_ADDR       0x48u
#define REG_CTRL          0x20u
#define REG_STATUS        0x27u
#define REG_TEMP_L        0x28u
#define CTRL_MEAS_EN      0x01u
#define STATUS_DRDY       0x01u
#define TEMP_LSB_PER_C    64     /* counts per degree C */

/* Write one register. Returns true when the device acknowledged. */
static bool reg_write(uint8_t reg, uint8_t value) {
    uint8_t frame[2] = { reg, value };
    return hal_i2c_write(SENSOR_ADDR, frame, sizeof frame) == 0;
}

/* Set the register pointer, then read len bytes. The device keeps the pointer between
 * transactions, so a separate write and read is enough. */
static bool reg_read(uint8_t reg, uint8_t *buf, size_t len) {
    if (hal_i2c_write(SENSOR_ADDR, &reg, 1U) != 0) {
        return false;
    }
    return hal_i2c_read(SENSOR_ADDR, buf, len) == 0;
}

bool sensor_init(void) {
    return reg_write(REG_CTRL, CTRL_MEAS_EN);
}

sensor_status_t sensor_poll(int32_t *centi) {
    /* One bus transaction to check data-ready. If it is not set, go back to the loop. */
    uint8_t status = 0U;
    if (!reg_read(REG_STATUS, &status, 1U)) {
        return SENSOR_ERROR;
    }
    if ((status & STATUS_DRDY) == 0U) {
        return SENSOR_IDLE;
    }

    /* Burst read of TEMP_L and TEMP_H, the two bytes of one signed sample. */
    uint8_t raw[2];
    if (!reg_read(REG_TEMP_L, raw, 2U)) {
        return SENSOR_ERROR;
    }
    int16_t counts = (int16_t)(((uint16_t)raw[1] << 8) | raw[0]);

    /* Convert to hundredths of a degree with integer maths: counts * 100 / 64. The product
     * fits in 32 bits for any 16-bit count, and the sign is kept. */
    *centi = ((int32_t)counts * 100) / TEMP_LSB_PER_C;
    return SENSOR_NEW_SAMPLE;
}
