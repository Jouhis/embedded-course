cmake_minimum_required(VERSION 3.20.0)
find_package(Zephyr REQUIRED HINTS $ENV{ZEPHYR_BASE})
project(temp_format_tests)

# The code under test is the same file the application uses (../../src). The test harness
# (ztest) supplies main(), so this folder has no main.c.
target_sources(app PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../../src/temp_format.c
    src/test_temp_format.c)
target_include_directories(app PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/../../src)
