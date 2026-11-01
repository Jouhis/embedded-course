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
    (void)start;
    (void)value;
    (void)rsp;

    /* TODO(learner): handle function 03 (read holding registers) and 06 (write single register).
     * For 03: check the quantity (1 to MODBUS_MAX_READ_QTY) and the address range (use a 32-bit
     * sum so start + value cannot wrap), then fill rsp with address, function, byte count and
     * the registers big-endian, and call finish_frame(). For 06: check the address, store the
     * value, and echo the request. Use exception_response() for every error. Return the length. */
    if (fc == MODBUS_FC_READ_HOLDING || fc == MODBUS_FC_WRITE_SINGLE) {
        return 0u;                           /* not written yet: the tests will show this */
    }

    return exception_response(slave->address, fc, MODBUS_EXC_ILLEGAL_FUNCTION, rsp);
}
