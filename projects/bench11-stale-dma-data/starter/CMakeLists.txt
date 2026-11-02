cmake_minimum_required(VERSION 3.20)
# Bench lab 11: NUCLEO-U545RE-Q, register level with CMSIS. Real board only (no Wokwi model).
set(CMAKE_TOOLCHAIN_FILE ${CMAKE_CURRENT_SOURCE_DIR}/../../../templates/common/arm-none-eabi.cmake)
project(dma C ASM)
include(../../../templates/common/stm32u5.cmake)

add_executable(dma main.c ${STM32_STARTUP})
stm32_postbuild(dma)
