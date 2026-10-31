/* app_image.h: the contract between the bootloader and the application image (lessons 102 and 113).
 *
 *   0x08000000  bootloader        16 KiB  boot/bootloader.c: checks the header, then jumps
 *   0x08004000  application slot  48 KiB  header (32 bytes), vector table at +0x100, then the code
 *
 * One ELF holds both, linked by boot/boot.ld, so one .hex programs both. In a product the two are
 * separate images joined by a flash tool or MCUboot (lesson 102). The version lives in the header
 * and the application shows it on the display. */
#ifndef APP_IMAGE_H
#define APP_IMAGE_H

#include <stdint.h>

#define APP_IMAGE_MAGIC     0x41505031u          /* 'A' 'P' 'P' '1' */
#define APP_BASE_ADDR       0x08004000u          /* first byte of the application slot */
#define APP_SLOT_SIZE       (48u * 1024u)
#define APP_VECTOR_OFFSET   0x100u               /* vector table sits 256 bytes into the slot */
#define APP_VERSION         ((1u << 16) | 0u)    /* 1.0, as (major << 16) | minor */
#define APP_VECTOR_COUNT    (16u + 60u)          /* core exceptions, then the 60 device interrupts of the F103xB */
#define APP_IRQ_USART1      37u                  /* USART1 (RM0008 table 63) */

#define RAM_BASE_ADDR       0x20000000u
#define RAM_SIZE            (20u * 1024u)        /* Blue Pill, STM32F103C8 */

/* The header is 32 bytes at APP_BASE_ADDR. The bootloader reads it before it trusts the slot. */
typedef struct {
    uint32_t magic;          /* must equal APP_IMAGE_MAGIC */
    uint32_t version;        /* (major << 16) | minor */
    uint32_t image_end;      /* address one past the last byte of the image */
    uint32_t vector_offset;  /* the vector table, as an offset from this header */
    uint32_t reserved[4];    /* room for a CRC and a signature (lesson 103); zero here */
} app_header_t;

_Static_assert(sizeof(app_header_t) == 32u, "the image header is 32 bytes");

/* Defined in main.c: the application's entry point, called from its reset vector. */
void app_main(void);

#endif /* APP_IMAGE_H */
