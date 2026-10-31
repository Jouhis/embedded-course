/* Robustness on the Blue Pill (lesson 84): a fault on purpose, caught by our own
 * HardFault handler, which prints the stacked PC. The handler's assembly stub is
 * done for you. Your job is the C function hard_fault_report() at the bottom.
 *
 * Serial: USART1 TX on PA9, 115200 baud (lesson 70). */
#include <stdint.h>
#include "stm32f1xx.h"

static void uart_init(void) {
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_USART1EN;
    /* PA9: alternate-function push-pull output, 50 MHz (CNF=10, MODE=11) */
    GPIOA->CRH = (GPIOA->CRH & ~(0xFU << 4)) | (0xBU << 4);
    USART1->BRR = SystemCoreClock / 115200U;
    USART1->CR1 = USART_CR1_TE | USART_CR1_UE;
}

static void uart_putc(char c) {
    while ((USART1->SR & USART_SR_TXE) == 0) { }
    USART1->DR = (uint8_t)c;
}

static void uart_puts(const char *s) {
    while (*s) {
        uart_putc(*s++);
    }
}

/* Prints a 32-bit value as 0x and eight hex digits. */
static void uart_put_hex32(uint32_t v) {
    static const char digits[] = "0123456789ABCDEF";
    uart_puts("0x");
    for (int shift = 28; shift >= 0; shift -= 4) {
        uart_putc(digits[(v >> shift) & 0xFU]);
    }
}

/* The core saves eight words on the stack when it enters an exception (lesson 34):
 * frame[0..7] = R0, R1, R2, R3, R12, LR, PC, xPSR. */
void hard_fault_report(uint32_t *frame) __attribute__((noreturn, used));

/* Entered by the core with the handler's own stack pointer unknown. EXC_RETURN is in
 * LR. Bit 2 of LR says which stack the frame was pushed on: 0 for MSP, 1 for PSP.
 * This stub passes that frame pointer in R0. It has no prologue, so R0 to R3 and
 * the stacked values are not changed before we read them. */
void HardFault_Handler(void) __attribute__((naked));
void HardFault_Handler(void) {
    __asm volatile(
        "tst lr, #4              \n"
        "ite eq                  \n"
        "mrseq r0, msp           \n"
        "mrsne r0, psp           \n"
        "b hard_fault_report     \n"
    );
}

/* TODO(learner): print the stacked PC, then stop.
 *  1. uart_puts("HardFault PC=");  (the exact text is the EXPECT line in main)
 *  2. uart_put_hex32(frame[6]);     frame[6] is the PC that faulted
 *  3. uart_puts("\r\n");
 *  4. loop forever: for (;;) { }
 * Lesson 84 asks you to predict the PC with arm-none-eabi-addr2line afterwards. */
void hard_fault_report(uint32_t *frame) {
    (void)frame;
    for (;;) { }
}

/* Causes a fault on purpose. With UNALIGN_TRP set, a word load from an address that is
 * not 4-byte aligned raises a UsageFault. The UsageFault is not enabled in SHCSR, so the
 * core escalates it to a HardFault (HFSR.FORCED). Either way, our handler above runs. */
static void trigger_unaligned_load(void) {
    SCB->CCR |= SCB_CCR_UNALIGN_TRP_Msk;
    volatile uint32_t *p = (volatile uint32_t *)0x20000001u;   /* RAM, but odd */
    (void)*p;
}

int main(void) {
    SystemCoreClockUpdate();
    uart_init();
    uart_puts("boot: triggering a fault\r\n");
    trigger_unaligned_load();
    for (;;) { }
}
