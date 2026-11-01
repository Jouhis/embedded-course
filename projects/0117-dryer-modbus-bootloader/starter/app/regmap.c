/* regmap.c: the Modbus register map (lesson 117). STARTER: publishing the registers is yours.
 *
 * TODO(learner): fill in regmap_publish() for the table in regmap.h:
 *   REG_SETPOINT_C     out->setpoint_centi, in whole degrees C
 *   REG_STATE          d->state, as a number (the enum order is the table order)
 *   REG_TEMP_X10       temp_centi in tenths of a degree, stored as two's complement (cast through int16_t)
 *   REG_PWM_PCT        heater_permille in percent
 *   REG_FAULT_CODE     out->fault
 *   REG_REMAINING_MIN  out->remaining_min
 *   REG_MATERIAL       d->material
 * Then run test_regmap: the publish tests must pass. The command register is already done below. */
#include "regmap.h"
#include "materials.h"
#include "modbus.h"

void regmap_publish(uint16_t regs[REG_COUNT], const dryer_t *d, const dryer_out_t *out,
                    int32_t temp_centi, uint16_t heater_permille) {
    (void)regs;
    (void)d;
    (void)out;
    (void)temp_centi;
    (void)heater_permille;
    /* TODO(learner): write the seven read-only registers here. */
}

bool regmap_take_command(uint16_t regs[REG_COUNT]) {
    if (regs[REG_COMMAND] == REGMAP_CMD_START_STOP) {
        regs[REG_COMMAND] = 0u;
        return true;
    }
    regs[REG_COMMAND] = 0u;           /* any other value is cleared without action */
    return false;
}

uint8_t regmap_check_write(uint16_t reg, uint16_t value) {
    switch (reg) {
    case REG_COMMAND:
        return (value <= REGMAP_CMD_START_STOP) ? 0u : MODBUS_EXC_ILLEGAL_VALUE;
    case REG_MATERIAL:
        return (value < MATERIAL_COUNT) ? 0u : MODBUS_EXC_ILLEGAL_VALUE;
    default:
        return MODBUS_EXC_ILLEGAL_ADDRESS;   /* every other register is read-only */
    }
}
