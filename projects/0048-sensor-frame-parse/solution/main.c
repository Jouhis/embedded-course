// EXPECT: FRAME PARSE OK temp=4660 mode=1 valid=1
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include "pico/stdlib.h"

/* A 4-byte sensor frame as it arrives on the wire:
 *   byte 0      header, always 0xA5
 *   bytes 1, 2  temperature in hundredths of a degree C, big-endian (high byte first)
 *   byte 3      status: bits 1:0 = mode, bit 2 = valid
 */
#define FRAME_HEADER  0xA5U
#define FRAME_LEN     4U

/* Plain fields, no bit-fields: the parsed value is the same on every compiler. */
typedef struct {
    uint16_t temp_centi_c;
    uint8_t  mode;
    uint8_t  valid;
} SensorReading;

static bool parse_frame(const uint8_t frame[FRAME_LEN], SensorReading *out) {
    if (frame[0] != FRAME_HEADER) {
        return false;
    }

    /* The wire is big-endian: byte 1 is the high byte. Build the value with shifts, so
     * the result does not depend on the CPU's byte order. Cast each byte to uint16_t
     * before shifting: the shift happens after integer promotion, and this keeps the
     * high byte from being shifted in a narrower type. Using memcpy would copy in the
     * host's order, which is little-endian on the RP2040, so the bytes would swap. */
    out->temp_centi_c = (uint16_t)(((uint16_t)frame[1] << 8) | (uint16_t)frame[2]);

    out->mode  = frame[3] & 0x03U;          /* bits 1:0 */
    out->valid = (frame[3] >> 2) & 0x01U;   /* bit 2 */
    return true;
}

int main(void) {
    stdio_init_all();

    const uint8_t good[FRAME_LEN] = {0xA5, 0x12, 0x34, 0x05};
    const uint8_t bad[FRAME_LEN]  = {0x5A, 0x12, 0x34, 0x05};

    SensorReading r;
    if (parse_frame(good, &r)) {
        printf("FRAME PARSE OK temp=%u mode=%u valid=%u\n", r.temp_centi_c, r.mode, r.valid);
    } else {
        printf("bad frame\n");
    }

    if (!parse_frame(bad, &r)) {
        printf("bad header rejected\n");
    }

    while (true) {
        sleep_ms(1000);
    }
}
