/* app.h: the environment monitor. app_run() is the whole application: it starts the board,
 * brings up the sensor and the display, and runs the super-loop forever. The project's main()
 * only calls app_run(), so the application is the same for every board. */
#ifndef APP_H
#define APP_H

void app_run(void);

#endif /* APP_H */
