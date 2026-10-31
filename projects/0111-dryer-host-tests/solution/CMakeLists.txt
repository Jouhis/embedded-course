# Host unit tests for lesson 111: compiled with the PC's gcc (MinGW), not the ARM toolchain.
# The application sources are the SAME files the firmware compiles (projects/0111-dryer-drivers/solution/app),
# so a passing test is a statement about the real code. Build and run:
#   python -I tools/build.py <this folder> --test
cmake_minimum_required(VERSION 3.13)
project(host_tests C)
set(CMAKE_C_STANDARD 11)
add_compile_options(-Wall -Wextra)

set(THIRD_PARTY ${CMAKE_CURRENT_LIST_DIR}/../../../third_party)
add_library(unity STATIC ${THIRD_PARTY}/Unity/src/unity.c)
target_include_directories(unity PUBLIC ${THIRD_PARTY}/Unity/src)

set(APP ${CMAKE_CURRENT_LIST_DIR}/../../0111-dryer-drivers/solution/app)
add_library(dryer_app STATIC
            ${APP}/ntc.c ${APP}/safety.c ${APP}/control.c ${APP}/dryer.c ${APP}/materials.c
            ${APP}/ui.c ${APP}/debounce.c ${APP}/filters.c ${APP}/format.c)
target_include_directories(dryer_app PUBLIC ${APP})
target_link_libraries(dryer_app PUBLIC m)            # logf and lroundf (the Beta equation)

enable_testing()
foreach(t ntc safety dryer control ui debounce filters)
  add_executable(test_${t} test/test_${t}.c)
  target_link_libraries(test_${t} dryer_app unity)
  add_test(NAME ${t} COMMAND test_${t})
endforeach()

# The driver services, with the hardware replaced by FFF fakes (lesson 81). fff.h is the header-only fake library.
set(FFF ${THIRD_PARTY}/fff)
add_executable(test_drivers test/test_drivers.c ${APP}/sensor.c ${APP}/buttons.c)
target_include_directories(test_drivers PRIVATE ${FFF})
target_link_libraries(test_drivers dryer_app unity)
add_test(NAME drivers COMMAND test_drivers)
