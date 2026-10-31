/*
 * mystery.chip.c: a simulated I2C temperature sensor for lesson 63.
 *
 * It implements the register map in MYSTERY-SENSOR-DATASHEET.html. The chip is
 * a teaching model: it is not a real part, and its behaviour is what the
 * datasheet says, nothing more.
 *
 * I2C model: the first byte the master writes in a transaction sets the register
 * pointer. Further write bytes go to the register at the pointer, and the pointer
 * then increments. A read returns the byte at the pointer, then increments it.
 */
#include <stddef.h>
#include <stdbool.h>
#include <stdint.h>
#include "wokwi-api.h"

/* ---- Register map (datasheet section 3) ---- */
#define MYSTERY_ADDR        0x48u   /* 7-bit I2C address, datasheet section 2 */
#define REG_WHO_AM_I        0x0Fu
#define REG_CTRL            0x20u
#define REG_STATUS          0x27u
#define REG_TEMP_L          0x28u
#define REG_TEMP_H          0x29u

#define WHO_AM_I_VALUE      0xA7u
#define CTRL_MEAS_EN        (1u << 0)   /* CTRL bit 0: enable measurement */
#define STATUS_DRDY         (1u << 0)   /* STATUS bit 0: data ready */

/* One new sample every 500 ms of simulated time. Slow enough that a driver
 * which does not wait for DRDY reads stale or repeated values. */
#define SAMPLE_PERIOD_US    500000u

/* Temperatures in 1/64 degC, as signed 16-bit values. 1440 = 22.50 degC. */
static const int16_t sequence[] = { 1440, 1446, 1453, 1461, 1468, 1466, 1459, 1450 };
#define SEQ_LEN (sizeof sequence / sizeof sequence[0])

typedef struct {
  uint8_t  ptr;          /* register pointer, auto-increments */
  bool     first_byte;   /* next write byte is the pointer, not data */
  uint8_t  ctrl;
  uint8_t  status;
  int16_t  temp;         /* the newest sample */
  int16_t  latch;        /* copy taken when TEMP_L is read, so the pair is consistent */
  uint32_t seq_idx;
  timer_t  timer;
} chip_state_t;

static chip_state_t s;

static uint8_t reg_read(uint8_t reg) {
  switch (reg) {
    case REG_WHO_AM_I: return WHO_AM_I_VALUE;
    case REG_CTRL:     return s.ctrl;
    case REG_STATUS:   return s.status;
    case REG_TEMP_L:
      /* Reading the low byte latches the sample, as many sensors do. */
      s.latch = s.temp;
      return (uint8_t)((uint16_t)s.latch & 0xFFu);
    case REG_TEMP_H:
      /* Reading the high byte of the latched sample releases data-ready. */
      s.status &= (uint8_t)~STATUS_DRDY;
      return (uint8_t)((uint16_t)s.latch >> 8);
    default:
      return 0; /* undefined registers read as zero */
  }
}

static void reg_write(uint8_t reg, uint8_t value) {
  if (reg == REG_CTRL) {
    s.ctrl = value & CTRL_MEAS_EN; /* only bit 0 is implemented */
  }
  /* WHO_AM_I, STATUS and the temperature registers are read-only: writes are ignored. */
}

/* ---- I2C callbacks ---- */

static bool on_connect(void *user_data, uint32_t address, bool read) {
  (void)user_data; (void)read;
  s.first_byte = true;               /* a new transaction: the next write byte is the pointer */
  return address == MYSTERY_ADDR;    /* ACK only our address */
}

static uint8_t on_read(void *user_data) {
  (void)user_data;
  uint8_t value = reg_read(s.ptr);
  s.ptr++;                           /* auto-increment after every byte */
  return value;
}

static bool on_write(void *user_data, uint8_t data) {
  (void)user_data;
  if (s.first_byte) {
    s.ptr = data;
    s.first_byte = false;
  } else {
    reg_write(s.ptr, data);
    s.ptr++;
  }
  return true;                       /* ACK */
}

static void on_disconnect(void *user_data) {
  (void)user_data;
  s.first_byte = false;
}

/* ---- Simulated measurement ---- */

static void on_sample(void *user_data) {
  (void)user_data;
  if (!(s.ctrl & CTRL_MEAS_EN)) {
    return;                          /* measurement off: no new data */
  }
  s.seq_idx = (s.seq_idx + 1) % SEQ_LEN;
  s.temp = sequence[s.seq_idx];
  s.status |= STATUS_DRDY;
}

void chip_init(void) {
  s.temp = sequence[0];
  s.latch = sequence[0];

  i2c_config_t i2c = {
    .user_data  = NULL,
    .address    = MYSTERY_ADDR,
    .scl        = pin_init("SCL", INPUT_PULLUP),
    .sda        = pin_init("SDA", INPUT_PULLUP),
    .connect    = on_connect,
    .read       = on_read,
    .write      = on_write,
    .disconnect = on_disconnect,
  };
  i2c_init(&i2c);

  timer_config_t tc = {
    .user_data = NULL,
    .callback  = on_sample,
  };
  s.timer = timer_init(&tc);
  timer_start(s.timer, SAMPLE_PERIOD_US, true);   /* repeat forever */
}
