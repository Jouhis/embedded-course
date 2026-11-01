cmake_minimum_required(VERSION 3.20.0)
find_package(Zephyr REQUIRED HINTS $ENV{ZEPHYR_BASE})
project(logging_shell)
# temp_format.c is shared with the ztest suite in tests/temp_format, so it is a separate file.
target_sources(app PRIVATE src/main.c src/temp_format.c)
