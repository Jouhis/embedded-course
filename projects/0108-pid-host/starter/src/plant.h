/* A first-order thermal plant: the heater model the PID controls (lesson 108).
 *
 *   dT/dt = (P * k - (T - T_amb)) / tau
 *
 * P is the heater power as a fraction (0 to 1), k is the temperature rise at full power in the
 * steady state, and tau is the thermal time constant. The equation is discretised with Euler's
 * method: T[n+1] = T[n] + dt * (P * k - (T[n] - T_amb)) / tau. The model is an approximation of a
 * heater on a printer or dryer, not a measurement of one.
 */
#ifndef PLANT_H
#define PLANT_H

typedef struct {
    float temp;      /* current temperature, in degrees C */
    float ambient;   /* room temperature the plant relaxes to with no heat */
    float gain;      /* degrees of rise at full power, once settled (k) */
    float tau;       /* thermal time constant, in seconds */
} plant_t;

void  plant_init(plant_t *p, float ambient, float gain, float tau, float start);
float plant_step(plant_t *p, float power, float dt);   /* power in 0..1; returns the new temperature */

#endif
