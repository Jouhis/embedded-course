cmake_minimum_required(VERSION 3.13)
set(PICO_BOARD pico)
# Wokwi runs the .elf directly, so the UF2 converter (picotool) is not needed.
set(PICO_NO_PICOTOOL 1)
include($ENV{PICO_SDK_PATH}/external/pico_sdk_import.cmake)
project(blink C CXX ASM)
set(CMAKE_C_STANDARD 11)
pico_sdk_init()

# The application (../../app) is the same file set as the Blue Pill build. hal_pico.c is the
# only board-specific source. This folder is complete, so it is the worked example.
add_executable(blink main.c hal_pico.c
               ../../app/app.c ../../app/display.c ../../app/format.c ../../app/font.c
               ../../app/sensor.c ../../app/ssd1306.c ../../app/ui.c)
target_include_directories(blink PRIVATE ${CMAKE_CURRENT_SOURCE_DIR} ${CMAKE_CURRENT_SOURCE_DIR}/../../app)
target_link_libraries(blink pico_stdlib hardware_i2c)
pico_enable_stdio_uart(blink 1)
pico_enable_stdio_usb(blink 0)
