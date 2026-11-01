/* temp_format.c: the MYS-1 count-to-temperature conversion, kept free of hardware. */
#include "temp_format.h"

/* 100 hundredths per degree, and 64 counts per degree on the MYS-1 (datasheet section 4.1).
 * Multiply first: the product fits in 32 bits (32767 * 100 < 2^31), and dividing a scaled
 * value keeps the fraction that dividing first would throw away. */
#define CENTI_PER_DEGREE  100
#define COUNTS_PER_DEGREE 64

int32_t mys_raw_to_centi_c(int16_t raw)
{
    return ((int32_t)raw * CENTI_PER_DEGREE) / COUNTS_PER_DEGREE;
}
