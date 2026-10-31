/* Field diagnostics on the Blue Pill (lesson 85).
 *
 * A crash log in no-init RAM survives a software reset. On the first boot the demo
 * fails an assertion on purpose. The assertion writes the file and line into the log and
 * resets the chip (NVIC_SystemReset). On the next boot, main() reads the reset reason
 * from RCC->CSR, then prints the log that survived.
 *
 * Serial: USART1 TX on PA9, 115200 baud.
 */
// EXPECT: previous reset
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>       /* snprintf: newlib-nano has %d, %u, %lu and %s */
#include "stm32f1xx.h"
#include "crash_log.h"

#define LOG_LINE_TICK_MS  500U

/* Startup clears only .bss, so this struct keeps its contents across a reset. The linker
 * script has no .noinit output section, so GCC's orphan .noinit section is placed after
 * .bss (check the .map file: _ebss must come before this variable). A production linker
 * script would give .noinit (NOLOAD) its own output section. */
static crash_log_t g_crash_log __attribute__((section(".noinit")));

/* RCC_CSR flags for the reset sources the chip reports (stm32f103xb.h). */
#define RESET_FLAGS_MASK  (RCC_CSR_LPWRRSTF | RCC_CSR_WWDGRSTF | RCC_CSR_IWDGRSTF | \
                           RCC_CSR_SFTRSTF | RCC_CSR_PORRSTF | RCC_CSR_PINRSTF)

static void delay_ms(uint32_t ms) {
    SysTick->LOAD = (SystemCoreClock / 1000U) - 1U;
    SysTick->VAL  = 0;
    SysTick->CTRL = SysTick_CTRL_CLKSOURCE_Msk | SysTick_CTRL_ENABLE_Msk;
    while (ms--) {
        while ((SysTick->CTRL & SysTick_CTRL_COUNTFLAG_Msk) == 0) { }
    }
    SysTick->CTRL = 0;
}

static void uart_init(void) {
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_USART1EN;
    GPIOA->CRH = (GPIOA->CRH & ~(0xFU << 4)) | (0xBU << 4);   /* PA9: AF push-pull, 50 MHz */
    USART1->BRR = SystemCoreClock / 115200U;
    USART1->CR1 = USART_CR1_TE | USART_CR1_UE;
}

static void uart_puts(const char *s) {
    while (*s) {
        while ((USART1->SR & USART_SR_TXE) == 0) { }
        USART1->DR = (uint8_t)*s++;
    }
}

static void print_reset_reason(uint32_t flags) {
    if (flags & RCC_CSR_SFTRSTF)  uart_puts("software-reset ");
    if (flags & RCC_CSR_IWDGRSTF) uart_puts("IWDG ");
    if (flags & RCC_CSR_WWDGRSTF) uart_puts("WWDG ");
    if (flags & RCC_CSR_LPWRRSTF) uart_puts("low-power ");
    if (flags & RCC_CSR_PORRSTF)  uart_puts("power-on ");
    if (flags & RCC_CSR_PINRSTF)  uart_puts("pin ");
    if (flags == 0u)              uart_puts("none recorded ");
    uart_puts("\r\n");
}

/* The last path component of __FILE__, so the log line stays short. */
static const char *basename_of(const char *path) {
    const char *base = path;
    for (const char *p = path; *p; p++) {
        if (*p == '/' || *p == '\\') {
            base = p + 1;
        }
    }
    return base;
}

/* Log the failure, then reset. Nothing after NVIC_SystemReset() runs. The next boot
 * sees the line in g_crash_log. */
void crash_assert_failed(const char *file, int line) {
    char text[CRASH_LOG_LINE_LEN];
    snprintf(text, sizeof text, "ASSERT %s:%d", basename_of(file), line);
    crash_log_add(&g_crash_log, text);
    uart_puts(text);
    uart_puts("\r\nresetting\r\n");
    NVIC_SystemReset();
}

int main(void) {
    SystemCoreClockUpdate();

    /* Read the reset flags before anything else, then clear them (RMVF), so the next
     * boot shows only its own reset. */
    uint32_t flags = RCC->CSR & RESET_FLAGS_MASK;
    RCC->CSR |= RCC_CSR_RMVF;

    uart_init();
    bool had_log = crash_log_boot(&g_crash_log, flags);

    char text[CRASH_LOG_LINE_LEN];
    snprintf(text, sizeof text, "boot %lu: reset reason ", (unsigned long)g_crash_log.boot_count);
    uart_puts(text);
    print_reset_reason(flags);

    if (had_log) {
        uart_puts("previous reset: log from the last run follows\r\n");
        for (uint32_t i = 0; ; i++) {
            const char *line = crash_log_line(&g_crash_log, i);
            if (line == NULL) {
                break;
            }
            uart_puts("  log: ");
            uart_puts(line);
            uart_puts("\r\n");
        }
    } else {
        uart_puts("no valid log in RAM (power-on, or the RAM was corrupt)\r\n");
    }

    for (uint32_t tick = 1u; ; tick++) {
        snprintf(text, sizeof text, "tick %lu", (unsigned long)tick);
        crash_log_add(&g_crash_log, text);
        uart_puts(text);
        uart_puts("\r\n");

        /* First boot only: simulate a bug on the third tick. */
        if (g_crash_log.boot_count == 1u && tick == 3u) {
            crash_assert_failed(__FILE__, __LINE__);
        }
        delay_ms(LOG_LINE_TICK_MS);
    }
}
