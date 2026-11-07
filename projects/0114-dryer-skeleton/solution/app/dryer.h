/* dryer.h: the drying cycle's state machine (lessons 113 to 117).
 *
 *   IDLE --start--> HEATING --reached setpoint--> HOLDING --time done--> COOLDOWN --cool--> IDLE
 *   any running state --stop--> COOLDOWN
 *   any state --safety trip--> FAULT --stop, when safe--> IDLE
 *
 * Lesson 115 adds the full transition table and the timers. The skeleton only defines the states. */
#ifndef DRYER_H
#define DRYER_H

typedef enum {
    DRYER_IDLE = 0,
    DRYER_HEATING,
    DRYER_HOLDING,
    DRYER_COOLDOWN,
    DRYER_FAULT,
} dryer_state_t;

/* Reset the controller to IDLE. Stub in the skeleton. */
void dryer_init(void);

#endif /* DRYER_H */
