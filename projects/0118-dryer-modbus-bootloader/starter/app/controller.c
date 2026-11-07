/* controller.c: one control cycle of the dryer (lesson 117). See controller.h for the steps. */
#include "controller.h"
#include "tuning.h"

void controller_init(controller_t *c) {
    ema_init(&c->filter, 2u);
    dryer_init(&c->dryer);
    pid_init(&c->heater, TUNED_KP, TUNED_KI, TUNED_KD, CONTROL_DT_S, 0.0f, 1.0f);
    c->heater_running = false;
    runaway_reset(&c->runaway);
    c->last_temp = 0;
}

void controller_step(controller_t *c, const control_in_t *in, control_out_t *out) {
    /* 1. Filter the temperature. A failed sensor keeps the last good value; the fault flag says why. */
    if (in->sensor_ok) {
        c->last_temp = ema_update(&c->filter, in->raw_centi);
    }
    int32_t temp = c->last_temp;

    /* 2. Acknowledge: a start press in FAULT releases the latch, but only when the cause looks gone
     * (the sensor works and the part is below 60 C). If the cause is still there, the safety
     * monitor latches again within one monitor period, and the own checks in step 5 do too. */
    bool ack = in->start_pressed && c->dryer.state == DRYER_FAULT && in->sensor_ok &&
               temp < DRYER_FAULT_CLEAR_CENTI;
    fault_t latched = ack ? FAULT_NONE : in->latched_fault;

    /* 3. The state machine, first pass: the monitor's latch and the press events. */
    dryer_in_t din = {
        .now_ms = in->now_ms,
        .temp_centi = temp,
        .sensor_ok = in->sensor_ok,
        .start_pressed = in->start_pressed,
        .material_pressed = in->material_pressed,
        .material_set_valid = in->material_set_valid,
        .material_set = in->material_set,
        .safety_fault = latched,
    };
    dryer_step(&c->dryer, &din, &out->dryer);

    /* 4. The heater duty. The PID runs only while the state machine wants heat, and it restarts
     * from a clean state each time a heating phase begins (so the integral does not carry over). */
    uint16_t duty = 0u;
    if (out->dryer.heater_enabled) {
        if (!c->heater_running) {
            pid_init(&c->heater, TUNED_KP, TUNED_KI, TUNED_KD, CONTROL_DT_S, 0.0f, 1.0f);
            c->heater_running = true;
        }
        float setpoint_c = (float)out->dryer.setpoint_centi / 100.0f;
        float measured_c = (float)temp / 100.0f;
        float u = pid_update(&c->heater, setpoint_c, measured_c);       /* 0.0 to 1.0 */
        duty = (uint16_t)(u * (float)CONTROL_FULL_PERMILLE + 0.5f);
    } else {
        c->heater_running = false;
    }

    /* 5. The safety checks look at the duty that is about to be applied. If one trips, the heater
     * is cut now and the state machine goes to FAULT on a second pass with no press events. */
    safety_in_t s = {
        .now_ms = in->now_ms,
        .temp_centi = temp,
        .sensor_ok = in->sensor_ok,
        .heater_enabled = out->dryer.heater_enabled,
        .heater_full = (duty >= CONTROL_FULL_PERMILLE),
        .setpoint_centi = out->dryer.setpoint_centi,
        .sample_age_ms = 0u,
    };
    fault_t own = safety_check(&s, &c->runaway);
    if (own != FAULT_NONE) {
        duty = 0u;
        din.start_pressed = false;
        din.material_pressed = false;
        din.safety_fault = own;
        dryer_step(&c->dryer, &din, &out->dryer);
    }

    out->temp_centi = temp;
    out->heater_permille = duty;
    out->clear_latch = ack;
}
