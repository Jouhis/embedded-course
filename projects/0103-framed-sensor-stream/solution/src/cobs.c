/* cobs.c: COBS encoder and decoder. See cobs.h for the contract and the reference.
 *
 * Encoded form: a sequence of blocks. Each block starts with a code byte c, followed by c - 1
 * data bytes (none of them zero). The code says where the next zero was: after the block, a
 * zero is inserted, unless c is 0xFF, which means "254 data bytes, and no zero follows". */
#include "cobs.h"

#define CODE_MAX 0xFFu   /* a full block of 254 data bytes; no implied zero after it */

int cobs_encode(const uint8_t *in, size_t len, uint8_t *out, size_t cap, size_t *out_len) {
    size_t code_at = 0;  /* index of the code byte of the block being built */
    size_t w = 1;        /* next free output index; out[0] is the first code byte */
    uint8_t code = 1;    /* 1 + the number of data bytes in the current block */

    if (cap < 1) {
        return 0;
    }
    for (size_t r = 0; r < len; r++) {
        if (in[r] == 0) {
            /* A zero ends the block. Its code byte records the distance to this zero. */
            out[code_at] = code;
            code = 1;
            if (w >= cap) {
                return 0;
            }
            code_at = w++;               /* reserve the next code byte */
        } else {
            if (w >= cap) {
                return 0;
            }
            out[w++] = in[r];
            code++;
            if (code == CODE_MAX) {
                /* 254 data bytes fill a block. Close it without a zero, and start another. */
                out[code_at] = code;
                code = 1;
                if (w >= cap) {
                    return 0;
                }
                code_at = w++;
            }
        }
    }
    out[code_at] = code;                 /* the last block ends with the end of the data */
    *out_len = w;
    return 1;
}

int cobs_decode(const uint8_t *in, size_t len, uint8_t *out, size_t cap, size_t *out_len) {
    size_t r = 0;   /* read index into the encoded data */
    size_t w = 0;   /* write index into the decoded data */

    while (r < len) {
        uint8_t code = in[r];
        if (code == 0) {
            return 0;                    /* a zero cannot occur inside encoded data */
        }
        if (r + code > len) {
            return 0;                    /* the block claims more bytes than there are */
        }
        for (uint8_t k = 1; k < code; k++) {
            uint8_t b = in[r + k];
            if (b == 0) {
                return 0;
            }
            if (w >= cap) {
                return 0;
            }
            out[w++] = b;
        }
        r += code;
        /* A block shorter than 0xFF was ended by a zero, unless it ended the data. */
        if (code != CODE_MAX && r < len) {
            if (w >= cap) {
                return 0;
            }
            out[w++] = 0;
        }
    }
    *out_len = w;
    return 1;
}
