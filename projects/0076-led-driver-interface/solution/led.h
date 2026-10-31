/* led.h: the LED driver interface. main.c calls only these three functions.
 *
 * Each backend defines all three: led_gpio.c drives a real pin, and led_fake.c logs to the
 * serial monitor. CMake compiles exactly one backend into the program (LED_BACKEND, chosen
 * at link time), so main.c never knows which one it has. Keep this header free of pins,
 * SDK calls and printf: those belong in a backend. */
#ifndef LED_H
#define LED_H

#include <stdbool.h>

void led_init(void);        /* call once, before the other two; leaves the LED off */
void led_set(bool on);      /* on = true lights the LED */
bool led_get(void);         /* the level the driver last applied: true = on */

#endif /* LED_H */
