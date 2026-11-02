cmake_minimum_required(VERSION 3.20)
# Bench lab 13: Lab 4's monitor on the NUCLEO-U545RE-Q. Real board only (no Wokwi model).
set(CMAKE_TOOLCHAIN_FILE ${CMAKE_CURRENT_SOURCE_DIR}/../../../templates/common/arm-none-eabi.cmake)
project(monitor C ASM)
include(../../../templates/common/stm32u5.cmake)

# Lab 4's application, used in place: the same files as the Blue Pill and Pico builds, except
# sensor.c (the MYS-1 exists only in Wokwi), which sensor_ntc_u5.c replaces behind sensor.h.
set(APP ${CMAKE_CURRENT_SOURCE_DIR}/../../lab04-port-lab3-to-stm32/app)
add_executable(monitor main.c hal_nucleo_u5.c sensor_ntc_u5.c
               ${APP}/app.c ${APP}/display.c ${APP}/format.c ${APP}/font.c
               ${APP}/ssd1306.c ${APP}/ui.c
               ${STM32_STARTUP})
target_include_directories(monitor PRIVATE ${CMAKE_CURRENT_SOURCE_DIR} ${APP})
target_link_libraries(monitor m)
stm32_postbuild(monitor)
