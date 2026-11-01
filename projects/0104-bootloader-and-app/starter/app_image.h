/* app_image.h: the contract between the bootloader and the application image (lesson 104).
 *
 * Flash layout (boot.ld places these; see the lesson for the diagram):
 *   0x08000000  bootloader        16 KiB
 *   0x08004000  application slot  48 KiB: header (32 bytes), then the vector table at +0x200,
 *                                 then the code
 * The bootloader and the application are linked into ONE image here, so one .hex file
 * programs both. In a real product they are two images that a flash tool or MCUboot joins. */
#ifndef APP_IMAGE_H
#define APP_IMAGE_H

#include <stdint.h>

#define APP_IMAGE_MAGIC     0x41505031u          /* 'A' 'P' 'P' '1' */
#define APP_BASE_ADDR       0x08004000u          /* first byte of the application slot */
#define APP_SLOT_SIZE       (48u * 1024u)
#define APP_VECTOR_OFFSET   0x200u               /* 512 bytes in: VTOR needs 512-byte alignment (PM0056 4.4.4) */
#define APP_VERSION         ((1u << 16) | 0u)    /* 1.0, as (major << 16) | minor */

#define RAM_BASE_ADDR       0x20000000u
#define RAM_SIZE            (20u * 1024u)        /* Blue Pill, STM32F103C8 */

/* The header is 32 bytes and sits at APP_BASE_ADDR. The bootloader reads it before it trusts
 * anything else in the slot. */
typedef struct {
    uint32_t magic;          /* must equal APP_IMAGE_MAGIC */
    uint32_t version;        /* (major << 16) | minor */
    uint32_t image_end;      /* address one past the last byte of the image */
    uint32_t vector_offset;  /* the vector table, as an offset from this header */
    uint32_t reserved[4];    /* room for a CRC, a signature and flags (lesson 105); zero here */
} app_header_t;

_Static_assert(sizeof(app_header_t) == 32u, "the image header is 32 bytes");

/* Provided by main.c. The application reuses the bootloader's UART, because it is in the same image. */
void uart_puts(const char *s);

#endif /* APP_IMAGE_H */
