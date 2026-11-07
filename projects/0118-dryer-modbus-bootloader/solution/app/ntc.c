/* ntc.c: the NTC conversion with the Beta equation (lesson 115).
 *
 * Wokwi's docs give this formula with a 10-bit constant (1023). The Blue Pill's ADC is 12-bit, so
 * the constant becomes 4095. The rest is unchanged: with R_series = 10 kOhm, the NTC resistance is
 *     R_ntc / R_series = 1 / (full / raw - 1)
 * and the Beta equation (25 C reference, beta 3950) turns the resistance into a temperature:
 *     1 / T = ln(R_ntc / R_25) / beta + 1 / T_25,   with R_25 = 10 kOhm and T_25 = 298.15 K. */
#include <math.h>
#include "ntc.h"

#define NTC_BETA          3950.0f   /* the thermistor's beta constant, the Wokwi default */
#define NTC_T25_KELVIN    298.15f   /* 25 C in kelvin, the reference temperature of the beta equation */
#define KELVIN_OFFSET     273.15f

bool ntc_centi_from_raw(uint16_t raw, int32_t *centi_c) {
    if (raw < NTC_RAW_MIN || raw > NTC_RAW_MAX) {
        return false;                       /* open or shorted sensor: the log of 0 or of a negative number is meaningless */
    }
    float full = (float)NTC_FULL_SCALE_CODE;
    float inv_t = logf(1.0f / (full / (float)raw - 1.0f)) / NTC_BETA + 1.0f / NTC_T25_KELVIN;
    float celsius = 1.0f / inv_t - KELVIN_OFFSET;
    *centi_c = (int32_t)lroundf(celsius * 100.0f);
    return true;
}
