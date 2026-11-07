/* controller.h: one control cycle of the dryer, as pure logic (lesson 117).
 *
 * controller_step() is the whole decision path, from a raw ADC temperature to a heater duty:
 *   1. the IIR filter (lesson 107) smooths the temperature
 *   2. a start press in FAULT acknowledges the fault, if the cause is gone and the part is cool
 *   3. the state machine (lesson 115) says whether heat is wanted
 *   4. the PID controller (lesson 108) sets the duty while heat is wanted
 *   5. the safety checks (lesson 116) run on the duty that is about to be applied
 *
 * The firmware calls this from the control task at 10 Hz. The host test calls the same function
 * with a simulated sensor and the thermal plant from lesson 108, so the tests exercise this code. */
#ifndef CONTROLLER_H
#define CONTROLLER_H

#include <stdbool.h>
#include <stdint.h>
#include "dryer.h"
#include "filters.h"
#include "pid.h"
#include "safety.h"

#define CONTROL_FULL_PERMILLE  1000u

typedef struct {
    ema_t     filter;        /* the temperature filter (lesson 107): k = 2, a time constant of about 4 samples */
    dryer_t   dryer;         /* the state machine */
    pid_t     heater;        /* the heater PID (lesson 108) */
    bool      heater_running;/* the PID has been initialised for the current heating phase */
    runaway_t runaway;      /* the heater runaway check (lesson 116) */
    int32_t   last_temp;     /* the last filtered temperature, held when the sensor fails */
} controller_t;

typedef struct {
    uint32_t now_ms;
    bool     sensor_ok;
    int32_t  raw_centi;        /* the unfiltered temperature, from ntc_centi_from_raw() */
    bool     start_pressed;    /* press events from the UI task */
    bool     material_pressed;
    bool     material_set_valid;  /* a material chosen over Modbus (lesson 118) */
    uint8_t  material_set;
    fault_t  latched_fault;    /* the safety monitor's latch (lesson 117, the monitor task) */
} control_in_t;

typedef struct {
    int32_t     temp_centi;        /* the filtered temperature */
    dryer_out_t dryer;             /* the state machine's outputs */
    uint16_t    heater_permille;   /* the duty to apply, 0 to 1000 */
    bool        clear_latch;       /* the operator acknowledged a fault: the monitor may clear its latch */
} control_out_t;

void controller_init(controller_t *c);
void controller_step(controller_t *c, const control_in_t *in, control_out_t *out);

#endif /* CONTROLLER_H */
