cmake_minimum_required(VERSION 3.20)
set(CMAKE_TOOLCHAIN_FILE ${CMAKE_CURRENT_SOURCE_DIR}/../../../templates/common/arm-none-eabi.cmake)
project(dryer C ASM)
include(../../../templates/common/stm32f1.cmake)

# app/ is the application: plain C that only calls hal.h. hw/ is the Blue Pill board file.
add_executable(dryer main.c hw/hal_bluepill.c
               app/ntc.c app/dryer.c app/materials.c
               ${STM32_STARTUP})
target_include_directories(dryer PRIVATE ${CMAKE_CURRENT_SOURCE_DIR} ${CMAKE_CURRENT_SOURCE_DIR}/app)
stm32_postbuild(dryer)
