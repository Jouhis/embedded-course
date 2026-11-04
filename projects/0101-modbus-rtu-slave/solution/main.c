/* Modbus RTU slave on the Pico's UART0 (lesson 101).
 *
 * Bus: UART0 on GP0 (TX) and GP1 (RX), 115200 baud, 8N1. Slave address 1.
 * Register map (holding registers, function 03 reads, function 06 writes):
 *   0  counter: +1 every second (read only in practice)
 *   1  LED:     bit 0 drives the on-board LED (GP25)
 *   2  sensor:  22.50 C in hundredths of a degree (a constant, because the simulator has no sensor)
 *
 * The protocol code is in modbus.c and crc16.c, which have no hardware in them. This file
 * only does the framing: it collects bytes from the UART and decides when a frame has ended. */
// EXPECT: MODBUS SLAVE READY
#include <stdbool.h>
#include "pico/stdlib.h"
#include "hardware/uart.h"
#include "modbus.h"

#define SLAVE_ADDRESS      1u
#define BUS_UART           uart0
#define BUS_BAUD           115200u
#define BUS_TX_PIN         0u
#define BUS_RX_PIN         1u
#define LED_PIN            25u

#define REG_COUNTER        0u
#define REG_LED            1u
#define REG_SENSOR         2u
#define NUM_REGS           3u
#define SENSOR_CENTI_C     2250u

/* Modbus over Serial Line: a frame ends after a silence of 3.5 characters. Above 19200 baud
 * the specification fixes this silence at 1.750 ms (V1.02, section 2.5.1.1, not checked here).
 * At 115200 baud an 8N1 character is 10 bits, about 86.8 us, so 3.5 characters would be only
 * about 304 us; the fixed 1750 us applies instead. */
#define FRAME_SILENCE_US   1750u
#define COUNTER_PERIOD_US  1000000u

#define RX_CAPACITY        MODBUS_MAX_FRAME

static uint16_t regs[NUM_REGS];
static modbus_slave_t slave = { SLAVE_ADDRESS, regs, NUM_REGS };

static uint8_t rx_buf[RX_CAPACITY];
static size_t  rx_len;
static uint32_t last_byte_us;
static uint8_t tx_buf[MODBUS_MAX_FRAME];

/* Drain the receive FIFO, then answer a frame once the line has been quiet long enough. */
static void bus_poll(void) {
    while (uart_is_readable(BUS_UART)) {
        uint8_t b = uart_getc(BUS_UART);
        if (rx_len < RX_CAPACITY) {
            rx_buf[rx_len++] = b;            /* an overlong frame fails its CRC, so drop extra bytes */
        }
        last_byte_us = time_us_32();
    }
    if (rx_len > 0 && (time_us_32() - last_byte_us) >= FRAME_SILENCE_US) {
        size_t n = modbus_process(&slave, rx_buf, rx_len, tx_buf);
        if (n > 0) {
            uart_write_blocking(BUS_UART, tx_buf, n);   /* no RS-485 driver here, so no DE/RE pin */
        }
        rx_len = 0;
    }
}

/* Boot self-test: answer one known request before going on the bus. Read holding register 2
 * (the sensor, 2250 = 0x08CA) from slave 1. Both frames are fixed bytes with their CRC, so a
 * wrong CRC routine or a missing function 03 fails here, not later on the bus. */
static bool self_test(void) {
    static const uint8_t req[] = { 0x01, 0x03, 0x00, 0x02, 0x00, 0x01, 0x25, 0xCA };
    static const uint8_t want[] = { 0x01, 0x03, 0x02, 0x08, 0xCA, 0x3F, 0xD3 };
    uint8_t rsp[MODBUS_MAX_FRAME];
    size_t n = modbus_process(&slave, req, sizeof req, rsp);
    if (n != sizeof want) return false;
    for (size_t i = 0; i < n; i++) {
        if (rsp[i] != want[i]) return false;
    }
    return true;
}

int main(void) {
    uart_init(BUS_UART, BUS_BAUD);
    gpio_set_function(BUS_TX_PIN, GPIO_FUNC_UART);
    gpio_set_function(BUS_RX_PIN, GPIO_FUNC_UART);

    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);

    regs[REG_SENSOR] = SENSOR_CENTI_C;
    // stdio is off: UART0 is the Modbus bus
    uart_puts(BUS_UART, self_test() ? "MODBUS SLAVE READY\r\n" : "MODBUS SELF-TEST FAILED\r\n");

    uint32_t last_tick_us = time_us_32();
    while (true) {
        bus_poll();

        gpio_put(LED_PIN, regs[REG_LED] & 1u);       /* the master writes the LED register */

        if (time_us_32() - last_tick_us >= COUNTER_PERIOD_US) {
            last_tick_us += COUNTER_PERIOD_US;
            regs[REG_COUNTER]++;
        }
    }
}
