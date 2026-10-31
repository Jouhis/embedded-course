/* hal_bluepill.c: the Blue Pill board file for hal.h (lesson 110).
 *
 * Only the serial log is real in this skeleton. The other functions are stubs that the later
 * stages fill in (lesson 111 for the ADC, PWM, GPIO and I2C; lesson 113 for the bus).
 * Registers are used directly (CMSIS), as in lessons 67 and 102: no HAL is needed for the log. */
#include "stm32f1xx.h"
#include "hal.h"

#define LOG_BAUD 115200U

void hal_init(void) {
    SystemCoreClockUpdate();                     /* read the clock the startup code set up */

    /* USART1 on PA9 (TX): alternate-function push-pull, 50 MHz (CNF=10, MODE=11), see RM0008 section 9.1.11. */
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_USART1EN;
    GPIOA->CRH = (GPIOA->CRH & ~(0xFU << 4)) | (0xBU << 4);
    USART1->BRR = SystemCoreClock / LOG_BAUD;
    USART1->CR1 = USART_CR1_TE | USART_CR1_UE;   /* transmitter on, USART on */
}

void hal_log(const char *line) {
    while (*line != '\0') {
        while ((USART1->SR & USART_SR_TXE) == 0U) {
            /* wait until the data register is empty (the previous byte has moved to the shift register) */
        }
        USART1->DR = (uint8_t)*line++;
    }
    while ((USART1->SR & USART_SR_TXE) == 0U) {
    }
    USART1->DR = '\r';
    while ((USART1->SR & USART_SR_TXE) == 0U) {
    }
    USART1->DR = '\n';
}

/* Stubs: lesson 111 implements these. They return safe values so the skeleton links and runs. */
uint16_t hal_adc_read_ntc(void) { return 0U; }
void hal_heater_set_permille(uint16_t permille) { (void)permille; }
void hal_fan_set(uint8_t on) { (void)on; }
uint8_t hal_button_pressed(hal_button_t button) { (void)button; return 0U; }
uint32_t hal_millis(void) { return 0U; }
int hal_i2c_write(uint8_t addr7, const uint8_t *data, size_t len) { (void)addr7; (void)data; (void)len; return -1; }
int hal_i2c_read(uint8_t addr7, uint8_t *data, size_t len) { (void)addr7; (void)data; (void)len; return -1; }
