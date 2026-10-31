#include <stdint.h>
#include <stdio.h>
#include "pico/stdlib.h"

// EXPECT: GDB WATCH OK

// A frame buffer with a sentinel byte. In this struct the sentinel sits right after data[].
// The sentinel must still hold SENTINEL after the frame is built.
#define FRAME_LEN   8u
#define SENTINEL    0xA5u
#define SEED        0x10u

typedef struct {
    uint8_t data[FRAME_LEN];
    uint8_t sentinel;
} frame_t;

static frame_t frame;

// FIXED: the loop bound is "< FRAME_LEN". The old "<= FRAME_LEN" wrote data[8], one byte past
// the end of the array. In this struct that byte is the sentinel, so the sentinel was overwritten.
static void build_frame(frame_t *f, uint8_t seed) {
    for (uint32_t i = 0; i < FRAME_LEN; i++) {
        f->data[i] = (uint8_t)(seed + i);
    }
}

int main(void) {
    stdio_init_all();

    while (true) {
        frame.sentinel = SENTINEL;
        build_frame(&frame, SEED);

        if (frame.sentinel == SENTINEL) {
            printf("GDB WATCH OK: sentinel intact at 0x%02x\n", frame.sentinel);
        } else {
            printf("SENTINEL CORRUPTED: 0x%02x, expected 0xa5\n", frame.sentinel);
        }
        sleep_ms(1000);
    }
}
