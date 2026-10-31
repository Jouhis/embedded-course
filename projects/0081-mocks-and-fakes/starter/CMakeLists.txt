# Host unit tests (lesson 81): compiled with the PC's gcc (MinGW), not the ARM toolchain.
# Build and run:  python -I tools/build.py <this folder> --test
cmake_minimum_required(VERSION 3.13)
project(host_tests C)
set(CMAKE_C_STANDARD 11)
add_compile_options(-Wall -Wextra)

# The course's third_party folder; adjust the number of ../ if you move this project.
set(THIRD_PARTY ${CMAKE_CURRENT_LIST_DIR}/../../../third_party)
add_library(unity STATIC ${THIRD_PARTY}/Unity/src/unity.c)
target_include_directories(unity PUBLIC ${THIRD_PARTY}/Unity/src)

# Code under test: the MYS-1 driver. It talks to the bus only through i2c_bus.h,
# so the tests can replace the bus with FFF fakes.
add_library(mys1 STATIC src/mys1.c)
target_include_directories(mys1 PUBLIC src)

enable_testing()
add_executable(test_mys1 test/test_mys1.c)
target_include_directories(test_mys1 PRIVATE ${THIRD_PARTY}/fff)
target_link_libraries(test_mys1 mys1 unity)
add_test(NAME mys1 COMMAND test_mys1)
