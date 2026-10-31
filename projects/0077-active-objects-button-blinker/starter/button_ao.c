/* button_ao.c: the button active object (starter). TODO(learner): move the button code from
 * main.c here. Write a handler that reacts to SIG_TICK, debounces the pin with the integrator
 * from lesson 52, and calls ao_publish() with SIG_PRESS once per confirmed press. The solution
 * folder has one complete version. */
#include "button_ao.h"

void button_ao_init(void) {
    /* TODO(learner): set BUTTON_PIN up as in main.c, then call ao_start() with your handler
     * and AO_SUB(SIG_TICK). Keep the state in a file-scope struct whose first member is ao_t. */
}
