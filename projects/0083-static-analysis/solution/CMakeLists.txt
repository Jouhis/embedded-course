# Host unit tests (lesson 83): compiled with the PC's gcc (MinGW), not the ARM toolchain.
# Build and run:  python -I tools/build.py <this folder> --test
cmake_minimum_required(VERSION 3.13)
project(host_tests C)
set(CMAKE_C_STANDARD 11)
add_compile_options(-Wall -Wextra)

# The course's third_party folder; adjust the number of ../ if you move this project.
set(THIRD_PARTY ${CMAKE_CURRENT_LIST_DIR}/../../../third_party)
add_library(unity STATIC ${THIRD_PARTY}/Unity/src/unity.c)
target_include_directories(unity PUBLIC ${THIRD_PARTY}/Unity/src)

# Code under test: plain C with no hardware access.
add_library(analysis STATIC src/analysis.c)
target_include_directories(analysis PUBLIC src)

enable_testing()
add_executable(test_analysis test/test_analysis.c)
target_link_libraries(test_analysis analysis unity)
add_test(NAME analysis COMMAND test_analysis)
