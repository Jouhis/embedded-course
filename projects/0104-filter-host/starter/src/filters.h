/* Digital filters for sampled sensor data (lesson 104).
 *
 * Each filter keeps its own state in a struct, so one program can run several filters on
 * several signals. No filter allocates memory or calls a library, so the same C runs on the
 * PC (host tests) and on the RP2040 (Pico project).
 */
#ifndef FILTERS_H
#define FILTERS_H

#include <stdbool.h>
#include <stdint.h>

#define MA_MAX_WINDOW   16u   /* ring-buffer capacity: any window from 1 up to this */
#define EMA_FRAC_BITS   8u    /* extra fractional bits in the EMA state (2^8 = 256 steps per unit) */

/* Moving average: the mean of the last `window` samples. */
typedef struct {
    int32_t buf[MA_MAX_WINDOW]; /* the samples currently in the window */
    int32_t sum;                /* running sum of buf[], so each update costs O(1) */
    uint8_t window;             /* N, between 1 and MA_MAX_WINDOW */
    uint8_t idx;                /* slot the next sample overwrites (the oldest one) */
} moving_avg_t;

/* First-order IIR filter, the exponential moving average: y += (x - y) >> k, with alpha = 1 / 2^k. */
typedef struct {
    int32_t state;   /* y scaled by 2^EMA_FRAC_BITS, so small steps are not rounded away */
    uint8_t k;       /* shift: the time constant is about 2^k samples */
    bool    primed;  /* false until the first sample, so the output starts at that sample */
} ema_t;

/* Median of the last three samples: removes single-sample spikes and passes a step one sample late. */
typedef struct {
    int32_t hist[3];   /* hist[2] is the newest sample */
    uint8_t count;     /* samples seen so far, capped at 2 */
} median3_t;

void    ma_init(moving_avg_t *m, uint8_t window);
int32_t ma_update(moving_avg_t *m, int32_t x);

void    ema_init(ema_t *e, uint8_t k);
int32_t ema_update(ema_t *e, int32_t x);

void    median3_init(median3_t *m);
int32_t median3_update(median3_t *m, int32_t x);

#endif
