/* regmap.h: the Modbus holding-register map of the dryer (lesson 117). Pure logic: the RTU slave
 * (modbus.c) reads and writes the array; this module decides what the registers mean.
 *
 *   addr  name             access  unit / values
 *   0     SETPOINT_C       read    whole degrees C, of the selected material
 *   1     STATE            read    0 IDLE, 1 HEATING, 2 HOLDING, 3 COOLDOWN, 4 FAULT
 *   2     TEMP_X10         read    chamber temperature in tenths of a degree (22.5 C = 225)
 *   3     PWM_PCT          read    heater duty, 0 to 100 %
 *   4     FAULT_CODE       read    0 none, 1 over-temperature, 2 sensor, 3 runaway, 4 stale
 *   5     REMAINING_MIN    read    minutes of drying left
 *   6     COMMAND          write   1 = start or stop (the same as the start button); reads 0
 *   7     MATERIAL         r/w     0 PLA, 1 PETG, 2 ABS; a write is applied in IDLE only
 *
 * A write to a read-only register is refused with exception 02 (illegal data address), and an
 * out-of-range COMMAND or MATERIAL value with exception 03 (illegal data value): see
 * regmap_check_write(), which the slave calls before every function 06 write. */
#ifndef REGMAP_H
#define REGMAP_H

#include <stdbool.h>
#include <stdint.h>
#include "dryer.h"

enum {
    REG_SETPOINT_C = 0,
    REG_STATE,
    REG_TEMP_X10,
    REG_PWM_PCT,
    REG_FAULT_CODE,
    REG_REMAINING_MIN,
    REG_COMMAND,
    REG_MATERIAL,
    REG_COUNT
};

#define REGMAP_CMD_START_STOP  1u

/* Copy the current state into the read-only registers (and the material register). */
void regmap_publish(uint16_t regs[REG_COUNT], const dryer_t *d, const dryer_out_t *out,
                    int32_t temp_centi, uint16_t heater_permille);

/* The slave's write check (modbus_slave_t.check_write): 0 = allowed, else an exception code. */
uint8_t regmap_check_write(uint16_t reg, uint16_t value);

/* True once per start/stop write; clears the command register. */
bool regmap_take_command(uint16_t regs[REG_COUNT]);

#endif /* REGMAP_H */
