/* Bench lab 6: the OLED that doesn't answer.
 *
 * Lesson 61's driver sends to address 0x3C and ignores the result. That works in Wokwi, where
 * the panel is set to 0x3C in diagram.json. A real module may be strapped to 0x3D (its SA0
 * pin, SSD1306 datasheet section 8.1.5), its silkscreen may print the 8-bit forms 0x78 or 0x7A,
 * and after a reset in the middle of a transfer a device can be left holding SDA low.
 * This program checks all three, in the order a professional bring-up would:
 *   1. bus recovery: if SDA is low before the bus is used, clock SCL up to nine times
 *      (NXP UM10204 rev. 7, section 3.1.16 "Bus clear"), then send a STOP;
 *   2. bus scan: try every 7-bit address and print the ones that acknowledge;
 *   3. initialise the panel at the address the scan found, and check every write.
 */
// EXPECT: BENCH6 OLED at 0x3C
#include <stdbool.h>
#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/i2c.h"
#include "ssd1306.h"

#define I2C_PORT   i2c0
#define SDA_PIN    4u
#define SCL_PIN    5u
#define I2C_HZ     400000u
#define HALF_BIT_US 5u        // 100 kHz bit-banged clock for the recovery pulses

/* Open-drain by hand: "low" drives the pin to 0, "release" makes it an input so the pull-up
 * takes it high. Never drive an I2C line high: another device may be pulling it low. */
static void line_low(uint pin)     { gpio_put(pin, 0); gpio_set_dir(pin, GPIO_OUT); }
static void line_release(uint pin) { gpio_set_dir(pin, GPIO_IN); }

static bool bus_recover(void) {
    gpio_init(SDA_PIN);
    gpio_init(SCL_PIN);
    gpio_pull_up(SDA_PIN);
    gpio_pull_up(SCL_PIN);
    line_release(SDA_PIN);
    line_release(SCL_PIN);
    sleep_us(HALF_BIT_US);
    if (gpio_get(SDA_PIN)) {
        return true;                      // SDA is high: nothing to recover
    }
    printf("BENCH6 SDA stuck low: sending clock pulses\n");
    for (int pulse = 1; pulse <= 9 && !gpio_get(SDA_PIN); pulse++) {
        line_low(SCL_PIN);
        sleep_us(HALF_BIT_US);
        line_release(SCL_PIN);
        sleep_us(HALF_BIT_US);
        printf("BENCH6 pulse %d: SDA=%d\n", pulse, gpio_get(SDA_PIN));
    }
    // A STOP condition: SDA rises while SCL is high. It resets every device's bus logic.
    line_low(SDA_PIN);
    sleep_us(HALF_BIT_US);
    line_release(SCL_PIN);
    sleep_us(HALF_BIT_US);
    line_release(SDA_PIN);
    sleep_us(HALF_BIT_US);
    return gpio_get(SDA_PIN);
}

/* Reserved addresses 0x00-0x07 and 0x78-0x7F are not used by ordinary devices (UM10204,
 * section 3.1.12), so the scan skips them, as the pico-examples bus_scan does. */
static uint8_t bus_scan(void) {
    uint8_t found_oled = 0;
    unsigned found = 0;
    for (uint8_t addr = 0x08; addr < 0x78; addr++) {
        uint8_t dummy;
        if (i2c_read_blocking(I2C_PORT, addr, &dummy, 1, false) >= 0) {
            printf("BENCH6 device at 0x%02X\n", addr);
            found++;
            if (addr == SSD1306_ADDR_SA0_LOW || addr == SSD1306_ADDR_SA0_HIGH) {
                found_oled = addr;
            }
        }
    }
    printf("BENCH6 scan done: %u device(s)\n", found);
    return found_oled;
}

int main(void) {
    stdio_init_all();
    if (!bus_recover()) {
        printf("BENCH6 SDA still low: power-cycle the module (UM10204 3.1.16)\n");
    }
    i2c_init(I2C_PORT, I2C_HZ);
    gpio_set_function(SDA_PIN, GPIO_FUNC_I2C);
    gpio_set_function(SCL_PIN, GPIO_FUNC_I2C);
    gpio_pull_up(SDA_PIN);
    gpio_pull_up(SCL_PIN);

    uint8_t addr = bus_scan();
    if (addr == 0) {
        printf("BENCH6 no SSD1306 at 0x3C or 0x3D: check power, GND, SDA/SCL swap, pull-ups\n");
    } else if (!ssd1306_init(I2C_PORT, addr)) {
        printf("BENCH6 panel at 0x%02X stopped answering during init\n", addr);
    } else {
        char line[20];
        snprintf(line, sizeof line, "ADDR 0x%02X", addr);
        ssd1306_clear();
        ssd1306_draw_text(0, 0, "BENCH LAB 6");
        ssd1306_draw_text(2, 0, line);
        ssd1306_flush();
        printf("BENCH6 OLED at 0x%02X\n", addr);
    }
    while (true) {
        sleep_ms(1000);
    }
}
