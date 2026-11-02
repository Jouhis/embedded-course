# Shared STM32U545 (NUCLEO-U545RE-Q) build settings for the bench labs. Include after project().
# Real board only: Wokwi has no STM32U5 model, so these projects have no diagram.json or wokwi.toml.
# Flash by copying build/<name>.bin onto the ST-LINK's USB drive (UM3062, "STLINK-V3EC": mass storage).
set(COURSE_ROOT ${CMAKE_CURRENT_LIST_DIR}/../..)
set(TP ${COURSE_ROOT}/third_party)
set(MCU_FLAGS -mcpu=cortex-m33 -mthumb -mfpu=fpv5-sp-d16 -mfloat-abi=hard)

set(CMAKE_EXECUTABLE_SUFFIX .elf)
set(CMAKE_EXECUTABLE_SUFFIX_C .elf)
set(CMAKE_EXECUTABLE_SUFFIX_ASM .elf)

add_compile_options(${MCU_FLAGS} -Wall -Wextra -ffunction-sections -fdata-sections -g3 -Og)
add_compile_definitions(STM32U545xx)
# ST's linker script for the U545 (512 KB flash at 0x08000000, 256 KB SRAM at 0x20000000).
add_link_options(${MCU_FLAGS} -T${TP}/cmsis-device-u5/Source/Templates/gcc/linker/STM32U545xx_FLASH.ld
                 -Wl,--gc-sections -Wl,-Map=${PROJECT_NAME}.map
                 --specs=nano.specs --specs=nosys.specs -Wl,--no-warn-rwx-segments)

include_directories(
  ${TP}/CMSIS_5/CMSIS/Core/Include
  ${TP}/cmsis-device-u5/Include)

# TrustZone is off on the Nucleo as delivered, so the plain (not _s / _ns) system file applies.
set(STM32_STARTUP
  ${TP}/cmsis-device-u5/Source/Templates/gcc/startup_stm32u545xx.s
  ${TP}/cmsis-device-u5/Source/Templates/system_stm32u5xx.c)
set_source_files_properties(${STM32_STARTUP} PROPERTIES COMPILE_OPTIONS "-w")
list(APPEND STM32_STARTUP ${CMAKE_CURRENT_LIST_DIR}/syscalls.c)

# build/<name>.bin for drag-and-drop flashing, plus a size report.
function(stm32_postbuild target)
  add_custom_command(TARGET ${target} POST_BUILD
    COMMAND ${CMAKE_OBJCOPY} -O binary $<TARGET_FILE:${target}> ${target}.bin
    COMMAND ${CMAKE_SIZE} $<TARGET_FILE:${target}>)
endfunction()

# FreeRTOS for the Cortex-M33 without TrustZone (the target provides FreeRTOSConfig.h).
set(FREERTOS ${TP}/FreeRTOS-Kernel)
function(stm32_use_freertos target)
  target_sources(${target} PRIVATE
    ${FREERTOS}/tasks.c ${FREERTOS}/queue.c ${FREERTOS}/list.c ${FREERTOS}/timers.c
    ${FREERTOS}/portable/GCC/ARM_CM33_NTZ/non_secure/port.c
    ${FREERTOS}/portable/GCC/ARM_CM33_NTZ/non_secure/portasm.c
    ${FREERTOS}/portable/MemMang/heap_4.c)
  target_include_directories(${target} PRIVATE
    ${FREERTOS}/include ${FREERTOS}/portable/GCC/ARM_CM33_NTZ/non_secure)
endfunction()
