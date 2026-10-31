/* analysis.h: small helpers for lesson 83 (static analysis).
 *
 * The starter has five planted defects. Some are caught by the tests, some are not.
 * Find them with cppcheck and the GCC warning flags (lesson text), then fix them. */
#ifndef ANALYSIS_H
#define ANALYSIS_H

#include <stddef.h>
#include <stdint.h>

/* Sum n samples. */
int32_t sum_samples(const int16_t *s, size_t n);

/* Index of the first negative sample, or -1 if there is none. */
int find_first_negative(const int16_t *s, size_t n);

/* Name of a status code: 0 idle, 1 running, 2 fault, anything else unknown. */
const char *status_name(uint8_t code);

/* Modulo-256 sum of n bytes. */
uint8_t checksum(const uint8_t *data, size_t n);

/* Write [type, value, 0, marker] into out. The marker is 0xFF when terminate is set,
 * otherwise 0. */
void frame_build(uint8_t type, uint8_t value, int terminate, uint8_t out[4]);

#endif /* ANALYSIS_H */
