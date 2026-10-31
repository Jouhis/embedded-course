/* crc16.c: bitwise CRC-16 implementations. See crc16.h for the parameters. */
#include "crc16.h"

#define CRC_MODBUS_POLY_REFLECTED 0xA001u  /* 0x8005 with its bits reversed */
#define CRC_CCITT_POLY            0x1021u
#define CRC_INIT                  0xFFFFu
#define BITS_PER_BYTE             8u

uint16_t crc16_modbus(const uint8_t *data, size_t len) {
    uint16_t crc = CRC_INIT;
    for (size_t i = 0; i < len; i++) {
        crc ^= data[i];
        for (unsigned bit = 0; bit < BITS_PER_BYTE; bit++) {
            if (crc & 1u) {
                crc = (uint16_t)((crc >> 1) ^ CRC_MODBUS_POLY_REFLECTED);
            } else {
                crc = (uint16_t)(crc >> 1);
            }
        }
    }
    return crc;
}

uint16_t crc16_ccitt_false(const uint8_t *data, size_t len) {
    uint16_t crc = CRC_INIT;
    /* TODO(learner): for each byte, XOR it into the TOP byte of crc (byte << 8), then loop over
     * the 8 bits: shift left, and if the bit that fell off the top was 1, XOR with
     * CRC_CCITT_POLY. Mask nothing: uint16_t drops the bits above 16 for you. */
    (void)data;
    (void)len;
    (void)CRC_CCITT_POLY;
    (void)BITS_PER_BYTE;
    return crc;
}
