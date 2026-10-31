cmake_minimum_required(VERSION 3.13)
set(PICO_BOARD pico)
# Wokwi runs the .elf directly, so the UF2 converter (picotool) is not needed.
set(PICO_NO_PICOTOOL 1)
include($ENV{PICO_SDK_PATH}/external/pico_sdk_import.cmake)
project(blink C CXX ASM)
set(CMAKE_C_STANDARD 11)
pico_sdk_init()

# Link-time selection: exactly one backend is compiled and linked. Change it with
#   cmake -S . -B build -DLED_BACKEND=fake
# (python -I tools/build.py does not pass -D, so delete build/ first or run cmake yourself).
set(LED_BACKEND "gpio" CACHE STRING "LED backend: gpio (the GP25 pin) or fake (log lines)")
set_property(CACHE LED_BACKEND PROPERTY STRINGS gpio fake)
if(LED_BACKEND STREQUAL "gpio")
    set(LED_SOURCE led_gpio.c)
elseif(LED_BACKEND STREQUAL "fake")
    set(LED_SOURCE led_fake.c)
else()
    message(FATAL_ERROR "LED_BACKEND must be gpio or fake, not '${LED_BACKEND}'")
endif()

add_executable(blink main.c ${LED_SOURCE})
target_link_libraries(blink pico_stdlib)
pico_enable_stdio_uart(blink 1)
pico_enable_stdio_usb(blink 0)
