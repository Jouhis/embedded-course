/* ntc.c: stub for the skeleton. Lesson 111 replaces this with the Beta-equation conversion. */
#include "ntc.h"

bool ntc_centi_from_raw(uint16_t raw, int32_t *centi_c) {
    (void)raw;
    *centi_c = 0;
    return false;   /* no conversion yet: every reading is a fault */
}
