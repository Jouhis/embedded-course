/* hal_bluepill.c: the Blue Pill board file for hal.h (lesson 116).
 *
 *   ADC1_IN0 (PA0)    NTC divider, 12-bit, 71.5-cycle sample time (single conversion, software start)
 *   TIM3_CH1 (PA6)    heater PWM, 1 kHz: PSC = 7 and ARR = 999 on the 8 MHz clock, PWM mode 1
 *   PB0               fan, push-pull output
 *   PB12, PB13        buttons to GND with the internal pull-up (active low)
 *   I2C1 (PB6, PB7)   the OLED, through ST's HAL I2C (the same code as Lab 5)
 *   USART1 (PA9)      the serial log, 115200 baud
 *   SysTick           owned by FreeRTOS (1 kHz); vApplicationTickHook() keeps HAL_GetTick() counting
 *   WWDG              window watchdog, a count of about 4.1 ms, reset after about 262 ms (lesson 84)
 *
 * Only this file touches registers and the HAL. Everything in app/ uses hal.h. */
#include <string.h>
#include "FreeRTOS.h"
#include "queue.h"
#include "task.h"
#include "stm32f1xx_hal.h"
#include "hal.h"

#define ADC_CHANNEL_NTC     0u        /* ADC1_IN0 = PA0 */
#define PWM_PSC             7u        /* 8 MHz / (7 + 1) = 1 MHz counter clock */
#define PWM_ARR             999u      /* 1 MHz / (999 + 1) = 1 kHz PWM period */
#define BUTTON_PORT         GPIOB
#define BUTTON_START_PIN    12u
#define BUTTON_MATERIAL_PIN 13u
#define FAN_PIN             0u
#define LOG_BAUD            115200u
#define I2C_TIMEOUT_MS      100u

static I2C_HandleTypeDef hi2c1;
static QueueHandle_t uart_rx_queue;     /* bytes from the receive interrupt, read by the comms task */

/* USART1 receive interrupt priority. It must be at or below configMAX_SYSCALL_INTERRUPT_PRIORITY (5)
 * so the ISR may call the FromISR queue functions (lesson 90). */
#define UART_RX_IRQ_PRIORITY  5U
#define UART_RX_QUEUE_LEN     64U

