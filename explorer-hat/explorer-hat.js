// NOTE - Remove relative paths when deploying for realz
var RASPI = require('./raspi');
var GPIO = require('./raspi-gpio');
var I2C = require('./raspi-i2c').I2C;
var BOARD = require('./raspi-board');
var PIBLASTER = require('./pi-blaster.js');

var ADC = require('./ads1015');
var CAP1208 = require('./cap1xxx');

// Onboard LEDs above 1, 2, 3, 4
var LED1 = 4;
var LED2 = 17;
var LED3 = 27;
var LED4 = 5;

// Outputs via ULN2003A
var OUT1 = 6;
var OUT2 = 12;
var OUT3 = 13;
var OUT4 = 16;

// 5v Tolerant Inputs
var IN1 = 23;
var IN2 = 22;
var IN3 = 24;
var IN4 = 25;

// Motor, via DRV8833PWP Dual H-Bridge
var M1B = 19;
var M1F = 20;
var M2B = 21;
var M2F = 26;

// Number of times to update
// pulsing LEDs per second
var PULSE_FPS = 50;
var PULSE_FREQUENCY = 1000;

var DEBOUNCE_TIME = 20;

var CAP_PRODUCT_ID = 107;


// Pulse class
function Pulse(pin, timeOn, timeOff, transitionOn, transitionOff) {
    var d_pin = pin; // Class Pin
    var d_timeOn = timeOn;
    var d_timeOff = timeOff;
    var d_transitionOn = transitionOn;
    var d_transitionOff = transitionOff;
    var d_fps = PULSE_FPS;
    var d_timeStart = Date.now();

    var d_paused = false;
    var d_intervalToken;

    function start() {
        d_pin.frequency(PULSE_FREQUENCY);
        if (d_paused) {
            d_timeStart = Date.now();
            d_paused = false;
            return;
        }

        d_timeStart = Date.now();
        d_intervalToken = setInterval(function() {
            // RUN
            if (!d_paused) {
                var currTime = Date.now() - d_timeStart;
                var delta = currTime % (d_transitionOn + d_timeOn + d_transitionOff + d_timeOff);

                var timeOff = d_transitionOn + d_timeOn + d_transitionOff;
                var timeOn = d_transitionOn + d_timeOn;

                if (delta <= d_transitionOn) {
                    // Transition on phase
                    d_pin.dutyCycle(Math.round((100.0 / d_transitionOn) * delta));
                }
                else if (timeOn < delta && delta <= timeOff) {
                    // Transition Off phase
                    var currDelta = delta - d_transitionOn - d_timeOn;
                    d_pin.dutyCycle(Math.round(100.0 - ((100.0 / d_transitionOff) * currDelta)));
                }
                else if (d_transitionOn < delta && delta <= timeOn) {
                    d_pin.dutyCycle(100);
                }
                else if (delta > timeOff) {
                    d_pin.dutyCycle(0);
                }
            }
        }, (1.0 / d_fps) * 1000);
    }

    function pause() {
        d_paused = true;
    }

    function stop() {
        if (d_intervalToken) {
            d_intervalToken();
        }
        d_intervalToken = null;
        d_pin.dutyCycle(0);
    }

    // Exports
    this.start = start;
    this.pause = pause;
    this.stop = stop;
}

function Motor(pinFwd, pinBack) {
    var d_invert = false;
    var d_pinFwd = pinFwd;
    var d_pinBack = pinBack;
    var d_speed = 0; // -100 - 100

    // Use pi-blaster to set the speed to 0
    PIBLASTER.setPwm(d_pinFwd, 0); // 0.0 - 1.0
    PIBLASTER.setPwm(d_pinBack, 0);

    function invert() {
        d_invert = !d_invert;
        d_speed = -d_speed;
        speed(d_speed);
        return d_invert;
    }

    function forwards(spd) {
        if (spd === undefined) spd = 100;
        if (spd < 0 || spd > 100) {
            throw new Error("Speed must be between 0 and 100");
        }

        if (d_invert) {
            speed(-spd);
        }
        else {
            speed(spd);
        }
    }

    function backwards(spd) {
        if (spd === undefined) spd = 100;
        if (spd < 0 || spd > 100) {
            throw new Error("Speed must be between 0 and 100");
        }

        if (d_invert) {
            speed(spd);
        }
        else {
            speed(-spd);
        }
    }

    function speed(spd) {
        if (spd === undefined) spd = 100;
        if (spd < -100 || spd > 100) {
            throw new Error("Speed must be between -100 and 100");
        }

        d_speed = spd;
        if (spd > 0) {
            PIBLASTER.setPwm(d_pinBack, 0);
            PIBLASTER.setPwm(d_pinFwd, spd / 100.0);
        }
        if (spd < 0) {
            PIBLASTER.setPwm(d_pinFwd, 0);
            PIBLASTER.setPwm(d_pinBack, Math.abs(spd / 100.0));
        }
        if (spd === 0) {
            PIBLASTER.setPwm(d_pinBack, 0);
            PIBLASTER.setPwm(d_pinFwd, 0);
        }

        return spd;
    }

    function stop() {
        speed(0);
    }

    this.invert = invert;
    this.forwards = forwards;
    this.forward = forwards;
    this.backwards = backwards;
    this.backward = backwards;
    this.speed = speed;
    this.reverse = invert;
}

