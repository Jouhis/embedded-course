/* cobs.c: COBS encoder and decoder. See cobs.h for the contract and the reference.
 *
 * Encoded form: a sequence of blocks. Each block starts with a code byte c, followed by c - 1
 * data bytes (none of them zero). The code says where the next zero was: after the block, a
 * zero is inserted, unless c is 0xFF, which means "254 data bytes, and no zero follows". */
#include "cobs.h"

#define CODE_MAX 0xFFu   /* a full block of 254 data bytes; no implied zero after it */

int cobs_encode(const uint8_t *in, size_t len, uint8_t *out, size_t cap, size_t *out_len) {
    /* TODO(learner): write the encoder. Keep two indexes: code_at (where the current block's
     * code byte goes) and w (next free output byte). Start with code_at = 0, w = 1, code = 1.
     * For each input byte:
     *   - a zero: write code into out[code_at], start a new block (code = 1, code_at = w, w++);
     *   - a nonzero byte: copy it to out[w++] and code++; when code reaches 0xFF, close the block
     *     the same way as a zero, but without a zero to skip.
     * At the end write code into out[code_at] and set *out_len = w. Check cap before each write.
     * The tests in test/test_framing.c show the expected bytes. */
    (void)in; (void)len; (void)out; (void)cap; (void)out_len;
    (void)CODE_MAX;
    return 0;
}

int cobs_decode(const uint8_t *in, size_t len, uint8_t *out, size_t cap, size_t *out_len) {
    /* TODO(learner): write the decoder. Read a code byte c at r, reject c == 0, reject
     * r + c > len, copy the c - 1 bytes that follow (reject any zero among them), then move r
     * to the next block. After a block whose code is not 0xFF, emit one zero, unless the data
     * has ended. Check cap before each write, and set *out_len at the end. */
    (void)in; (void)len; (void)out; (void)cap; (void)out_len;
    return 0;
}
