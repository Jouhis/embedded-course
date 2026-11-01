/* sensor.h: the NTC sensor service (lesson 114). Reads the ADC through hal.h and converts. */
#ifndef SENSOR_H
#define SENSOR_H

#include <stdbool.h>
#include <stdint.h>

/* One reading. Returns false on a sensor fault; raw is always set, so the log can show it. */
bool sensor_read(uint16_t *raw, int32_t *centi_c);

#endif /* SENSOR_H */