void hal_init(void) {
    HAL_Init();                                  /* SysTick at 1 kHz: HAL_GetTick() and the HAL timeouts run */
    SystemCoreClockUpdate();

    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_IOPBEN | RCC_APB2ENR_USART1EN | RCC_APB2ENR_ADC1EN;
    RCC->APB1ENR |= RCC_APB1ENR_TIM3EN;

    /* PA0 analog input (CNF=00, MODE=00): the ADC sees the pin without a digital input buffer. */
    GPIOA->CRL &= ~(0xFU << 0);

    /* PA6 TIM3_CH1: alternate-function push-pull, 50 MHz (CNF=10, MODE=11). */
    GPIOA->CRL = (GPIOA->CRL & ~(0xFU << 24)) | (0xBU << 24);

    /* PA9 USART1_TX: alternate-function push-pull. */
    GPIOA->CRH = (GPIOA->CRH & ~(0xFU << 4)) | (0xBU << 4);
    USART1->BRR = SystemCoreClock / LOG_BAUD;
    USART1->CR1 = USART_CR1_TE | USART_CR1_UE;

    /* PB0 fan: push-pull output, 2 MHz (CNF=00, MODE=10), off. */
    GPIOB->CRL = (GPIOB->CRL & ~(0xFU << 0)) | (0x2U << 0);
    GPIOB->BSRR = (1U << FAN_PIN) << 16;

    /* PB12 and PB13: inputs with pull-up (CNF=10, MODE=00). ODR=1 selects the pull-UP. */
    GPIOB->CRH = (GPIOB->CRH & ~((0xFU << 16) | (0xFU << 20))) | (0x8U << 16) | (0x8U << 20);
    GPIOB->BSRR = (1U << BUTTON_START_PIN) | (1U << BUTTON_MATERIAL_PIN);

    /* ADC1: power up (ADON is set twice, with a wait between, as RM0008 section 11.3.1 says),
     * calibrate, then select channel 0 and a sample time of 71.5 cycles on it. */
    ADC1->CR2 = ADC_CR2_ADON;
    for (volatile uint32_t i = 0; i < 100U; i++) { }
    ADC1->CR2 |= ADC_CR2_ADON;
    ADC1->CR2 |= ADC_CR2_CAL;
    while ((ADC1->CR2 & ADC_CR2_CAL) != 0U) { }
    ADC1->CR2 |= ADC_CR2_EXTTRIG | ADC_CR2_EXTSEL;     /* EXTSEL=111: software start */
    ADC1->SMPR2 = (ADC1->SMPR2 & ~ADC_SMPR2_SMP0) | (6U << 0);   /* SMP0 = 6: 71.5 cycles (5 would be 55.5) */
    ADC1->SQR1 = 0U;                                   /* one conversion */
    ADC1->SQR3 = ADC_CHANNEL_NTC;

    /* TIM3: PWM mode 1 on channel 1 with preload, 1 kHz. The output is high while CNT < CCR. */
    TIM3->PSC = PWM_PSC;
    TIM3->ARR = PWM_ARR;
    TIM3->CCMR1 = (6U << 4) | TIM_CCMR1_OC1PE;         /* OC1M=110: PWM mode 1 */
    TIM3->CCER = TIM_CCER_CC1E;                        /* output on */
    TIM3->CCR1 = 0U;                                   /* heater off at start */
    TIM3->CR1 = TIM_CR1_ARPE;
    TIM3->EGR = TIM_EGR_UG;                            /* load the preloaded registers now */
    TIM3->CR1 |= TIM_CR1_CEN;

    /* I2C1 on PB6 (SCL) and PB7 (SDA): alternate-function open-drain. The 4.7 kOhm pull-ups are on the board. */
    RCC->APB1ENR |= RCC_APB1ENR_I2C1EN;
    RCC->APB2ENR |= RCC_APB2ENR_AFIOEN;
    GPIOB->CRL = (GPIOB->CRL & ~((0xFU << 24) | (0xFU << 28))) | (0xDU << 24) | (0xDU << 28);   /* CNF=11, MODE=01: 10 MHz AF open-drain */
    /* PA10 USART1_RX: input, floating (CNF=01, MODE=00). The RX line is driven by the bus. */
    GPIOA->CRH = (GPIOA->CRH & ~(0xFU << 8)) | (0x4U << 8);
    uart_rx_queue = xQueueCreate(UART_RX_QUEUE_LEN, sizeof(uint8_t));
    USART1->CR1 |= USART_CR1_RE | USART_CR1_RXNEIE;   /* receiver on, interrupt on each byte */
    NVIC_SetPriority(USART1_IRQn, UART_RX_IRQ_PRIORITY);
    NVIC_EnableIRQ(USART1_IRQn);

    hi2c1.Instance = I2C1;
    hi2c1.Init.ClockSpeed = 100000;                    /* standard mode, 100 kHz */
    hi2c1.Init.DutyCycle = I2C_DUTYCYCLE_2;
    hi2c1.Init.OwnAddress1 = 0;
    hi2c1.Init.AddressingMode = I2C_ADDRESSINGMODE_7BIT;
    hi2c1.Init.DualAddressMode = I2C_DUALADDRESS_DISABLE;
    hi2c1.Init.GeneralCallMode = I2C_GENERALCALL_DISABLE;
    hi2c1.Init.NoStretchMode = I2C_NOSTRETCH_DISABLE;
    (void)HAL_I2C_Init(&hi2c1);
}

bool hal_uart_getc(uint8_t *b, uint32_t timeout_ms) {
    return xQueueReceive(uart_rx_queue, b, pdMS_TO_TICKS(timeout_ms)) == pdTRUE;
}

void hal_uart_write(const uint8_t *buf, size_t len) {
    for (size_t i = 0; i < len; i++) {
        while ((USART1->SR & USART_SR_TXE) == 0U) { }
        USART1->DR = buf[i];
    }
    while ((USART1->SR & USART_SR_TC) == 0U) { }      /* the last byte has left the shift register */
}

void hal_log(const char *line) {
    while (*line != '\0') {
        while ((USART1->SR & USART_SR_TXE) == 0U) { }
        USART1->DR = (uint8_t)*line++;
    }
    while ((USART1->SR & USART_SR_TXE) == 0U) { }
    USART1->DR = '\r';
    while ((USART1->SR & USART_SR_TXE) == 0U) { }
    USART1->DR = '\n';
}

