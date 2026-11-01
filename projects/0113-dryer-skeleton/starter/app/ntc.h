/* ntc.h: the NTC thermistor driver's pure part (lesson 114). It turns a 12-bit ADC code into
 * hundredths of a degree Celsius, and reports sensor faults. No hardware in this file. */
#ifndef NTC_H
#define NTC_H

#include <stdbool.h>
#include <stdint.h>

/* Convert an ADC code to hundredths of a degree C (2250 means 22.50 C). Returns false when the
 * code means a sensor fault (open or shorted NTC). Stub in the skeleton: lesson 114 fills it in. */
bool ntc_centi_from_raw(uint16_t raw, int32_t *centi_c);

#endif /* NTC_H */
