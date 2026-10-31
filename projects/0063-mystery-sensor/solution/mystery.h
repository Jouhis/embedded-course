/* mystery.h: driver API for the MYS-1 temperature sensor (lesson 63).
 * The register map is in MYSTERY-SENSOR-DATASHEET.html, one folder up. */
#ifndef MYSTERY_H
#define MYSTERY_H

#include <stdbool.h>
#include <stdint.h>

/* Configure I2C0 on GP4/GP5 and start measuring. Returns false on a bus error. */
bool mystery_init(void);

/* Read WHO_AM_I (0x0F). The caller checks the value: 0xA7 for this part. */
bool mystery_whoami(uint8_t *id);

/* Wait for data ready, then read the latched temperature in degrees Celsius. */
bool mystery_read_celsius(float *celsius);

#endif /* MYSTERY_H */
