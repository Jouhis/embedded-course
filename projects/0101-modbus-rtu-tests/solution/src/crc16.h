/* crc16.h: CRC-16 functions shared by the Modbus slave (lesson 101) and the serial
 * framing lessons (lesson 103). Both are bitwise: no table, so no RAM and a few bytes of flash.
 *
 *   crc16_modbus()       CRC-16/MODBUS: reflected polynomial 0xA001 (0x8005 reflected), init 0xFFFF.
 *                        Modbus RTU appends it low byte first.
 *   crc16_ccitt_false()  CRC-16/CCITT-FALSE: polynomial 0x1021, init 0xFFFF, no reflection (lesson 103).
 */
#ifndef CRC16_H
#define CRC16_H

#include <stddef.h>
#include <stdint.h>

uint16_t crc16_modbus(const uint8_t *data, size_t len);
uint16_t crc16_ccitt_false(const uint8_t *data, size_t len);

#endif /* CRC16_H */
