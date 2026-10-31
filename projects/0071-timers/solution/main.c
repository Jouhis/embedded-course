/* Timers on the Blue Pill: PWM output, input capture and encoder mode.
 * Clock: the default HSI oscillator, 8 MHz (no PLL). Every timer here uses PSC = 7,
 * so its counter ticks at 8 MHz / 8 = 1 MHz: one count is one microsecond.
 *
 *   TIM2 CH1  PA0   -> LED through a resistor. PWM at 1 kHz, 25 % duty.
 *   TIM3 CH1  PA6   -> servo signal. PWM at 50 Hz, 1500 us pulse.
 *   TIM3 CH3  PB0   <- wire PA6 to PB0. Input capture measures the pulse width.
 *   TIM4 CH1/2 PB6/PB7 <- KY-040 CLK and DT. Encoder mode 3 counts the rotation.
 *
 * Frequency rule (lesson 71): f = f_clk / ((PSC + 1) * (ARR + 1)).
 *   LED:   8e6 / (8 * 1000)  = 1000 Hz    so ARR = 999
 *   Servo: 8e6 / (8 * 20000) = 50 Hz      so ARR = 19999
 *
 * Register names come from the CMSIS header (stm32f103xb.h). The RM0008 chapters are
 * "General-purpose timers (TIM2 to TIM5)" and "Alternate function I/O".
 */
// EXPECT: CAPTURE pulse_us=1500
#include <stdint.h>
#include "stm32f1xx.h"

#define TIM_PSC          7U        /* 8 MHz / (7 + 1) = 1 MHz tick */
#define LED_PWM_ARR      999U      /* 1 MHz / (999 + 1) = 1 kHz */
#define LED_DUTY_CCR     250U      /* 250 / 1000 = 25 % duty */
#define SERVO_ARR        19999U    /* 1 MHz / 20000 = 50 Hz, the 20 ms servo frame */
#define SERVO_PULSE_US   1500U     /* centre position of a hobby servo */

/* GPIO CRL/CRH field values: the 4-bit value is CNF:MODE (RM0008 GPIO configuration table). */
#define CFG_INPUT_PULLUP   0x8U    /* CNF=10, MODE=00 */
#define CFG_AF_PUSHPULL_50 0xBU    /* CNF=10, MODE=11: alternate function, 50 MHz */

static void gpio_set_pin(GPIO_TypeDef *port, uint32_t pin, uint32_t cfg) {
    /* Pins 0 to 7 use CRL, pins 8 to 15 use CRH. Each pin has a 4-bit field. */
    volatile uint32_t *cr = (pin < 8U) ? &port->CRL : &port->CRH;
    uint32_t shift = (pin & 7U) * 4U;
    *cr = (*cr & ~(0xFU << shift)) | (cfg << shift);
}

static void delay_ms(uint32_t ms) {
    SysTick->LOAD = (SystemCoreClock / 1000U) - 1U;
    SysTick->VAL  = 0;
    SysTick->CTRL = SysTick_CTRL_CLKSOURCE_Msk | SysTick_CTRL_ENABLE_Msk;
    while (ms--) {
        while ((SysTick->CTRL & SysTick_CTRL_COUNTFLAG_Msk) == 0) { }
    }
    SysTick->CTRL = 0;
}

/* ---- UART (same wiring as the template: USART1 TX on PA9) ----------------- */

static void uart_init(void) {
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_USART1EN;
    gpio_set_pin(GPIOA, 9U, CFG_AF_PUSHPULL_50);
    USART1->BRR = SystemCoreClock / 115200U;
    USART1->CR1 = USART_CR1_TE | USART_CR1_UE;
}

static void uart_putc(char c) {
    while ((USART1->SR & USART_SR_TXE) == 0) { }
    USART1->DR = (uint8_t)c;
}

static void uart_puts(const char *s) {
    while (*s) { uart_putc(*s++); }
}

static void uart_put_int(int32_t v) {
    char buf[12];
    uint32_t u = (v < 0) ? (uint32_t)(-(v + 1)) + 1U : (uint32_t)v;   /* safe for INT32_MIN */
    int n = 0;
    do { buf[n++] = (char)('0' + (u % 10U)); u /= 10U; } while (u != 0U);
    if (v < 0) { uart_putc('-'); }
    while (n > 0) { uart_putc(buf[--n]); }
}

/* ---- PWM output on TIM2 CH1 (LED) and TIM3 CH1 (servo) ------------------- */

