/* mystery.c: driver for the MYS-1 temperature sensor (lesson 63).
 *
 * reg_write and reg_read are done for you: they are the I2C plumbing from
 * lesson 60. Your job is the three public functions at the bottom. The
 * register map and data format are in MYSTERY-SENSOR-DATASHEET.html. */
#include <stddef.h>

#include "hardware/gpio.h"
#include "hardware/i2c.h"
#include "pico/time.h"
#include "mystery.h"

#define MYSTERY_I2C       i2c0
#define MYSTERY_ADDR      0x48u    /* datasheet section 2 */
#define MYSTERY_SDA_PIN   4u       /* I2C0 SDA on the Pico */
#define MYSTERY_SCL_PIN   5u       /* I2C0 SCL on the Pico */
#define MYSTERY_BAUD_HZ   100000u  /* standard mode, 100 kHz */

/* Register map (datasheet section 3) */
#define REG_WHO_AM_I      0x0Fu
#define REG_CTRL          0x20u
#define REG_STATUS        0x27u
#define REG_TEMP_L        0x28u    /* TEMP_H is 0x29: one burst read covers both */

#define WHO_AM_I_VALUE    0xA7u
#define CTRL_MEAS_EN      0x01u    /* CTRL bit 0 */
#define STATUS_DRDY       0x01u    /* STATUS bit 0 */

/* The sensor makes a sample every 500 ms, so 2 s is a safe timeout. */
#define DRDY_TIMEOUT_MS   2000u
#define DRDY_POLL_MS      10u
#define TEMP_LSB_PER_C    64.0f    /* datasheet section 4: 1/64 degC per count */

/* Write one register. The 2-byte frame is [pointer, value]. */
static bool reg_write(uint8_t reg, uint8_t value) {
    uint8_t frame[2] = { reg, value };
    return i2c_write_blocking(MYSTERY_I2C, MYSTERY_ADDR, frame, 2, false) == 2;
}

/* Read len registers starting at reg. The pointer is written with nostop = true,
 * so the read follows as a repeated start and the bus is not released in between. */
static bool reg_read(uint8_t reg, uint8_t *buf, size_t len) {
    if (i2c_write_blocking(MYSTERY_I2C, MYSTERY_ADDR, &reg, 1, true) != 1) {
        return false;
    }
    return i2c_read_blocking(MYSTERY_I2C, MYSTERY_ADDR, buf, len, false) == (int)len;
}

/* TODO(learner): bring up I2C0 and enable measurement.
 *  1. i2c_init(MYSTERY_I2C, MYSTERY_BAUD_HZ)
 *  2. gpio_set_function() on SDA and SCL to GPIO_FUNC_I2C
 *  3. gpio_pull_up() on both pins
 *  4. return reg_write(REG_CTRL, CTRL_MEAS_EN)
 * Lesson text: which register turns measurement on, and what bit 0 does. */
bool mystery_init(void) {
    return false;
}

/* TODO(learner): read WHO_AM_I into *id. One line: reg_read(...). */
bool mystery_whoami(uint8_t *id) {
    (void)id;
    return false;
}

/* TODO(learner): return the temperature in degrees Celsius.
 *  1. Poll STATUS until DRDY is set, or give up after DRDY_TIMEOUT_MS.
 *     Use make_timeout_time_ms(), time_reached() and sleep_ms(DRDY_POLL_MS).
 *  2. Read TEMP_L and TEMP_H in one burst: reg_read(REG_TEMP_L, raw, 2).
 *  3. Combine the bytes: the high byte is raw[1]. Cast to int16_t, because the
 *     value is signed. Then divide by TEMP_LSB_PER_C. */
bool mystery_read_celsius(float *celsius) {
    (void)celsius;
    return false;
}
