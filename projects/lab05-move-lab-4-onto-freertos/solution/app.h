/* app.h: the RTOS layer of the monitor. app_start() creates the queues, the mutex and the tasks,
 * then starts the scheduler. It does not return. main() calls it after the board and devices
 * are initialised. */
#ifndef APP_H
#define APP_H

void app_start(void);

#endif /* APP_H */
