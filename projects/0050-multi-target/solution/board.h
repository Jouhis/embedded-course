/* Board selection. The build defines exactly one BOARD_* macro (see CMakeLists.txt).
 * The include guard stops the header being read twice in one translation unit,
 * which would redefine the macros below and fail to compile. */
#ifndef BOARD_H
#define BOARD_H

#if defined(BOARD_PICO)
    #define BOARD_NAME "pico"
    #define LED_PIN    25u          /* on-board LED of the Raspberry Pi Pico */
#elif defined(BOARD_BLUEPILL)
    #define BOARD_NAME "bluepill"
    #define LED_PIN    13u          /* PC13 on the STM32 Blue Pill (active low) */
#else
    #error "Define BOARD_PICO or BOARD_BLUEPILL in CMakeLists.txt"
#endif

#endif /* BOARD_H */
