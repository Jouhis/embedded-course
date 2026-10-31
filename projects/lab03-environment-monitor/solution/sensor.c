/* sensor.c: MYS-1 driver for Lab 3, reused from lesson 63 and made non-blocking.
 *
 * The register map is in projects/0063-mystery-sensor/MYSTERY-SENSOR-DATASHEET.html.
 * The bus is I2C0 on GP4 (SDA) and GP5 (SCL), shared with the SSD1306 OLED. */
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

bool sensor_init(void) {
    i2c_init(SENSOR_BUS, BUS_BAUD_HZ);
    gpio_set_function(PIN_SDA, GPIO_FUNC_I2C);
    gpio_set_function(PIN_SCL, GPIO_FUNC_I2C);
    gpio_pull_up(PIN_SDA);
    gpio_pull_up(PIN_SCL);
    return reg_write(REG_CTRL, CTRL_MEAS_EN);
}

sensor_status_t sensor_poll(float *celsius) {
    /* One bus transaction to check data-ready. If it is not set, go back to the loop. */
    uint8_t status = 0;
    if (!reg_read(REG_STATUS, &status, 1)) {
        return SENSOR_ERROR;
    }
    if (!(status & STATUS_DRDY)) {
        return SENSOR_IDLE;
    }

    /* Burst read of TEMP_L and TEMP_H. Reading TEMP_L latches the sample, and
     * reading TEMP_H clears data-ready. */
    uint8_t raw[2];
    if (!reg_read(REG_TEMP_L, raw, 2)) {
        return SENSOR_ERROR;
    }
    int16_t counts = (int16_t)(((uint16_t)raw[1] << 8) | raw[0]);
    *celsius = (float)counts / TEMP_LSB_PER_C;
    return SENSOR_NEW_SAMPLE;
}
