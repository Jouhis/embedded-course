/* dryer.h: the drying cycle state machine (lesson 114). Pure logic: inputs and outputs are structs.
 *
 *   IDLE --start--> HEATING --within 1 C of setpoint--> HOLDING --time done--> COOLDOWN --below 40 C--> IDLE
 *   HEATING or HOLDING --start (stop)--> COOLDOWN
 *   any state --safety fault or sensor fault--> FAULT --start, when safe--> IDLE
 *
 * The start/stop button is one button: a press starts when idle and stops when running. */
#ifndef DRYER_H
#define DRYER_H

#include <stdbool.h>
#include <stdint.h>
#include "materials.h"
#include "safety.h"

typedef enum {
    DRYER_IDLE = 0,
    DRYER_HEATING,
    DRYER_HOLDING,
    DRYER_COOLDOWN,
    DRYER_FAULT,
} dryer_state_t;

#define DRYER_REACH_BAND_CENTI   100    /* HOLDING starts within 1.00 C of the setpoint */
#define DRYER_COOL_DONE_CENTI    4000   /* COOLDOWN ends at 40.00 C */
#define DRYER_FAULT_CLEAR_CENTI  6000   /* a fault can be cleared (acknowledged) only below 60.00 C */
#define DRYER_MS_PER_MIN         60000u

typedef struct {
    dryer_state_t state;
    uint8_t  material;         /* index into the presets */
    uint32_t phase_start_ms;   /* when HOLDING started */
    uint32_t hold_ms;          /* drying time of the chosen material */
    fault_t  fault;            /* the latched cause while in FAULT */
} dryer_t;

typedef struct {
    uint32_t now_ms;
    int32_t  temp_centi;        /* filtered chamber temperature */
    bool     sensor_ok;
    bool     start_pressed;     /* a press event (one per press), not the level */
    bool     material_pressed;  /* a press event */
    fault_t  safety_fault;      /* FAULT_NONE, or the cause from safety_check() */
} dryer_in_t;

typedef struct {
    bool     heater_enabled;    /* the controller may heat now (HEATING and HOLDING) */
    bool     fan_on;
    int32_t  setpoint_centi;    /* the selected material's drying temperature */
    uint16_t remaining_min;     /* minutes of drying left (the full time while not yet holding) */
    fault_t  fault;             /* the latched fault, or FAULT_NONE */
} dryer_out_t;

void dryer_init(dryer_t *d);
void dryer_step(dryer_t *d, const dryer_in_t *in, dryer_out_t *out);
const char *dryer_state_name(dryer_state_t state);

#endif /* DRYER_H */
