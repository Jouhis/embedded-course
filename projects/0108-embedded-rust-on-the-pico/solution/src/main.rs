#![no_std]
#![no_main]

use core::cell::{Cell, RefCell};

use critical_section::Mutex;
use embedded_hal::digital::{OutputPin, StatefulOutputPin};
use panic_halt as _;
use rp2040_hal::{
    self as hal,
    clocks::init_clocks_and_plls,
    gpio::{bank0::Gpio14, FunctionSio, Interrupt as PinInterrupt, PullUp, SioInput},
    pac::{self, interrupt},
    Clock, Sio, Watchdog,
};

// The RP2040 boot ROM reads this 256-byte second-stage bootloader from flash (lesson 42, datasheet
// section 2.8). It configures the flash for execute-in-place before the vector table is used.
#[link_section = ".boot2"]
#[used]
pub static BOOT2: [u8; 256] = rp2040_boot2::BOOT_LOADER_W25Q080;

const XOSC_HZ: u32 = 12_000_000;

// One tick is the main loop's delay. LED 1 toggles every 10 ticks, LED 2 every 5 ticks.
const TICK_MS: u32 = 50;
const LED1_TICKS: u32 = 10; // 500 ms half period
const LED2_TICKS: u32 = 5;  // 250 ms half period

// The button pin, owned by the interrupt handler after main hands it over. The Option starts as
// None, and the RefCell lets the handler borrow it mutably inside the critical section.
type ButtonPin = hal::gpio::Pin<Gpio14, FunctionSio<SioInput>, PullUp>;
static BUTTON: Mutex<RefCell<Option<ButtonPin>>> = Mutex::new(RefCell::new(None));

// Written by the ISR, read by main. The Cell gives interior mutability; the critical section makes
// each read and write of it atomic with respect to the interrupt.
static BLINK_ENABLED: Mutex<Cell<bool>> = Mutex::new(Cell::new(true));

#[interrupt]
fn IO_IRQ_BANK0() {
    critical_section::with(|cs| {
        let mut button = BUTTON.borrow(cs).borrow_mut();
        if let Some(pin) = button.as_mut() {
            // The bank 0 line is shared by every GPIO in the bank, so check that this pin fired.
            if pin.interrupt_status(PinInterrupt::EdgeLow) {
                let flag = BLINK_ENABLED.borrow(cs);
                flag.set(!flag.get());
                pin.clear_interrupt(PinInterrupt::EdgeLow);
            }
        }
    });
}

#[hal::entry]
fn main() -> ! {
    let mut pac = pac::Peripherals::take().unwrap();
    let core = pac::CorePeripherals::take().unwrap();
    let mut watchdog = Watchdog::new(pac.WATCHDOG);
    let clocks = init_clocks_and_plls(XOSC_HZ, pac.XOSC, pac.CLOCKS, pac.PLL_SYS, pac.PLL_USB,
                                      &mut pac.RESETS, &mut watchdog).ok().unwrap();
    let mut delay = cortex_m::delay::Delay::new(core.SYST, clocks.system_clock.freq().to_Hz());
    let sio = Sio::new(pac.SIO);
    let pins = hal::gpio::Pins::new(pac.IO_BANK0, pac.PADS_BANK0, sio.gpio_bank0, &mut pac.RESETS);

    let mut led1 = pins.gpio25.into_push_pull_output(); // onboard LED
    let mut led2 = pins.gpio15.into_push_pull_output(); // external LED, through a resistor

    // The button is a pulled-up input: it reads high until the switch connects GP14 to ground.
    // Pressing it makes a falling edge, which is the interrupt we enable here.
    let button = pins.gpio14.into_pull_up_input();
    button.set_interrupt_enabled(PinInterrupt::EdgeLow, true);

    // Moving the pin into the Mutex transfers ownership: main can no longer touch it, and only the
    // handler can, through the critical section.
    critical_section::with(|cs| BUTTON.borrow(cs).replace(Some(button)));

    // Unmask the bank 0 line in the NVIC. Unmasking is unsafe because it can start an ISR at once.
    unsafe { pac::NVIC::unmask(pac::Interrupt::IO_IRQ_BANK0) };

    let mut tick: u32 = 0;
    loop {
        let enabled = critical_section::with(|cs| BLINK_ENABLED.borrow(cs).get());
        if enabled {
            tick = tick.wrapping_add(1);
            if tick % LED1_TICKS == 0 {
                led1.toggle().unwrap();
            }
            if tick % LED2_TICKS == 0 {
                led2.toggle().unwrap();
            }
        } else {
            // Blinking is paused: hold both LEDs off, so a pause is visible.
            led1.set_low().unwrap();
            led2.set_low().unwrap();
        }
        delay.delay_ms(TICK_MS);
    }
}
