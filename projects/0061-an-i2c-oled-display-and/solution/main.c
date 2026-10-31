#include <stdbool.h>
#include <stdio.h>
#include "hardware/i2c.h"
#include "menu.h"
#include "pico/stdlib.h"
#include "ssd1306.h"

#define I2C_PORT    i2c0
#define SDA_PIN     4       // GP4 SDA, GP5 SCL: the Pico's default I2C0 pins
#define SCL_PIN     5
#define I2C_HZ      400000  // fast mode: the SSD1306 accepts 400 kHz
#define BTN_DOWN    14      // moves the cursor (pull-up, pressed = low)
#define BTN_SELECT  15      // runs the selected item
#define POLL_MS     20      // sample the buttons every 20 ms
#define STATUS_PAGE 6

static uint32_t s_presses = 0;   // how many items have been selected since reset

// Actions are plain functions; the menu holds pointers to them (callbacks, lesson 49).
static void act_blink(void) { s_presses++; }
static void act_solid(void) { s_presses++; }
static void act_reset(void) { s_presses = 0; }

static const menu_item_t ITEMS[] = {
    {"BLINK", act_blink},
    {"SOLID", act_solid},
    {"RESET", act_reset},
};

static menu_t s_menu = {ITEMS, sizeof ITEMS / sizeof ITEMS[0], 0};

static bool pressed(uint gpio) {
    return !gpio_get(gpio);   // pull-up: the pin reads 0 while the button holds it low
}

int main(void) {
    stdio_init_all();
    gpio_init(BTN_DOWN);   gpio_set_dir(BTN_DOWN, GPIO_IN);   gpio_pull_up(BTN_DOWN);
    gpio_init(BTN_SELECT); gpio_set_dir(BTN_SELECT, GPIO_IN); gpio_pull_up(BTN_SELECT);

    i2c_init(I2C_PORT, I2C_HZ);
    gpio_set_function(SDA_PIN, GPIO_FUNC_I2C);
    gpio_set_function(SCL_PIN, GPIO_FUNC_I2C);
    gpio_pull_up(SDA_PIN);
    gpio_pull_up(SCL_PIN);

    ssd1306_init(I2C_PORT);
    bool down_prev = false, select_prev = false, dirty = true, announced = false;

    while (true) {
        bool down_now = pressed(BTN_DOWN);
        bool select_now = pressed(BTN_SELECT);
        // Act on the falling edge only: one press is one step, however long the button is held.
        if (down_now && !down_prev) {
            menu_next(&s_menu);
            dirty = true;
        }
        if (select_now && !select_prev) {
            menu_select(&s_menu);
            dirty = true;
        }
        down_prev = down_now;
        select_prev = select_now;

        if (dirty) {
            char status[16];
            menu_draw(&s_menu);
            snprintf(status, sizeof status, "PRESSES:%lu", (unsigned long)s_presses);
            ssd1306_draw_text(STATUS_PAGE, 0, status);
            ssd1306_flush();
            dirty = false;
            if (!announced) {
                printf("MENU OK\n");   // EXPECT: MENU OK
                announced = true;
            }
        }
        sleep_ms(POLL_MS);
    }
}
