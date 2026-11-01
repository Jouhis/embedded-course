cmake_minimum_required(VERSION 3.13)
set(PICO_BOARD pico)
# Wokwi runs the .elf directly, so the UF2 converter (picotool) is not needed.
set(PICO_NO_PICOTOOL 1)
include($ENV{PICO_SDK_PATH}/external/pico_sdk_import.cmake)
project(modbus_slave C CXX ASM)
set(CMAKE_C_STANDARD 11)
pico_sdk_init()

add_executable(modbus_slave main.c src/modbus.c src/crc16.c)
target_include_directories(modbus_slave PRIVATE src)
target_link_libraries(modbus_slave pico_stdlib hardware_uart)
# UART0 is the Modbus bus, so stdio must not use it: printf would corrupt the frames.
pico_enable_stdio_uart(modbus_slave 0)
pico_enable_stdio_usb(modbus_slave 0)
