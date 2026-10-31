cmake_minimum_required(VERSION 3.20)
set(CMAKE_TOOLCHAIN_FILE ${CMAKE_CURRENT_SOURCE_DIR}/../../../templates/common/arm-none-eabi.cmake)
project(boot_and_app C ASM)
include(../../../templates/common/stm32f1.cmake)

# stm32f1.cmake passes the course's 64 KiB linker script. This project needs two regions in one
# image (bootloader + application slot), so it replaces that script with boot.ld.
set_property(DIRECTORY PROPERTY LINK_OPTIONS "")
add_link_options(${MCU_FLAGS} -T${CMAKE_CURRENT_SOURCE_DIR}/boot.ld
                 -Wl,--gc-sections -Wl,-Map=${PROJECT_NAME}.map
                 --specs=nano.specs --specs=nosys.specs -Wl,--no-warn-rwx-segments)

# main.c is the bootloader; app.c is the application image, linked into the same ELF and .hex.
add_executable(boot_and_app main.c app.c ${STM32_STARTUP})
stm32_postbuild(boot_and_app)
