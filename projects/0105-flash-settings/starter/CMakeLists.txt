# Lesson 105: the settings store, tested on the PC against a fake flash.
# Build and run:  python tools/build.py <this folder> --test
#           or:   ctest --test-dir build --output-on-failure
cmake_minimum_required(VERSION 3.13)
project(flash_settings_tests C)
set(CMAKE_C_STANDARD 11)
add_compile_options(-Wall -Wextra)

# The course's third_party folder; adjust the number of ../ if you move this project.
set(THIRD_PARTY ${CMAKE_CURRENT_LIST_DIR}/../../../third_party)
add_library(unity STATIC ${THIRD_PARTY}/Unity/src/unity.c)
target_include_directories(unity PUBLIC ${THIRD_PARTY}/Unity/src)

# Code under test: the store and its CRC (the same crc16.c as lesson 103). No hardware access:
# it reaches the flash only through flash_port.h.
add_library(settings STATIC src/settings.c src/crc16.c)
target_include_directories(settings PUBLIC src)

enable_testing()
add_executable(test_settings test/test_settings.c test/fake_flash.c)
target_link_libraries(test_settings settings unity)
add_test(NAME settings COMMAND test_settings)
