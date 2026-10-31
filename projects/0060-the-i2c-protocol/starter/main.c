#include <stdint.h>
#include <stdio.h>
#include "hardware/i2c.h"
#include "pico/stdlib.h"

#define I2C_PORT    i2c0
#define SDA_PIN     4
#define SCL_PIN     5
#define I2C_HZ      100000
#define MPU_ADDR    0x68
#define REG_PWR_MGMT_1  0x6B
#define REG_WHO_AM_I    0x75
#define WHO_AM_I_VALUE  0x68
#define POLL_MS     1000

static int write_reg(uint8_t reg, uint8_t value) {
    uint8_t buf[2] = {reg, value};
    int n = i2c_write_blocking(I2C_PORT, MPU_ADDR, buf, 2, false);
    return n == 2 ? PICO_OK : PICO_ERROR_GENERIC;
}

// TODO(learner): this read is wrong in one way. The register-pointer write ends with a STOP,
// so the read is a new transaction. Change it to a repeated START: keep the bus for the read.
// Then explain on the logic analyzer why the repeated START matters (lesson 60, section 2).
static int read_reg(uint8_t reg, uint8_t *value) {
    int n = i2c_write_blocking(I2C_PORT, MPU_ADDR, &reg, 1, false);
    if (n != 1) {
        return PICO_ERROR_GENERIC;
    }
    n = i2c_read_blocking(I2C_PORT, MPU_ADDR, value, 1, false);
    return n == 1 ? PICO_OK : PICO_ERROR_GENERIC;
}

int main(void) {
    stdio_init_all();
    i2c_init(I2C_PORT, I2C_HZ);
    gpio_set_function(SDA_PIN, GPIO_FUNC_I2C);
    gpio_set_function(SCL_PIN, GPIO_FUNC_I2C);
    gpio_pull_up(SDA_PIN);
    gpio_pull_up(SCL_PIN);

    // TODO(learner): wake the MPU6050 with write_reg(REG_PWR_MGMT_1, 0x00). It powers up asleep.
    // Print "I2C FAIL" if the write does not return PICO_OK.

    while (true) {
        uint8_t id = 0;
        // TODO(learner): print "MPU6050 WHO_AM_I=0x68" when the read succeeds and id matches.
        (void)read_reg(REG_WHO_AM_I, &id);
        (void)WHO_AM_I_VALUE;
        sleep_ms(POLL_MS);
    }
}
