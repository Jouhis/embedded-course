#include "march.h"

/* TODO(learner): implement March C- in six passes. Write each pass as a for loop over the
 * addresses, with the up or down direction the pass needs:
 *
 *   1. up   (w0)          write 0x00 everywhere
 *   2. up   (r0, w1)      read expecting 0x00, then write 0xFF
 *   3. up   (r1, w0)      read expecting 0xFF, then write 0x00
 *   4. down (r0, w1)      as pass 2, walking from the last address to the first
 *   5. down (r1, w0)      as pass 3, walking backwards
 *   6. any  (r0)          read expecting 0x00
 *
 * Return the address of the first wrong read, or -1 if every pass succeeds.
 * Right now the function reports every RAM as healthy, which is why the fault tests fail. */

int march_c_minus(const mem_iface_t *mem) {
    (void)mem;
    return -1;   /* placeholder: says all memory is fine */
}
