/* settings.h: a setpoint that survives resets and power cuts, stored in two flash sectors.
 *
 * The store keeps no state in RAM: every call reads the flash, so a reset changes nothing.
 */
#ifndef SETTINGS_H
#define SETTINGS_H

#include <stdbool.h>
#include <stdint.h>
#include "flash_port.h"

/* Where the two sectors start. The Pico build puts them at the end of its 2 MB flash. */
#ifndef SETTINGS_OFFSET
#define SETTINGS_OFFSET 0u
#endif

#define SETTINGS_SECTORS   2u
#define SLOTS_PER_SECTOR   (FLASH_PORT_SECTOR_BYTES / FLASH_PORT_PAGE_BYTES)   /* 16 */
#define SLOT_COUNT         (SETTINGS_SECTORS * SLOTS_PER_SECTOR)               /* 32 */

#define RECORD_MAGIC       0x53455454u   /* "SETT": a slot written by this code */
#define DEFAULT_SETPOINT_C 50u

/* One record per slot (a 256-byte page). The rest of the page stays 0xFF. */
typedef struct {
    uint32_t magic;
    uint32_t seq;          /* 1 for the first save, one more for each save after it */
    uint16_t setpoint_c;
    uint16_t crc;          /* CRC-16/CCITT-FALSE of the 10 bytes before it */
} settings_record_t;

/* The newest valid setpoint. Returns false, and DEFAULT_SETPOINT_C, if there is none. */
bool settings_load(uint16_t *setpoint_c);

/* Saves a new setpoint. A power cut at any moment leaves the previous one loadable. */
void settings_save(uint16_t setpoint_c);

#endif
