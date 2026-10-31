# Host unit tests for crash_log.c (lesson 85). Compiled with the PC's gcc.
# Build and run:  python -I tools/build.py <this folder> --test
cmake_minimum_required(VERSION 3.13)
project(host_tests C)
set(CMAKE_C_STANDARD 11)
add_compile_options(-Wall -Wextra)

# The course's third_party folder (this folder is four levels below the course root).
set(THIRD_PARTY ${CMAKE_CURRENT_LIST_DIR}/../../../../third_party)
add_library(unity STATIC ${THIRD_PARTY}/Unity/src/unity.c)
target_include_directories(unity PUBLIC ${THIRD_PARTY}/Unity/src)

# The same source the firmware compiles, so the tests check the real code.
add_library(crash_log STATIC ${CMAKE_CURRENT_LIST_DIR}/../src/crash_log.c)
target_include_directories(crash_log PUBLIC ${CMAKE_CURRENT_LIST_DIR}/../src)

enable_testing()
add_executable(test_crash_log test_crash_log.c)
target_link_libraries(test_crash_log crash_log unity)
add_test(NAME crash_log COMMAND test_crash_log)
