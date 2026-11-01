/* Host tests for COBS and CRC-16/CCITT-FALSE (lesson 103). Test-driven: the starter has the
 * same tests, and the encoder and decoder are written to make them pass. */
#include <string.h>
#include "unity.h"
#include "cobs.h"
#include "crc16.h"

#define MAX_BUF 700u   /* the encoding of 600 bytes is 603 bytes long */

static uint8_t enc[MAX_BUF];
static uint8_t dec[MAX_BUF];
static size_t  n_enc;
static size_t  n_dec;

void setUp(void) {
    memset(enc, 0xEE, sizeof enc);   /* poison: a test must not depend on old contents */
    memset(dec, 0xEE, sizeof dec);
    n_enc = 0;
    n_dec = 0;
}

void tearDown(void) {}

/* Encode in, check the bytes against the expected encoding, then decode and check the round trip. */
static void check_vector(const uint8_t *in, size_t len, const uint8_t *expect, size_t expect_len) {
    TEST_ASSERT_TRUE(cobs_encode(in, len, enc, MAX_BUF, &n_enc));
    TEST_ASSERT_EQUAL_UINT(expect_len, n_enc);
    TEST_ASSERT_EQUAL_UINT8_ARRAY(expect, enc, n_enc);
    TEST_ASSERT_TRUE(cobs_decode(enc, n_enc, dec, MAX_BUF, &n_dec));
    TEST_ASSERT_EQUAL_UINT(len, n_dec);
    if (len > 0) {                       /* Unity refuses to compare zero elements */
        TEST_ASSERT_EQUAL_UINT8_ARRAY(in, dec, n_dec);
    }
}

static void test_empty_frame_encodes_to_one_code_byte(void) {
    static const uint8_t in[] = {0};
    static const uint8_t expect[] = {0x01};
    check_vector(in, 0, expect, 1);
}

static void test_single_zero(void) {
    static const uint8_t in[] = {0x00};
    static const uint8_t expect[] = {0x01, 0x01};
    check_vector(in, sizeof in, expect, sizeof expect);
}

static void test_two_zeros(void) {
    static const uint8_t in[] = {0x00, 0x00};
    static const uint8_t expect[] = {0x01, 0x01, 0x01};
    check_vector(in, sizeof in, expect, sizeof expect);
}

static void test_zero_in_the_middle(void) {
    static const uint8_t in[] = {0x11, 0x22, 0x00, 0x33};
    static const uint8_t expect[] = {0x03, 0x11, 0x22, 0x02, 0x33};
    check_vector(in, sizeof in, expect, sizeof expect);
}

static void test_no_zeros_gets_one_code_byte(void) {
    static const uint8_t in[] = {0x11, 0x22, 0x33, 0x44};
    static const uint8_t expect[] = {0x05, 0x11, 0x22, 0x33, 0x44};
    check_vector(in, sizeof in, expect, sizeof expect);
}

static void test_zeros_at_both_ends(void) {
    static const uint8_t in[] = {0x11, 0x00, 0x00, 0x00};
    static const uint8_t expect[] = {0x02, 0x11, 0x01, 0x01, 0x01};
    check_vector(in, sizeof in, expect, sizeof expect);
}

static void test_full_block_of_254_bytes(void) {
    uint8_t in[254];
    for (size_t i = 0; i < sizeof in; i++) {
        in[i] = (uint8_t)(i + 1);            /* 0x01 to 0xFE: no zeros */
    }
    TEST_ASSERT_TRUE(cobs_encode(in, sizeof in, enc, MAX_BUF, &n_enc));
    /* A full block is coded as 0xFF, the 254 bytes, then an empty last block (code 0x01). */
    TEST_ASSERT_EQUAL_UINT(256u, n_enc);
    TEST_ASSERT_EQUAL_HEX8(0xFF, enc[0]);
    TEST_ASSERT_EQUAL_HEX8(0x01, enc[255]);
    TEST_ASSERT_TRUE(cobs_decode(enc, n_enc, dec, MAX_BUF, &n_dec));
    TEST_ASSERT_EQUAL_UINT8_ARRAY(in, dec, n_dec);
}

