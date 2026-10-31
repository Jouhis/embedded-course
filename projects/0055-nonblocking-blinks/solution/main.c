#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include "pico/stdlib.h"

// EXPECT: NONBLOCKING OK

// Three LEDs on GP2, GP3 and GP4. They blink at 1 Hz, 2 Hz and 4 Hz, independently.
#define LED_A_PIN   2u
#define LED_B_PIN   3u
#define LED_C_PIN   4u
#define LED_MASK    ((1u << LED_A_PIN) | (1u << LED_B_PIN) | (1u << LED_C_PIN))

// A blink is a deadline. When the deadline passes, toggle the LED and move the deadline on by
// half a period. Each toggle is one blink edge, so a full period is two half periods.
typedef struct {
    uint32_t mask;          // which GPIO this blink drives
    uint32_t half_us;       // time between toggles, in microseconds
    uint32_t next_us;       // the next deadline, as a time_us_32() value
} blink_t;

// Wraparound-safe "now is at or after deadline". time_us_32() wraps every 2^32 us (about 71.6
// minutes). Subtracting in uint32 gives the true distance between the two times, and reading
// that distance as a signed value keeps the sign right across the wrap, as long as the
// distance is under 2^31 us (about 35.8 minutes). A plain now >= deadline gives the wrong
// answer for any deadline on the far side of the wrap.
static bool is_due(uint32_t now_us, uint32_t deadline_us) {
    return (int32_t)(now_us - deadline_us) >= 0;
}

static void blink_service(blink_t *b, uint32_t now_us) {
    if (is_due(now_us, b->next_us)) {
        gpio_xor_mask(b->mask);
        // Move the deadline from the old deadline, not from now_us. That keeps the average rate
        // exact even when this call runs a little late.
        b->next_us += b->half_us;
    }
}

// Check the comparison at the wrap point before using it. The deadline is 16 us below the wrap,
// so at 0xFFFFFFE0 it is still 16 us away and at 0x00000008 it is 24 us past.
static void wraparound_self_test(void) {
    uint32_t deadline = 0xFFFFFFF0u;
    bool before = is_due(0xFFFFFFE0u, deadline);   // expect false
    bool after  = is_due(0x00000008u, deadline);   // expect true
    if (!before && after) {
        printf("NONBLOCKING OK: wraparound compare correct\n");
    } else {
        printf("wraparound compare FAILED\n");
    }
}

int main(void) {
    stdio_init_all();

    gpio_init_mask(LED_MASK);
    gpio_set_dir_out_masked(LED_MASK);   // all three start low, so the first toggle turns them on

    wraparound_self_test();

    uint32_t start = time_us_32();
    blink_t a = { 1u << LED_A_PIN, 500000u, start + 500000u };   // 1 Hz: toggles every 500 ms
    blink_t b = { 1u << LED_B_PIN, 250000u, start + 250000u };   // 2 Hz: toggles every 250 ms
    blink_t c = { 1u << LED_C_PIN, 125000u, start + 125000u };   // 4 Hz: toggles every 125 ms

    absolute_time_t report_at = make_timeout_time_ms(2000);

    while (true) {
        // Each pass checks all three deadlines and returns at once. Nothing waits, so the loop
        // stays free for other work, such as the report below.
        uint32_t now = time_us_32();
        blink_service(&a, now);
        blink_service(&b, now);
        blink_service(&c, now);

        if (absolute_time_diff_us(get_absolute_time(), report_at) <= 0) {
            printf("uptime %lu ms\n", (unsigned long)to_ms_since_boot(get_absolute_time()));
            report_at = make_timeout_time_ms(2000);
        }
    }
}
