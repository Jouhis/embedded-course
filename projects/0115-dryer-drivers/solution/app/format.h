/* format.h: turning numbers into text without printf, so the same code runs on both boards.
 * Every function writes a NUL-terminated string and returns the length it wrote. Temperatures
 * are kept as integer hundredths of a degree (2250 means 22.50 C), so no float printf is needed. */
#ifndef FORMAT_H
#define FORMAT_H

#include <stddef.h>
#include <stdint.h>

/* Append s to out (capacity cap) starting at length len. Returns the new length. */
size_t str_append(char *out, size_t cap, size_t len, const char *s);

/* Format hundredths of a unit as "[-]I.FF", for example 2250 -> "22.50" and -5 -> "-0.05". */
size_t fmt_centi(char *out, size_t n, int32_t centi);

/* Format a signed integer in decimal. */
size_t fmt_int(char *out, size_t n, int32_t value);

#endif /* FORMAT_H */
