# Host unit tests (lesson 107): compiled with the PC's gcc (MinGW), not the ARM toolchain.
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

# Code under test: plain C, no hardware access. The same pid.c and plant.c could run on the Pico.
add_library(control STATIC src/pid.c src/plant.c src/loop.c)
target_include_directories(control PUBLIC src)

enable_testing()
add_executable(test_pid test/test_pid.c)
target_link_libraries(test_pid control unity)
add_test(NAME pid COMMAND test_pid)

# The CSV printer for plotting (not a test).
add_executable(pid_sim app/pid_sim.c)
target_link_libraries(pid_sim control)
