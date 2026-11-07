/* tasks.h: the FreeRTOS layer of the dryer (lesson 117). */
#ifndef TASKS_H
#define TASKS_H

/* Create the queues, mutexes, event group and tasks, then start the scheduler. Does not return.
 * Call after hal_init() and display_init(), from main(). */
void tasks_start(void);

#endif /* TASKS_H */
