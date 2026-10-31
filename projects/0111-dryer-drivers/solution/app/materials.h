/* materials.h: the filament presets (lesson 110). Each material has a drying temperature and a
 * drying time. The table is plain data, so changing a preset does not touch any logic. */
#ifndef MATERIALS_H
#define MATERIALS_H

#include <stdint.h>

typedef struct {
    const char *name;     /* at most 4 characters: it is shown on the 128 x 64 display */
    int32_t     setpoint_c;   /* drying temperature, whole degrees C */
    uint8_t     hours;        /* drying time at the setpoint, whole hours */
} material_t;

#define MATERIAL_COUNT 3u

/* Index 0 is PLA, 1 is PETG, 2 is ABS. Out-of-range indices are clamped to the last entry. */
const material_t *materials_get(uint8_t index);

#endif /* MATERIALS_H */
