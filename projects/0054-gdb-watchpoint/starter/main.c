#include <stdint.h>
#include <stdio.h>
#include "pico/stdlib.h"

// A frame buffer with a sentinel byte. In this struct the sentinel sits right after data[].
// The sentinel must still hold SENTINEL after the frame is built. The firmware is wrong
// somewhere, and your job is to find where with a GDB watchpoint.
#define FRAME_LEN   8u
#define SENTINEL    0xA5u
#define SEED        0x10u

typedef struct {
    uint8_t data[FRAME_LEN];
    uint8_t sentinel;
} frame_t;

static frame_t frame;

static void build_frame(frame_t *f, uint8_t seed) {
    for (uint32_t i = 0; i <= FRAME_LEN; i++) {
        f->data[i] = (uint8_t)(seed + i);
    }
}

int main(void) {
    stdio_init_all();

    while (true) {
        frame.sentinel = SENTINEL;          // set once per round, as the protocol requires
        build_frame(&frame, SEED);          // the sentinel should survive this call

        if (frame.sentinel == SENTINEL) {
            printf("sentinel intact: 0x%02x\n", frame.sentinel);
        } else {
            printf("SENTINEL CORRUPTED: 0x%02x, expected 0xa5\n", frame.sentinel);
        }
        sleep_ms(1000);
    }
}
