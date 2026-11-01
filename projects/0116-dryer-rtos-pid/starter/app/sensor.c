/* sensor.c: the NTC service: ADC code in, temperature out (lesson 114). Filtering comes in lesson 116. */
#include "hal.h"
#include "ntc.h"
#include "sensor.h"

bool sensor_read(uint16_t *raw, int32_t *centi_c) {
    *raw = hal_adc_read_ntc();
    *centi_c = 0;
    return ntc_centi_from_raw(*raw, centi_c);
}
