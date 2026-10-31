/* sensor.h: the MYS-1 environment sensor (the "mystery" custom chip from lesson 63), read
 * through hal.h. The sensor is polled without waiting: sensor_poll() looks at the data-ready
 * flag once and returns at once, so the main loop never waits for a sample. */
#ifndef SENSOR_H
#define SENSOR_H

#include <stdbool.h>
#include <stdint.h>

typedef enum {
    SENSOR_IDLE,        /* no new sample since the last poll */
    SENSOR_NEW_SAMPLE,  /* *centi holds a fresh reading, in hundredths of a degree */
    SENSOR_ERROR,       /* the bus or the device did not answer */
} sensor_status_t;

/* Start measuring. Call after hal_init(). Returns false if the device does not answer. */
bool sensor_init(void);

/* Non-blocking poll. Returns SENSOR_NEW_SAMPLE only once per new sample. */
sensor_status_t sensor_poll(int32_t *centi);

#endif /* SENSOR_H */
