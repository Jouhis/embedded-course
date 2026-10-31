/* analysis.c: fixed version of the lesson 83 starter. Each fix is marked FIXED. */
#include <stddef.h>
#include <stdint.h>

int32_t sum_samples(const int16_t *s, size_t n) {
    int32_t total = 0;                  /* FIXED 1: one total, declared once */
    for (size_t i = 0; i < n; i++) {
        total += s[i];
    }
    return total;
}

int find_first_negative(const int16_t *s, size_t n) {
    for (size_t i = 0; i < n; i++) {    /* FIXED 2: index type matches the length type */
        if (s[i] < 0) {
            return (int)i;              /* safe: i < n, and the caller's n fits in int */
        }
    }
    return -1;
}

const char *status_name(uint8_t code) {
    switch (code) {
    case 0u:
        return "idle";
    case 1u:
        return "running";
    case 2u:
        return "fault";
    default:                            /* FIXED 3: every case returns, so no fall-through */
        return "unknown";
    }
}

uint8_t checksum(const uint8_t *data, size_t n) {
    uint8_t sum = 0u;                   /* FIXED 4: initialised */
    for (size_t i = 0; i < n; i++) {
        sum = (uint8_t)(sum + data[i]); /* FIXED: explicit narrowing, so -Wconversion is quiet */
    }
    return sum;
}

void frame_build(uint8_t type, uint8_t value, int terminate, uint8_t out[4]) {
    uint8_t frame[4];                   /* FIXED 5: four bytes, so index 3 exists */
    frame[0] = type;
    frame[1] = value;
    frame[2] = 0u;
    frame[3] = terminate ? 0xFFu : 0u;
    for (size_t i = 0; i < 4u; i++) {
        out[i] = frame[i];
    }
}
