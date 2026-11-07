/* modbus.c: Modbus RTU request handling for functions 03 and 06. */
#include "modbus.h"
#include "crc16.h"

/* Modbus fields are big-endian on the wire; the CRC is little-endian. */
static uint16_t get_be16(const uint8_t *p) {
    return (uint16_t)(((uint16_t)p[0] << 8) | p[1]);
}

static void put_be16(uint8_t *p, uint16_t v) {
    p[0] = (uint8_t)(v >> 8);
    p[1] = (uint8_t)(v & 0xFFu);
}

/* Appends the CRC to a frame of n bytes and returns the total length. */
static size_t finish_frame(uint8_t *frame, size_t n) {
    uint16_t crc = crc16_modbus(frame, n);
    frame[n] = (uint8_t)(crc & 0xFFu);      /* low byte first */
    frame[n + 1] = (uint8_t)(crc >> 8);
    return n + 2u;
}

static size_t exception_response(uint8_t address, uint8_t fc, uint8_t code, uint8_t *rsp) {
    rsp[0] = address;
    rsp[1] = (uint8_t)(fc | MODBUS_EXC_FLAG);  /* the high bit marks an exception */
    rsp[2] = code;
    return finish_frame(rsp, 3u);
}

size_t modbus_process(const modbus_slave_t *slave,
                      const uint8_t *req, size_t req_len, uint8_t *rsp) {
    if (req_len != MODBUS_REQ_LEN) {
        return 0u;                           /* 03 and 06 requests are always 8 bytes */
    }
    if (req[0] != slave->address) {
        return 0u;                           /* a request for another slave */
    }
    /* The CRC covers everything but its own two bytes. A bad CRC means the frame was
     * corrupted on the wire, so the slave does not answer at all. */
    uint16_t received = (uint16_t)(req[req_len - 2u] | (req[req_len - 1u] << 8));
    if (crc16_modbus(req, req_len - 2u) != received) {
        return 0u;
    }

    uint8_t  fc    = req[1];
    uint16_t start = get_be16(&req[2]);
    uint16_t value = get_be16(&req[4]);      /* quantity for 03, register value for 06 */

    if (fc == MODBUS_FC_READ_HOLDING) {
        if (value == 0u || value > MODBUS_MAX_READ_QTY) {
            return exception_response(slave->address, fc, MODBUS_EXC_ILLEGAL_VALUE, rsp);
        }
        /* Use a 32-bit sum so start + value cannot wrap around. */
        if ((uint32_t)start + value > slave->nregs) {
            return exception_response(slave->address, fc, MODBUS_EXC_ILLEGAL_ADDRESS, rsp);
        }
        rsp[0] = slave->address;
        rsp[1] = fc;
        rsp[2] = (uint8_t)(value * 2u);      /* byte count */
        for (uint16_t i = 0; i < value; i++) {
            put_be16(&rsp[3u + 2u * i], slave->regs[start + i]);
        }
        return finish_frame(rsp, 3u + 2u * value);
    }

    if (fc == MODBUS_FC_WRITE_SINGLE) {
        if (start >= slave->nregs) {
            return exception_response(slave->address, fc, MODBUS_EXC_ILLEGAL_ADDRESS, rsp);
        }
        if (slave->check_write != NULL) {
            uint8_t exc = slave->check_write(start, value);
            if (exc != 0u) {
                return exception_response(slave->address, fc, exc, rsp);
            }
        }
        slave->regs[start] = value;
        /* A successful write is answered with an echo of the request. */
        for (size_t i = 0; i < MODBUS_REQ_LEN - 2u; i++) {
            rsp[i] = req[i];
        }
        return finish_frame(rsp, MODBUS_REQ_LEN - 2u);
    }

    return exception_response(slave->address, fc, MODBUS_EXC_ILLEGAL_FUNCTION, rsp);
}
