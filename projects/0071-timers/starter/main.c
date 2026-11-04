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

    /* TODO(learner): 1 kHz from f = f_clk / ((PSC + 1) * (ARR + 1)).
     * Set TIM2->PSC and TIM2->ARR, then choose PWM mode 1 in CCMR1 with the
     * preload bit, load CCR1 with the duty, enable CC1E, and start the counter.
     * The solution is in projects/0071-timers/solution. */
}

static void pwm_servo_and_capture_start(void) {
    RCC->APB1ENR |= RCC_APB1ENR_TIM3EN;
    gpio_set_pin(GPIOA, 6U, CFG_AF_PUSHPULL_50);          /* PA6 = TIM3_CH1, the servo signal */
    gpio_set_pin(GPIOB, 0U, CFG_INPUT_PULLUP);            /* PB0 = TIM3_CH3, capture input */
    GPIOB->ODR |= (1U << 0);

    /* TODO(learner): the servo wants 50 Hz and a 1500 us pulse on CH1 (PWM mode 1).
     * The capture side needs CH3 on TI3 at the rising edge and CH4 on TI3 at the
     * falling edge, so set CCMR2 and CCER for that. Then start the counter. */
}

/* Pulse width in microseconds from the two captures. The subtraction is done on
 * uint16_t so a counter wrap (CCR4 smaller than CCR3) still gives the right answer. */
static uint32_t capture_pulse_us(void) {
    uint16_t rise = (uint16_t)TIM3->CCR3;
    uint16_t fall = (uint16_t)TIM3->CCR4;
    return (uint16_t)(fall - rise);
}

/* A second way to measure the same pulse, without input capture: poll the PB0 pin and
 * read TIM3's counter at each edge. It is a few microseconds less exact than a capture,
 * because the loop has to notice the edge first. Wokwi's STM32 model does not simulate
 * input capture (CCR3 and CCR4 stay 0), so this is the check that works in the simulator.
 * Returns 0 if no pulse arrives, for example when TIM3 is not running. */
static uint32_t poll_pulse_us(void) {
    uint32_t guard = 200000U;                     /* about 0.15 s at 8 MHz */
    while ((GPIOB->IDR & 1U) && --guard) { }             /* let a pulse in progress end */
    while (!(GPIOB->IDR & 1U) && --guard) { }            /* wait for the rising edge */
    uint32_t rise = TIM3->CNT;
    while ((GPIOB->IDR & 1U) && --guard) { }             /* wait for the falling edge */
    uint32_t fall = TIM3->CNT;
    if (guard == 0U) return 0U;
    if (fall < rise) fall += TIM3->ARR + 1U;             /* the counter wrapped at ARR */
    return fall - rise;
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
    /* TODO(learner): encoder mode 3 is selected in SMCR (SMS = 011). Set it. */
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

    uint32_t polled = poll_pulse_us();
    uart_puts("POLL pulse_us=");
    uart_put_int((int32_t)polled);
    uart_puts(polled >= 1490U && polled <= 1510U ? " SERVO OK\r\n" : " SERVO FAIL\r\n");

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
