cmake_minimum_required(VERSION 3.20)
set(CMAKE_TOOLCHAIN_FILE ${CMAKE_CURRENT_SOURCE_DIR}/../common/arm-none-eabi.cmake)
project(blink C ASM)
include(../common/stm32f1.cmake)

add_executable(blink main.c ${STM32_STARTUP})
stm32_postbuild(blink)
