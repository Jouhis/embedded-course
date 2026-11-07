// EXPECT: DEMO OK
/* Lesson 105 demo: the tested settings store on the Pico's real flash.
 *
 * settings.c is the solution file from projects/0105-flash-settings, unchanged. Only the flash
 * port differs. The demo loads the setpoint, saves 21 new values (the log moves into the second
 * sector on the 17th), and reads the last one back from flash.
 *
 * On a real board, unplug it and plug it in again: the first line then shows the value saved
 * before the power went. Wokwi simulates the flash writes, but no reset that keeps the flash
 * (the watchdog and SYSRESETREQ do not reset its Pico), so in Wokwi every run starts blank.
 */
#include <stdio.h>
#include "pico/stdlib.h"
#include "settings.h"

#define FIRST_C 60u
#define LAST_C  80u

/* The linker puts the program at the start of flash; this symbol marks where it ends. */
extern char __flash_binary_end;

_Static_assert(SETTINGS_OFFSET + SETTINGS_SECTORS * FLASH_PORT_SECTOR_BYTES == PICO_FLASH_SIZE_BYTES,
               "the settings sectors must be the last two sectors of the flash");

int main(void) {
    stdio_init_all();
    printf("\nprogram ends at offset 0x%06X, settings start at offset 0x%06X\n",
           (unsigned)((uintptr_t)&__flash_binary_end - XIP_BASE), (unsigned)SETTINGS_OFFSET);

    uint16_t sp;
    if (settings_load(&sp)) {
        printf("power-up: setpoint %u C, saved before the power went\n", sp);
    } else {
        printf("power-up: setpoint %u C (no saved record, the default)\n", sp);
    }

    for (uint16_t v = FIRST_C; v <= LAST_C; v++) {
        settings_save(v);
    }
    printf("saved %u to %u C: %u saves\n", FIRST_C, LAST_C, LAST_C - FIRST_C + 1u);

    /* The store keeps nothing in RAM, so this load reads only what the flash holds. */
    if (settings_load(&sp) && sp == LAST_C) {
        printf("DEMO OK: read %u C back from flash\n", sp);
    } else {
        printf("DEMO FAILED: read %u C, expected %u C\n", sp, LAST_C);
    }
    for (;;) {
        tight_loop_contents();
    }
}
