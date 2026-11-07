/* flash_port_pico.c: flash_port.h on the Pico, with the SDK's hardware_flash.
 *
 * The program runs from the same flash chip (execute in place, XIP). While the chip erases or
 * programs, it cannot be read, so nothing may run from flash: the SDK functions run from RAM,
 * and interrupts stay off, because their handlers and the vector table are in flash. With both
 * cores running, the other core must be stopped too (multicore_lockout, or flash_safe_execute).
 */
#include "flash_port.h"

#include "hardware/flash.h"
#include "hardware/sync.h"
#include "pico/stdlib.h"

_Static_assert(FLASH_PORT_SECTOR_BYTES == FLASH_SECTOR_SIZE, "sector size must match the SDK");
_Static_assert(FLASH_PORT_PAGE_BYTES == FLASH_PAGE_SIZE, "page size must match the SDK");

void flash_port_erase_sector(uint32_t offset) {
    uint32_t irq = save_and_disable_interrupts();
    flash_range_erase(offset, FLASH_SECTOR_SIZE);
    restore_interrupts(irq);
}

void flash_port_program_page(uint32_t offset, const uint8_t *page) {
    uint32_t irq = save_and_disable_interrupts();
    flash_range_program(offset, page, FLASH_PAGE_SIZE);   /* page must be in RAM, not flash */
    restore_interrupts(irq);
}

/* The flash is mapped at XIP_BASE (0x10000000), so an offset becomes an address. */
const uint8_t *flash_port_read(uint32_t offset) {
    return (const uint8_t *)(XIP_BASE + offset);
}
