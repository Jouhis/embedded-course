cmake_minimum_required(VERSION 3.20)
# Bench lab 15: FreeRTOS on the NUCLEO-U545RE-Q (port ARM_CM33_NTZ). Real board only (no Wokwi model).
set(CMAKE_TOOLCHAIN_FILE ${CMAKE_CURRENT_SOURCE_DIR}/../../../templates/common/arm-none-eabi.cmake)
project(deadlines C ASM)
include(../../../templates/common/stm32u5.cmake)

add_executable(deadlines main.c ${STM32_STARTUP})
target_include_directories(deadlines PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})
stm32_use_freertos(deadlines)
stm32_postbuild(deadlines)