static void test_encoded_output_has_no_zero_bytes(void) {
    uint8_t in[300];
    for (size_t i = 0; i < sizeof in; i++) {
        in[i] = (uint8_t)((i * 7u) % 5u == 0u ? 0u : i);   /* a mix of zeros and nonzeros */
    }
    TEST_ASSERT_TRUE(cobs_encode(in, sizeof in, enc, MAX_BUF, &n_enc));
    for (size_t i = 0; i < n_enc; i++) {
        TEST_ASSERT_NOT_EQUAL_UINT8(0u, enc[i]);
    }
    /* The overhead bound from the paper: at most one extra byte per 254 bytes, plus one. */
    TEST_ASSERT_TRUE(n_enc <= sizeof in + sizeof in / 254u + 1u);
}

static void test_round_trip_every_length_up_to_600(void) {
    uint8_t in[MAX_BUF];
    for (size_t len = 0; len <= 600; len++) {
        for (size_t i = 0; i < len; i++) {
            in[i] = (uint8_t)((i * 31u + len) % 256u);     /* includes zeros */
        }
        TEST_ASSERT_TRUE(cobs_encode(in, len, enc, MAX_BUF, &n_enc));
        TEST_ASSERT_TRUE(cobs_decode(enc, n_enc, dec, MAX_BUF, &n_dec));
        TEST_ASSERT_EQUAL_UINT(len, n_dec);
        if (len > 0) {
            TEST_ASSERT_EQUAL_UINT8_ARRAY(in, dec, len);
        }
    }
}

static void test_decode_rejects_zero_in_data(void) {
    static const uint8_t bad[] = {0x03, 0x11, 0x00, 0x02, 0x33};
    TEST_ASSERT_FALSE(cobs_decode(bad, sizeof bad, dec, MAX_BUF, &n_dec));
}

static void test_decode_rejects_block_past_end(void) {
    static const uint8_t bad[] = {0x05, 0x11, 0x22};   /* says 4 data bytes, has 2 */
    TEST_ASSERT_FALSE(cobs_decode(bad, sizeof bad, dec, MAX_BUF, &n_dec));
}

static void test_encode_rejects_small_output(void) {
    static const uint8_t in[] = {0x11, 0x22, 0x33, 0x44};
    uint8_t tiny[4];                    /* the encoding needs 5 bytes */
    TEST_ASSERT_FALSE(cobs_encode(in, sizeof in, tiny, sizeof tiny, &n_enc));
}

static void test_crc_ccitt_false_check_value(void) {
    /* The standard check value for CRC-16/CCITT-FALSE over ASCII "123456789". */
    TEST_ASSERT_EQUAL_HEX16(0x29B1u, crc16_ccitt_false((const uint8_t *)"123456789", 9));
}

static void test_crc_ccitt_false_empty_is_init(void) {
    TEST_ASSERT_EQUAL_HEX16(0xFFFFu, crc16_ccitt_false((const uint8_t *)"", 0));
}

static void test_crc_residue_is_zero_when_crc_is_appended_big_endian(void) {
    /* Appending the CRC (high byte first) makes the CRC of the whole frame zero. The
     * framing code uses this to check a received frame in one step. */
    uint8_t whole[8];
    memcpy(whole, "sensor", 6);
    uint16_t crc = crc16_ccitt_false(whole, 6);
    whole[6] = (uint8_t)(crc >> 8);       /* high byte first */
    whole[7] = (uint8_t)(crc & 0xFFu);
    TEST_ASSERT_EQUAL_HEX16(0x0000u, crc16_ccitt_false(whole, sizeof whole));
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_empty_frame_encodes_to_one_code_byte);
    RUN_TEST(test_single_zero);
    RUN_TEST(test_two_zeros);
    RUN_TEST(test_zero_in_the_middle);
    RUN_TEST(test_no_zeros_gets_one_code_byte);
    RUN_TEST(test_zeros_at_both_ends);
    RUN_TEST(test_full_block_of_254_bytes);
    RUN_TEST(test_encoded_output_has_no_zero_bytes);
    RUN_TEST(test_round_trip_every_length_up_to_600);
    RUN_TEST(test_decode_rejects_zero_in_data);
    RUN_TEST(test_decode_rejects_block_past_end);
    RUN_TEST(test_encode_rejects_small_output);
    RUN_TEST(test_crc_ccitt_false_check_value);
    RUN_TEST(test_crc_ccitt_false_empty_is_init);
    RUN_TEST(test_crc_residue_is_zero_when_crc_is_appended_big_endian);
    return UNITY_END();
}
