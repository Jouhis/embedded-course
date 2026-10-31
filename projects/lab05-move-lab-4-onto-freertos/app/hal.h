/* hal.h: the hardware abstraction layer of the environment monitor, ported to FreeRTOS (Lab 5).
 *
 * Lab 4 polled the buttons. Here a button press is an interrupt: the board file calls the
 * callback registered with hal_set_button_callback() from the EXTI interrupt. The callback runs
 * in interrupt context, so it may only use FromISR kernel calls. The board file owns the
 * interrupt and the FreeRTOS switch that follows it.
 *
 * Everything in app/ includes only this header. It never names a register, an SDK call,
 * a HAL handle, a port or a pin number. The Blue Pill file is hal_bluepill.c, which lives next
 * to the application entry point in each folder (solution/ and starter/). */
#ifndef HAL_H
#define HAL_H

#include <stddef.h>
#include <stdint.h>

typedef enum {
    HAL_PIN_LED = 0,     /* output: the alarm indicator */
    HAL_PIN_BTN_A,       /* input: button A, falling edge = press */
    HAL_PIN_BTN_B,       /* input: button B, falling edge = press */
    HAL_PIN_COUNT
} hal_pin_t;

/* Called from the button interrupt on each falling edge of a button pin. Returns 1 if the
 * callback woke a task that should run before the interrupted one, otherwise 0. The board
 * then requests a context switch when the interrupt ends (portYIELD_FROM_ISR). */
typedef int (*hal_button_callback_t)(hal_pin_t pin);

/* Start the clock, GPIO, the serial log, the I2C bus and the button interrupts. Call once,
 * first, before the scheduler starts. */
void hal_init(void);

/* Register the button callback. Call before the scheduler starts. */
void hal_set_button_callback(hal_button_callback_t callback);

/* Drive an output pin. on = 1 means the logical "on" state. */
void hal_gpio_write(hal_pin_t pin, uint8_t on);

/* Write len bytes to the 7-bit I2C address addr7. Returns 0 on success, -1 on error or
 * timeout. The call is bounded: it never waits forever for a device that does not answer. */
int hal_i2c_write(uint8_t addr7, const uint8_t *data, size_t len);

/* Read len bytes from the 7-bit I2C address addr7. Returns 0 on success, -1 on error. */
int hal_i2c_read(uint8_t addr7, uint8_t *data, size_t len);

/* Milliseconds since the scheduler started (FreeRTOS tick at 1 kHz). It wraps after about
 * 49.7 days, so compare with unsigned subtraction. Call only from a task, not from the
 * interrupt: use the FromISR tick call there. */
uint32_t hal_millis(void);

/* Write one line to the serial log. The implementation adds the line ending. Only the logger
 * task calls this once the scheduler runs, because only one task may own the UART. */
void hal_log(const char *line);

#endif /* HAL_H */
