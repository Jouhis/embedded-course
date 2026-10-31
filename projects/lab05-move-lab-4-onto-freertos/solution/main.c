// EXPECT: LAB5 OK
/* Entry point of the Lab 5 monitor on the Blue Pill. Initialise the board and the two devices
 * before the scheduler starts, then hand over to the tasks. Nothing else runs yet, so this is
 * the one place where the UART is written without the logger task. */
#include "app.h"
#include "display.h"
#include "hal.h"
#include "sensor.h"
#include "ui.h"

int main(void) {
    hal_init();
    ui_init();
    if (!sensor_init() || !display_init()) {
        hal_log("LAB5 init failed");
        for (;;) {
            /* Halt: the log says what failed, and no task starts. */
        }
    }
    hal_log("LAB5 OK");
    app_start();
    return 0;
}
