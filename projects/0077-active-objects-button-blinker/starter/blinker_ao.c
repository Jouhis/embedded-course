/* blinker_ao.c: the blinker active object (starter). TODO(learner): move the LED code from
 * main.c here. The handler toggles the blink mode on SIG_PRESS, flips the LED every
 * HALF_PERIOD_TICKS ticks while blinking, and prints "blink on" or "blink off" on each press.
 * The solution folder has one complete version. */
#include "blinker_ao.h"

void blinker_ao_init(void) {
    /* TODO(learner): set LED_PIN up, then call ao_start() with your handler and
     * AO_SUB(SIG_TICK) | AO_SUB(SIG_PRESS). */
}
