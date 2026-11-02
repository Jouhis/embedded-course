/* sensor.h: the environment sensor for Lab 3. In Wokwi it was the MYS-1 (lesson 63); on the
 * bench (bench lab 8) sensor_ntc.c implements the same interface with an NTC thermistor.
 *
 * The sensor is read without blocking. sensor_poll() checks once whether a new
 * sample is due and returns at once, so the main loop never waits for a sample. */
#ifndef SENSOR_H
#define SENSOR_H

#include <stdbool.h>

typedef enum {
    SENSOR_IDLE,        /* no new sample since the last poll */
    SENSOR_NEW_SAMPLE,  /* *celsius holds a fresh reading */
    SENSOR_ERROR,       /* the bus or the device did not answer */
} sensor_status_t;

/* Bring up I2C0 (shared with the OLED on the same pins) and start measuring.
 * Call this before display_init(). */
bool sensor_init(void);

/* Non-blocking poll. Returns SENSOR_NEW_SAMPLE only once per new sample. */
sensor_status_t sensor_poll(float *celsius);

#endif /* SENSOR_H */
