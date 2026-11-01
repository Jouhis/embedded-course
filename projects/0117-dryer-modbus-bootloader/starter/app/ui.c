/* ui.c: composes the four OLED lines from the state (lesson 115). */
#include "format.h"
#include "materials.h"
#include "ui.h"

void ui_compose(const dryer_t *d, const dryer_out_t *out, int32_t temp_centi, bool sensor_ok,
                char lines[UI_LINES][UI_LINE_CHARS]) {
    char num[16];
    size_t n;

    /* Line 0: the material. */
    lines[0][0] = '\0';
    n = str_append(lines[0], UI_LINE_CHARS, 0u, "DRYER ");
    (void)str_append(lines[0], UI_LINE_CHARS, n, materials_get(d->material)->name);

    /* Line 1: the chamber temperature, or the sensor fault. */
    lines[1][0] = '\0';
    if (sensor_ok) {
        n = str_append(lines[1], UI_LINE_CHARS, 0u, "TEMP ");
        fmt_centi(num, sizeof num, temp_centi);
        n = str_append(lines[1], UI_LINE_CHARS, n, num);
        (void)str_append(lines[1], UI_LINE_CHARS, n, " C");
    } else {
        (void)str_append(lines[1], UI_LINE_CHARS, 0u, "SENSOR FAULT");
    }

    /* Line 2: the state. A fault shows its code, so the reason is visible without a laptop. */
    lines[2][0] = '\0';
    n = str_append(lines[2], UI_LINE_CHARS, 0u, dryer_state_name(d->state));
    if (d->state == DRYER_FAULT) {
        n = str_append(lines[2], UI_LINE_CHARS, n, " ");
        fmt_int(num, sizeof num, (int32_t)out->fault);
        (void)str_append(lines[2], UI_LINE_CHARS, n, num);
    }

    /* Line 3: the minutes left in the drying time. */
    lines[3][0] = '\0';
    n = str_append(lines[3], UI_LINE_CHARS, 0u, "LEFT ");
    fmt_int(num, sizeof num, (int32_t)out->remaining_min);
    n = str_append(lines[3], UI_LINE_CHARS, n, num);
    (void)str_append(lines[3], UI_LINE_CHARS, n, " MIN");
}
