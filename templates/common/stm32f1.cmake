# Shared STM32F103 (Blue Pill) build settings. Include after project().
set(COURSE_ROOT ${CMAKE_CURRENT_LIST_DIR}/../..)
set(TP ${COURSE_ROOT}/third_party)
set(MCU_FLAGS -mcpu=cortex-m3 -mthumb)

# Output build/<name>.elf (wokwi.toml and the VS Code debug config expect it).
# Must be set after project(): the Generic platform resets the suffix to empty.
set(CMAKE_EXECUTABLE_SUFFIX .elf)
set(CMAKE_EXECUTABLE_SUFFIX_C .elf)
set(CMAKE_EXECUTABLE_SUFFIX_ASM .elf)

add_compile_options(${MCU_FLAGS} -Wall -Wextra -ffunction-sections -fdata-sections -g3 -Og)
add_compile_definitions(STM32F103xB)
add_link_options(${MCU_FLAGS} -T${CMAKE_CURRENT_LIST_DIR}/stm32f103c8.ld
                 -Wl,--gc-sections -Wl,-Map=${PROJECT_NAME}.map
                 --specs=nano.specs --specs=nosys.specs -Wl,--no-warn-rwx-segments)

include_directories(
  ${TP}/CMSIS_5/CMSIS/Core/Include
  ${TP}/cmsis-device-f1/Include)

set(STM32_STARTUP
  ${TP}/cmsis-device-f1/Source/Templates/gcc/startup_stm32f103xb.s
  ${TP}/cmsis-device-f1/Source/Templates/system_stm32f1xx.c)

function(stm32_postbuild target)
  add_custom_command(TARGET ${target} POST_BUILD
    COMMAND ${CMAKE_OBJCOPY} -O ihex $<TARGET_FILE:${target}> ${target}.hex
    COMMAND ${CMAKE_SIZE} $<TARGET_FILE:${target}>)
endfunction()

# STM32F1 HAL library (only linked by targets that call stm32_use_hal()).
set(HAL ${TP}/stm32f1xx-hal-driver)
file(GLOB STM32_HAL_SOURCES ${HAL}/Src/*.c)
list(FILTER STM32_HAL_SOURCES EXCLUDE REGEX ".*_template\.c$")
function(stm32_use_hal target)
  target_sources(${target} PRIVATE ${STM32_HAL_SOURCES})
  target_include_directories(${target} PRIVATE ${HAL}/Inc)
  target_compile_definitions(${target} PRIVATE USE_HAL_DRIVER)
endfunction()

# FreeRTOS kernel for Cortex-M3 (target must provide FreeRTOSConfig.h).
set(FREERTOS ${TP}/FreeRTOS-Kernel)
function(stm32_use_freertos target)
  target_sources(${target} PRIVATE
    ${FREERTOS}/tasks.c ${FREERTOS}/queue.c ${FREERTOS}/list.c
    ${FREERTOS}/timers.c ${FREERTOS}/event_groups.c
    ${FREERTOS}/portable/GCC/ARM_CM3/port.c
    ${FREERTOS}/portable/MemMang/heap_4.c)
  target_include_directories(${target} PRIVATE
    ${FREERTOS}/include ${FREERTOS}/portable/GCC/ARM_CM3)
endfunction()

# Vendor code is not ours to fix: compile it without warnings.
set_source_files_properties(${STM32_HAL_SOURCES} ${STM32_STARTUP} PROPERTIES COMPILE_OPTIONS "-w")
list(APPEND STM32_STARTUP ${CMAKE_CURRENT_LIST_DIR}/syscalls.c)
