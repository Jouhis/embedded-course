cmake_minimum_required(VERSION 3.20)
set(CMAKE_TOOLCHAIN_FILE ${CMAKE_CURRENT_SOURCE_DIR}/../../../templates/common/arm-none-eabi.cmake)
project(blink C ASM)
include(../../../templates/common/stm32f1.cmake)

# The application modules are shared with the starter in ../app. The RTOS layer (app.c), the
# board file (hal_bluepill.c) and main.c are per folder.
add_executable(blink main.c app.c hal_bluepill.c
               ../app/display.c ../app/format.c ../app/font.c
               ../app/sensor.c ../app/ssd1306.c ../app/ui.c
               ${STM32_STARTUP})
target_include_directories(blink PRIVATE ${CMAKE_CURRENT_SOURCE_DIR} ${CMAKE_CURRENT_SOURCE_DIR}/../app)
stm32_use_hal(blink)
stm32_use_freertos(blink)
stm32_postbuild(blink)
