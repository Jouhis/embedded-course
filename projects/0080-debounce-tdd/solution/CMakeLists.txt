# Host unit tests (lesson 80): compiled with the PC's gcc (MinGW), not the ARM toolchain.
# Build and run:  python -I tools/build.py <this folder> --test
#           or:   ctest --test-dir build --output-on-failure
cmake_minimum_required(VERSION 3.13)
project(host_tests C)
set(CMAKE_C_STANDARD 11)
add_compile_options(-Wall -Wextra)

# The course's third_party folder; adjust the number of ../ if you move this project.
set(THIRD_PARTY ${CMAKE_CURRENT_LIST_DIR}/../../../third_party)
add_library(unity STATIC ${THIRD_PARTY}/Unity/src/unity.c)
target_include_directories(unity PUBLIC ${THIRD_PARTY}/Unity/src)

# Code under test: plain C with no hardware access, so it builds for the PC and for the MCU.
add_library(debounce STATIC src/debounce.c)
target_include_directories(debounce PUBLIC src)

enable_testing()
add_executable(test_debounce test/test_debounce.c)
target_link_libraries(test_debounce debounce unity)
add_test(NAME debounce COMMAND test_debounce)
