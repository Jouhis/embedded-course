/* materials.c: the presets. Values are the common manufacturer drying guides (PLA 45 C,
 * PETG 65 C, ABS 80 C), with the drying times set in the course spec: 4, 4 and 6 hours. */
#include "materials.h"

static const material_t PRESETS[MATERIAL_COUNT] = {
    { "PLA",  45, 4 },
    { "PETG", 65, 4 },
    { "ABS",  80, 6 },
};

const material_t *materials_get(uint8_t index) {
    if (index >= MATERIAL_COUNT) {
        index = (uint8_t)(MATERIAL_COUNT - 1u);
    }
    return &PRESETS[index];
}
