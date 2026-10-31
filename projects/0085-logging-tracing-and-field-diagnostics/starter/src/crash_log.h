/* crash_log.h: a ring of the last few log lines that survives a reset (lesson 85).
 *
 * The struct lives in no-init RAM (.noinit, see main.c). The startup code clears only
 * .bss, so the contents survive NVIC_SystemReset(), a watchdog reset or a crash. A
 * power-on reset leaves the RAM random, so the magic number decides whether the
 * contents are trusted. This module has no hardware access, so the host tests in
 * host-tests/ check its logic on the PC. */
#ifndef CRASH_LOG_H
#define CRASH_LOG_H

#include <stdbool.h>
#include <stdint.h>

#define CRASH_LOG_LINES     8u     /* how many recent lines are kept */
#define CRASH_LOG_LINE_LEN  24u    /* longer lines are cut to 23 characters plus NUL */
#define CRASH_LOG_MAGIC     0xC0DEFA11u

typedef struct {
    uint32_t magic;                /* valid only when equal to CRASH_LOG_MAGIC */
    uint32_t boot_count;           /* boots since the log was last cleared */
    uint32_t reset_flags;          /* RCC_CSR reset flags seen at the latest boot */
    uint32_t head;                 /* index of the slot the next line goes into */
    uint32_t count;                /* how many lines are valid, at most CRASH_LOG_LINES */
    char lines[CRASH_LOG_LINES][CRASH_LOG_LINE_LEN];
} crash_log_t;

/* Call once per boot, before anything logs. Returns true when the RAM held a valid log
 * from before this reset. Otherwise the log is cleared. The boot counter always goes up,
 * and reset_flags records why this boot happened. */
bool crash_log_boot(crash_log_t *log, uint32_t reset_flags);

/* Append a line (cut to CRASH_LOG_LINE_LEN - 1 characters). The oldest line is dropped
 * when the ring is full. */
void crash_log_add(crash_log_t *log, const char *text);

/* Line i, where 0 is the oldest kept line. Returns NULL when i >= count. */
const char *crash_log_line(const crash_log_t *log, uint32_t i);

#endif /* CRASH_LOG_H */
