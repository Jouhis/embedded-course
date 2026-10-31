// EXPECT: ROUNDTRIP OK
/* Framed sensor stream (lesson 101): each reading becomes one frame on the wire.
 *
 * Frame body (before COBS):   seq (1) | sensor id (1) | value (2, little-endian) | CRC-16 (2, big-endian)
 * Wire format:                COBS(body) followed by one 0x00 delimiter.
 *
 * The CRC is CRC-16/CCITT-FALSE. Appended big-endian, it makes the CRC of the whole body zero,
 * so the receiver checks a frame with one call. COBS removes every zero from the body, so the
 * 0x00 delimiter always marks the end of a frame, even after line noise. */
#include <stdint.h>
#include <stdio.h>
#include "pico/stdlib.h"
#include "cobs.h"
#include "crc16.h"

#define SENSOR_ID            0x21u
#define PAYLOAD_LEN          4u      /* seq, sensor id, 16-bit value */
#define BODY_LEN             6u      /* payload plus the CRC */
#define WIRE_CAP            16u      /* COBS of 6 bytes is 8 bytes, plus the delimiter */
#define NUM_FRAMES           5u
#define SENSOR_BASE_CENTI_C 2250     /* 22.50 C, then one hundredth more per frame */

/* Builds one frame on the wire. Returns its length, or 0 if it did not fit. */
static size_t frame_encode(uint8_t seq, int16_t value, uint8_t *wire) {
    uint8_t body[BODY_LEN];
    uint16_t v = (uint16_t)value;   /* the bit pattern is the same; this avoids signed shifts */

    body[0] = seq;
    body[1] = SENSOR_ID;
    body[2] = (uint8_t)(v & 0xFFu);
    body[3] = (uint8_t)(v >> 8);
    uint16_t crc = crc16_ccitt_false(body, PAYLOAD_LEN);
    body[4] = (uint8_t)(crc >> 8);  /* high byte first, so the CRC of all six bytes is zero */
    body[5] = (uint8_t)(crc & 0xFFu);

    size_t n = 0;
    if (!cobs_encode(body, BODY_LEN, wire, WIRE_CAP - 1u, &n)) {
        return 0;
    }
    wire[n] = 0x00;                 /* delimiter: the COBS output contains no zero */
    return n + 1u;
}

/* Decodes one frame (without its delimiter). Returns 1 when the frame is intact. */
static int frame_decode(const uint8_t *wire, size_t n, uint8_t *seq, int16_t *value) {
    uint8_t body[BODY_LEN];
    size_t m = 0;
    if (!cobs_decode(wire, n, body, BODY_LEN, &m) || m != BODY_LEN) {
        return 0;
    }
    if (crc16_ccitt_false(body, BODY_LEN) != 0u) {
        return 0;                   /* the CRC of a good frame is zero */
    }
    *seq = body[0];
    *value = (int16_t)((uint16_t)body[2] | (uint16_t)((uint16_t)body[3] << 8));
    return body[1] == SENSOR_ID;
}

int main(void) {
    stdio_init_all();

    unsigned good = 0;
    uint8_t wire[WIRE_CAP];

    for (uint8_t seq = 0; seq < NUM_FRAMES; seq++) {
        int16_t value = (int16_t)(SENSOR_BASE_CENTI_C + seq);
        size_t n = frame_encode(seq, value, wire);

        printf("FRAME seq=%u bytes=%u:", seq, (unsigned)n);
        for (size_t i = 0; i < n; i++) {
            printf(" %02X", wire[i]);
        }
        printf("\n");

        uint8_t  rseq = 0;
        int16_t  rvalue = 0;
        if (n > 0 && frame_decode(wire, n - 1u, &rseq, &rvalue) && rseq == seq && rvalue == value) {
            good++;
            printf("  decoded seq=%u value=%d (%d.%02d C)\n", rseq, rvalue, rvalue / 100, rvalue % 100);
        } else {
            printf("  decode FAILED\n");
        }
    }

    /* A frame with one byte changed must be rejected by the CRC or by COBS. */
    size_t n = frame_encode(0, SENSOR_BASE_CENTI_C, wire);
    wire[1] = (uint8_t)(wire[1] == 0x55u ? 0x56u : 0x55u);
    uint8_t  cseq = 0;
    int16_t  cvalue = 0;
    int corrupt_rejected = !frame_decode(wire, n - 1u, &cseq, &cvalue);
    printf("corrupted frame rejected: %s\n", corrupt_rejected ? "yes" : "no");

    printf("%s\n", (good == NUM_FRAMES && corrupt_rejected) ? "ROUNDTRIP OK" : "ROUNDTRIP FAILED");

    while (true) {
        tight_loop_contents();
    }
}
