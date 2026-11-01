// EXPECT: DRYER SKELETON OK
/* main.c: the skeleton of the filament dryer (lesson 113).
 *
 * This stage has no behaviour yet. It proves the layers link together: the application
 * (app/) calls only hal.h, and the board file (hw/) is the only place that touches registers.
 * The banner at the end is the check: it appears on the serial monitor when the image runs. */
#include "dryer.h"
#include "hal.h"
#include "materials.h"

int main(void) {
    hal_init();                 /* clock, serial log, pins, timers, ADC, I2C */
    dryer_init();               /* state machine: IDLE (stub until lesson 114) */

    const material_t *m = materials_get(0);
    (void)m;                    /* the preset list is linked in; the UI uses it from lesson 115 */

    hal_log("DRYER SKELETON OK");
    for (;;) {
        /* The cycle is driven by the RTOS tasks from lesson 116. Nothing runs here yet. */
    }
}
