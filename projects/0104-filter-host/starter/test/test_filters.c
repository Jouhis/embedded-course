#include "unity.h"
#include "filters.h"

/* Step-response tests: feed a known input and check the numbers the filter equations predict.
 * The expected values were computed by running the same equations (see the lesson). */

static moving_avg_t ma;
static ema_t ema;
static median3_t med;

void setUp(void) {
    ma_init(&ma, 4);
    ema_init(&ema, 3);      /* alpha = 1/8, time constant about 7.5 samples */
    median3_init(&med);
}

void tearDown(void) {}

static void test_ma_window_one_passes_input_through(void) {
    ma_init(&ma, 1);
    TEST_ASSERT_EQUAL_INT32(7, ma_update(&ma, 7));
    TEST_ASSERT_EQUAL_INT32(9, ma_update(&ma, 9));
}

static void test_ma_is_the_mean_of_the_last_four(void) {
    ma_update(&ma, 2);
    ma_update(&ma, 4);
    ma_update(&ma, 6);
    TEST_ASSERT_EQUAL_INT32(5, ma_update(&ma, 8));    /* (2+4+6+8)/4 */
    TEST_ASSERT_EQUAL_INT32(7, ma_update(&ma, 10));   /* (4+6+8+10)/4: the 2 has left the window */
}

static void test_ma_step_response_rises_in_quarters(void) {
    TEST_ASSERT_EQUAL_INT32(250, ma_update(&ma, 1000));
    TEST_ASSERT_EQUAL_INT32(500, ma_update(&ma, 1000));
    TEST_ASSERT_EQUAL_INT32(750, ma_update(&ma, 1000));
    TEST_ASSERT_EQUAL_INT32(1000, ma_update(&ma, 1000));
    TEST_ASSERT_EQUAL_INT32(1000, ma_update(&ma, 1000));
}

static void test_ma_falling_step_decays_in_quarters(void) {
    for (int i = 0; i < 4; i++) {
        ma_update(&ma, 1000);
    }
    TEST_ASSERT_EQUAL_INT32(750, ma_update(&ma, 0));
    TEST_ASSERT_EQUAL_INT32(500, ma_update(&ma, 0));
    TEST_ASSERT_EQUAL_INT32(250, ma_update(&ma, 0));
    TEST_ASSERT_EQUAL_INT32(0, ma_update(&ma, 0));
}

static void test_ma_window_sixteen_is_correct_at_full_length(void) {
    ma_init(&ma, 16);
    int32_t out = 0;
    for (int32_t i = 1; i <= 16; i++) {
        out = ma_update(&ma, i);
    }
    TEST_ASSERT_EQUAL_INT32(8, out);    /* 136 / 16 = 8.5, truncated to 8 */
}

static void test_ema_primes_on_first_sample(void) {
    TEST_ASSERT_EQUAL_INT32(500, ema_update(&ema, 500));
}

static void test_ema_step_response_matches_the_equation(void) {
    ema_update(&ema, 0);                                      /* prime at 0 */
    TEST_ASSERT_INT_WITHIN(1, 125, ema_update(&ema, 1000));   /* 1000 / 8 */
    TEST_ASSERT_INT_WITHIN(1, 234, ema_update(&ema, 1000));
    TEST_ASSERT_INT_WITHIN(1, 330, ema_update(&ema, 1000));
    TEST_ASSERT_INT_WITHIN(1, 413, ema_update(&ema, 1000));
    TEST_ASSERT_INT_WITHIN(1, 487, ema_update(&ema, 1000));
    TEST_ASSERT_INT_WITHIN(1, 551, ema_update(&ema, 1000));
    TEST_ASSERT_INT_WITHIN(1, 607, ema_update(&ema, 1000));
    TEST_ASSERT_INT_WITHIN(2, 656, ema_update(&ema, 1000));   /* after 8 samples: 1000 * (1 - (7/8)^8) */
}

static void test_ema_converges_to_a_small_steady_input(void) {
    ema_update(&ema, 0);
    int32_t out = 0;
    for (int i = 0; i < 200; i++) {
        out = ema_update(&ema, 5);
    }
    TEST_ASSERT_EQUAL_INT32(5, out);   /* with rounding, the fixed-point filter reaches 5 */
}

static void test_integer_ema_without_fraction_stalls(void) {
    /* The same equation without fractional bits: (5 - y) >> 3 is 0 once y is 0, so y never moves.
       This is the dead band that the scaled state removes. */
    int32_t y = 0;
    for (int i = 0; i < 50; i++) {
        y += (5 - y) >> 3;
    }
    TEST_ASSERT_EQUAL_INT32(0, y);
}

static void test_median_removes_a_single_spike(void) {
    median3_update(&med, 10);
    median3_update(&med, 10);
    median3_update(&med, 10);
    TEST_ASSERT_EQUAL_INT32(10, median3_update(&med, 1000));   /* median(10, 10, 1000) */
    TEST_ASSERT_EQUAL_INT32(10, median3_update(&med, 10));     /* median(10, 1000, 10) */
}

static void test_median_passes_a_step_after_one_sample(void) {
    median3_update(&med, 10);
    median3_update(&med, 10);
    median3_update(&med, 10);
    TEST_ASSERT_EQUAL_INT32(10, median3_update(&med, 20));    /* the edge waits one sample */
    TEST_ASSERT_EQUAL_INT32(20, median3_update(&med, 20));
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_ma_window_one_passes_input_through);
    RUN_TEST(test_ma_is_the_mean_of_the_last_four);
    RUN_TEST(test_ma_step_response_rises_in_quarters);
    RUN_TEST(test_ma_falling_step_decays_in_quarters);
    RUN_TEST(test_ma_window_sixteen_is_correct_at_full_length);
    RUN_TEST(test_ema_primes_on_first_sample);
    RUN_TEST(test_ema_step_response_matches_the_equation);
    RUN_TEST(test_ema_converges_to_a_small_steady_input);
    RUN_TEST(test_integer_ema_without_fraction_stalls);
    RUN_TEST(test_median_removes_a_single_spike);
    RUN_TEST(test_median_passes_a_step_after_one_sample);
    return UNITY_END();
}
