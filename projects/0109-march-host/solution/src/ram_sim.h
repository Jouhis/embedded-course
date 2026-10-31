/* A simulated 64-byte RAM with stuck-at faults (lesson 109).
 *
 * A real RAM cell can fail so that one bit always reads 0 (stuck-at-0) or always reads 1
 * (stuck-at-1), whatever was written. The simulator applies those forced bits on every read,
 * so the March test sees the same wrong values it would see on a faulty chip.
 */
#ifndef RAM_SIM_H
#define RAM_SIM_H

#include <stdint.h>
#include "mem_iface.h"

#define RAM_SIM_SIZE 64u

typedef struct {
    uint8_t cells[RAM_SIM_SIZE];   /* what was last written */
    uint8_t stuck0[RAM_SIM_SIZE];  /* bits forced to 0 on read (1 = stuck) */
    uint8_t stuck1[RAM_SIM_SIZE];  /* bits forced to 1 on read (1 = stuck) */
} ram_sim_t;

void     ram_sim_init(ram_sim_t *r);
void     ram_sim_write(ram_sim_t *r, uint8_t addr, uint8_t value);
uint8_t  ram_sim_read(const ram_sim_t *r, uint8_t addr);
void     ram_sim_stick_bit(ram_sim_t *r, uint8_t addr, uint8_t bit, uint8_t value);  /* fault injection */
mem_iface_t ram_sim_iface(ram_sim_t *r);

#endif
