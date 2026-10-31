/* i2c_bus.h: the two bus functions the sensor driver needs.
 *
 * On the target these wrap the vendor SDK (for example i2c_write_blocking on the
 * Pico). In the host tests they are replaced by FFF fakes, so the driver can be
 * tested with no hardware. The driver never calls the SDK directly.
 *
 * i2c_write returns the number of bytes written, or a negative value on a bus error
 * (for example a NACK). stop = false leaves the bus claimed, so the next transaction
 * is a repeated start (lesson 60). */
#ifndef I2C_BUS_H
#define I2C_BUS_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

int i2c_write(uint8_t addr, const uint8_t *data, size_t len, bool stop);

/* Returns the number of bytes read, or a negative value on a bus error. */
int i2c_read(uint8_t addr, uint8_t *data, size_t len);

#endif /* I2C_BUS_H */
