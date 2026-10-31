cmake_minimum_required(VERSION 3.13)
set(PICO_BOARD pico)
# Wokwi runs the .elf directly, so the UF2 converter (picotool) is not needed.
set(PICO_NO_PICOTOOL 1)
include($ENV{PICO_SDK_PATH}/external/pico_sdk_import.cmake)
project(usb_cdc_demo C CXX ASM)
set(CMAKE_C_STANDARD 11)
pico_sdk_init()

add_executable(usb_cdc_demo main.c)
target_link_libraries(usb_cdc_demo pico_stdlib)
# printf goes to the USB CDC port (TinyUSB), not to UART0.
pico_enable_stdio_usb(usb_cdc_demo 1)
pico_enable_stdio_uart(usb_cdc_demo 0)
