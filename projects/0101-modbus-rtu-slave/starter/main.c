/* Modbus RTU slave on the Pico's UART0 (lesson 101). Your task: detect the end of a frame.
 *
 * Bus: UART0 on GP0 (TX) and GP1 (RX), 115200 baud, 8N1. Slave address 1.
 * Register map (holding registers): 0 counter, 1 LED (bit 0), 2 sensor (22.50 C = 2250).
 * The protocol code (modbus.c, crc16.c) is in src/. The framing is yours to finish here. */
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

#define FRAME_SILENCE_US   1750u          /* 3.5 characters, fixed above 19200 baud */
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
            rx_buf[rx_len++] = b;
        }
        last_byte_us = time_us_32();
    }
    /* TODO(learner): the frame is complete when rx_len > 0 and the line has been silent for
     * FRAME_SILENCE_US. When it is complete: call modbus_process(&slave, rx_buf, rx_len, tx_buf),
     * send the reply with uart_write_blocking() if it is not empty, and set rx_len back to 0.
     * time_us_32() gives the time in microseconds, and last_byte_us holds the last byte's time. */
}

int main(void) {
    uart_init(BUS_UART, BUS_BAUD);
    gpio_set_function(BUS_TX_PIN, GPIO_FUNC_UART);
    gpio_set_function(BUS_RX_PIN, GPIO_FUNC_UART);

    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);

    regs[REG_SENSOR] = SENSOR_CENTI_C;
    uart_puts(BUS_UART, "MODBUS SLAVE READY\r\n");

    uint32_t last_tick_us = time_us_32();
    while (true) {
        bus_poll();

        gpio_put(LED_PIN, regs[REG_LED] & 1u);

        if (time_us_32() - last_tick_us >= COUNTER_PERIOD_US) {
            last_tick_us += COUNTER_PERIOD_US;
            regs[REG_COUNTER]++;
        }
    }
}
