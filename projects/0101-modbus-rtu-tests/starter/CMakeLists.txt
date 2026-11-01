# Host unit tests for the CRC-16 and the Modbus RTU frame handler (lesson 101).
# Compiled with the PC's gcc (MinGW), not the ARM toolchain.
#   python -I tools/build.py <this folder> --test
cmake_minimum_required(VERSION 3.13)
project(modbus_host_tests C)
set(CMAKE_C_STANDARD 11)
add_compile_options(-Wall -Wextra)

# The course's third_party folder (three levels up from this folder).
set(THIRD_PARTY ${CMAKE_CURRENT_LIST_DIR}/../../../third_party)
add_library(unity STATIC ${THIRD_PARTY}/Unity/src/unity.c)
target_include_directories(unity PUBLIC ${THIRD_PARTY}/Unity/src)

# Code under test: plain C with no hardware access. The same files build for the Pico.
add_library(modbus STATIC src/crc16.c src/modbus.c)
target_include_directories(modbus PUBLIC src)

enable_testing()
add_executable(test_modbus test/test_modbus.c)
target_link_libraries(test_modbus modbus unity)
add_test(NAME modbus COMMAND test_modbus)
