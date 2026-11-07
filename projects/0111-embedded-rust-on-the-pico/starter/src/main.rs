#![no_std]
#![no_main]

use embedded_hal::delay::DelayNs;
use embedded_hal::digital::OutputPin;
use panic_halt as _;
use rp2040_hal::{self as hal, clocks::init_clocks_and_plls, pac, Sio, Watchdog};

// The RP2040 boot ROM reads this 256-byte second-stage bootloader from flash (lesson 42).
#[link_section = ".boot2"]
#[used]
pub static BOOT2: [u8; 256] = rp2040_boot2::BOOT_LOADER_W25Q080;

const XOSC_HZ: u32 = 12_000_000;

#[hal::entry]
fn main() -> ! {
    let mut pac = pac::Peripherals::take().unwrap();
    let mut watchdog = Watchdog::new(pac.WATCHDOG);
    let clocks = init_clocks_and_plls(XOSC_HZ, pac.XOSC, pac.CLOCKS, pac.PLL_SYS, pac.PLL_USB,
                                      &mut pac.RESETS, &mut watchdog).ok().unwrap();
    // The RP2040's TIMER peripheral counts microseconds, whatever the system clock is, and it
    // implements embedded-hal's DelayNs. (The Cortex-M SysTick delay, cortex_m::delay::Delay,
    // would also work on the chip, but it hangs in the Wokwi simulator.)
    let mut delay = hal::Timer::new(pac.TIMER, &mut pac.RESETS, &clocks);
    let sio = Sio::new(pac.SIO);
    let pins = hal::gpio::Pins::new(pac.IO_BANK0, pac.PADS_BANK0, sio.gpio_bank0, &mut pac.RESETS);
    let mut led = pins.gpio25.into_push_pull_output();

    // TODO(learner): (a) Add a second LED on GP15 (push-pull output). Toggle it every 250 ms while
    // the first LED toggles every 500 ms. Keep a tick counter in the loop and use `%` to pick the
    // ticks where each LED toggles. Use OutputPin::set_high / set_low, or StatefulOutputPin::toggle.

    // TODO(learner): (b) Add a button on GP14 with the internal pull-up (into_pull_up_input). Enable
    // a falling-edge interrupt on it, unmask IO_IRQ_BANK0 in the NVIC, and write an
    // #[interrupt] fn IO_IRQ_BANK0() that flips a blink-enable flag. Share the button pin and the
    // flag through critical_section::Mutex<RefCell<...>> and Mutex<Cell<bool>>. Then main pauses
    // the blink while the flag is false.

    loop {
        led.set_high().unwrap();
        delay.delay_ms(500);
        led.set_low().unwrap();
        delay.delay_ms(500);
    }
}
