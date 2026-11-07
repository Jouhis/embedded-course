/* fake_flash.c: see fake_flash.h. */
#include "fake_flash.h"

#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

jmp_buf fake_flash_power_back;

static uint8_t mem[FAKE_FLASH_BYTES];
static unsigned erases[FAKE_FLASH_BYTES / FLASH_PORT_SECTOR_BYTES];
static fake_flash_cut_t cut;

/* A misuse that real flash would not report: stop the test with a clear message. */
static void misuse(const char *what, uint32_t offset) {
    fprintf(stderr, "fake flash: %s at offset 0x%X\n", what, (unsigned)offset);
    exit(1);
}

void fake_flash_reset(void) {
    memset(mem, 0xFF, sizeof mem);
    memset(erases, 0, sizeof erases);
    cut = CUT_NONE;
}

void fake_flash_cut(fake_flash_cut_t when) {
    cut = when;
}

unsigned fake_flash_erases(unsigned sector) {
    return erases[sector];
}

void fake_flash_flip_bit(uint32_t offset, unsigned bit) {
    mem[offset] ^= (uint8_t)(1u << bit);
}

static void power_cut(void) {
    cut = CUT_NONE;
    longjmp(fake_flash_power_back, 1);
}

void flash_port_erase_sector(uint32_t offset) {
    if (offset % FLASH_PORT_SECTOR_BYTES != 0u || offset >= FAKE_FLASH_BYTES) {
        misuse("erase not on a sector boundary, or outside the two sectors", offset);
    }
    memset(&mem[offset], 0xFF, FLASH_PORT_SECTOR_BYTES);
    erases[offset / FLASH_PORT_SECTOR_BYTES]++;
    if (cut == CUT_ON_ERASE || cut == CUT_ON_ANY) {
        power_cut();
    }
}

void flash_port_program_page(uint32_t offset, const uint8_t *page) {
    if (offset % FLASH_PORT_PAGE_BYTES != 0u || offset >= FAKE_FLASH_BYTES) {
        misuse("program not on a page boundary, or outside the two sectors", offset);
    }
    bool torn = (cut == CUT_ON_PROGRAM || cut == CUT_ON_ANY);
    unsigned n = torn ? FAKE_FLASH_TORN_BYTES : FLASH_PORT_PAGE_BYTES;
    for (unsigned i = 0; i < n; i++) {
        mem[offset + i] &= page[i];   /* programming can only clear bits */
    }
    if (torn) {
        power_cut();
    }
}

const uint8_t *flash_port_read(uint32_t offset) {
    if (offset >= FAKE_FLASH_BYTES) {
        misuse("read outside the two sectors", offset);
    }
    return &mem[offset];
}
