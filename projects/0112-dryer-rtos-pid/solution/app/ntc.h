/* ntc.h: the NTC thermistor conversion (lesson 111). Pure C: no hardware, so the host tests
 * run the same code as the Blue Pill.
 *
 * The circuit (Wokwi's NTC part, and the real divider in lesson 58): 3.3 V through a 10 kOhm
 * series resistor to the OUT node, the 10 kOhm NTC from OUT to GND. The 12-bit ADC reads OUT. */
#ifndef NTC_H
#define NTC_H

#include <stdbool.h>
#include <stdint.h>

#define NTC_FULL_SCALE_CODE  4095   /* 12-bit ADC: codes 0 to 4095 (STM32F103 reference manual, ADC section) */
#define NTC_RAW_MIN          16u    /* below this the NTC is shorted (OUT is pulled to GND) */
#define NTC_RAW_MAX          4079u  /* above this the NTC is open (OUT is pulled up to 3.3 V) */

/* Convert an ADC code to hundredths of a degree C (2250 means 22.50 C). Returns false when the
 * code is a sensor fault, so the caller never acts on a made-up temperature. */
bool ntc_centi_from_raw(uint16_t raw, int32_t *centi_c);

#endif /* NTC_H */
