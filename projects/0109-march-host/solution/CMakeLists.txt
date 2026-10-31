# Host unit tests (lesson 109): compiled with the PC's gcc (MinGW), not the ARM toolchain.
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

# The test and the RAM simulator are plain C. On the MCU, ram_sim.c is replaced by the real RAM
# accessors, and march.c is unchanged.
add_library(memtest STATIC src/march.c src/ram_sim.c)
target_include_directories(memtest PUBLIC src)

enable_testing()
add_executable(test_march test/test_march.c)
target_link_libraries(test_march memtest unity)
add_test(NAME march COMMAND test_march)
