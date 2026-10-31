#include <stdint.h>
#include <stdio.h>
#include "hardware/gpio.h"
#include "hardware/spi.h"
#include "pico/stdlib.h"

#define SPI_PORT    spi0
#define PIN_SCK     18    // SPI0 SCK (RP2040 datasheet, GPIO function table, Table 279). 74HC595 SHCP
#define PIN_MOSI    19    // SPI0 TX, MOSI. 74HC595 DS
#define PIN_LATCH   17    // plain GPIO used as chip select. 74HC595 STCP (latch)
#define SPI_HZ      1000000
#define BIT_US      1
#define FRAMES      8

// Bit-bang reference: mode 0, MSB first, written out by hand. Keep it as the comparison.
static void bitbang_byte(uint8_t value) {
    gpio_put(PIN_LATCH, 0);
    for (int bit = 7; bit >= 0; bit--) {
        gpio_put(PIN_MOSI, (value >> bit) & 1u);
        sleep_us(BIT_US);
        gpio_put(PIN_SCK, 1);
        sleep_us(BIT_US);
        gpio_put(PIN_SCK, 0);
    }
    gpio_put(PIN_LATCH, 1);
}

// TODO(learner): send one byte on hardware SPI. Pull the latch low, call spi_write_blocking
// with one byte, wait while spi_is_busy(), then raise the latch. Mirror bitbang_byte.
static void hw_byte(uint8_t value) {
    (void)value;
}

int main(void) {
    stdio_init_all();
    gpio_init(PIN_LATCH); gpio_set_dir(PIN_LATCH, GPIO_OUT); gpio_put(PIN_LATCH, 1);
    gpio_init(PIN_SCK);   gpio_set_dir(PIN_SCK, GPIO_OUT);   gpio_put(PIN_SCK, 0);
    gpio_init(PIN_MOSI);  gpio_set_dir(PIN_MOSI, GPIO_OUT);  gpio_put(PIN_MOSI, 0);

    // Phase 1: the bit-bang chase works, so the wiring is right.
    for (uint8_t i = 0; i < FRAMES; i++) {
        bitbang_byte((uint8_t)(1u << i));
    }

    // TODO(learner): switch SCK and MOSI to the SPI function (gpio_set_function ... GPIO_FUNC_SPI),
    // then call spi_init(SPI_PORT, SPI_HZ).
    spi_init(SPI_PORT, SPI_HZ);

    // BUG: the 74HC595 shifts on the rising edge of SHCP, and the data must be stable then. Check
    // which SPI mode gives that (CPOL = 0, CPHA = 0 samples on the first, rising edge). Then fix
    // this line, and say in a comment which edge the 595 samples on.
    spi_set_format(SPI_PORT, 8, SPI_CPOL_0, SPI_CPHA_1, SPI_MSB_FIRST);

    // TODO(learner): print "SPI OK" when hardware SPI shows the same chase as bit-bang.
    while (true) {
        for (uint8_t i = 0; i < FRAMES; i++) {
            hw_byte((uint8_t)(1u << i));
            sleep_ms(100);
        }
    }
}
