/* hal_nucleo_u5.c: the NUCLEO-U545RE-Q implementation of Lab 4's hal.h, at register level.
 *
 *   LED           PA5, LD2, active high (UM3062 section 6.5; Arduino D13)
 *   Button A      PA8, Arduino D7, to GND, internal pull-up: active low as on the other boards
 *   Button B      PB10, Arduino D6, to GND, internal pull-up
 *   I2C1          PB6 SCL (D15), PB7 SDA (D14), AF4, 100 kHz, 4.7 kohm pull-ups to 3V3 on the wiring
 *   Serial log    USART1 TX on PA9, AF7, to the ST-LINK's virtual COM port, 115200 baud
 *   hal_millis    SysTick, 1 ms
 * Clock: MSIS 4 MHz from reset; PCLK1 (I2C1) and PCLK2 (USART1) are 4 MHz too.
 * The U5 HAL library is not used: the course's own hal.h is the abstraction, and CMSIS names
 * the registers.
 */
#include <stdint.h>
#include "stm32u5xx.h"
#include "hal.h"

#define LED_PIN        5U    /* PA5 */
#define BTN_A_PIN      8U    /* PA8 */
#define BTN_B_PIN      10U   /* PB10 */
#define SCL_PIN        6U    /* PB6 */
#define SDA_PIN        7U    /* PB7 */
#define TX_PIN         9U    /* PA9 */
#define AF4_I2C1       4U
#define AF7_USART1     7U
#define BAUD           115200U
#define I2C_TIMEOUT_MS 10U

static volatile uint32_t ms_ticks;

void SysTick_Handler(void) {
    ms_ticks++;
}

uint32_t hal_millis(void) {
    return ms_ticks;
}

static void pin_mode(GPIO_TypeDef *port, uint32_t pin, uint32_t mode) {   /* 0 in, 1 out, 2 AF, 3 analog */
    port->MODER = (port->MODER & ~(3U << (pin * 2U))) | (mode << (pin * 2U));
}

static void pin_af(GPIO_TypeDef *port, uint32_t pin, uint32_t af) {
    volatile uint32_t *afr = &port->AFR[pin / 8U];
    *afr = (*afr & ~(0xFU << ((pin % 8U) * 4U))) | (af << ((pin % 8U) * 4U));
    pin_mode(port, pin, 2U);
}

static void pin_pull(GPIO_TypeDef *port, uint32_t pin, uint32_t pull) {   /* 1 up, 2 down */
    port->PUPDR = (port->PUPDR & ~(3U << (pin * 2U))) | (pull << (pin * 2U));
}

static void uart_putc(char c) {
    while ((USART1->ISR & USART_ISR_TXE_TXFNF) == 0U) { }
    USART1->TDR = (uint8_t)c;
}

void hal_log(const char *line) {
    while (*line != '\0') {
        uart_putc(*line++);
    }
    uart_putc('\r');
    uart_putc('\n');
}

/* Part 1: the LED and the buttons. Part 2: I2C1. The log and the millisecond clock already work. */
void hal_init(void) {
    SystemCoreClockUpdate();
    RCC->AHB2ENR1 |= RCC_AHB2ENR1_GPIOAEN | RCC_AHB2ENR1_GPIOBEN;
    RCC->APB2ENR |= RCC_APB2ENR_USART1EN;
    (void)RCC->APB2ENR;
    SysTick_Config(SystemCoreClock / 1000U);

    pin_af(GPIOA, TX_PIN, AF7_USART1);
    USART1->BRR = (SystemCoreClock + BAUD / 2U) / BAUD;
    USART1->CR1 = USART_CR1_TE | USART_CR1_UE;

    /* TODO(learner), Part 1: the LED pin as an output (start it off), the buttons as inputs
     * with pull-ups. pin_mode() and pin_pull() below are ready to use. */
    /* TODO(learner), Part 2: I2C1 on PB6/PB7: clock enable, open-drain AF4 pins, TIMINGR for
     * 100 kHz at a 4 MHz kernel clock, then PE. */
    (void)pin_pull;
}

void hal_gpio_write(hal_pin_t pin, uint8_t on) {
    (void)pin; (void)on;    /* TODO(learner), Part 1: LD2 is active high, unlike the Blue Pill's PC13 */
}

uint8_t hal_gpio_read(hal_pin_t pin) {
    (void)pin;              /* TODO(learner), Part 1: 1 while pressed; a pressed button pulls the pin low */
    return 0U;
}

/* Part 2. Return 0 on success and -1 on a NACK or after I2C_TIMEOUT_MS: the call must never
 * hang (hal.h). The U5's I2C does START, address, data and STOP in hardware: see CR2's NBYTES,
 * AUTOEND, RD_WRN and START bits, and the ISR flags TXIS, RXNE, NACKF and STOPF. */
int hal_i2c_write(uint8_t addr7, const uint8_t *data, size_t len) {
    (void)addr7; (void)data; (void)len;   /* TODO(learner) */
    return -1;
}

int hal_i2c_read(uint8_t addr7, uint8_t *data, size_t len) {
    (void)addr7; (void)data; (void)len;   /* TODO(learner) */
    return -1;
}
