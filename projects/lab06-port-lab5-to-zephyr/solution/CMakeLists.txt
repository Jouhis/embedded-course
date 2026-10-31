cmake_minimum_required(VERSION 3.20.0)
find_package(Zephyr REQUIRED HINTS $ENV{ZEPHYR_BASE})
project(lab06_monitor)

# The application is the one shared with Lab 4. Its sources are compiled from there, not copied,
# so a change to app/ shows up in every port. Only hal_zephyr.c and src/main.c are Zephyr-side.
set(APP_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../../lab04-port-lab3-to-stm32/app)
target_include_directories(app PRIVATE ${APP_DIR})
target_sources(app PRIVATE
    src/main.c
    hal_zephyr.c
    ${APP_DIR}/app.c
    ${APP_DIR}/display.c
    ${APP_DIR}/font.c
    ${APP_DIR}/format.c
    ${APP_DIR}/sensor.c
    ${APP_DIR}/ssd1306.c
    ${APP_DIR}/ui.c)
