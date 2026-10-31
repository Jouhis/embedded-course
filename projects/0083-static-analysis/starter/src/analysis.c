/* analysis.c: starter with five planted defects (lesson 83). Do not fix them by
 * hand yet. Run the tools first, read what they say, then fix them. */
#include <stddef.h>
#include <stdint.h>

int32_t sum_samples(const int16_t *s, size_t n) {
    int32_t total = 0;
    for (size_t i = 0; i < n; i++) {
        int32_t total = 0;      /* DEFECT 1: hides the outer total */
        total += s[i];
    }
    return total;
}

int find_first_negative(const int16_t *s, size_t n) {
    for (int i = 0; i < n; i++) {   /* DEFECT 2: signed int compared with size_t */
        if (s[i] < 0) {
            return i;
        }
    }
    return -1;
}

const char *status_name(uint8_t code) {
    const char *name = "unknown";
    switch (code) {
    case 0u:
        name = "idle";          /* DEFECT 3: no break, so case 0 falls into case 1 */
    case 1u:
        name = "running";
        break;
    case 2u:
        name = "fault";
        break;
    default:
        break;
    }
    return name;
}

uint8_t checksum(const uint8_t *data, size_t n) {
    uint8_t sum;                /* DEFECT 4: never initialised */
    for (size_t i = 0; i < n; i++) {
        sum = sum + data[i];    /* int result stored back in uint8_t. GCC 14.2 and 16.2 stay quiet here (-Wconversion), but the cast in the solution says what you mean */
    }
    return sum;
}

void frame_build(uint8_t type, uint8_t value, int terminate, uint8_t out[4]) {
    uint8_t frame[3];           /* DEFECT 5: only indices 0 to 2 exist */
    frame[0] = type;
    frame[1] = value;
    frame[2] = 0u;
    out[0] = frame[0];
    out[1] = frame[1];
    out[2] = frame[2];
    out[3] = 0u;
    if (terminate) {
        frame[3] = 0xFFu;       /* index 3 is past the end of frame */
        out[3] = frame[3];
    }
}