function Input(pin) {
    var d_pin = pin;
    var d_pinImpl = new gpio.DigitalInput(pin);

    var d_handlePressed = null;
    var d_handleReleased = null;
    var d_handleChanged = null;
    var d_hasCallback = false;

    // Things that 'Pin' should have implemented
    var d_last = read();
    var d_handleChange = false;
    var d_handleHigh = false;
    var d_handleLow = false;

    var d_pollToken = null;

    function read() {
        return d_pinImpl.read() === gpio.HIGH;
    }

    function hasChanged() {
        if (read() !== d_last) {
            d_last = read();
            return true;
        }
        return false;
    }

    function isOff() {
        return (read() === false);
    }

    function isOn() {
        return (read() === true);
    }

    function onHigh(callback, bounceTime) {
        if (bounceTime === undefined) bounceTime = DEBOUNCE_TIME;
        d_handlePressed = callback;
        _setupCallback(bounceTime);
        return true;
    }

    function _setupCallback(bouncetime) {
        if (d_hasCallback) {
            return false;
        }

        // We might need to implement this as polling
        d_last = read();
        d_pollToken = setInterval(function () {
            var currVal = read();
            if (currVal !== d_last) {
                if (currVal && d_handlePressed) {
                    d_handlePressed();
                }
                else if (!currVal && d_handleReleased) {
                    d_handleReleased();
                }
                if (d_handleChanged) {
                    d_handleChanged();
                }
            }
            d_last = currVal;
        }, 10);

        d_hasCallback = true;
        return true;
    }

    function onLow(callback, bounceTime) {
        if (bounceTime === undefined) bounceTime = DEBOUNCE_TIME;
        d_handleReleased = callback;
        _setupCallback(bounceTime);
        return true;
    }

    function onChanged(callback, bounceTime) {
        if (bounceTime === undefined) bounceTime = DEBOUNCE_TIME;
        d_handleChanged = callback;
        _setupCallback(bounceTime);
        return true;
    }

    function clearEvents() {
        if (d_pollToken) {
            d_pollToken();
        }
        d_pollToken = null;
        d_hasCallback = false;
    }
    
    this.read = read;
    this.hasChanged = hasChanged;
    this.isOn = isOn;
    this.isOff = isOff;
    this.onHigh = onHigh;
    this.onLow = onLow;
    this.onChanged = onChanged;
    this.clearEvents = clearEvents;
    this.changed = onChanged;
    this.pressed = onHigh;
    this.released = onLow;
}

function Output(pin) {
    var d_pin = pin;
    var d_pinImpl = new gpio.DigitalOutput(pin);

    var d_pulser = new Pulse(this, 0, 0, 0, 0);
    var d_blinking = false;
    var d_pulsing = false;
    var d_fading = false;
    var d_fader = null;
    var d_value = false;

    function write(value) {
        if (value !== true && value !== false && value !== 1 && value !== 0) {
            throw new Error("Legal values to be written are 1/true or 0/false");
        }

        d_value = (value === true || value === 1) ? true : false;

        d_pinImpl.write(d_value);
        return true;
    }

    function on() {
        write(true);
        return true;
    }

    function off() {
        write(false);
        return true;
    }

    function toggle() {
        write(!d_value);
    }

    this.write = write;
    this.on = on;
    this.off = off;
    this.high = on;
    this.low = off;
    this.toggle = toggle;
}

