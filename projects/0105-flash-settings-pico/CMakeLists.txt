cmake_minimum_required(VERSION 3.13)
set(PICO_BOARD pico)
# Wokwi runs the .elf directly, so the UF2 converter (picotool) is not needed.
set(PICO_NO_PICOTOOL 1)
include($ENV{PICO_SDK_PATH}/external/pico_sdk_import.cmake)
project(flash_settings_pico C CXX ASM)
set(CMAKE_C_STANDARD 11)
pico_sdk_init()

# The store is the tested solution of lesson 105, used unchanged; only the flash port is new.
set(STORE ${CMAKE_CURRENT_LIST_DIR}/../0105-flash-settings/solution/src)
add_executable(flash_settings_pico main.c flash_port_pico.c ${STORE}/settings.c ${STORE}/crc16.c)
target_include_directories(flash_settings_pico PRIVATE ${STORE})
# The last two 4 KB sectors of the Pico's 2 MB flash: 0x200000 - 2 * 0x1000 = 0x1FE000.
target_compile_definitions(flash_settings_pico PRIVATE SETTINGS_OFFSET=0x1FE000u)
target_link_libraries(flash_settings_pico pico_stdlib hardware_flash)
pico_enable_stdio_uart(flash_settings_pico 1)
pico_enable_stdio_usb(flash_settings_pico 0)
