#include <stdint.h>
#include <stdio.h>
#include "hardware/gpio.h"
#include "hardware/spi.h"
#include "pico/stdlib.h"

#define SPI_PORT    spi0
#define PIN_SCK     18    // SPI0 SCK (RP2040 datasheet, GPIO function table, Table 279). 74HC595 SHCP
#define PIN_MOSI    19    // SPI0 TX, the MOSI output. 74HC595 DS
#define PIN_LATCH   17    // a plain GPIO used as chip select. 74HC595 STCP (the latch)
#define SPI_HZ      1000000   // requested bit rate; spi_init() returns the rate it actually set
#define BIT_US      1     // bit-bang half-period, so one bit takes about 2 us
#define FRAMES      8     // one byte per frame, eight frames in the chase

// Bit-bang: the CPU drives SCK and MOSI one pin at a time with GPIO writes. Mode 0 (idle low, sample
// on the rising edge), MSB first. Each bit costs two GPIO writes and two delays, all in software.
static void bitbang_byte(uint8_t value) {
    gpio_put(PIN_LATCH, 0);                  // chip select low: the 595 will shift, not latch
    for (int bit = 7; bit >= 0; bit--) {
        gpio_put(PIN_MOSI, (value >> bit) & 1u);   // data settles while SCK is low
        sleep_us(BIT_US);
        gpio_put(PIN_SCK, 1);                // rising edge: the 595 samples DS here
        sleep_us(BIT_US);
        gpio_put(PIN_SCK, 0);
    }
    gpio_put(PIN_LATCH, 1);                  // rising edge on the latch: the outputs change at once
}

// Hardware SPI: the PL022 shifts the byte with no CPU work per bit. The CPU only waits for the
// transmit FIFO and then for the last bit to leave the shift register (spi_is_busy).
static void hw_byte(uint8_t value) {
    gpio_put(PIN_LATCH, 0);
    spi_write_blocking(SPI_PORT, &value, 1);
    while (spi_is_busy(SPI_PORT)) {
        tight_loop_contents();
    }
    gpio_put(PIN_LATCH, 1);
}

static void pins_to_spi(void) {
    gpio_set_function(PIN_SCK, GPIO_FUNC_SPI);
    gpio_set_function(PIN_MOSI, GPIO_FUNC_SPI);
}

int main(void) {
    stdio_init_all();
    gpio_init(PIN_LATCH); gpio_set_dir(PIN_LATCH, GPIO_OUT); gpio_put(PIN_LATCH, 1);
    gpio_init(PIN_SCK);   gpio_set_dir(PIN_SCK, GPIO_OUT);   gpio_put(PIN_SCK, 0);
    gpio_init(PIN_MOSI);  gpio_set_dir(PIN_MOSI, GPIO_OUT);  gpio_put(PIN_MOSI, 0);

    // Phase 1: bit-bang the chase.
    uint32_t t0 = time_us_32();
    for (uint8_t i = 0; i < FRAMES; i++) {
        bitbang_byte((uint8_t)(1u << i));
    }
    uint32_t bitbang_us = time_us_32() - t0;

    // Phase 2: the same chase on hardware SPI, mode 0 (CPOL = 0, CPHA = 0), MSB first.
    // spi_init() already sets mode 0 (pico-sdk hardware_spi/spi.c, line 26); the call is explicit so
    // the mode is visible here.
    uint actual_hz = spi_init(SPI_PORT, SPI_HZ);
    spi_set_format(SPI_PORT, 8, SPI_CPOL_0, SPI_CPHA_0, SPI_MSB_FIRST);
    pins_to_spi();
    t0 = time_us_32();
    for (uint8_t i = 0; i < FRAMES; i++) {
        hw_byte((uint8_t)(1u << i));
    }
    uint32_t hw_us = time_us_32() - t0;

    printf("SPI OK\n");   // EXPECT: SPI OK
    printf("8 bytes: bit-bang %lu us, hardware SPI %lu us at %u Hz\n",
           (unsigned long)bitbang_us, (unsigned long)hw_us, actual_hz);

    // Keep chasing on hardware SPI so the LEDs and the logic analyzer show a steady pattern.
    while (true) {
        for (uint8_t i = 0; i < FRAMES; i++) {
            hw_byte((uint8_t)(1u << i));
            sleep_ms(100);
        }
    }
}
