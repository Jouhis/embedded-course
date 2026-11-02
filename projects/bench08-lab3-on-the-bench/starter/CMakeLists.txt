cmake_minimum_required(VERSION 3.13)
# Bench labs run on a real Raspberry Pi Pico 2 (RP2350, Arm cores) and in Wokwi's Pico 2.
set(PICO_BOARD pico2)
include($ENV{PICO_SDK_PATH}/external/pico_sdk_import.cmake)
project(blink C CXX ASM)
set(CMAKE_C_STANDARD 11)
pico_sdk_init()

add_executable(blink main.c sensor_ntc.c display.c ui.c ssd1306.c font.c)
target_link_libraries(blink pico_stdlib hardware_i2c hardware_adc)
# printf goes to UART0 (GP0/GP1: Wokwi's serial monitor) and to USB (the real board's serial port).
pico_enable_stdio_uart(blink 1)
pico_enable_stdio_usb(blink 1)
# Wait up to 3 s for a USB terminal before main() goes on, so the start-up lines are not lost.
target_compile_definitions(blink PRIVATE PICO_STDIO_USB_CONNECT_WAIT_TIMEOUT_MS=3000)
# build/blink.uf2: drag it onto the RPI-RP2 drive (hold BOOTSEL while plugging in). Wokwi uses the .elf.
pico_add_uf2_output(blink)
