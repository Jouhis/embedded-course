/* March C- memory test (lesson 111). Run it at startup, before the RAM holds anything you need:
 * it overwrites every byte it tests. */
#ifndef MARCH_H
#define MARCH_H

#include "mem_iface.h"

/* Returns -1 if every address passed. Otherwise returns the first address whose read-back was wrong. */
int march_c_minus(const mem_iface_t *mem);

#endif
