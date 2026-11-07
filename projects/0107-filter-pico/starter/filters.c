#include "filters.h"

/* The init functions are done for you. Port the three update functions from your lesson 107
 * host project (projects/0107-filter-host/solution/src/filters.c), then the Pico build runs them
 * on real ADC readings. The placeholders below return the input unchanged. */

void ma_init(moving_avg_t *m, uint8_t window) {
    if (window < 1u) window = 1u;
    if (window > MA_MAX_WINDOW) window = MA_MAX_WINDOW;
    for (uint8_t i = 0; i < MA_MAX_WINDOW; i++) {
        m->buf[i] = 0;
    }
    m->sum = 0;
    m->window = window;
    m->idx = 0;
}

int32_t ma_update(moving_avg_t *m, int32_t x) {
    /* TODO(learner): keep a running sum, so each update is O(1) with no loop over the window.
       Add the new sample, subtract the oldest one, store the new sample over the oldest slot,
       advance idx with wraparound, and return sum divided by the window. */
    (void)m;
    return x;   /* placeholder: a filter that does nothing */
}

void ema_init(ema_t *e, uint8_t k) {
    e->state = 0;
    e->k = k;
    e->primed = false;
}

int32_t ema_update(ema_t *e, int32_t x) {
    /* TODO(learner): scale x by 2^EMA_FRAC_BITS, prime the state on the first sample, then
       state += (target - state) >> k. Return the state with rounding, shifted back down by EMA_FRAC_BITS. */
    (void)e;
    return x;   /* placeholder */
}

void median3_init(median3_t *m) {
    m->hist[0] = 0;
    m->hist[1] = 0;
    m->hist[2] = 0;
    m->count = 0;
}

int32_t median3_update(median3_t *m, int32_t x) {
    /* TODO(learner): shift the three-sample history, return x for the first two samples, and
       return the median of the three after that. Compute the median without sorting. */
    (void)m;
    return x;   /* placeholder */
}
