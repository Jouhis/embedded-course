cmake_minimum_required(VERSION 3.13)
# Bench lab 18: the capstone (lesson 115's build) on a real Raspberry Pi Pico 2.
# app/ and main.c are lesson 115's, unchanged; only the board file is new: hw/hal_pico2.c.
set(PICO_BOARD pico2)
include($ENV{PICO_SDK_PATH}/external/pico_sdk_import.cmake)
project(dryer C CXX ASM)
set(CMAKE_C_STANDARD 11)
pico_sdk_init()

add_executable(dryer main.c hw/hal_pico2.c
               app/ntc.c app/safety.c app/control.c app/dryer.c app/materials.c app/ui.c
               app/sensor.c app/buttons.c app/debounce.c app/filters.c app/format.c
               app/font.c app/ssd1306.c app/display.c)
target_include_directories(dryer PRIVATE ${CMAKE_CURRENT_SOURCE_DIR} ${CMAKE_CURRENT_SOURCE_DIR}/app)
target_link_libraries(dryer pico_stdlib hardware_adc hardware_pwm hardware_i2c)
pico_enable_stdio_uart(dryer 1)
pico_enable_stdio_usb(dryer 1)
target_compile_definitions(dryer PRIVATE PICO_STDIO_USB_CONNECT_WAIT_TIMEOUT_MS=3000)
pico_add_uf2_output(dryer)
