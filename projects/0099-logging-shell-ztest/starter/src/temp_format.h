/* temp_format.h: conversion from MYS-1 raw counts to hundredths of a degree (lesson 63). */
#ifndef TEMP_FORMAT_H
#define TEMP_FORMAT_H

#include <stdint.h>

/* The MYS-1 reports 1/64 degC per count, signed 16-bit. Returns hundredths of a degree. */
int32_t mys_raw_to_centi_c(int16_t raw);

#endif /* TEMP_FORMAT_H */
