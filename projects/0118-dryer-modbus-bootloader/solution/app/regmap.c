/* regmap.c: the Modbus register map (lesson 118). See regmap.h for the table. */
#include "regmap.h"
#include "materials.h"
#include "modbus.h"

void regmap_publish(uint16_t regs[REG_COUNT], const dryer_t *d, const dryer_out_t *out,
                    int32_t temp_centi, uint16_t heater_permille) {
    regs[REG_SETPOINT_C] = (uint16_t)(out->setpoint_centi / 100);
    regs[REG_STATE] = (uint16_t)d->state;
    /* Signed temperature in tenths, stored in 16 bits as two's complement (Modbus registers are unsigned). */
    regs[REG_TEMP_X10] = (uint16_t)((int16_t)(temp_centi / 10));
    regs[REG_PWM_PCT] = (uint16_t)(heater_permille / 10u);
    regs[REG_FAULT_CODE] = (uint16_t)out->fault;
    regs[REG_REMAINING_MIN] = out->remaining_min;
    regs[REG_MATERIAL] = d->material;
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
