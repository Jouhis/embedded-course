cmake_minimum_required(VERSION 3.20)
set(CMAKE_TOOLCHAIN_FILE ${CMAKE_CURRENT_SOURCE_DIR}/../../../templates/common/arm-none-eabi.cmake)
project(dryer C ASM)
include(../../../templates/common/stm32f1.cmake)

# app/ is portable logic (host-tested); rtos/ is the FreeRTOS layer; hw/ is the Blue Pill board file.
add_executable(dryer main.c hw/hal_bluepill.c rtos/tasks.c
               app/controller.c app/pid.c app/ntc.c app/safety.c app/dryer.c app/materials.c app/ui.c
               app/sensor.c app/buttons.c app/debounce.c app/filters.c app/format.c
               app/font.c app/ssd1306.c app/display.c
               ${STM32_STARTUP})
target_include_directories(dryer PRIVATE ${CMAKE_CURRENT_SOURCE_DIR} ${CMAKE_CURRENT_SOURCE_DIR}/app ${CMAKE_CURRENT_SOURCE_DIR}/rtos)
stm32_use_hal(dryer)
stm32_use_freertos(dryer)
target_link_libraries(dryer PRIVATE m)     # logf and lroundf (the Beta equation)
stm32_postbuild(dryer)