function AnalogInput(adc, channel) {
    var d_channel = channel;
    var d_sensitivity = 0.1;
    var d_tWatch = null;
    var d_lastValue = null;
    var d_handler = null;

    function read() {
        return adc.readADC(d_channel);
    }

    function sensitivity(sens) {
        d_sensitivity = sens;
    }

    function changed(handler, sens) {
        d_handler = handler;
        if (sens !== undefined) {
            d_sensitivity = sens;
        }

        if (!d_tWatch) {
            d_tWatch = setInterval(function() {
                var value = read();
                if (d_lastValue !== null && Math.abs(value - d_lastValue) > d_sensitivity) {
                    if (d_handler) {
                        d_handler(value);
                    }
                }
                d_lastValue = value;
            }, 10);
        }
    }

    this.read = read;
    this.sensitivity = sensitivity;
    this.changed = changed;
}

var CapTouchSettings = {
    enableMultitouch: function(en) {
        if (en === undefined) en = true;
        d_cap1208.enableMultitouch(en);
    }
};

function CapTouchInput(cap1208, channel, alias) {
    var d_alias = alias;
    var d_pressed = false;
    var d_held = false;
    var d_channel = channel;
    var d_handlers = {
        'press': null,
        'release': null,
        'held': null
    };

    ['press', 'release', 'held'].forEach(function(evt) {
        cap1208.on(d_channel, evt, _handleState);
    });

    function _handleState(channel, evt) {
        if (channel === d_channel) {
            if (evt === 'press') {
                d_pressed = true;
            }
            else if (evt === 'held') {
                d_held = true;
            }
            else if (['release', 'none'].indexOf(evt) !== -1) {
                d_pressed = false;
                d_held = false;
            }

            if (d_handlers[evt]) {
                d_handlers[evt](d_alias, evt);
            }
        }
    }

    function isPressed() {
        return d_pressed;
    }

    function isHeld() {
        return d_held;
    }

    function pressed(handler) {
        d_handlers['press'] = handler;
    }

    function released(handler) {
        d_handlers['release'] = handler;
    }

    function held(handler) {
        d_handlers['held'] = handler;
    }

    this.isPressed = isPressed;
    this.isHeld = isHeld;
    this.pressed = pressed;
    this.released = released;
    this.held = held;
}

var d_isReady = false;

var d_adc;
var d_cap1208;

var d_workers = {};

function asyncStart(name, func, pollTime) {
    if (d_workers[name]) {
        d_workers[name]();
    }

    d_workers[name] = setInterval(func, pollTime);
}

function asyncStop(name) {
    if (d_workers[name]) {
        d_workers[name]();
    }

    d_workers[name] = undefined;
}

function asyncStopAll() {
    for (var name in d_workers) {
        if (d_workers[name]) {
            d_workers[name]();
        }
        d_workers[name] = undefined;
    }
}

var settings, light, output, input, touch, motor, analog;

RASPI.init(function () {
    var i2c = new I2C();
    d_adc = new ADC(i2c);
    d_cap1208 = new CAP1208(i2c, GPIO);

    settings = {
        touch: CapTouchSettings
    };

    light = {
        blue:   new Output(LED1),
        yellow: new Output(LED2),
        red:    new Output(LED3),
        green:  new Output(LED4)
    };

    output = {
        one:    new Output(OUT1),
        two:    new Output(OUT2),
        three:  new Output(OUT3),
        four:   new Output(OUT4)
    };

    input = {
        one:    new Input(IN1),
        two:    new Input(IN2),
        three:  new Input(IN3),
        four:   new Input(IN4)
    };

    touch = {
        one:    new CapTouchInput(4, 1),
        two:    new CapTouchInput(5, 2),
        three:  new CapTouchInput(6, 3),
        four:   new CapTouchInput(7, 4),
        five:   new CapTouchInput(0, 5),
        six:    new CapTouchInput(1, 6),
        seven:  new CapTouchInput(2, 7),
        eight:  new CapTouchInput(3, 8)
    };

    motor = {
        one:    new Motor(M1F, M1B),
        two:    new Motor(M2F, M2B)
    };

    analog = {
        one:    new AnalogInput(3),
        two:    new AnalogInput(2),
        three:  new AnalogInput(1),
        four:   new AnalogInput(0)
    };

    d_isReady = true;
});


var EXPLORER_HAT = {
    isReady: function() {
        return d_isReady;
    },
    settings: settings,
    light: light,
    output: output,
    input: input,
    touch: touch,
    motor: motor,
    analog: analog
};


module.exports = EXPLORER_HAT;