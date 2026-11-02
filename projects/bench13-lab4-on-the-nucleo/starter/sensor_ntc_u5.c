/* sensor_ntc_u5.c: Lab 4's sensor.h, served by a 10 kohm NTC on the NUCLEO-U545RE-Q.
 *
 * The MYS-1 behind app/sensor.c is a custom Wokwi chip and exists only in the simulator. On the
 * bench, a 10 kohm resistor from 3V3 to A0 (PA0, ADC1_IN5) and the NTC from A0 to GND form the
 * divider of bench lab 8 and lesson 58. This file replaces sensor.c; app/ stays as it is.
 *
 * ADC1 on the U5 is 14 bits (0 to 16383) and starts in deep power-down. Bring-up order:
 * leave deep power-down, start the ADC's voltage regulator and wait for LDORDY, calibrate,
 * then enable and wait for ADRDY. Each wait has a timeout, so a dead ADC is an error, not a hang.
 */
#include <math.h>
#include <stdbool.h>
#include <stdint.h>
#include "stm32u5xx.h"
#include "hal.h"
#include "sensor.h"

#define NTC_PIN        0U            /* PA0 */
#define NTC_CHANNEL    5U            /* ADC1_IN5 */
#define SAMPLE_MS      500U
#define OVERSAMPLE     16U
#define FULL_SCALE     16383         /* 14 bits */
#define OPEN_OR_SHORT  64            /* codes from either end: the NTC is missing or shorted */
#define BETA           3950.0f       /* check your thermistor: 3380 and 3950 are common */
#define T0_KELVIN      298.15f       /* 25 C, where the NTC is 10 kohm */
#define ADC_TIMEOUT_MS 10U

static uint32_t next_sample_ms;

static bool wait_flag(volatile uint32_t *reg, uint32_t flag, bool set) {
    uint32_t start = hal_millis();
    while (((*reg & flag) != 0U) != set) {
        if (hal_millis() - start > ADC_TIMEOUT_MS) {
            return false;
        }
    }
    return true;
}

/* Lesson 58's Beta equation, in hundredths of a degree. */
static sensor_status_t to_centi(uint32_t raw, int32_t *centi) {
    if ((int32_t)raw < OPEN_OR_SHORT || (int32_t)raw > FULL_SCALE - OPEN_OR_SHORT) {
        return SENSOR_ERROR;         /* a broken wire shows as an error, not as -40 or 150 C */
    }
    float inv_t = logf(1.0f / ((float)FULL_SCALE / (float)raw - 1.0f)) / BETA + 1.0f / T0_KELVIN;
    *centi = (int32_t)lroundf((1.0f / inv_t - 273.15f) * 100.0f);
    return SENSOR_NEW_SAMPLE;
}

/* Part 3. The conversion (to_centi) is done; bring up ADC1 in the order described at the top. */
bool sensor_init(void) {
    /* TODO(learner): clocks (ADC12EN, PWREN), PWR_SVMCR_ASV, PA0 analog, the bring-up order,
     * channel 5 preselected in PCSEL, a long sampling time, channel 5 first in SQR1. */
    (void)wait_flag;
    next_sample_ms = hal_millis();
    return true;
}

sensor_status_t sensor_poll(int32_t *centi) {
    uint32_t now = hal_millis();
    if ((int32_t)(now - next_sample_ms) < 0) {
        return SENSOR_IDLE;
    }
    next_sample_ms += SAMPLE_MS;
    (void)centi;
    (void)to_centi;
    return SENSOR_ERROR;    /* TODO(learner): OVERSAMPLE conversions, average them, to_centi() */
}
