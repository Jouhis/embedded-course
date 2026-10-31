/* dryer.c: the drying cycle state machine (lesson 111). See dryer.h for the transition diagram. */
#include "dryer.h"

void dryer_init(dryer_t *d) {
    d->state = DRYER_IDLE;
    d->material = 0u;
    d->phase_start_ms = 0u;
    d->hold_ms = (uint32_t)materials_get(0)->hours * 3600000u;
    d->fault = FAULT_NONE;
}

const char *dryer_state_name(dryer_state_t state) {
    switch (state) {
        case DRYER_IDLE:     return "IDLE";
        case DRYER_HEATING:  return "HEATING";
        case DRYER_HOLDING:  return "HOLDING";
        case DRYER_COOLDOWN: return "COOLDOWN";
        case DRYER_FAULT:    return "FAULT";
    }
    return "?";
}

/* Start from the chosen material: its drying time is the hold time. */
static void begin_cycle(dryer_t *d, uint32_t now_ms) {
    d->hold_ms = (uint32_t)materials_get(d->material)->hours * 3600000u;
    d->phase_start_ms = now_ms;
    d->state = DRYER_HEATING;
}

void dryer_step(dryer_t *d, const dryer_in_t *in, dryer_out_t *out) {
    const material_t *mat = materials_get(d->material);

    /* Any fault latches the machine in FAULT, whatever state it was in. */
    if (d->state != DRYER_FAULT && (in->safety_fault != FAULT_NONE || !in->sensor_ok)) {
        d->fault = (in->safety_fault != FAULT_NONE) ? in->safety_fault : FAULT_SENSOR;
        d->state = DRYER_FAULT;
    }

    switch (d->state) {
        case DRYER_IDLE:
            if (in->material_pressed) {
                d->material = (uint8_t)((d->material + 1u) % MATERIAL_COUNT);
            }
            if (in->start_pressed && in->sensor_ok) {
                begin_cycle(d, in->now_ms);
            }
            break;

        case DRYER_HEATING:
            if (in->start_pressed) {
                d->state = DRYER_COOLDOWN;               /* stop: cool down safely, never just switch off */
            } else if (in->temp_centi >= mat->setpoint_c * 100 - DRYER_REACH_BAND_CENTI) {
                d->phase_start_ms = in->now_ms;          /* the hold timer starts when the setpoint is reached */
                d->state = DRYER_HOLDING;
            }
            break;

        case DRYER_HOLDING:
            if (in->start_pressed) {
                d->state = DRYER_COOLDOWN;
            } else if (in->now_ms - d->phase_start_ms >= d->hold_ms) {
                d->state = DRYER_COOLDOWN;               /* drying time done */
            }
            break;

        case DRYER_COOLDOWN:
            if (in->temp_centi <= DRYER_COOL_DONE_CENTI) {
                d->state = DRYER_IDLE;
            }
            break;

        case DRYER_FAULT:
            /* Acknowledge: a start press clears the fault, but only if the cause is gone and the part is cool. */
            if (in->start_pressed && in->sensor_ok && in->safety_fault == FAULT_NONE &&
                in->temp_centi < DRYER_FAULT_CLEAR_CENTI) {
                d->fault = FAULT_NONE;
                d->state = DRYER_IDLE;
            }
            break;
    }

    /* Read the material again: a press in IDLE may have changed it during this step. */
    out->heater_enabled = (d->state == DRYER_HEATING || d->state == DRYER_HOLDING);
    out->fan_on = (d->state != DRYER_IDLE);
    out->setpoint_centi = materials_get(d->material)->setpoint_c * 100;
    out->fault = d->fault;

    if (d->state == DRYER_HOLDING) {
        uint32_t elapsed = in->now_ms - d->phase_start_ms;
        uint32_t left = (elapsed < d->hold_ms) ? (d->hold_ms - elapsed) : 0u;
        out->remaining_min = (uint16_t)(left / DRYER_MS_PER_MIN);
    } else if (d->state == DRYER_HEATING || d->state == DRYER_IDLE) {
        out->remaining_min = (uint16_t)(d->hold_ms / DRYER_MS_PER_MIN);   /* the full time still to come */
    } else {
        out->remaining_min = 0u;
    }
}
