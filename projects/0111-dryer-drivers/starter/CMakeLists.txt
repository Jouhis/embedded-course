cmake_minimum_required(VERSION 3.20)
set(CMAKE_TOOLCHAIN_FILE ${CMAKE_CURRENT_SOURCE_DIR}/../../../templates/common/arm-none-eabi.cmake)
project(dryer C ASM)
include(../../../templates/common/stm32f1.cmake)

# app/ holds the portable application (no hardware); hw/ is the Blue Pill board file.
# The HAL is used for I2C and the tick only (stm32_use_hal); the rest is register-level.
add_executable(dryer main.c hw/hal_bluepill.c
               app/ntc.c app/safety.c app/control.c app/dryer.c app/materials.c app/ui.c
               app/sensor.c app/buttons.c app/debounce.c app/filters.c app/format.c
               app/font.c app/ssd1306.c app/display.c
               ${STM32_STARTUP})
target_include_directories(dryer PRIVATE ${CMAKE_CURRENT_SOURCE_DIR} ${CMAKE_CURRENT_SOURCE_DIR}/app)
stm32_use_hal(dryer)
target_link_libraries(dryer PRIVATE m)     # logf and lroundf for the Beta equation (lesson 111)
stm32_postbuild(dryer)
