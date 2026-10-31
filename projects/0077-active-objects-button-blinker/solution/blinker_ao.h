/* blinker_ao.h: the blinker active object. main.c calls blinker_ao_init() once. */
#ifndef BLINKER_AO_H
#define BLINKER_AO_H

void blinker_ao_init(void);  /* configures the LED pin and registers the AO with the framework */

#endif /* BLINKER_AO_H */
