/* temp_format.c: the MYS-1 count-to-temperature conversion. */
#include "temp_format.h"

/* TODO(learner): return raw * 100 / 64 (hundredths of a degree). Multiply before you divide,
 * so the fraction is kept. Then run the ztest, which checks 1440 -> 2250 and -64 -> -100. */
int32_t mys_raw_to_centi_c(int16_t raw)
{
    (void)raw;
    return 0;
}
