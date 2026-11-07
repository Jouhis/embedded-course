/* fake_flash.h: two sectors of NOR flash in an array, with a power cut you can schedule.
 *
 * It follows the flash_port.h rules: erase sets a sector to 0xFF, program ANDs the new bytes
 * into the old ones, and both check their alignment. fake_flash_cut() arms a power cut for the
 * next erase, the next program, or whichever comes first:
 * - a cut erase finishes (the sector is blank), then the power goes;
 * - a cut program writes only the first FAKE_FLASH_TORN_BYTES bytes, then the power goes.
 * "The power goes" is a longjmp to fake_flash_power_back, which the test sets with setjmp.
 */
#ifndef FAKE_FLASH_H
#define FAKE_FLASH_H

#include <setjmp.h>
#include <stdint.h>
#include "flash_port.h"

#define FAKE_FLASH_BYTES      (2u * FLASH_PORT_SECTOR_BYTES)
#define FAKE_FLASH_TORN_BYTES 10u   /* the record up to its CRC: the setpoint is in, the CRC is not */

typedef enum { CUT_NONE, CUT_ON_ERASE, CUT_ON_PROGRAM, CUT_ON_ANY } fake_flash_cut_t;

extern jmp_buf fake_flash_power_back;

void fake_flash_reset(void);                  /* blank flash, counters at zero, no cut armed */
void fake_flash_cut(fake_flash_cut_t when);
unsigned fake_flash_erases(unsigned sector);  /* erases of one sector since the reset */
void fake_flash_flip_bit(uint32_t offset, unsigned bit);   /* a bit that went bad in the field */

#endif
