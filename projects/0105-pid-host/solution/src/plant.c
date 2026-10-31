#include "plant.h"

void plant_init(plant_t *p, float ambient, float gain, float tau, float start) {
    p->ambient = ambient;
    p->gain = gain;
    p->tau = tau;
    p->temp = start;
}

float plant_step(plant_t *p, float power, float dt) {
    /* Heat in (power * gain) minus heat lost to the room (temp - ambient), divided by tau. */
    float dtemp_dt = (power * p->gain - (p->temp - p->ambient)) / p->tau;
    p->temp += dt * dtemp_dt;
    return p->temp;
}
