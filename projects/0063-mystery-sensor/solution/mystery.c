/* mystery.c: driver for the MYS-1 temperature sensor (lesson 63).
 *
 * Layers: reg_write and reg_read are the I2C plumbing (lesson 60). The three
 * public functions use the datasheet's register map and data format. */
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

/* Read len registers starting at reg. Write the pointer with nostop = true, so
 * the bus stays claimed and the read follows as a repeated start. A STOP in
 * between would let another master change the bus, and the sensor would
 * restart its pointer protocol from scratch. */
static bool reg_read(uint8_t reg, uint8_t *buf, size_t len) {
    if (i2c_write_blocking(MYSTERY_I2C, MYSTERY_ADDR, &reg, 1, true) != 1) {
        return false;
    }
    return i2c_read_blocking(MYSTERY_I2C, MYSTERY_ADDR, buf, len, false) == (int)len;
}

bool mystery_init(void) {
    i2c_init(MYSTERY_I2C, MYSTERY_BAUD_HZ);
    gpio_set_function(MYSTERY_SDA_PIN, GPIO_FUNC_I2C);
    gpio_set_function(MYSTERY_SCL_PIN, GPIO_FUNC_I2C);
    /* The internal pulls are weak (50 to 80 kOhm). A real board needs about 4.7 kOhm
     * external pull-ups, which the diagram provides. */
    gpio_pull_up(MYSTERY_SDA_PIN);
    gpio_pull_up(MYSTERY_SCL_PIN);
    return reg_write(REG_CTRL, CTRL_MEAS_EN);
}

bool mystery_whoami(uint8_t *id) {
    return reg_read(REG_WHO_AM_I, id, 1);
}

bool mystery_read_celsius(float *celsius) {
    /* Poll data-ready. Reading TEMP_L latches a new sample, and reading TEMP_H
     * releases data-ready (datasheet section 4). Polling avoids reading stale data. */
    absolute_time_t deadline = make_timeout_time_ms(DRDY_TIMEOUT_MS);
    for (;;) {
        uint8_t status = 0;
        if (!reg_read(REG_STATUS, &status, 1)) {
            return false;
        }
        if (status & STATUS_DRDY) {
            break;
        }
        if (time_reached(deadline)) {
            return false;
        }
        sleep_ms(DRDY_POLL_MS);
    }

    /* One burst read of TEMP_L then TEMP_H. The pointer auto-increments, so the pair
     * comes from the same latched sample. */
    uint8_t raw[2];
    if (!reg_read(REG_TEMP_L, raw, 2)) {
        return false;
    }
    /* The value is signed 16-bit, little-endian on the wire: LSB first. Cast to
     * int16_t before dividing, so negative temperatures come out right. */
    int16_t counts = (int16_t)(((uint16_t)raw[1] << 8) | raw[0]);
    *celsius = (float)counts / TEMP_LSB_PER_C;
    return true;
}
