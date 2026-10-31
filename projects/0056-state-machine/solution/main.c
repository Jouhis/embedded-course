#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include "pico/stdlib.h"

// EXPECT: STATE MACHINE OK

// Traffic light: red LED on GP2, yellow on GP3, green on GP4. The button on GP14 is a
// pedestrian request. Active low: pressed reads 0, with the pull-up enabled.
#define RED_PIN      2u
#define YELLOW_PIN   3u
#define GREEN_PIN    4u
#define BUTTON_PIN   14u
#define DEBOUNCE_SAMPLES 10u   // 10 ms of agreement, as in lesson 52

// The states and events are the rows and columns of the transition table below.
typedef enum { ST_RED, ST_GREEN, ST_YELLOW, ST_COUNT } state_t;
typedef enum { EV_TIMEOUT, EV_REQUEST, EV_COUNT } event_t;

// The table. next_state[state][event] is the state to enter. A row and column pair that does
// not change the state keeps the current state, and the machine then prints nothing.
static const state_t next_state[ST_COUNT][EV_COUNT] = {
    /*            TIMEOUT     REQUEST   */
    /* RED    */ { ST_GREEN,  ST_RED    },   // a request in RED is ignored: it is already red
    /* GREEN  */ { ST_YELLOW, ST_YELLOW },   // a request ends green early
    /* YELLOW */ { ST_RED,    ST_YELLOW },   // a request in YELLOW is ignored
};

// How long each state lasts, in ms, before the timeout event.
static const uint32_t state_ms[ST_COUNT] = {
    [ST_RED]    = 3000u,
    [ST_GREEN]  = 3000u,
    [ST_YELLOW] = 1000u,
};

// Which LED is lit in each state, as a GPIO mask. All lights go through one gpio_put_masked().
static const uint32_t light_mask[ST_COUNT] = {
    [ST_RED]    = 1u << RED_PIN,
    [ST_GREEN]  = 1u << GREEN_PIN,
    [ST_YELLOW] = 1u << YELLOW_PIN,
};
#define LIGHT_PINS   ((1u << RED_PIN) | (1u << YELLOW_PIN) | (1u << GREEN_PIN))

static const char *state_name[ST_COUNT] = { "RED", "GREEN", "YELLOW" };

static state_t state = ST_RED;
static uint32_t deadline_us = 0;     // time_us_32() value at which the timeout fires

static bool is_due(uint32_t now_us, uint32_t deadline) {
    return (int32_t)(now_us - deadline) >= 0;   // wraparound-safe, as in lesson 55
}

// Table-driven dispatch: one lookup, one action. The only action on a change is printing the
// transition, updating the lights and restarting the timer for the new state.
static void dispatch(event_t e, uint32_t now_us) {
    state_t next = next_state[state][e];
    if (next == state) {
        return;                       // no transition: nothing to print or change
    }
    printf("STATE %s->%s\n", state_name[state], state_name[next]);
    state = next;
    gpio_put_masked(LIGHT_PINS, light_mask[state]);
    deadline_us = now_us + state_ms[state] * 1000u;
}

// Debounced button, the integrator from lesson 52. Returns true once per confirmed press.
static bool button_pressed_event(void) {
    static uint8_t integrator = 0;
    static bool stable = false;
    bool raw = !gpio_get(BUTTON_PIN);
    if (raw) { if (integrator < DEBOUNCE_SAMPLES) integrator++; }
    else     { if (integrator > 0) integrator--; }
    if (!stable && integrator == DEBOUNCE_SAMPLES) { stable = true; return true; }
    if (stable && integrator == 0) { stable = false; }
    return false;
}

int main(void) {
    stdio_init_all();

    gpio_init_mask(LIGHT_PINS);
    gpio_set_dir_out_masked(LIGHT_PINS);
    gpio_init(BUTTON_PIN);
    gpio_set_dir(BUTTON_PIN, GPIO_IN);
    gpio_pull_up(BUTTON_PIN);

    gpio_put_masked(LIGHT_PINS, light_mask[state]);
    deadline_us = time_us_32() + state_ms[state] * 1000u;

    printf("STATE MACHINE OK\n");

    while (true) {
        uint32_t now = time_us_32();

        // Turn raw samples into events. The loop never blocks, so it samples the button every
        // millisecond and checks the timeout on every pass.
        if (button_pressed_event()) {
            dispatch(EV_REQUEST, now);
        }
        if (is_due(now, deadline_us)) {
            dispatch(EV_TIMEOUT, now);
        }
        sleep_ms(1);
    }
}
