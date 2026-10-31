/* hal.h: the hardware abstraction layer of the environment monitor (Lab 4).
 *
 * Everything in app/ includes only this header. It never names a register, an SDK call,
 * a HAL handle, a port or a pin number. Each board supplies one implementation file:
 *   hal_bluepill.c  for the STM32F103C8 Blue Pill (STM32 HAL)
 *   hal_pico.c      for the Raspberry Pi Pico (Pico SDK)
 * The application sources are the same for both boards. Only the board file differs.
 *
 * Logical levels hide the wiring. hal_gpio_write(HAL_PIN_LED, 1) lights the LED on either
 * board, even though the Blue Pill LED is active low. hal_gpio_read(HAL_PIN_BTN_A) returns
 * 1 while the button is held, even though the pin reads 0. */
#ifndef HAL_H
#define HAL_H

#include <stddef.h>
#include <stdint.h>

typedef enum {
    HAL_PIN_LED = 0,     /* output: the alarm indicator */
    HAL_PIN_BTN_A,       /* input: button A, active low on both boards */
    HAL_PIN_BTN_B,       /* input: button B, active low on both boards */
    HAL_PIN_COUNT
} hal_pin_t;

/* Start the clock, GPIO, the serial log, the I2C bus and the millisecond clock.
 * Call once, first. */
void hal_init(void);

/* Drive an output pin. on = 1 means the logical "on" state. */
void hal_gpio_write(hal_pin_t pin, uint8_t on);

/* Read an input pin. Returns 1 while the button is pressed, 0 when it is released. */
uint8_t hal_gpio_read(hal_pin_t pin);

/* Write len bytes to the 7-bit I2C address addr7. Returns 0 on success, -1 on error or
 * timeout. The call is bounded: it never waits forever for a device that does not answer. */
int hal_i2c_write(uint8_t addr7, const uint8_t *data, size_t len);

/* Read len bytes from the 7-bit I2C address addr7. Returns 0 on success, -1 on error. */
int hal_i2c_read(uint8_t addr7, uint8_t *data, size_t len);

/* Milliseconds since hal_init(). It wraps after about 49.7 days, so compare with unsigned
 * subtraction, never with a raw "<" (lesson 73). */
uint32_t hal_millis(void);

/* Write one line to the serial log. The implementation adds the line ending. */
void hal_log(const char *line);

#endif /* HAL_H */
