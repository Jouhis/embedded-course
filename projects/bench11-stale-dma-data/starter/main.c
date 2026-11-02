/* Bench lab 11: stale and torn DMA data on the NUCLEO-U545RE-Q.
 *
 * A "producer" stands in for a peripheral: every millisecond, SysTick starts a GPDMA1 memory-to-
 * memory copy of one 256-word frame. Frames alternate between two sources, every word 0x55555555
 * or every word 0xAAAAAAAA, so a frame that mixes the two was read while the DMA was writing it.
 * The main loop is the consumer: it reads each frame and checks it.
 *
 * This starter has one buffer, and the consumer reads it whenever it likes. Run it and read the
 * counts: torn frames (read while the DMA was writing) and stale frames (the same frame read again).
 * TODO(learner): fix both without slowing the producer. The lab page describes double buffering.
 *
 *   PA6 (CN10 pin 13)  high while a DMA copy runs        logic analyzer D0 (optional)
 *   PA7 (CN10 pin 15)  high while the consumer reads     logic analyzer D1 (optional)
 * Once a second the ST-LINK's VCP prints frames produced, frames read, torn, stale and missed.
 * Clock: MSIS 4 MHz from reset.
 */
// SIM: skip real board only: Wokwi has no STM32U5 model
#include <stdint.h>
#include <stdio.h>
#include "stm32u5xx.h"

#define FRAME_WORDS  256U
#define DMA_PIN      6U      /* PA6 */
#define READ_PIN     7U      /* PA7 */
#define TX_PIN       9U      /* PA9, USART1 TX to the ST-LINK VCP */
#define BAUD         115200U
#define PATTERN_A    0x55555555UL
#define PATTERN_B    0xAAAAAAAAUL

static uint32_t source[2][FRAME_WORDS];
static uint32_t frame_buf[2][FRAME_WORDS];

static volatile uint32_t produced;        /* frames completed by the DMA */
static volatile uint32_t ready_frame;     /* number of the newest complete frame */
static volatile uint32_t ready_buf;       /* which buffer holds it */
static volatile uint32_t ms_ticks;

static uint32_t read_count, torn, stale, missed;

static void uart_init(void) {
    RCC->APB2ENR |= RCC_APB2ENR_USART1EN;
    GPIOA->MODER = (GPIOA->MODER & ~(3U << (TX_PIN * 2U))) | (2U << (TX_PIN * 2U));
    GPIOA->AFR[1] = (GPIOA->AFR[1] & ~(0xFU << ((TX_PIN - 8U) * 4U))) | (7U << ((TX_PIN - 8U) * 4U));
    USART1->BRR = (SystemCoreClock + BAUD / 2U) / BAUD;
    USART1->CR1 = USART_CR1_TE | USART_CR1_UE;
}

int _write(int fd, const char *buf, int len) {
    (void)fd;
    for (int i = 0; i < len; i++) {
        if (buf[i] == '\n') {
            while ((USART1->ISR & USART_ISR_TXE_TXFNF) == 0U) { }
            USART1->TDR = '\r';
        }
        while ((USART1->ISR & USART_ISR_TXE_TXFNF) == 0U) { }
        USART1->TDR = (uint8_t)buf[i];
    }
    return len;
}

/* One memory-to-memory block: 32-bit words, both addresses incrementing, software request.
 * The channel turns itself off at the end of the block, so each frame is armed again. */
static void dma_start(const uint32_t *src, uint32_t *dst) {
    DMA_Channel_TypeDef *ch = GPDMA1_Channel0;
    ch->CFCR = DMA_CFCR_TCF;
    ch->CTR1 = (2U << DMA_CTR1_SDW_LOG2_Pos) | DMA_CTR1_SINC | (2U << DMA_CTR1_DDW_LOG2_Pos) | DMA_CTR1_DINC;
    ch->CTR2 = DMA_CTR2_SWREQ;
    ch->CBR1 = FRAME_WORDS * 4U;                     /* block size in bytes */
    ch->CSAR = (uint32_t)src;
    ch->CDAR = (uint32_t)dst;
    ch->CLLR = 0U;                                   /* no linked list: one block, then stop */
    GPIOA->BSRR = 1U << DMA_PIN;
    ch->CCR = DMA_CCR_TCIE | DMA_CCR_EN;
}

