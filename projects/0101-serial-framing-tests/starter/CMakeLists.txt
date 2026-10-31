# Host unit tests for COBS and CRC-16/CCITT-FALSE (lesson 101).
# Compiled with the PC's gcc (MinGW), not the ARM toolchain.
#   python -I tools/build.py <this folder> --test
cmake_minimum_required(VERSION 3.13)
project(framing_host_tests C)
set(CMAKE_C_STANDARD 11)
add_compile_options(-Wall -Wextra)

# The course's third_party folder (three levels up from this folder).
set(THIRD_PARTY ${CMAKE_CURRENT_LIST_DIR}/../../../third_party)
add_library(unity STATIC ${THIRD_PARTY}/Unity/src/unity.c)
target_include_directories(unity PUBLIC ${THIRD_PARTY}/Unity/src)

# Code under test: plain C with no hardware access. The same files build for the Pico.
add_library(framing STATIC src/cobs.c src/crc16.c)
target_include_directories(framing PUBLIC src)

enable_testing()
add_executable(test_framing test/test_framing.c)
target_link_libraries(test_framing framing unity)
add_test(NAME framing COMMAND test_framing)
