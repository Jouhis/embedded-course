/* flash_port.h: the three flash operations the settings store needs.
 *
 * The rules are those of NOR flash, such as the W25Q16JV on the Pico:
 * - Erase works on a whole 4096-byte sector and sets every bit in it to 1 (every byte reads 0xFF).
 * - Program works on a 256-byte page and can only change bits from 1 to 0. Programming a byte
 *   that is not 0xFF gives the AND of the old and the new value.
 * - Reading is a plain memory read: the flash is mapped into the address space.
 *
 * On the Pico, flash_port_pico.c implements these with the SDK's hardware_flash. In the host
 * tests, test/fake_flash.c implements them with an array, and can cut the power mid-operation.
 * Offsets count from the start of the flash.
 */
#ifndef FLASH_PORT_H
#define FLASH_PORT_H

#include <stdint.h>

#define FLASH_PORT_SECTOR_BYTES 4096u
#define FLASH_PORT_PAGE_BYTES   256u

/* offset must be a multiple of FLASH_PORT_SECTOR_BYTES. */
void flash_port_erase_sector(uint32_t offset);

/* offset must be a multiple of FLASH_PORT_PAGE_BYTES; page holds FLASH_PORT_PAGE_BYTES bytes. */
void flash_port_program_page(uint32_t offset, const uint8_t *page);

/* A pointer to the flash contents at offset, for reading. */
const uint8_t *flash_port_read(uint32_t offset);

#endif
