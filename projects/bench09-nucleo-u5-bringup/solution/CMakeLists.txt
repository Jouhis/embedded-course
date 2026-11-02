cmake_minimum_required(VERSION 3.20)
# Bench lab 9: NUCLEO-U545RE-Q, register level with CMSIS. Real board only (no Wokwi model).
set(CMAKE_TOOLCHAIN_FILE ${CMAKE_CURRENT_SOURCE_DIR}/../../../templates/common/arm-none-eabi.cmake)
project(blink C ASM)
include(../../../templates/common/stm32u5.cmake)

add_executable(blink main.c ${STM32_STARTUP})
stm32_postbuild(blink)
