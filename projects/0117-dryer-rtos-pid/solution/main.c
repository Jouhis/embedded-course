// EXPECT: DRYER RTOS OK
/* main.c: the filament dryer on FreeRTOS (lesson 117). Start the board and the display, print
 * the banner, then hand over to the tasks in rtos/tasks.c. Nothing else runs before the scheduler. */
#include "display.h"
#include "hal.h"
#include "tasks.h"

int main(void) {
    hal_init();
    (void)display_init();      /* the I2C transfer is polled, so it works before the scheduler starts */
    hal_log("DRYER RTOS OK");
    tasks_start();             /* never returns */
    for (;;) {}
}
