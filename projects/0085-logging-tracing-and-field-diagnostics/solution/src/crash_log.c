/* crash_log.c: see crash_log.h. Pure logic, no hardware access. */
#include <stddef.h>
#include <string.h>

#include "crash_log.h"

static bool looks_valid(const crash_log_t *log) {
    /* The magic alone could match random RAM by chance, so also check the ring indices. */
    return log->magic == CRASH_LOG_MAGIC && log->head < CRASH_LOG_LINES && log->count <= CRASH_LOG_LINES;
}

bool crash_log_boot(crash_log_t *log, uint32_t reset_flags) {
    bool valid = looks_valid(log);
    if (!valid) {
        memset(log, 0, sizeof *log);   /* power-on or corrupt RAM: start empty */
        log->magic = CRASH_LOG_MAGIC;
    }
    log->boot_count++;
    log->reset_flags = reset_flags;
    return valid;
}

void crash_log_add(crash_log_t *log, const char *text) {
    char *slot = log->lines[log->head];
    size_t n = strlen(text);
    if (n > CRASH_LOG_LINE_LEN - 1u) {
        n = CRASH_LOG_LINE_LEN - 1u;
    }
    memcpy(slot, text, n);
    slot[n] = '\0';

    log->head = (log->head + 1u) % CRASH_LOG_LINES;
    if (log->count < CRASH_LOG_LINES) {
        log->count++;
    }
}

const char *crash_log_line(const crash_log_t *log, uint32_t i) {
    if (i >= log->count) {
        return NULL;
    }
    /* With a full ring, the oldest line is in the slot head points at. With a partly
     * filled ring, it is slot 0. Stepping back count slots from head covers both. */
    uint32_t oldest = (log->head + CRASH_LOG_LINES - log->count) % CRASH_LOG_LINES;
    return log->lines[(oldest + i) % CRASH_LOG_LINES];
}
