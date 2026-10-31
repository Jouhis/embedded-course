/* cobs.h: Consistent Overhead Byte Stuffing (COBS), lesson 101.
 *
 * COBS rewrites a frame so that it contains no zero bytes. A frame delimiter of 0x00 can then
 * mark the end of every frame, and the receiver can find a frame's start after any noise.
 * The encoded output is never more than len + len/254 + 1 bytes long. The delimiter itself is
 * NOT part of the encoded output: the framing layer appends a 0x00 after it.
 *
 * Reference: Cheshire and Baker, "Consistent Overhead Byte Stuffing", IEEE/ACM Transactions
 * on Networking 7(2), 1999 (see RESOURCES.md for the link).
 */
#ifndef COBS_H
#define COBS_H

#include <stddef.h>
#include <stdint.h>

/* Encode len bytes from in into out (capacity cap). Returns 1 and sets *out_len on success,
 * or 0 if out is too small. */
int cobs_encode(const uint8_t *in, size_t len, uint8_t *out, size_t cap, size_t *out_len);

/* Decode len encoded bytes from in into out (capacity cap). Returns 1 and sets *out_len on
 * success. Returns 0 for malformed input: a zero byte inside the encoded data, a block that
 * runs past the end, or an output buffer that is too small. */
int cobs_decode(const uint8_t *in, size_t len, uint8_t *out, size_t cap, size_t *out_len);

#endif /* COBS_H */
