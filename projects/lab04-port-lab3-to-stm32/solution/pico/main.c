// EXPECT: LAB4 OK
/* Entry point of the Lab 4 monitor on the Raspberry Pi Pico. The application is in ../../app,
 * and it is the same file set as the Blue Pill build. Only hal_pico.c is board-specific. */
#include "app.h"

int main(void) {
    app_run();
    return 0;
}
