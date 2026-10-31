/* ntc.c: the NTC conversion (lesson 111). STARTER: the conversion is yours to write.
 *
 * TODO(learner): implement the Beta equation. The circuit is 10 kOhm from 3.3 V to OUT, and the
 * 10 kOhm NTC from OUT to GND. With full = 4095 and raw the ADC code:
 *     R_ntc / 10k = 1 / (full / raw - 1)
 *     1 / T_kelvin = ln(R_ntc / 10k) / 3950 + 1 / 298.15
 *     celsius = 1 / (1 / T_kelvin) - 273.15, stored as hundredths: lroundf(celsius * 100)
 * Reject the codes below NTC_RAW_MIN and above NTC_RAW_MAX (return false), because the log is
 * meaningless there. Then run the host tests: test_ntc must pass. */
#include <math.h>
#include "ntc.h"

bool ntc_centi_from_raw(uint16_t raw, int32_t *centi_c) {
    (void)raw;
    *centi_c = 0;
    return false;     /* TODO(learner): replace with the conversion above */
}
