/* mys1.h: driver API for the MYS-1 temperature sensor (lesson 63), written as a
 * host-testable unit. The register map is in MYSTERY-SENSOR-DATASHEET.html. */
#ifndef MYS1_H
#define MYS1_H

#include <stdbool.h>
#include <stdint.h>

#define MYS1_ADDR            0x48u   /* datasheet section 2 */
#define MYS1_REG_WHO_AM_I    0x0Fu   /* datasheet section 3.1 */
#define MYS1_REG_CTRL        0x20u
#define MYS1_REG_STATUS      0x27u
#define MYS1_REG_TEMP_L      0x28u   /* TEMP_H is 0x29: one burst read covers both */
#define MYS1_WHO_AM_I_VALUE  0xA7u
#define MYS1_CTRL_MEAS_EN    0x01u   /* CTRL bit 0 */
#define MYS1_STATUS_DRDY     0x01u   /* STATUS bit 0 */

/* Give up after this many status polls. The sensor takes 500 ms per sample, so a
 * real driver polls with a delay; the host tests count polls instead. */
#define MYS1_MAX_POLLS       5u

/* Start periodic measurement (write CTRL). Returns false on a bus error. */
bool mys1_start(void);

/* Read WHO_AM_I into *id. The caller checks the value (0xA7 for this part). */
bool mys1_whoami(uint8_t *id);

/* Wait for data ready, then read the latched temperature in degrees Celsius.
 * Returns false on a bus error or when no sample is ready after MYS1_MAX_POLLS. */
bool mys1_read_celsius(float *celsius);

#endif /* MYS1_H */