uint16_t hal_adc_read_ntc(void) {
    ADC1->SQR3 = ADC_CHANNEL_NTC;
    ADC1->SR &= ~ADC_SR_EOC;
    ADC1->CR2 |= ADC_CR2_SWSTART;
    while ((ADC1->SR & ADC_SR_EOC) == 0U) { }
    return (uint16_t)(ADC1->DR & 0x0FFFU);             /* 12 bits */
}

void hal_heater_set_permille(uint16_t permille) {
    if (permille > 1000U) {
        permille = 1000U;
    }
    /* CCR above ARR keeps the output high for the whole period, so 1000 is a constant full power. */
    TIM3->CCR1 = permille;
}

void hal_fan_set(uint8_t on) {
    if (on) {
        GPIOB->BSRR = 1U << FAN_PIN;
    } else {
        GPIOB->BSRR = (1U << FAN_PIN) << 16;
    }
}

uint8_t hal_button_pressed(hal_button_t button) {
    uint32_t pin = (button == HAL_BUTTON_START) ? BUTTON_START_PIN : BUTTON_MATERIAL_PIN;
    return ((BUTTON_PORT->IDR & (1U << pin)) == 0U) ? 1U : 0U;   /* active low */
}

uint32_t hal_millis(void) {
    return (uint32_t)xTaskGetTickCount();
}

/* WWDG (RM0008 section 18). Its clock is PCLK1 / 4096 / 8 = 244 Hz at 8 MHz, so one count is about 4.1 ms.
 * The counter reloads from 0x7F and resets the chip when it falls to 0x3F: 64 counts, about 262 ms.
 * The window register is 0x7F, so a refresh is accepted at any time before that. The watchdog
 * cannot be stopped once started, which is why it is the last thing done before the scheduler. */
#define WWDG_RELOAD   0x7FU
void hal_wdg_start(void) {
    RCC->APB1ENR |= RCC_APB1ENR_WWDGEN;
    WWDG->CFR = WWDG_CFR_WDGTB | WWDG_RELOAD;          /* prescaler 8, window 0x7F */
    WWDG->CR = WWDG_CR_WDGA | WWDG_RELOAD;             /* start the counter */
}

void hal_wdg_kick(void) {
    WWDG->CR = WWDG_CR_WDGA | WWDG_RELOAD;             /* reload: the counter is above the window, so this is accepted */
}

int hal_i2c_write(uint8_t addr7, const uint8_t *data, size_t len) {
    if (len > 0xFFFFU) {
        return -1;
    }
    /* ST's HAL takes the 7-bit address shifted left by one (the R/W bit is set by the HAL). */
    return (HAL_I2C_Master_Transmit(&hi2c1, (uint16_t)(addr7 << 1), (uint8_t *)data,
                                    (uint16_t)len, I2C_TIMEOUT_MS) == HAL_OK) ? 0 : -1;
}

int hal_i2c_read(uint8_t addr7, uint8_t *data, size_t len) {
    if (len > 0xFFFFU) {
        return -1;
    }
    return (HAL_I2C_Master_Receive(&hi2c1, (uint16_t)(addr7 << 1), data,
                                   (uint16_t)len, I2C_TIMEOUT_MS) == HAL_OK) ? 0 : -1;
}

/* Runs once per FreeRTOS tick, from the port's SysTick handler. Keeps HAL timeouts counting. */
void vApplicationTickHook(void) {
    HAL_IncTick();
}

/* USART1 receive: one byte per interrupt. Reading SR first, then DR, clears both RXNE and an
 * overrun (ORE), so an overrun cannot stop the receiver. */
void USART1_IRQHandler(void) {
    BaseType_t woken = pdFALSE;
    uint32_t sr = USART1->SR;
    if ((sr & USART_SR_RXNE) != 0U) {
        uint8_t b = (uint8_t)USART1->DR;
        (void)xQueueSendFromISR(uart_rx_queue, &b, &woken);
    } else if ((sr & USART_SR_ORE) != 0U) {
        (void)USART1->DR;                              /* clear the overrun; the lost byte shows up as a CRC error */
    }
    portYIELD_FROM_ISR(woken);
}
