#include "ram_sim.h"

void ram_sim_init(ram_sim_t *r) {
    for (uint8_t a = 0; a < RAM_SIM_SIZE; a++) {
        r->cells[a] = 0;
        r->stuck0[a] = 0;
        r->stuck1[a] = 0;
    }
}

void ram_sim_write(ram_sim_t *r, uint8_t addr, uint8_t value) {
    r->cells[addr] = value;     /* the cell stores the value even when a bit is stuck */
}

uint8_t ram_sim_read(const ram_sim_t *r, uint8_t addr) {
    /* A stuck-at-0 bit reads 0 whatever was stored; a stuck-at-1 bit reads 1. */
    return (uint8_t)((r->cells[addr] & (uint8_t)~r->stuck0[addr]) | r->stuck1[addr]);
}

void ram_sim_stick_bit(ram_sim_t *r, uint8_t addr, uint8_t bit, uint8_t value) {
    uint8_t mask = (uint8_t)(1u << bit);
    if (value) {
        r->stuck1[addr] |= mask;
        r->stuck0[addr] &= (uint8_t)~mask;
    } else {
        r->stuck0[addr] |= mask;
        r->stuck1[addr] &= (uint8_t)~mask;
    }
}

static uint8_t iface_read(void *ctx, uint8_t addr) {
    return ram_sim_read((const ram_sim_t *)ctx, addr);
}

static void iface_write(void *ctx, uint8_t addr, uint8_t value) {
    ram_sim_write((ram_sim_t *)ctx, addr, value);
}

mem_iface_t ram_sim_iface(ram_sim_t *r) {
    mem_iface_t m;
    m.ctx = r;
    m.read = iface_read;
    m.write = iface_write;
    m.size = RAM_SIM_SIZE;
    return m;
}