static uint32_t next_frame;                          /* number of the frame being copied */

/* The producer: one frame per millisecond, into the buffer the consumer isn't reading. */
void SysTick_Handler(void) {
    ms_ticks++;
    if ((GPDMA1_Channel0->CCR & DMA_CCR_EN) != 0U) {
        return;                                      /* the last copy hasn't finished: skip a tick */
    }
    /* The pattern changes every two frames, so each buffer gets A and B in turn and a tear shows. */
    dma_start(source[next_frame % 2U], frame_buf[0]);
}

void GPDMA1_Channel0_IRQHandler(void) {
    if ((GPDMA1_Channel0->CSR & DMA_CSR_TCF) != 0U) {
        GPDMA1_Channel0->CFCR = DMA_CFCR_TCF;
        GPIOA->BSRR = 1U << (DMA_PIN + 16U);
        ready_buf = next_frame % 2U;                 /* publish the buffer first... */
        ready_frame = next_frame;                    /* ...then the number the consumer waits for */
        produced++;
        next_frame++;
    }
}

/* Returns 1 if every word of the frame holds the same pattern. */
static int frame_is_whole(const uint32_t *f) {
    uint32_t first = f[0];
    if (first != PATTERN_A && first != PATTERN_B) {
        return 0;
    }
    for (uint32_t i = 1; i < FRAME_WORDS; i++) {
        if (f[i] != first) {
            return 0;
        }
    }
    return 1;
}

int main(void) {
    SystemCoreClockUpdate();
    RCC->AHB2ENR1 |= RCC_AHB2ENR1_GPIOAEN;
    RCC->AHB1ENR |= RCC_AHB1ENR_GPDMA1EN;
    (void)RCC->AHB1ENR;
    uart_init();
    for (uint32_t p = DMA_PIN; p <= READ_PIN; p++) {
        GPIOA->MODER = (GPIOA->MODER & ~(3U << (p * 2U))) | (1U << (p * 2U));
    }
    for (uint32_t i = 0; i < FRAME_WORDS; i++) {
        source[0][i] = PATTERN_A;
        source[1][i] = PATTERN_B;
    }
    NVIC_SetPriority(GPDMA1_Channel0_IRQn, 1);
    NVIC_EnableIRQ(GPDMA1_Channel0_IRQn);
    SysTick_Config(SystemCoreClock / 1000U);
    printf("BENCH11 ready: one frame per ms, double-buffered\n");

    uint32_t last_seen = UINT32_MAX, next_report = 1000U;
    for (;;) {
        if (produced != 0U) {
            uint32_t n = ready_frame;                /* the frame we believe we're reading */
            GPIOA->BSRR = 1U << READ_PIN;
            int whole = frame_is_whole(frame_buf[0]);
            GPIOA->BSRR = 1U << (READ_PIN + 16U);
            read_count++;
            torn += whole ? 0U : 1U;
            if (n == last_seen) {
                stale++;                             /* nothing new since the last read */
            } else if (last_seen != UINT32_MAX && n - last_seen > 1U) {
                missed += n - last_seen - 1U;
            }
            last_seen = n;
        }
        if ((int32_t)(ms_ticks - next_report) >= 0) {
            next_report += 1000U;
            printf("BENCH11 produced %lu, read %lu, torn %lu, stale %lu, missed %lu\n",
                   (unsigned long)produced, (unsigned long)read_count, (unsigned long)torn,
                   (unsigned long)stale, (unsigned long)missed);
        }
    }
}
