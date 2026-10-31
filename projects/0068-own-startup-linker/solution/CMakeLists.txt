cmake_minimum_required(VERSION 3.20)
set(CMAKE_TOOLCHAIN_FILE ${CMAKE_CURRENT_SOURCE_DIR}/../../../templates/common/arm-none-eabi.cmake)
project(blink C ASM)
include(../../../templates/common/stm32f1.cmake)

# Replace the CMSIS startup with our own. system_stm32f1xx.c stays: it sets the clock
# and defines SystemCoreClock, which main() uses for the UART baud rate. syscalls.c gives
# the newlib stubs (_write and friends) that the nano C library references at link time.
set(STM32_STARTUP
  ${CMAKE_CURRENT_SOURCE_DIR}/startup.c
  ${TP}/cmsis-device-f1/Source/Templates/system_stm32f1xx.c
  ${CMAKE_CURRENT_SOURCE_DIR}/../../../templates/common/syscalls.c)  # newlib stubs for nano libc

# stm32f1.cmake adds the course linker script with add_link_options(). Clear the
# directory's link options before adding ours, so only minimal.ld is passed with -T.
set_property(DIRECTORY PROPERTY LINK_OPTIONS "")
add_link_options(${MCU_FLAGS} -T${CMAKE_CURRENT_SOURCE_DIR}/minimal.ld
                 -Wl,--gc-sections -Wl,-Map=${PROJECT_NAME}.map
                 --specs=nano.specs --specs=nosys.specs -Wl,--no-warn-rwx-segments)

add_executable(blink main.c ${STM32_STARTUP})
stm32_postbuild(blink)
