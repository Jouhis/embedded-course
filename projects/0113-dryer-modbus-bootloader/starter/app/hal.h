/* hal.h: the hardware abstraction layer of the filament dryer (lesson 110).
 *
 * Every module in app/ includes only this header. None of them names a register, a HAL handle,
 * a port or a pin number. The board file hw/hal_bluepill.c implements these functions for the
 * STM32F103C8 (Blue Pill). A host test build can implement them with fakes instead (lessons 80
 * and 81), which is why the pure logic can be tested on the PC.
 *
 * Pin map (Blue Pill, STM32F103C8):
 *   PA0   ADC1_IN0    NTC thermistor divider output (analog input)
 *   PA6   TIM3_CH1    heater PWM (the gate of the heater MOSFET, through a resistor)
 *   PB0   GPIO out    fan (the gate of the fan MOSFET)
 *   PB12  GPIO in     start/stop button, to GND, internal pull-up (active low)
 *   PB13  GPIO in     material button, to GND, internal pull-up (active low)
 *   PB6   I2C1_SCL    SSD1306 OLED (external 4.7 kOhm pull-ups)
 *   PB7   I2C1_SDA    SSD1306 OLED
 *   PA9   USART1_TX   serial log (115200 baud), later the Modbus bus (lesson 113)
 *   PA10  USART1_RX   serial receive, used from lesson 113
 *   PC13  GPIO out    on-board LED, active low
 */
#ifndef HAL_H
#define HAL_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

typedef enum {
    HAL_BUTTON_START = 0,    /* PB12: start or stop the drying cycle */
    HAL_BUTTON_MATERIAL,     /* PB13: select the material while idle */
} hal_button_t;

/* Start the clock, the GPIO, the timers, the ADC, the serial log and the I2C bus. Call once,
 * before anything else. */
void hal_init(void);

/* Write one line to the serial log, followed by CR LF. Blocks until the line has left the UART. */
void hal_log(const char *line);

/* One 12-bit ADC conversion of the NTC divider (0 to 4095). */
uint16_t hal_adc_read_ntc(void);

/* Heater duty cycle, 0 (off) to 1000 (full power). Timer resolution is 0.1 %. */
void hal_heater_set_permille(uint16_t permille);

/* Fan on (1) or off (0). */
void hal_fan_set(uint8_t on);

/* Raw button level: 1 = pressed, 0 = released. The pin is active low, the board file inverts it. */
uint8_t hal_button_pressed(hal_button_t button);

/* Start the window watchdog (WWDG). It cannot be stopped once started. Call once, before the scheduler. */
void hal_wdg_start(void);
/* Refresh the watchdog. Only the supervisor task calls this, and only when every task has checked in. */
void hal_wdg_kick(void);

/* Serial bus for Modbus (USART1 on PA9 and PA10, the same port as the log). Receive is
 * interrupt-driven: the ISR queues each byte, so no byte is lost while a task is busy.
 * hal_uart_getc() waits up to timeout_ms; it returns true when a byte arrived. hal_uart_write()
 * blocks until every byte has left the transmitter. The log (hal_log) shares this transmitter. */
bool hal_uart_getc(uint8_t *b, uint32_t timeout_ms);
void hal_uart_write(const uint8_t *buf, size_t len);

/* Milliseconds since reset. Wraps after about 49.7 days; compare with unsigned subtraction. */
uint32_t hal_millis(void);

/* I2C transfers to a 7-bit address. Return 0 on success, -1 on error or timeout. */
int hal_i2c_write(uint8_t addr7, const uint8_t *data, size_t len);
int hal_i2c_read(uint8_t addr7, uint8_t *data, size_t len);

#endif /* HAL_H */
