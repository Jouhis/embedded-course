cmake_minimum_required(VERSION 3.13)
set(PICO_BOARD pico)
# Wokwi runs the .elf directly, so the UF2 converter (picotool) is not needed.
set(PICO_NO_PICOTOOL 1)
include($ENV{PICO_SDK_PATH}/external/pico_sdk_import.cmake)
project(blink C CXX ASM)
set(CMAKE_C_STANDARD 11)
pico_sdk_init()

# ao.c is the framework; button_ao.c and blinker_ao.c are the two active objects.
add_executable(blink main.c ao.c button_ao.c blinker_ao.c)
target_link_libraries(blink pico_stdlib)
pico_enable_stdio_uart(blink 1)
pico_enable_stdio_usb(blink 0)
