/* main.c: the skeleton of the filament dryer (lesson 110). Starter.
 *
 * The layers are already in place: the application (app/) calls only hal.h, and the board file
 * (hw/) is the only place that touches registers. Your task is the start-up sequence. */
#include "dryer.h"
#include "hal.h"
#include "materials.h"

int main(void) {
    hal_init();                 /* clock, serial log, pins, timers, ADC, I2C */
    dryer_init();               /* state machine: IDLE (stub until lesson 111) */

    /* TODO(learner): look up the first preset with materials_get(0) and keep it in a variable.
     * Then print the banner the lesson's checker expects: the exact text "DRYER SKELETON OK",
     * using hal_log(). You know it works when the serial monitor shows that line after the
     * build and the simulator start. */

    for (;;) {
        /* The cycle is driven by the RTOS tasks from lesson 112. Nothing runs here yet. */
    }
}
