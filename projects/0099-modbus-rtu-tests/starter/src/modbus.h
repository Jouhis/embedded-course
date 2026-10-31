/* modbus.h: a Modbus RTU slave frame handler (lesson 99). Hardware-free: it takes a request
 * frame and returns a response frame, so the PC tests run the same code as the Pico.
 *
 * Supported: function 03 (read holding registers) and 06 (write single register).
 * Exceptions: 01 illegal function, 02 illegal data address, 03 illegal data value.
 * Framing (the silent interval and the UART) is the caller's job; see main.c on the Pico.
 */
#ifndef MODBUS_H
#define MODBUS_H

#include <stddef.h>
#include <stdint.h>

#define MODBUS_MAX_FRAME          256u
#define MODBUS_REQ_LEN              8u   /* address, function, two 16-bit fields, CRC: for 03 and 06 */
#define MODBUS_FC_READ_HOLDING   0x03u
#define MODBUS_FC_WRITE_SINGLE   0x06u
#define MODBUS_EXC_FLAG          0x80u   /* set in the function code of an exception response */
#define MODBUS_EXC_ILLEGAL_FUNCTION  0x01u
#define MODBUS_EXC_ILLEGAL_ADDRESS   0x02u
#define MODBUS_EXC_ILLEGAL_VALUE     0x03u
#define MODBUS_MAX_READ_QTY        125u   /* application protocol limit for function 03 */

typedef struct {
    uint8_t   address;   /* 1 to 247; 0 is broadcast and gets no response */
    uint16_t *regs;      /* holding registers, owned by the application */
    uint16_t  nregs;     /* number of registers in regs[] */
} modbus_slave_t;

/* Handle one complete request frame. Writes the response into rsp (at least
 * MODBUS_MAX_FRAME bytes). Returns the response length, or 0 when the slave must stay silent
 * (wrong length, wrong address, or bad CRC). */
size_t modbus_process(const modbus_slave_t *slave,
                      const uint8_t *req, size_t req_len, uint8_t *rsp);

#endif /* MODBUS_H */
