/* temp_format.h: conversion from MYS-1 raw counts to hundredths of a degree (lesson 63).
 * Pure C with no hardware calls, so the same function runs in the shell and in a ztest on a
 * PC or a board. */
#ifndef TEMP_FORMAT_H
#define TEMP_FORMAT_H

#include <stdint.h>

/* The MYS-1 reports 1/64 degC per count, signed 16-bit. Returns hundredths of a degree
 * (2250 means 22.50 C). C integer division truncates toward zero, so the result is rounded
 * toward zero, and the maths stays exact for every raw value that divides evenly. */
int32_t mys_raw_to_centi_c(int16_t raw);

#endif /* TEMP_FORMAT_H */
