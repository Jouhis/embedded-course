/* ztest unit tests for the MYS-1 conversion. Run them after you fix temp_format.c. */
#include <zephyr/ztest.h>
#include "temp_format.h"

ZTEST_SUITE(temp_format, NULL, NULL, NULL, NULL, NULL);

ZTEST(temp_format, test_room_temperature)
{
	zassert_equal(mys_raw_to_centi_c(1440), 2250, "1440 counts should be 22.50 C");
}

/* TODO(learner): add ZTEST(temp_format, test_negative_temperature) for -64 -> -100, and
 * a test for 0 -> 0. Write each one before you change the code, and watch it fail first. */
