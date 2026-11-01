/* Framed sensor stream (lesson 103). Your task: frame each reading and check it on the way back.
 *
 * Frame body (before COBS): seq (1) | sensor id (1) | value (2, little-endian) | CRC-16 (2, big-endian)
 * Wire format: COBS(body) followed by one 0x00 delimiter.
 * cobs.c and crc16.c are in src/ (they are the same files you finished in the host tests). */
#include <stdint.h>
#include <stdio.h>
#include "pico/stdlib.h"
#include "cobs.h"
#include "crc16.h"

#define SENSOR_ID            0x21u
#define PAYLOAD_LEN          4u
#define BODY_LEN             6u
#define WIRE_CAP            16u
#define NUM_FRAMES           5u
#define SENSOR_BASE_CENTI_C 2250

/* TODO(learner): build the frame. Fill body[0..3] with seq, SENSOR_ID and the value (low byte
 * first). Compute crc16_ccitt_false() over the first PAYLOAD_LEN bytes and store it in body[4..5],
 * high byte first. COBS-encode the six body bytes into wire, then add the 0x00 delimiter.
 * Return the number of bytes written, or 0 if they did not fit. */
static size_t frame_encode(uint8_t seq, int16_t value, uint8_t *wire) {
    (void)seq;
    (void)value;
    (void)wire;
    (void)SENSOR_ID;
    (void)PAYLOAD_LEN;
    (void)BODY_LEN;
    (void)WIRE_CAP;
    return 0;
}

/* TODO(learner): undo the framing. COBS-decode wire (without the delimiter) into a six-byte
 * body. Reject it if the decode fails or the length is wrong. A good frame has a CRC of zero
 * over all six bytes. Then copy out seq and value, and check the sensor id. */
static int frame_decode(const uint8_t *wire, size_t n, uint8_t *seq, int16_t *value) {
    (void)wire;
    (void)n;
    (void)seq;
    (void)value;
    return 0;
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
        } else {
            printf("  decode FAILED\n");
        }
    }

    printf("%s\n", good == NUM_FRAMES ? "ROUNDTRIP OK" : "ROUNDTRIP FAILED");
    while (true) {
        tight_loop_contents();
    }
}
