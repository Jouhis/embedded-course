#include "march.h"

/* March C- in six passes (Van de Goor's notation: up and down arrows are address order,
 * r0 reads expecting 0, w1 writes 1, and so on):
 *
 *   1. up   (w0)          write 0 everywhere
 *   2. up   (r0, w1)      read 0, write 1
 *   3. up   (r1, w0)      read 1, write 0
 *   4. down (r0, w1)      read 0, write 1, walking backwards
 *   5. down (r1, w0)      read 1, write 0
 *   6. any  (r0)          read 0 once more
 *
 * A stuck-at-0 bit fails pass 3 (it reads 0 when 1 was written). A stuck-at-1 bit fails
 * pass 2 (it reads 1 when 0 was written). Both directions are needed to catch coupling faults.
 */

static int check(const mem_iface_t *m, int addr, uint8_t expected) {
    return m->read(m->ctx, (uint8_t)addr) == expected;
}

int march_c_minus(const mem_iface_t *mem) {
    int n = mem->size;

    for (int a = 0; a < n; a++) {                 /* pass 1 */
        mem->write(mem->ctx, (uint8_t)a, 0x00u);
    }
    for (int a = 0; a < n; a++) {                 /* pass 2 */
        if (!check(mem, a, 0x00u)) return a;
        mem->write(mem->ctx, (uint8_t)a, 0xFFu);
    }
    for (int a = 0; a < n; a++) {                 /* pass 3 */
        if (!check(mem, a, 0xFFu)) return a;
        mem->write(mem->ctx, (uint8_t)a, 0x00u);
    }
    for (int a = n - 1; a >= 0; a--) {            /* pass 4 */
        if (!check(mem, a, 0x00u)) return a;
        mem->write(mem->ctx, (uint8_t)a, 0xFFu);
    }
    for (int a = n - 1; a >= 0; a--) {            /* pass 5 */
        if (!check(mem, a, 0xFFu)) return a;
        mem->write(mem->ctx, (uint8_t)a, 0x00u);
    }
    for (int a = 0; a < n; a++) {                 /* pass 6 */
        if (!check(mem, a, 0x00u)) return a;
    }
    return -1;
}
