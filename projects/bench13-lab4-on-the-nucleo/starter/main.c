/* Bench lab 13: Lab 4's monitor on the NUCLEO-U545RE-Q. The application is Lab 4's app/ folder,
 * unchanged; this project adds only the board layer (hal_nucleo_u5.c) and the bench sensor
 * (sensor_ntc_u5.c). On the board, the ST-LINK's virtual COM port prints "LAB4 OK". */
// SIM: skip real board only: Wokwi has no STM32U5 model
#include "app.h"

int main(void) {
    app_run();
    return 0;
}
