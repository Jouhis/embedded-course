// EXPECT: DRYER RTOS OK
/* main.c: the application of the dryer (lessons 116 and 117). Linked into the application slot
 * (boot/boot.ld). The bootloader's main() jumps here through the image's reset vector, and app_main()
 * starts the board and the display, prints the banner, then hands over to the tasks in rtos/tasks.c.
 * Nothing else runs before the scheduler. */
#include "app_image.h"
#include "display.h"
#include "hal.h"
#include "tasks.h"

void app_main(void) {
    hal_init();
    (void)display_init();      /* the I2C transfer is polled, so it works before the scheduler starts */
    hal_log("DRYER RTOS OK");
    tasks_start();             /* never returns */
    for (;;) {}
}
