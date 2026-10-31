#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include "pico/stdlib.h"

// EXPECT: STACK PAINT OK

// Stack painting: fill the unused stack with a known pattern, run code that uses it, then
// count how many words were overwritten. The lowest changed word is the high-water mark.
// A canary word at the very bottom of the reserved stack shows whether the stack ever went
// past its reserved size.

#define PAINT_WORD          0xA5A5A5A5u  /* fills the unused stack */
#define CANARY_WORD         0xDEADBEEFu  /* stored at __StackBottom, the lowest reserved word */
#define PAINT_MARGIN_BYTES  64u          /* stop painting this far below our own frames */
#define SAFE_DEPTH          16u          /* recursion that fits in the reserved stack */
#define OVERFLOW_DEPTH      128u         /* 128 frames of 24 bytes: 1 KB past the 2 KB reserved stack */

// The linker defines these (pico-sdk memmap, script_include/section_end.incl and
// section_heap.incl). Their addresses are the bounds; their contents are not used.
extern char __StackBottom;   /* lowest byte of the reserved core 0 stack */
extern char __StackTop;      /* one past the highest byte: the stack starts here and grows down */

static uint32_t *s_paint_limit;   /* the words below this were painted; above it is in use */

static uint32_t current_sp(void) {
    uint32_t sp;
    __asm volatile ("mov %0, sp" : "=r"(sp));   /* read SP directly: the Cortex-M stack pointer */
    return sp;
}

static void paint_unused_stack(void) {
    volatile uint32_t *lo = (volatile uint32_t *)&__StackBottom;
    volatile uint32_t *hi = (volatile uint32_t *)(current_sp() - PAINT_MARGIN_BYTES);
    *lo = CANARY_WORD;                              /* the canary: the lowest reserved word */
    for (volatile uint32_t *p = lo + 1; p < hi; p++) {
        *p = PAINT_WORD;
    }
    s_paint_limit = (uint32_t *)hi;
}

// The stack grows down, so the lowest word that no longer holds the paint marks the deepest
// point the stack reached. Word 0 is the canary, so the scan starts at word 1.
static uint32_t high_water_bytes(void) {
    const uint32_t *lo = (const uint32_t *)&__StackBottom;
    const uint32_t *top = (const uint32_t *)&__StackTop;
    for (const uint32_t *p = lo + 1; p < s_paint_limit; p++) {
        if (*p != PAINT_WORD) {
            return (uint32_t)((uintptr_t)top - (uintptr_t)p);
        }
    }
    return 0;                                       /* nothing changed: the stack never got here */
}

static bool canary_intact(void) {
    return *(volatile uint32_t *)&__StackBottom == CANARY_WORD;
}

// Each call keeps a small frame alive (the volatile array stops the compiler from removing it),
// so the depth is the number of frames on the stack.
static uint32_t recurse(uint32_t depth) {
    volatile uint32_t frame[4];
    frame[0] = depth;
    if (depth == 0) {
        return frame[0];
    }
    return recurse(depth - 1) + frame[0];
}

int main(void) {
    stdio_init_all();

    paint_unused_stack();
    uint32_t sink = recurse(SAFE_DEPTH);
    uint32_t used = high_water_bytes();
    uint32_t reserved = (uint32_t)((uintptr_t)&__StackTop - (uintptr_t)&__StackBottom);
    bool ok = used > 0u && used <= reserved && canary_intact();

    printf("STACK reserved %lu bytes, depth %u, high-water %lu bytes (sink %lu)\n",
           (unsigned long)reserved, SAFE_DEPTH, (unsigned long)used, (unsigned long)sink);
    puts(ok ? "STACK PAINT OK" : "STACK PAINT FAIL");

    // Optional overflow: recurse past the reserved stack. The canary is the only thing that
    // notices, and only after the damage is done. The Pico's RAM below the stack is free here.
    recurse(OVERFLOW_DEPTH);
    puts(canary_intact() ? "CANARY OK: no overflow" : "CANARY HIT: the stack went past __StackBottom");

    while (true) {
        tight_loop_contents();
    }
}
