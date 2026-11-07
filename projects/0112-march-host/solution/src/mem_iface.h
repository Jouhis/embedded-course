/* The interface a memory test uses: two function pointers and a context, so the same test code
 * can run on real RAM, on a simulated RAM, or on a fake in a unit test (lesson 49: callbacks). */
#ifndef MEM_IFACE_H
#define MEM_IFACE_H

#include <stdint.h>

typedef struct {
    void    *ctx;                                              /* the object the functions act on */
    uint8_t (*read)(void *ctx, uint8_t addr);
    void    (*write)(void *ctx, uint8_t addr, uint8_t value);
    uint8_t size;                                              /* number of byte addresses tested */
} mem_iface_t;

#endif
