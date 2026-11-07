/* settings.c (solution): the setpoint as a log of records in two flash sectors.
 *
 * Each save writes a new record into the slot after the newest one, so one sector erase serves
 * 16 saves. The log erases a sector only when it moves into it, and at that moment the newest
 * record is in the other sector. A record carries a sequence number and a CRC: loading takes
 * the valid record with the highest sequence number, and a record torn by a power cut fails
 * its CRC and is ignored.
 */
#include "settings.h"

#include <stddef.h>
#include <string.h>
#include "crc16.h"

#define NO_SLOT (-1)

_Static_assert(sizeof(settings_record_t) == 12, "the record must have no padding");

static uint32_t slot_offset(unsigned slot) {
    return SETTINGS_OFFSET + slot * FLASH_PORT_PAGE_BYTES;
}

static uint16_t record_crc(const settings_record_t *r) {
    return crc16_ccitt_false((const uint8_t *)r, offsetof(settings_record_t, crc));
}

static bool record_valid(const settings_record_t *r) {
    return r->magic == RECORD_MAGIC && record_crc(r) == r->crc;
}

static bool slot_blank(unsigned slot) {
    const uint8_t *p = flash_port_read(slot_offset(slot));
    for (unsigned i = 0; i < FLASH_PORT_PAGE_BYTES; i++) {
        if (p[i] != 0xFFu) {
            return false;
        }
    }
    return true;
}

/* The slot holding the valid record with the highest sequence number, or NO_SLOT. */
static int newest_slot(settings_record_t *newest) {
    int best = NO_SLOT;
    for (unsigned i = 0; i < SLOT_COUNT; i++) {
        settings_record_t r;
        memcpy(&r, flash_port_read(slot_offset(i)), sizeof r);   /* flash may not be aligned for a struct */
        if (record_valid(&r) && (best == NO_SLOT || r.seq > newest->seq)) {
            *newest = r;
            best = (int)i;
        }
    }
    return best;
}

bool settings_load(uint16_t *setpoint_c) {
    settings_record_t r;
    if (newest_slot(&r) == NO_SLOT) {
        *setpoint_c = DEFAULT_SETPOINT_C;
        return false;
    }
    *setpoint_c = r.setpoint_c;
    return true;
}

void settings_save(uint16_t setpoint_c) {
    settings_record_t newest;
    int slot = newest_slot(&newest);
    settings_record_t rec = {
        .magic = RECORD_MAGIC,
        .seq = (slot == NO_SLOT) ? 1u : newest.seq + 1u,
        .setpoint_c = setpoint_c,
    };
    rec.crc = record_crc(&rec);

    unsigned next = (slot == NO_SLOT) ? 0u : ((unsigned)slot + 1u) % SLOT_COUNT;
    for (;;) {
        if (next % SLOTS_PER_SECTOR == 0u) {
            /* The log moves into this sector. Everything in it is older than the newest record,
             * which is in the other sector, so erasing it loses nothing. */
            flash_port_erase_sector(slot_offset(next));
            break;
        }
        if (slot_blank(next)) {
            break;
        }
        next = (next + 1u) % SLOT_COUNT;   /* a record torn by a power cut: skip its slot */
    }

    static uint8_t page[FLASH_PORT_PAGE_BYTES];   /* in RAM, and off the stack: 256 bytes is a lot of stack */
    memset(page, 0xFF, sizeof page);              /* 0xFF leaves the rest of the page erased */
    memcpy(page, &rec, sizeof rec);
    flash_port_program_page(slot_offset(next), page);
}
