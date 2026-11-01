#include "filters.h"

void ma_init(moving_avg_t *m, uint8_t window) {
    /* Clamp the window: 0 would divide by zero, and more than MA_MAX_WINDOW would overrun buf. */
    if (window < 1u) window = 1u;
    if (window > MA_MAX_WINDOW) window = MA_MAX_WINDOW;
    for (uint8_t i = 0; i < MA_MAX_WINDOW; i++) {
        m->buf[i] = 0;          /* the window starts as zeros, so early outputs ramp up from 0 */
    }
    m->sum = 0;
    m->window = window;
    m->idx = 0;
}

int32_t ma_update(moving_avg_t *m, int32_t x) {
    /* Add the new sample and remove the oldest one: one add and one subtract, no loop over the window. */
    m->sum += x - m->buf[m->idx];
    m->buf[m->idx] = x;
    m->idx = (uint8_t)((m->idx + 1u) % m->window);
    return m->sum / (int32_t)m->window;   /* C truncates toward zero; fine for ADC counts */
}

void ema_init(ema_t *e, uint8_t k) {
    e->state = 0;
    e->k = k;
    e->primed = false;
}

int32_t ema_update(ema_t *e, int32_t x) {
    int32_t target = x * (1 << EMA_FRAC_BITS);   /* the input, scaled to the state's units */
    if (!e->primed) {
        e->state = target;   /* start at the first sample, not at 0, so there is no startup ramp */
        e->primed = true;
    } else {
        /* The IIR update. Right-shifting a negative signed value is implementation-defined in C
           (gcc shifts arithmetically), so check the compiler before using this on negative signals. */
        e->state += (target - e->state) >> e->k;
    }
    /* Round to nearest when leaving the fixed-point domain. Truncating would show 4 for a steady 5. */
    return (e->state + (1 << (EMA_FRAC_BITS - 1u))) >> EMA_FRAC_BITS;
}

void median3_init(median3_t *m) {
    m->hist[0] = 0;
    m->hist[1] = 0;
    m->hist[2] = 0;
    m->count = 0;
}

static int32_t min32(int32_t a, int32_t b) { return a < b ? a : b; }
static int32_t max32(int32_t a, int32_t b) { return a > b ? a : b; }

int32_t median3_update(median3_t *m, int32_t x) {
    m->hist[0] = m->hist[1];
    m->hist[1] = m->hist[2];
    m->hist[2] = x;
    if (m->count < 2u) {          /* the first two outputs have no full window yet */
        m->count++;
        return x;
    }
    /* Median of three without sorting: the larger of the two smaller values, or the third value. */
    int32_t a = m->hist[0], b = m->hist[1], c = m->hist[2];
    return max32(min32(a, b), min32(max32(a, b), c));
}
