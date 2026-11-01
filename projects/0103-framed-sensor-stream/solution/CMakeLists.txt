cmake_minimum_required(VERSION 3.13)
set(PICO_BOARD pico)
# Wokwi runs the .elf directly, so the UF2 converter (picotool) is not needed.
set(PICO_NO_PICOTOOL 1)
include($ENV{PICO_SDK_PATH}/external/pico_sdk_import.cmake)
project(framed_sensor_stream C CXX ASM)
set(CMAKE_C_STANDARD 11)
pico_sdk_init()

# cobs.c and crc16.c are the same files as the host tests in lesson 103.
add_executable(framed_sensor_stream main.c src/cobs.c src/crc16.c)
target_include_directories(framed_sensor_stream PRIVATE src)
target_link_libraries(framed_sensor_stream pico_stdlib)
pico_enable_stdio_uart(framed_sensor_stream 1)
pico_enable_stdio_usb(framed_sensor_stream 0)
