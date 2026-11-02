/* Bench lab 6: the OLED that doesn't answer.
 *
 * This is lesson 61's way of starting the panel: a fixed address, and no check of whether the
 * panel acknowledged anything. It works in Wokwi. On the bench the screen may stay black, and
 * the program gives you no clue why. Your tasks (see the lab):
 *   1. TODO(learner): scan the bus and print every address that acknowledges;
 *   2. TODO(learner): start the panel at the address you found, and report a NACK;
 *   3. TODO(learner): before using the bus, check SDA and recover it if a device holds it low.
 */
#include <stdbool.h>
#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/i2c.h"
#include "ssd1306.h"

#define I2C_PORT   i2c0
#define SDA_PIN    4u
#define SCL_PIN    5u
#define I2C_HZ     400000u

int main(void) {
    stdio_init_all();
    i2c_init(I2C_PORT, I2C_HZ);
    gpio_set_function(SDA_PIN, GPIO_FUNC_I2C);
    gpio_set_function(SCL_PIN, GPIO_FUNC_I2C);
    gpio_pull_up(SDA_PIN);
    gpio_pull_up(SCL_PIN);

    ssd1306_init(I2C_PORT, SSD1306_ADDR_SA0_LOW);   // result ignored, as in lesson 61
    ssd1306_clear();
    ssd1306_draw_text(0, 0, "BENCH LAB 6");
    ssd1306_flush();
    printf("BENCH6 started (did the panel answer? this code cannot tell)\n");
    while (true) {
        sleep_ms(1000);
    }
}
