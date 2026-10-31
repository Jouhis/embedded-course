// EXPECT: LAB4 OK
/* Entry point of the Lab 4 monitor on the Blue Pill. The project is the board part only:
 * the application is in ../../app and is the same file set on every board. Porting to a new
 * board means writing one new hal_<board>.c and changing nothing else (lesson 76). */
#include "app.h"

int main(void) {
    app_run();
    return 0;
}
