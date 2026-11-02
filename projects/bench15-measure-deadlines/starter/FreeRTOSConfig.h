/* FreeRTOS configuration for the STM32U545 (Cortex-M33) without TrustZone: port ARM_CM33_NTZ.
 * Compared with lesson 93's Blue Pill configuration: the Cortex-M33 port names its exception
 * handlers SVC_Handler, PendSV_Handler and SysTick_Handler itself, so the three #defines that
 * renamed them on the Cortex-M3 are gone, and the ARMv8-M options below are new. */
#ifndef FREERTOS_CONFIG_H
#define FREERTOS_CONFIG_H
#include <stdint.h>
extern uint32_t SystemCoreClock;

#define configUSE_PREEMPTION                1
#define configCPU_CLOCK_HZ                  (SystemCoreClock)
#define configTICK_RATE_HZ                  1000
#define configMAX_PRIORITIES                5
#define configMINIMAL_STACK_SIZE            128
#define configTOTAL_HEAP_SIZE               (16 * 1024)
#define configMAX_TASK_NAME_LEN             12
#define configUSE_16_BIT_TICKS              0
#define configUSE_IDLE_HOOK                 1
#define configUSE_TICK_HOOK                 0
#define configUSE_MUTEXES                   1
#define configUSE_COUNTING_SEMAPHORES       1
#define configUSE_TIMERS                    0
#define configCHECK_FOR_STACK_OVERFLOW      2
#define configUSE_MALLOC_FAILED_HOOK        1
#define INCLUDE_vTaskDelay                  1
#define INCLUDE_xTaskDelayUntil             1
#define INCLUDE_uxTaskGetStackHighWaterMark 1

/* ARMv8-M port options: no TrustZone, no MPU, the FPU on (the build uses -mfloat-abi=hard). */
#define configENABLE_TRUSTZONE              0
#define configRUN_FREERTOS_SECURE_ONLY      0
#define configENABLE_MPU                    0
#define configENABLE_FPU                    1
#define configENABLE_MVE                    0

/* The STM32U5 implements 4 priority bits (__NVIC_PRIO_BITS in stm32u545xx.h), as the F1 does. */
#define configKERNEL_INTERRUPT_PRIORITY         (15 << 4)
#define configMAX_SYSCALL_INTERRUPT_PRIORITY    (5 << 4)

#define configASSERT(x) if ((x) == 0) { taskDISABLE_INTERRUPTS(); for (;;) {} }
#endif
