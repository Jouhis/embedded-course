/* crc16.c: bitwise CRC-16 implementations. See crc16.h for the parameters. */
#include "crc16.h"

#define CRC_MODBUS_POLY_REFLECTED 0xA001u  /* 0x8005 with its bits reversed */
#define CRC_CCITT_POLY            0x1021u
#define CRC_INIT                  0xFFFFu
#define BITS_PER_BYTE             8u

uint16_t crc16_modbus(const uint8_t *data, size_t len) {
    uint16_t crc = CRC_INIT;
    for (size_t i = 0; i < len; i++) {
        /* TODO(learner): XOR data[i] into the low byte of crc, then loop over the 8 bits:
         * if the bit shifted out on the right is 1, shift and XOR with CRC_MODBUS_POLY_REFLECTED;
         * otherwise just shift. The loop body is the same as the CCITT version below, mirrored. */
        (void)data;
    }
    return crc;
}

uint16_t crc16_ccitt_false(const uint8_t *data, size_t len) {
    uint16_t crc = CRC_INIT;
    for (size_t i = 0; i < len; i++) {
        crc ^= (uint16_t)((uint16_t)data[i] << 8);   /* the byte enters at the top */
        for (unsigned bit = 0; bit < BITS_PER_BYTE; bit++) {
            /* Shift left; the top bit shifted out decides whether to apply the polynomial. */
            if (crc & 0x8000u) {
                crc = (uint16_t)((uint16_t)(crc << 1) ^ CRC_CCITT_POLY);
            } else {
                crc = (uint16_t)(crc << 1);
            }
        }
    }
    return crc;
}
