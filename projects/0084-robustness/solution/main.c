/* Robustness on the Blue Pill (lesson 84): a fault on purpose, caught by our own
 * HardFault handler, which prints the stacked PC and the fault status registers.
 * The PC is then decoded with arm-none-eabi-addr2line against the .elf.
 *
 * Serial: USART1 TX on PA9, 115200 baud (lesson 70).
 */
// SIM: skip Wokwi's STM32 core raises no fault exceptions; on a real board it prints "HardFault PC=0x..."
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

static void uart_put_labelled(const char *label, uint32_t v) {
    uart_puts(label);
    uart_put_hex32(v);
    uart_puts("\r\n");
}

/* Frame layout the core pushes on exception entry (lesson 34): R0, R1, R2, R3, R12,
 * LR, PC, xPSR. The handler gets a pointer to it. */
void hard_fault_report(uint32_t *frame) __attribute__((noreturn, used));

/* Naked: no prologue, so the stacked values are untouched when we read them. Bit 2
 * of EXC_RETURN (LR) says which stack the core pushed the frame on: 0 for MSP, 1 for
 * PSP. The stub passes that frame pointer to C in R0. */
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

void hard_fault_report(uint32_t *frame) {
    uart_puts("\r\nHardFault PC=");
    uart_put_hex32(frame[6]);          /* the faulting instruction (precise fault) */
    uart_puts("\r\n");
    uart_put_labelled("  R0   ", frame[0]);
    uart_put_labelled("  R1   ", frame[1]);
    uart_put_labelled("  R2   ", frame[2]);
    uart_put_labelled("  R3   ", frame[3]);
    uart_put_labelled("  R12  ", frame[4]);
    uart_put_labelled("  LR   ", frame[5]);
    uart_put_labelled("  xPSR ", frame[7]);
    /* Fault status registers (lesson 39). HFSR.FORCED (bit 30) says a configurable
     * fault was escalated to HardFault. CFSR says which fault it was. The UsageFault
     * field starts at CFSR bit 16, and UNALIGNED is 8 bits above that, so bit 24. */
    uart_put_labelled("  HFSR ", SCB->HFSR);
    uart_put_labelled("  CFSR ", SCB->CFSR);
    uart_put_labelled("  BFAR ", SCB->BFAR);
    uart_put_labelled("  MMFAR", SCB->MMFAR);
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
