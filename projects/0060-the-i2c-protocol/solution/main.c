#include <stdint.h>
#include <stdio.h>
#include "hardware/i2c.h"
#include "pico/stdlib.h"

#define I2C_PORT    i2c0     // i2c0 default pins on the Pico: GP4 SDA, GP5 SCL
#define SDA_PIN     4
#define SCL_PIN     5
#define I2C_HZ      100000   // standard mode: 100 kbit/s, the slowest common I2C speed
#define MPU_ADDR    0x68     // 7-bit address. AD0 low. The address byte on the wire is 0xD0 (write) / 0xD1 (read)
#define REG_PWR_MGMT_1  0x6B // power management 1. The device powers up in sleep mode, so set it to 0 (wake)
#define REG_WHO_AM_I    0x75 // identity register: reads 0x68 (RM-MPU-6000A, register 117)
#define WHO_AM_I_VALUE  0x68
#define POLL_MS     1000     // one transaction per second keeps the logic-analyzer capture short

// Write one register. One transaction: START, address+W, register, data, STOP.
static int write_reg(uint8_t reg, uint8_t value) {
    uint8_t buf[2] = {reg, value};
    int n = i2c_write_blocking(I2C_PORT, MPU_ADDR, buf, 2, false);  // false = send STOP at the end
    return n == 2 ? PICO_OK : PICO_ERROR_GENERIC;
}

// Read one register: a write of the register pointer, then a read. The two are joined by a
// repeated START (nostop = true), so the bus is never released between them.
static int read_reg(uint8_t reg, uint8_t *value) {
    int n = i2c_write_blocking(I2C_PORT, MPU_ADDR, &reg, 1, true);   // true = keep the bus, no STOP
    if (n != 1) {
        return PICO_ERROR_GENERIC;   // NACK on the address or the register byte
    }
    n = i2c_read_blocking(I2C_PORT, MPU_ADDR, value, 1, false);       // RESTART + address+R, then STOP
    return n == 1 ? PICO_OK : PICO_ERROR_GENERIC;
}

int main(void) {
    stdio_init_all();
    i2c_init(I2C_PORT, I2C_HZ);
    gpio_set_function(SDA_PIN, GPIO_FUNC_I2C);   // route the pin to the I2C peripheral (not GPIO)
    gpio_set_function(SCL_PIN, GPIO_FUNC_I2C);
    gpio_pull_up(SDA_PIN);                       // a weak internal pull-up; the diagram also has 4.7 kOhm resistors

    if (write_reg(REG_PWR_MGMT_1, 0x00) != PICO_OK) {
        printf("I2C FAIL: no ACK on the wake write\n");
    }

    while (true) {
        uint8_t id = 0;
        if (read_reg(REG_WHO_AM_I, &id) == PICO_OK && id == WHO_AM_I_VALUE) {
            printf("MPU6050 WHO_AM_I=0x%02X\n", id);   // EXPECT: WHO_AM_I=0x68
        } else {
            printf("I2C FAIL: read 0x%02X\n", id);
        }
        sleep_ms(POLL_MS);
    }
}