static void pwm_led_start(void) {
    RCC->APB1ENR |= RCC_APB1ENR_TIM2EN;
    gpio_set_pin(GPIOA, 0U, CFG_AF_PUSHPULL_50);          /* PA0 = TIM2_CH1 */

    TIM2->PSC = TIM_PSC;
    TIM2->ARR = LED_PWM_ARR;
    /* OC1M = 110 is PWM mode 1: the output is active while CNT < CCR1.
     * OC1PE preloads CCR1, so a duty change takes effect at the next update event. */
    TIM2->CCMR1 = TIM_CCMR1_OC1M_1 | TIM_CCMR1_OC1M_2 | TIM_CCMR1_OC1PE;
    TIM2->CCR1  = LED_DUTY_CCR;
    TIM2->CCER  = TIM_CCER_CC1E;
    TIM2->CR1   = TIM_CR1_ARPE;
    TIM2->EGR   = TIM_EGR_UG;                             /* load PSC and ARR now */
    TIM2->CR1  |= TIM_CR1_CEN;
}

static void pwm_servo_and_capture_start(void) {
    RCC->APB1ENR |= RCC_APB1ENR_TIM3EN;
    gpio_set_pin(GPIOA, 6U, CFG_AF_PUSHPULL_50);          /* PA6 = TIM3_CH1, the servo signal */
    gpio_set_pin(GPIOB, 0U, CFG_INPUT_PULLUP);            /* PB0 = TIM3_CH3, capture input */
    GPIOB->ODR |= (1U << 0);

    TIM3->PSC = TIM_PSC;
    TIM3->ARR = SERVO_ARR;

    /* Output side: channel 1 in PWM mode 1, the same as the LED. */
    TIM3->CCMR1 = TIM_CCMR1_OC1M_1 | TIM_CCMR1_OC1M_2 | TIM_CCMR1_OC1PE;
    TIM3->CCR1  = SERVO_PULSE_US;

    /* Input side: channels 3 and 4 both look at TI3 (the PB0 pin).
     *   CC3S = 01: CH3 captures on TI3 directly, at the rising edge (CC3P = 0).
     *   CC4S = 10: CH4 captures the same TI3 signal, at the falling edge (CC4P = 1).
     * So CCR3 holds the rising-edge time and CCR4 the falling-edge time. */
    TIM3->CCMR2 = TIM_CCMR2_CC3S_0 | TIM_CCMR2_CC4S_1;
    TIM3->CCER  = TIM_CCER_CC1E | TIM_CCER_CC3E | TIM_CCER_CC4E | TIM_CCER_CC4P;

    TIM3->CR1  = TIM_CR1_ARPE;
    TIM3->EGR  = TIM_EGR_UG;
    TIM3->CR1 |= TIM_CR1_CEN;
}

/* Pulse width in microseconds from the two captures. The subtraction is done on
 * uint16_t so a counter wrap (CCR4 smaller than CCR3) still gives the right answer. */
static uint32_t capture_pulse_us(void) {
    uint16_t rise = (uint16_t)TIM3->CCR3;
    uint16_t fall = (uint16_t)TIM3->CCR4;
    return (uint16_t)(fall - rise);
}

/* ---- Encoder mode on TIM4 (KY-040) ---------------------------------------- */

static void encoder_start(void) {
    RCC->APB1ENR |= RCC_APB1ENR_TIM4EN;
    gpio_set_pin(GPIOB, 6U, CFG_INPUT_PULLUP);            /* CLK: TIM4_CH1 */
    gpio_set_pin(GPIOB, 7U, CFG_INPUT_PULLUP);            /* DT:  TIM4_CH2 */
    GPIOB->ODR |= (1U << 6) | (1U << 7);                  /* pull-ups on, idle high */

    TIM4->CCMR1 = TIM_CCMR1_CC1S_0 | TIM_CCMR1_CC2S_0;    /* both channels map to TI1 and TI2 */
    TIM4->CCER  = 0U;                                     /* no inversion */
    /* SMS = 011 is encoder mode 3: the counter counts on both edges of both channels,
     * so a detent that produces one CLK and one DT cycle moves the count by four. */
    TIM4->SMCR  = TIM_SMCR_SMS_0 | TIM_SMCR_SMS_1;
    TIM4->ARR   = 0xFFFFU;                                /* full 16-bit range, wraps safely */
    TIM4->CNT   = 0U;
    TIM4->CR1   = TIM_CR1_CEN;
}

/* The counter is 16 bits, so read it as int16_t to get a signed count. */
static int32_t encoder_count(void) {
    return (int16_t)TIM4->CNT;
}

/* ---- Main ----------------------------------------------------------------- */

int main(void) {
    SystemCoreClockUpdate();
    uart_init();

    RCC->APB2ENR |= RCC_APB2ENR_IOPBEN;                   /* ports A and B are used */
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN;

    pwm_led_start();
    pwm_servo_and_capture_start();
    encoder_start();

    uart_puts("PWM LED 1000 Hz duty 25%\r\n");
    uart_puts("SERVO 50 Hz pulse 1500 us\r\n");

    while (1) {
        /* The capture reads the servo output. Wire PA6 to PB0 on the diagram. */
        uart_puts("CAPTURE pulse_us=");
        uart_put_int((int32_t)capture_pulse_us());
        uart_puts(" ENC count=");
        uart_put_int(encoder_count());
        uart_puts("\r\n");
        delay_ms(500);
    }
}
