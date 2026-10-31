/* format.c: integers to text. Digits come out in reverse order, so they are built into a
 * scratch buffer and copied back the right way round. */
#include "format.h"

size_t str_append(char *out, size_t cap, size_t len, const char *s) {
    if (cap == 0U) {
        return 0U;
    }
    while (*s != '\0' && len + 1U < cap) {
        out[len++] = *s++;
    }
    out[len] = '\0';
    return len;
}

/* Copy the reversed scratch buffer rev (k characters) into out, the right way round. */
static size_t emit_reversed(char *out, size_t n, const char *rev, size_t k) {
    size_t len = 0U;
    if (n == 0U) {
        return 0U;
    }
    while (k > 0U && len + 1U < n) {
        out[len++] = rev[--k];
    }
    out[len] = '\0';
    return len;
}

size_t fmt_centi(char *out, size_t n, int32_t centi) {
    char rev[16];
    size_t k = 0U;
    /* Magnitude without overflow for the most negative value: -(x + 1) + 1 is safe. */
    uint32_t mag = (centi < 0) ? (uint32_t)(-(centi + 1)) + 1U : (uint32_t)centi;

    rev[k++] = (char)('0' + (mag % 10U));          /* hundredths */
    mag /= 10U;
    rev[k++] = (char)('0' + (mag % 10U));          /* tenths */
    mag /= 10U;
    rev[k++] = '.';
    do {                                           /* whole units, at least one digit */
        rev[k++] = (char)('0' + (mag % 10U));
        mag /= 10U;
    } while (mag != 0U);
    if (centi < 0) {
        rev[k++] = '-';
    }
    return emit_reversed(out, n, rev, k);
}

size_t fmt_int(char *out, size_t n, int32_t value) {
    char rev[12];
    size_t k = 0U;
    uint32_t mag = (value < 0) ? (uint32_t)(-(value + 1)) + 1U : (uint32_t)value;
    do {
        rev[k++] = (char)('0' + (mag % 10U));
        mag /= 10U;
    } while (mag != 0U);
    if (value < 0) {
        rev[k++] = '-';
    }
    return emit_reversed(out, n, rev, k);
}
