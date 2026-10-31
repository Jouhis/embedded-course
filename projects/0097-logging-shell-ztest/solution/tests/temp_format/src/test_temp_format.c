/* ztest unit tests for the MYS-1 conversion. Each ZTEST is one test case; a failed assertion
 * is reported with its message and the test run goes on. Run with Twister (see lesson 97)
 * or build for a board with: west build -b rpi_pico tests/temp_format */
#include <zephyr/ztest.h>
#include "temp_format.h"

/* The suite has no setup or teardown: the conversion keeps no state. */
ZTEST_SUITE(temp_format, NULL, NULL, NULL, NULL, NULL);

/* 1440 counts is 22.50 C (datasheet section 4.1 example). */
ZTEST(temp_format, test_room_temperature)
{
	zassert_equal(mys_raw_to_centi_c(1440), 2250, "1440 counts should be 22.50 C");
}

/* -64 counts is -1.00 C. The signed type matters: as unsigned, 0xFFC0 would give 1023.0. */
ZTEST(temp_format, test_negative_temperature)
{
	zassert_equal(mys_raw_to_centi_c(-64), -100, "-64 counts should be -1.00 C");
}

ZTEST(temp_format, test_zero)
{
	zassert_equal(mys_raw_to_centi_c(0), 0, "0 counts should be 0.00 C");
}

/* The 16-bit extremes: the product 32767 * 100 must not overflow a 32-bit int. */
ZTEST(temp_format, test_range_limits)
{
	zassert_equal(mys_raw_to_centi_c(32767), 51198, "largest count, rounded toward zero");
	zassert_equal(mys_raw_to_centi_c(-32768), -51200, "smallest count is exact");
}
