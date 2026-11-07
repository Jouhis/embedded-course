/* settings.c (starter): the obvious way to save a setting, and why it is not enough.
 *
 * This version keeps one record in the first slot. Every save erases the sector and programs
 * the record again. It works until the power fails between the erase and the program, and it
 * erases the sector on every save. Five tests fail with it; your job is to make all nine pass.
 *
 * The plan (see the lesson):
 * 1. record_valid(): check the magic and the CRC, so a torn or damaged record is ignored.
 * 2. newest_slot(): scan all SLOT_COUNT slots and keep the valid record with the highest seq.
 * 3. settings_save(): write the record into the slot after the newest one, with seq one higher.
 *    Erase a sector only when the log moves into its first slot. Skip a slot that is not
 *    blank (a record torn by a power cut).
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

/* TODO(learner) 1: also check the CRC. */
static bool record_valid(const settings_record_t *r) {
    return r->magic == RECORD_MAGIC;
}

/* True if every byte of the slot is 0xFF. You need it in TODO(learner) 3. */
static bool slot_blank(unsigned slot) {
    const uint8_t *p = flash_port_read(slot_offset(slot));
    for (unsigned i = 0; i < FLASH_PORT_PAGE_BYTES; i++) {
        if (p[i] != 0xFFu) {
            return false;
        }
    }
    return true;
}

/* TODO(learner) 2: scan every slot, not only slot 0, and keep the valid record with the highest seq. */
static int newest_slot(settings_record_t *newest) {
    memcpy(newest, flash_port_read(slot_offset(0)), sizeof *newest);
    return record_valid(newest) ? 0 : NO_SLOT;
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

/* TODO(learner) 3: write to the slot after the newest record instead of erasing and rewriting slot 0. */
void settings_save(uint16_t setpoint_c) {
    settings_record_t newest;
    int slot = newest_slot(&newest);
    settings_record_t rec = {
        .magic = RECORD_MAGIC,
        .seq = (slot == NO_SLOT) ? 1u : newest.seq + 1u,
        .setpoint_c = setpoint_c,
    };
    rec.crc = record_crc(&rec);

    (void)slot_blank;   /* unused until TODO(learner) 3; remove this line then */
    unsigned next = 0u;
    flash_port_erase_sector(slot_offset(next));   /* from here until the program, no copy exists */

    static uint8_t page[FLASH_PORT_PAGE_BYTES];   /* in RAM, and off the stack: 256 bytes is a lot of stack */
    memset(page, 0xFF, sizeof page);              /* 0xFF leaves the rest of the page erased */
    memcpy(page, &rec, sizeof rec);
    flash_port_program_page(slot_offset(next), page);
}
