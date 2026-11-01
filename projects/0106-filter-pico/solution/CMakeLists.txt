cmake_minimum_required(VERSION 3.13)
set(PICO_BOARD pico)
# Wokwi runs the .elf directly, so the UF2 converter (picotool) is not needed.
set(PICO_NO_PICOTOOL 1)
include($ENV{PICO_SDK_PATH}/external/pico_sdk_import.cmake)
project(blink C CXX ASM)
set(CMAKE_C_STANDARD 11)
pico_sdk_init()

# filters.c is the same file the host tests compile (lesson 106): plain C, no hardware calls.
add_executable(blink main.c filters.c)
target_include_directories(blink PRIVATE ${CMAKE_CURRENT_LIST_DIR})
target_link_libraries(blink pico_stdlib hardware_adc)
pico_enable_stdio_uart(blink 1)
pico_enable_stdio_usb(blink 0)
