# Host unit tests and the closed-loop simulation for lesson 117: compiled with the PC's gcc (MinGW).
# The application sources are the SAME files the firmware compiles (projects/0117-dryer-rtos-pid/starter/app).
# The thermal plant is the one from lesson 108 (projects/0108-pid-host/solution/src).
#   python -I tools/build.py <this folder> --test
cmake_minimum_required(VERSION 3.13)
project(host_tests C)
set(CMAKE_C_STANDARD 11)
add_compile_options(-Wall -Wextra)

set(THIRD_PARTY ${CMAKE_CURRENT_LIST_DIR}/../../../third_party)
add_library(unity STATIC ${THIRD_PARTY}/Unity/src/unity.c)
target_include_directories(unity PUBLIC ${THIRD_PARTY}/Unity/src)

set(APP ${CMAKE_CURRENT_LIST_DIR}/../../0117-dryer-rtos-pid/starter/app)
set(PLANT_DIR ${CMAKE_CURRENT_LIST_DIR}/../../0108-pid-host/solution/src)
add_library(dryer_app STATIC
            ${APP}/controller.c ${APP}/pid.c ${APP}/ntc.c ${APP}/safety.c ${APP}/dryer.c
            ${APP}/materials.c ${APP}/ui.c ${APP}/debounce.c ${APP}/filters.c ${APP}/format.c
            ${PLANT_DIR}/plant.c)
target_include_directories(dryer_app PUBLIC ${APP} ${PLANT_DIR})
target_link_libraries(dryer_app PUBLIC m)            # logf, lroundf, exp (the Beta equation and the plant)

enable_testing()
foreach(t ntc safety dryer ui debounce filters controller closed_loop)
  add_executable(test_${t} test/test_${t}.c)
  target_link_libraries(test_${t} dryer_app unity)
  add_test(NAME ${t} COMMAND test_${t})
endforeach()
