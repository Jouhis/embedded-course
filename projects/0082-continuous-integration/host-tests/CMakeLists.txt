# Host unit tests for the firmware's pure logic (lesson 82). Compiled with the PC's gcc.
# Build and run:  python -I tools/build.py <this folder> --test
cmake_minimum_required(VERSION 3.13)
project(host_tests C)
set(CMAKE_C_STANDARD 11)
add_compile_options(-Wall -Wextra)

set(THIRD_PARTY ${CMAKE_CURRENT_LIST_DIR}/../../../third_party)
add_library(unity STATIC ${THIRD_PARTY}/Unity/src/unity.c)
target_include_directories(unity PUBLIC ${THIRD_PARTY}/Unity/src)

# The same source file the firmware compiles, so the tests check the real code.
add_library(led_pattern STATIC ${CMAKE_CURRENT_LIST_DIR}/../src/led_pattern.c)
target_include_directories(led_pattern PUBLIC ${CMAKE_CURRENT_LIST_DIR}/../src)

enable_testing()
add_executable(test_led_pattern test_led_pattern.c)
target_link_libraries(test_led_pattern led_pattern unity)
add_test(NAME led_pattern COMMAND test_led_pattern)
