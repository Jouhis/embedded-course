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

void hal_init(void) {
    SystemCoreClockUpdate();
    RCC->AHB2ENR1 |= RCC_AHB2ENR1_GPIOAEN | RCC_AHB2ENR1_GPIOBEN;
    RCC->APB1ENR1 |= RCC_APB1ENR1_I2C1EN;
    RCC->APB2ENR |= RCC_APB2ENR_USART1EN;
    (void)RCC->APB2ENR;
    SysTick_Config(SystemCoreClock / 1000U);

    /* LED off, then output. Buttons: inputs with pull-ups. */
    GPIOA->BSRR = 1U << (LED_PIN + 16U);
    pin_mode(GPIOA, LED_PIN, 1U);
    pin_mode(GPIOA, BTN_A_PIN, 0U);
    pin_pull(GPIOA, BTN_A_PIN, 1U);
    pin_mode(GPIOB, BTN_B_PIN, 0U);
    pin_pull(GPIOB, BTN_B_PIN, 1U);

    pin_af(GPIOA, TX_PIN, AF7_USART1);
    USART1->BRR = (SystemCoreClock + BAUD / 2U) / BAUD;
    USART1->CR1 = USART_CR1_TE | USART_CR1_UE;

    /* I2C pins: open-drain alternate function. The bus idles high through the external pull-ups. */
    GPIOB->OTYPER |= (1U << SCL_PIN) | (1U << SDA_PIN);
    pin_af(GPIOB, SCL_PIN, AF4_I2C1);
    pin_af(GPIOB, SDA_PIN, AF4_I2C1);
    /* 100 kHz from a 4 MHz kernel clock: PRESC 0 (250 ns), SCLDEL 4, SDADEL 2, SCLH 15, SCLL 19.
     * Low 20 x 250 ns = 5 us, high 16 x 250 ns = 4 us, plus rise time and synchronisation. */
    I2C1->CR1 = 0U;
    I2C1->TIMINGR = (0U << 28) | (4U << 20) | (2U << 16) | (15U << 8) | 19U;
    I2C1->CR1 = I2C_CR1_PE;
}

void hal_gpio_write(hal_pin_t pin, uint8_t on) {
    if (pin == HAL_PIN_LED) {
        GPIOA->BSRR = on ? (1U << LED_PIN) : (1U << (LED_PIN + 16U));   /* active high */
    }
}

uint8_t hal_gpio_read(hal_pin_t pin) {
    uint32_t level = 1U;
    if (pin == HAL_PIN_BTN_A) {
        level = (GPIOA->IDR >> BTN_A_PIN) & 1U;
    } else if (pin == HAL_PIN_BTN_B) {
        level = (GPIOB->IDR >> BTN_B_PIN) & 1U;
    }
    return level ? 0U : 1U;                          /* pressed = low = 1 */
}

/* Wait until a flag in ISR is set. Gives up on NACK or after I2C_TIMEOUT_MS. */
static int i2c_wait(uint32_t flag) {
    uint32_t start = ms_ticks;
    while ((I2C1->ISR & flag) == 0U) {
        if ((I2C1->ISR & I2C_ISR_NACKF) != 0U || (ms_ticks - start) > I2C_TIMEOUT_MS) {
            return -1;
        }
    }
    return 0;
}

/* One transfer of 1 to 255 bytes with AUTOEND: START, address, data and STOP, all in hardware. */
static int i2c_transfer(uint8_t addr7, uint8_t *data, size_t len, int read) {
    if (len == 0U || len > 255U) {
        return -1;
    }
    I2C1->ICR = I2C_ICR_NACKCF | I2C_ICR_STOPCF;
    I2C1->CR2 = ((uint32_t)addr7 << 1) | ((uint32_t)len << I2C_CR2_NBYTES_Pos) | I2C_CR2_AUTOEND
              | (read ? I2C_CR2_RD_WRN : 0U) | I2C_CR2_START;
    int rc = 0;
    for (size_t i = 0; i < len && rc == 0; i++) {
        if (read) {
            rc = i2c_wait(I2C_ISR_RXNE);
            if (rc == 0) {
                data[i] = (uint8_t)I2C1->RXDR;
            }
        } else {
            rc = i2c_wait(I2C_ISR_TXIS);
            if (rc == 0) {
                I2C1->TXDR = data[i];
            }
        }
    }
    if (rc == 0) {
        rc = i2c_wait(I2C_ISR_STOPF);
    }
    if (rc != 0 && (I2C1->ISR & I2C_ISR_NACKF) == 0U) {
        /* A timeout, not a NACK: switching PE off and on resets the peripheral's state machine. */
        I2C1->CR1 &= ~I2C_CR1_PE;
        (void)I2C1->CR1;
        I2C1->CR1 |= I2C_CR1_PE;
    }
    I2C1->ICR = I2C_ICR_NACKCF | I2C_ICR_STOPCF;     /* after a NACK, AUTOEND sends the STOP */
    return rc;
}

int hal_i2c_write(uint8_t addr7, const uint8_t *data, size_t len) {
    return i2c_transfer(addr7, (uint8_t *)data, len, 0);
}

int hal_i2c_read(uint8_t addr7, uint8_t *data, size_t len) {
    return i2c_transfer(addr7, data, len, 1);
}
