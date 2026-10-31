# Host unit tests (lesson 80 onward): compiled with the PC's gcc (MinGW), not the ARM toolchain.
# Build and run:  python tools/build.py <this folder>   then   build/test_ring.exe
#           or:   ctest --test-dir build --output-on-failure
cmake_minimum_required(VERSION 3.13)
project(host_tests C)
set(CMAKE_C_STANDARD 11)
add_compile_options(-Wall -Wextra)

# The course's third_party folder; adjust the number of ../ if you move this project.
set(THIRD_PARTY ${CMAKE_CURRENT_LIST_DIR}/../../third_party)
add_library(unity STATIC ${THIRD_PARTY}/Unity/src/unity.c)
target_include_directories(unity PUBLIC ${THIRD_PARTY}/Unity/src)

# Code under test: plain C with no hardware access.
add_library(ring STATIC src/ring.c)
target_include_directories(ring PUBLIC src)

enable_testing()
add_executable(test_ring test/test_ring.c)
target_include_directories(test_ring PRIVATE ${THIRD_PARTY}/fff)
target_link_libraries(test_ring ring unity)
add_test(NAME ring COMMAND test_ring)
