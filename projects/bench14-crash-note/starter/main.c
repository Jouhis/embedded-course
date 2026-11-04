/* Bench lab 14: the crash that leaves a note.
 *
 * A device in the field resets, and nobody saw why. This program leaves itself a note before
 * it dies and reads it after the reset. It crashes on purpose, twice:
 *   run 1: a task gets stuck in a loop; the watchdog (lesson 84) resets the chip after 2 s;
 *   run 2: code calls a NULL callback; the core takes a HardFault, the handler writes the note
 *          and asks the watchdog for an immediate reset;
 *   run 3: both notes have been read back; the program reports and stops crashing.
 *
 * The note is meant to survive the reset. In this starter it does not: see the two TODOs. The run number lives in watchdog scratch register 0, which
 * survives the SDK's watchdog reset and is cleared at power-on (RP2350 datasheet, section
 * 12.9.5; the SDK itself uses scratch 4 to 7, so this program uses 0 only).
 */
#include <stdio.h>
#include <string.h>
#include "pico/stdlib.h"
#include "hardware/watchdog.h"
#include "hardware/structs/watchdog.h"

#define WATCHDOG_MS   2000u
#define NOTE_MAGIC    0xC0FFEE14u
#define RUN_MAGIC     0x52554E00u   // "RUN" in the top bytes; the low byte is the run number

enum cause { CAUSE_NONE, CAUSE_STUCK, CAUSE_HARDFAULT };

typedef struct {
    uint32_t magic;
    uint32_t cause;       // enum cause
    uint32_t pc;          // where it happened
    uint32_t lr;          // who called it
    uint32_t uptime_ms;
    uint32_t crc;         // CRC-32 of the fields above
} crash_note_t;

/* TODO(learner) 1: an ordinary static is zeroed by the start-up code on every reset, so the
 * note never survives. Put it in RAM that start-up does not touch. */
static crash_note_t note;

/* Bitwise CRC-32 (polynomial 0xEDB88320, as in zlib). Slow, small, and enough for 20 bytes. */
static uint32_t crc32(const void *data, size_t len) {
    const uint8_t *p = data;
    uint32_t crc = 0xFFFFFFFFu;
    while (len--) {
        crc ^= *p++;
        for (int k = 0; k < 8; k++) {
            crc = (crc >> 1) ^ (0xEDB88320u & -(crc & 1u));
        }
    }
    return ~crc;
}

static void note_write(enum cause cause, uint32_t pc, uint32_t lr) {
    note.magic = NOTE_MAGIC;
    note.cause = cause;
    note.pc = pc;
    note.lr = lr;
    note.uptime_ms = to_ms_since_boot(get_absolute_time());
    note.crc = crc32(&note, offsetof(crash_note_t, crc));
}

/* TODO(learner) 2: after power-on that RAM holds random bits. Accept a note only if its magic
 * number and its CRC are right. */
static bool note_valid(void) {
    return note.cause != CAUSE_NONE;
}

/* HardFault: the naked stub finds the stacked frame (lesson 84) and passes it to C. */
void __attribute__((used, noreturn)) hardfault_note(uint32_t *frame) {
    note_write(CAUSE_HARDFAULT, frame[6], frame[5]);   // stacked PC and LR
    watchdog_reboot(0, 0, 0);                          // reset now; the note survives
    while (true) { }
}

void __attribute__((naked)) isr_hardfault(void) {
    __asm volatile(
        "tst lr, #4      \n"
        "ite eq          \n"
        "mrseq r0, msp   \n"
        "mrsne r0, psp   \n"
        "b hardfault_note\n");
}

/* The stuck loop leaves its note on every pass, as a "last known position". In real firmware
 * the watchdog's own early-warning interrupt or the task supervisor would write it. */
static void __attribute__((noinline)) stuck_task(void) {
    while (true) {
        uint32_t pc;
        __asm volatile("mov %0, pc" : "=r"(pc));
        note_write(CAUSE_STUCK, pc, (uint32_t)__builtin_return_address(0));
    }
}

typedef void (*callback_t)(void);
static volatile callback_t on_event;   // never set: the classic NULL callback

int main(void) {
    stdio_init_all();
    uint32_t s0 = watchdog_hw->scratch[0];
    unsigned run = ((s0 & 0xFFFFFF00u) == RUN_MAGIC) ? (s0 & 0xFFu) + 1u : 1u;
    watchdog_hw->scratch[0] = RUN_MAGIC | run;

    printf("BENCH14 run %u, reset by watchdog: %s\n", run, watchdog_caused_reboot() ? "yes" : "no");
    if (note_valid()) {
        printf("BENCH14 note: cause=%s pc=0x%08lx lr=0x%08lx after %lu ms\n",
               note.cause == CAUSE_STUCK ? "stuck loop" : note.cause == CAUSE_HARDFAULT ? "HardFault" : "none",
               (unsigned long)note.pc, (unsigned long)note.lr, (unsigned long)note.uptime_ms);
    } else {
        printf("BENCH14 no valid note (power-on, or RAM held garbage)\n");
    }
    // Scratch 1 remembers which notes came back: bit 0 the stuck loop's (read in run 2),
    // bit 1 the HardFault's (read in run 3). Like scratch 0, it survives the watchdog reset.
    if (run == 1) {
        watchdog_hw->scratch[1] = 0;
    } else if (note_valid()) {
        watchdog_hw->scratch[1] |= 1u << (run - 2u);
    }
    memset(&note, 0, sizeof note);          // a note is read once

    if (run == 1) {
        printf("BENCH14 run 1: getting stuck; the watchdog fires in %u ms\n", WATCHDOG_MS);
        watchdog_enable(WATCHDOG_MS, true);
        sleep_ms(500);
        stuck_task();
    } else if (run == 2) {
        printf("BENCH14 run 2: calling a NULL callback\n");
        sleep_ms(100);
        on_event();
    }
    if ((watchdog_hw->scratch[1] & 3u) == 3u) {
        printf("BENCH14 both crashes recorded\n");
    } else {
        printf("BENCH14 a note was lost (got 0x%lx of 0x3)\n", (unsigned long)(watchdog_hw->scratch[1] & 3u));
    }
    watchdog_hw->scratch[0] = 0;            // next reset starts the sequence again
    while (true) {
        sleep_ms(1000);
    }
}
