/* sensor.c: MYS-1 driver for Lab 3, reused from lesson 63 and made non-blocking.
 *
 * The register map is in projects/0063-mystery-sensor/MYSTERY-SENSOR-DATASHEET.html.
 * The bus is I2C0 on GP4 (SDA) and GP5 (SCL), shared with the SSD1306 OLED.
 * reg_write and reg_read are done for you (lesson 60 plumbing). */
#include <stddef.h>

#include "hardware/gpio.h"
#include "hardware/i2c.h"
#include "sensor.h"

#define SENSOR_BUS        i2c0
#define SENSOR_ADDR       0x48u
#define PIN_SDA           4u
#define PIN_SCL           5u
#define BUS_BAUD_HZ       400000u   /* fast mode: the MYS-1 datasheet allows 400 kHz */

#define REG_CTRL          0x20u
#define REG_STATUS        0x27u
#define REG_TEMP_L        0x28u
#define CTRL_MEAS_EN      0x01u
#define STATUS_DRDY       0x01u
#define TEMP_LSB_PER_C    64.0f

static bool reg_write(uint8_t reg, uint8_t value) {
    uint8_t frame[2] = { reg, value };
    return i2c_write_blocking(SENSOR_BUS, SENSOR_ADDR, frame, 2, false) == 2;
}

/* nostop = true keeps the bus claimed, so the read is a repeated start. */
static bool reg_read(uint8_t reg, uint8_t *buf, size_t len) {
    if (i2c_write_blocking(SENSOR_BUS, SENSOR_ADDR, &reg, 1, true) != 1) {
        return false;
    }
    return i2c_read_blocking(SENSOR_BUS, SENSOR_ADDR, buf, len, false) == (int)len;
}

/* TODO(learner): bring up the shared bus and start measuring.
 *  1. i2c_init(SENSOR_BUS, BUS_BAUD_HZ)
 *  2. gpio_set_function() on SDA and SCL to GPIO_FUNC_I2C, then gpio_pull_up() on both
 *  3. return reg_write(REG_CTRL, CTRL_MEAS_EN)
 * The OLED is on the same bus, so this function must run first. */
bool sensor_init(void) {
    return false;
}

/* TODO(learner): a non-blocking poll. Do not loop and do not sleep.
 *  1. reg_read(REG_STATUS, &status, 1). If that fails, return SENSOR_ERROR.
 *  2. If DRDY (bit 0) is clear, return SENSOR_IDLE. The loop will ask again later.
 *  3. If DRDY is set, read TEMP_L and TEMP_H in one burst, convert the value as in
 *     lesson 63 (signed, divided by TEMP_LSB_PER_C), and return SENSOR_NEW_SAMPLE. */
sensor_status_t sensor_poll(float *celsius) {
    (void)celsius;
    return SENSOR_IDLE;
}
