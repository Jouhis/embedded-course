# Host unit tests (lesson 104): compiled with the PC's gcc (MinGW), not the ARM toolchain.
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

# Code under test: plain C with no hardware access, so the same file builds for the Pico.
add_library(filters STATIC src/filters.c)
target_include_directories(filters PUBLIC src)

enable_testing()
add_executable(test_filters test/test_filters.c)
target_link_libraries(test_filters filters unity)
add_test(NAME filters COMMAND test_filters)
