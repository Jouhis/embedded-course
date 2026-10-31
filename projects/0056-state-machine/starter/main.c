#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include "pico/stdlib.h"

// Traffic light: red LED on GP2, yellow on GP3, green on GP4. The button on GP14 is a
// pedestrian request. Active low: pressed reads 0, with the pull-up enabled.
#define RED_PIN      2u
#define YELLOW_PIN   3u
#define GREEN_PIN    4u
#define BUTTON_PIN   14u

#define RED_MS       3000u
#define GREEN_MS     3000u
#define YELLOW_MS    1000u

typedef enum { ST_RED, ST_GREEN, ST_YELLOW } state_t;
typedef enum { EV_TIMEOUT, EV_REQUEST } event_t;

static const char *state_name(state_t s) {
    switch (s) {
        case ST_RED:    return "RED";
        case ST_GREEN:  return "GREEN";
        case ST_YELLOW: return "YELLOW";
    }
    return "?";
}

static uint32_t state_ms(state_t s) {
    switch (s) {
        case ST_RED:    return RED_MS;
        case ST_GREEN:  return GREEN_MS;
        case ST_YELLOW: return YELLOW_MS;
    }
    return 0;
}

// Switch-based transition function: given a state and an event, return the next state.
// Each case has a TODO. Fill in the transitions from the lesson's table.
static state_t on_event(state_t s, event_t e) {
    switch (s) {
        case ST_RED:
            // TODO(learner): on EV_TIMEOUT go to GREEN. A request is ignored in RED.
            break;
        case ST_GREEN:
            // TODO(learner): on EV_TIMEOUT go to YELLOW. On EV_REQUEST also go to YELLOW early.
            break;
        case ST_YELLOW:
            // TODO(learner): on EV_TIMEOUT go to RED. A request is ignored in YELLOW.
            break;
    }
    (void)e;
    return s;
}

static void show_lights(state_t s) {
    gpio_put(RED_PIN,    s == ST_RED);
    gpio_put(GREEN_PIN,  s == ST_GREEN);
    gpio_put(YELLOW_PIN, s == ST_YELLOW);
}

int main(void) {
    stdio_init_all();

    gpio_init(RED_PIN);    gpio_set_dir(RED_PIN, GPIO_OUT);
    gpio_init(YELLOW_PIN); gpio_set_dir(YELLOW_PIN, GPIO_OUT);
    gpio_init(GREEN_PIN);  gpio_set_dir(GREEN_PIN, GPIO_OUT);
    gpio_init(BUTTON_PIN); gpio_set_dir(BUTTON_PIN, GPIO_IN);
    gpio_pull_up(BUTTON_PIN);

    state_t state = ST_RED;
    show_lights(state);
    uint32_t deadline = time_us_32() + state_ms(state) * 1000u;

    printf("STATE MACHINE starter\n");

    while (true) {
        // TODO(learner): add the button. Call on_event(state, EV_REQUEST) on a press, and print
        // "STATE old->new" with the new state's light when the state changes. For now only the
        // timeout is handled, so the light never moves past RED.
        if ((int32_t)(time_us_32() - deadline) >= 0) {
            state = on_event(state, EV_TIMEOUT);
            show_lights(state);
            deadline = time_us_32() + state_ms(state) * 1000u;
        }
        sleep_ms(1);
    }
}
