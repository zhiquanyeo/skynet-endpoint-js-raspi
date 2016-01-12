// CAP1XXX Capacitive Touch Sensors

// cap 1208 - 8 inputs
// cap 1188 - 8 inputs, 8 LEDs

var Promise = require('promise');

var ADDRESS     = 0x28;

// Supported devices
var PID_CAP1208 = 0x6B;
var PID_CAP1188 = 0x50;
var PID_CAP1166 = 0x51;

// REGISTER MAP

var R_MAIN_CONTROL      = 0x00;
var R_GENERAL_STATUS    = 0x02;
var R_INPUT_STATUS      = 0x03;
var R_LED_STATUS        = 0x04;
var R_NOISE_FLAG_STATUS = 0x0A;

// Read-only delta counts for all inputs
var R_INPUT_1_DELTA   = 0x10;
var R_INPUT_2_DELTA   = 0x11;
var R_INPUT_3_DELTA   = 0x12;
var R_INPUT_4_DELTA   = 0x13;
var R_INPUT_5_DELTA   = 0x14;
var R_INPUT_6_DELTA   = 0x15;
var R_INPUT_7_DELTA   = 0x16;
var R_INPUT_8_DELTA   = 0x17;

var R_SENSITIVITY     = 0x1F;
// B7     = N/A
// B6..B4 = Sensitivity
// B3..B0 = Base Shift
var SENSITIVITY = {
    128:    0x00,
    64:     0x01,
    32:     0x02,
    16:     0x03,
    8:      0x04,
    4:      0x05,
    2:      0x06,
    1:      0x07
};

var R_GENERAL_CONFIG  = 0x20;
// B7 = Timeout
// B6 = Wake Config ( 1 = Wake pin asserted )
// B5 = Disable Digital Noise ( 1 = Noise threshold disabled )
// B4 = Disable Analog Noise ( 1 = Low frequency analog noise blocking disabled )
// B3 = Max Duration Recalibration ( 1 =  Enable recalibration if touch is held longer than max duration )
// B2..B0 = N/A

var R_INPUT_ENABLE    = 0x21;


var R_INPUT_CONFIG    = 0x22;

var R_INPUT_CONFIG2   = 0x23; // Default 0x00000111

// Values for bits 3 to 0 of R_INPUT_CONFIG2
// Determines minimum amount of time before
// a "press and hold" event is detected.

// Also - Values for bits 3 to 0 of R_INPUT_CONFIG
// Determines rate at which interrupt will repeat
//
// Resolution of 35ms, max = 35 + (35 * 0b1111) = 560ms

var R_SAMPLING_CONFIG = 0x24; // Default 0x00111001
var R_CALIBRATION     = 0x26; // Default 0b00000000
var R_INTERRUPT_EN    = 0x27; // Default 0b11111111
var R_REPEAT_EN       = 0x28; // Default 0b11111111
var R_MTOUCH_CONFIG   = 0x2A; // Default 0b11111111
var R_MTOUCH_PAT_CONF = 0x2B;
var R_MTOUCH_PATTERN  = 0x2D;
var R_COUNT_O_LIMIT   = 0x2E;
var R_RECALIBRATION   = 0x2F;

// R/W Touch detection thresholds for inputs
var R_INPUT_1_THRESH  = 0x30;
var R_INPUT_2_THRESH  = 0x31;
var R_INPUT_3_THRESH  = 0x32;
var R_INPUT_4_THRESH  = 0x33;
var R_INPUT_4_THRESH  = 0x34;
var R_INPUT_6_THRESH  = 0x35;
var R_INPUT_7_THRESH  = 0x36;
var R_INPUT_8_THRESH  = 0x37;

// R/W Noise threshold for all inputs
var R_NOISE_THRESH    = 0x38;

// R/W Standby and Config Registers
var R_STANDBY_CHANNEL = 0x40;
var R_STANDBY_CONFIG  = 0x41;
var R_STANDBY_SENS    = 0x42;
var R_STANDBY_THRESH  = 0x43;

var R_CONFIGURATION2  = 0x44;
// B7 = Linked LED Transition Controls ( 1 = LED trigger is !touch )
// B6 = Alert Polarity ( 1 = Active Low Open Drain, 0 = Active High Push Pull )
// B5 = Reduce Power ( 1 = Do not power down between poll )
// B4 = Link Polarity/Mirror bits ( 0 = Linked, 1 = Unlinked )
// B3 = Show RF Noise ( 1 = Noise status registers only show RF, 0 = Both RF and EMI shown )
// B2 = Disable RF Noise ( 1 = Disable RF noise filter )
// B1..B0 = N/A

// Read-only reference counts for sensor inputs
var R_INPUT_1_BCOUNT  = 0x50;
var R_INPUT_2_BCOUNT  = 0x51;
var R_INPUT_3_BCOUNT  = 0x52;
var R_INPUT_4_BCOUNT  = 0x53;
var R_INPUT_5_BCOUNT  = 0x54;
var R_INPUT_6_BCOUNT  = 0x55;
var R_INPUT_7_BCOUNT  = 0x56;
var R_INPUT_8_BCOUNT  = 0x57;

// LED Controls - For CAP1188 and similar
var R_LED_OUTPUT_TYPE = 0x71;
var R_LED_LINKING     = 0x72;
var R_LED_POLARITY    = 0x73;
var R_LED_OUTPUT_CON  = 0x74;
var R_LED_LTRANS_CON  = 0x77;
var R_LED_MIRROR_CON  = 0x79;

// LED Behaviour
var R_LED_BEHAVIOUR_1 = 0x81; // For LEDs 1-4
var R_LED_BEHAVIOUR_2 = 0x82; // For LEDs 5-8
var R_LED_PULSE_1_PER = 0x84;
var R_LED_PULSE_2_PER = 0x85;
var R_LED_BREATHE_PER = 0x86;
var R_LED_CONFIG      = 0x88;
var R_LED_PULSE_1_DUT = 0x90;
var R_LED_PULSE_2_DUT = 0x91;
var R_LED_BREATHE_DUT = 0x92;
var R_LED_DIRECT_DUT  = 0x93;
var R_LED_DIRECT_RAMP = 0x94;
var R_LED_OFF_DELAY   = 0x95;

// R/W Power buttonc ontrol
var R_POWER_BUTTON    = 0x60;
var R_POW_BUTTON_CONF = 0x61;

// Read-only upper 8-bit calibration values for sensors
var R_INPUT_1_CALIB   = 0xB1;
var R_INPUT_2_CALIB   = 0xB2;
var R_INPUT_3_CALIB   = 0xB3;
var R_INPUT_4_CALIB   = 0xB4;
var R_INPUT_5_CALIB   = 0xB5;
var R_INPUT_6_CALIB   = 0xB6;
var R_INPUT_7_CALIB   = 0xB7;
var R_INPUT_8_CALIB   = 0xB8;

// Read-only 2 LSBs for each sensor input
var R_INPUT_CAL_LSB1  = 0xB9;
var R_INPUT_CAL_LSB2  = 0xBA;

// Product ID Registers
var R_PRODUCT_ID      = 0xFD;
var R_MANUFACTURER_ID = 0xFE;
var R_REVISION        = 0xFF;

// LED Behaviour settings
var LED_BEHAVIOUR_DIRECT  = 0x0;
var LED_BEHAVIOUR_PULSE1  = 0x1;
var LED_BEHAVIOUR_PULSE2  = 0x2;
var LED_BEHAVIOUR_BREATHE = 0x3;

var LED_OPEN_DRAIN = 0; // Default, LED is open-drain output with ext pullup
var LED_PUSH_PULL  = 1; // LED is driven HIGH/LOW with logic 1/0

var LED_RAMP_RATE_2000MS = 7;
var LED_RAMP_RATE_1500MS = 6;
var LED_RAMP_RATE_1250MS = 5;
var LED_RAMP_RATE_1000MS = 4;
var LED_RAMP_RATE_750MS  = 3;
var LED_RAMP_RATE_500MS  = 2;
var LED_RAMP_RATE_250MS  = 1;
var LED_RAMP_RATE_0MS    = 0;

function CAP1XXX(i2c, gpio) {
    var d_supported = [PID_CAP1208, PID_CAP1188, PID_CAP1166];
    var d_numInputs = 8;
    var d_numLeds   = 8;

    var d_alertPinId;
    var d_alertPin;
    var d_resetPinId;
    var d_resetPin;

    var d_touchHandlers;
    var d_internalHandlers = {
        'press':    [],
        'release':  [],
        'held':     []
    };

    var d_initialized = false;

    var d_delta = 50;

    var d_lastInputStatus = [];
    var d_inputStatus = [];
    var d_inputDelta = [];
    var d_inputPresset = [];

    var d_repeatEnabled = 0x00;
    var d_releaseEnabled = 0xFF;

    var d_pollToken;

    function initialize(alertPin, resetPin, onTouch, skipInit) {
        var i;
        if (alertPin === undefined) alertPin = -1;
        d_alertPinId = alertPin;

        if (resetPin === undefined) resetPin = -1;
        d_resetPinId = resetPin;

        if (onTouch === undefined) {
            onTouch = [];
            for (i = 0; i < d_numInputs; i++) {
                onTouch[i] = null;
            }
        }
        d_touchHandlers = onTouch;

        skipInit = !!skipInit;

        if (d_alertPinId !== -1) {
            d_alertPin = new gpio.DigitalInput({
                pin: d_alertPinId,
                pullResistor: gpio.PULL_UP
            });
        }

        if (d_resetPinId !== -1) {
            d_resetPin = new gpio.DigitalOutput(d_resetPinId);
            d_resetPin.write(gpio.LOW);
            d_resetPin.write(gpio.HIGH);
            // TODO sleep?
            d_resetPin.write(gpio.LOW);
        }

        // Set up internal state
        for (i = 0; i < d_numInputs; i++) {
            d_internalHandlers['press'][i] = null;
            d_internalHandlers['release'][i] = null;
            d_internalHandlers['held'][i] = null;

            d_lastInputStatus[i] = false;
            d_inputStatus[i] = 'none';
            d_inputDelta[i] = 0;
            d_inputPressed[i] = false;
        }

        // At this point, we are ready
        d_initialized = true;

        if (skipInit) {
            return;
        }

        // Initialize the IC

        // Enable all inputs with interrupt by default
        enableInputs(0xFF);
        enableInterrupts(0xFF);

        // Disable repeat for all channels, but give it sane defaults
        enableRepeat(0x00);
        enableMultitouch(true);

        setHoldDelay(210);
        setRepeatRate(210);

        // Tested sane defaults for various configurations
        _writeByte(R_SAMPLING_CONFIG, 0x08);    // 1 sample per measure, 1.28ms time, 35ms cycle
        _writeByte(R_SENSITIVITY, 0x60);        // 2x Sensitivity
        _writeByte(R_GENERAL_CONFIG, 0x38);
        _writeByte(R_CONFIGURATION2, 0x60);
        setTouchDelta(10);

    }

    function getInputStatus() {
        if (!d_initialized) {
            throw new Error("Not yet initialized");
        }
        // Get the status of all inputs
        // Returns an array of 8 boolean values indicating
        // whether an input has been triggered since the
        // interrupt flag was last cleared
        var touched = _readByte(R_INPUT_STATUS);
        var threshold = _readBlock(R_INPUT_1_THRESH, d_numInputs);
        var delta = _readBlock(R_INPUT_1_DELTA, d_numInputs);
        
        for (var x = 0; x < d_numInputs; x++) {
            if ((1 << x) & touched) {
                var status = 'none';
                var _delta = _getTwosComp(delta[x]);
                // We only ever want to detect PRESS events
                // If repeat is disabled and release detect is enabled
                if (_delta >= threshold[x]) {
                    d_inputDelta[x] = _delta;
                    // touch down event
                    if (['press','held'].indexOf(d_inputStatus[x]) !== -1) {
                        if (d_repeatEnabled & (1 << x)) {
                            status = 'held';
                        }
                    }
                    if (['none','release'].indexOf(d_inputStatus[x]) !== -1) {
                        if (d_inputPressed[x]) {
                            status = 'none';
                        }
                        else {
                            status = 'press';
                        }
                    }
                }
                else {
                    // Touch Release event
                    if ((d_releaseEnabled & (1 << x)) && d_inputStatus[x] !== 'release') {
                        status = 'release';
                    }
                    else {
                        status = 'none';
                    }
                }

                d_inputStatus[x] = status;
                d_inputPressed[x] = (['press','held','none'].indexOf(status) !== -1);
            }
            else {
                d_inputStatus[x] = 'none';
                d_inputPressed[x] = false;
            }
        }
        return d_inputStatus;
    }

    function _getTwosComp(val) {
        if ((val & (1 << (8 - 1))) !== 0) {
            val = val - (1 << 8);
        }
        return val;
    }

    function clearInterrupt() {
        if (!d_initialized) {
            throw new Error("Not yet initialized");
        }
        // Clear the interrupt flag, bit 0 of the
        // main control register
        var main = _readByte(R_MAIN_CONTROL);
        main &= ~0x01;
        _writeByte(R_MAIN_CONTROL, main);
    }

    function _interruptStatus() {
        if (d_alertPinId == -1) {
            return ((_readByte(R_MAIN_CONTROL) & 1) == 1);
        }
        else {
            return !d_alertPin.read();
        }
    }

    function waitForInterrupt(timeout) {
        if (!d_initialized) {
            throw new Error("Not yet initialized");
        }
        // Wait for interrupt (bit 0) of the main
        // control register to be set, indicating an
        // input has been triggered
        return new Promise(function(fulfill, reject) {
            var start = Date.now();
            var intervalToken = setInterval(function () {
                var status = _interruptStatus();
                if (status) {
                    intervalToken();
                    fulfill(true);
                }
                if (Date.now() > start + timeout) {
                    intervalToken();
                    fulfill(false);
                }
            }, 5);
        });
    }

    function on(ch, evt, handler) {
        if (!d_initialized) {
            throw new Error("Not yet initialized");
        }

        if (ch === undefined) ch = 0;
        if (evt === undefined) evt = 'press';
        d_internalHandlers[evt][ch] = handler;
        
        // TODO replace this with something
        startWatching();
        return true;
    }

    function startWatching() {
        if (!d_initialized) {
            throw new Error("Not yet initialized");
        }

        if (d_alertPinId !== -1) {
            // TODO implement?
        }

        if (!d_pollToken) {
            d_pollToken = setInterval(function () {
                waitForInterrupt().then(function(result) {
                    if (result) {
                        _handleAlert();
                    }
                });
            }, 10);
            return true;
        }
        return false;
    }

    function stopWatching() {
        if (!d_initialized) {
            throw new Error("Not yet initialized");
        }

        if (d_pollToken) {
            d_pollToken();
            d_pollToken = null;
        }
        return false;
    }

    function setTouchDelta(delta) {
        if (!d_initialized) {
            throw new Error("Not yet initialized");
        }

        d_delta = delta;
    }

    function autoRecalibrate(value) {
        if (!d_initialized) {
            throw new Error("Not yet initialized");
        }

        _changeBit(R_GENERAL_CONFIG, 3, value);
    }

    function filterAnalogNoise(value) {
        if (!d_initialized) {
            throw new Error("Not yet initialized");
        }
        
        _changeBit(R_GENERAL_CONFIG, 4, !value);
    }

    function filterDigitalNoise(value) {
        if (!d_initialized) {
            throw new Error("Not yet initialized");
        }
        
        _changeBit(R_GENERAL_CONFIG, 5, !value);
    }

    function setHoldDelay(ms) {
        if (!d_initialized) {
            throw new Error("Not yet initialized");
        }
        
        // Set time before a press and hod is detected
        // clamps to multiples of 35 from 35 to 560
        var repeatRate = _calcTouchRate(ms);
        var inputConfig = _readByte(R_INPUT_CONFIG2);
        intputConfig = (inputConfig & ~0xF) | repeatRate;
        _writeByte(R_INPUT_CONFIG2, inputConfig);
    }

    function setRepeatRate(ms) {
        if (!d_initialized) {
            throw new Error("Not yet initialized");
        }
        
        // Set repeat rate in milliseconds
        // Clamps to multiples of 35 from 35 to 560
        var repeatRate = _calcTouchRate(ms);
        var iputConfig = _readByte(R_INPUT_CONFIG);
        inputConfig = (inputConfig & ~0xF) | repeatRate;
        _writeByte(R_INPUT_CONFIG, inputConfig);
    }

    function _calcTouchRate(ms) {
        ms = min(max(ms, 0), 500);
        var scale = parseInt(Math.round(ms / 35.0) * 35, 10) / 35;
        return parseInt(scale, 10);
    }

    function _handleAlert(pin) {
        var inputs = _getInputStatus();
        for (var x = 0; x < d_numInputs; x++) {
            _triggerHandler(x, inputs[x]);
        }
        clearInterrupt();
    }

    function _triggerHandler(ch, event) {
        if (event === 'none') {
            return;
        }
        var handler = d_internalHandlers[event][ch];
        if (handler) {
            handler({
                channel: ch,
                event: event,
                delta: d_inputDelta[ch]
            });
        }
    }

    function enableMultitouch(en) {
        if (!d_initialized) {
            throw new Error("Not yet initialized");
        }
        
        if (en === undefined) en = true;
        // Toggles multitouch by toggling the multitouch
        // block bit in the config register
        var ret_mt = _readByte(R_MTOUCH_CONFIG);
        if (en) {
            _writeByte(R_MTOUCH_CONFIG, ret_mt & ~0x80);
        }
        else {
            _writeByte(R_MTOUCH_CONFIG, ret_mt | 0x80);
        }
    }

    function enableRepeat(inputs) {
        if (!d_initialized) {
            throw new Error("Not yet initialized");
        }
        
        d_repeatEnabled = inputs;
        _writeByte(R_REPEAT_EN, inputs);
    }

    function enableInterrupts(inputs) {
        if (!d_initialized) {
            throw new Error("Not yet initialized");
        }
        
        _writeByte(R_INTERRUPT_EN, inputs);
    }

    function enableInputs(inputs) {
        if (!d_initialized) {
            throw new Error("Not yet initialized");
        }
        
        _writeByte(R_INPUT_ENABLE, inputs);
    }

    function _writeByte(register, value) {
        i2c.writeByteSync(ADDRESS, register, value);
    }

    function _readByte(register) {
        return i2c.readByteSync(ADDRESS, register);
    }

    function _readBlock(register, length) {
        return i2c.readSync(ADDRESS, register, length);
    }

    function _setBit(register, bit) {
        _writeByte(register, _readByte(register) | (1 << bit));
    }

    function _clearBit(register, bit) {
        _writeByte(register, _readByte(register) & ~(1 << bit));
    }

    function _changeBit(register, bit, state) {
        if (state) {
            _setBit(register, bit);
        }
        else {
            _clearBit(register, bit);
        }
    }

    function _changeBits(register, offset, size, bits) {
        var originalValue = _readByte(register);
        for (var x = 0; x < size; x++) {
            originalValue &= ~(1 << (offset+x));
        }
        originalValue |= (bits << offset);
        _writeByte(register, originalValue);
    }

    this.initialize = initialize;
    this.getInputStatus = getInputStatus;
    this.clearInterrupt = clearInterrupt;
    this.waitForInterrupt = waitForInterrupt;
    this.on = on;
    this.startWatching = startWatching;
    this.stopWatching = stopWatching;
    this.setTouchDelta = setTouchDelta;
    this.autoRecalibrate = autoRecalibrate;
    this.filterAnalogNoise = filterAnalogNoise;
    this.filterDigitalNoise = filterDigitalNoise;
    this.setHoldDelay = setHoldDelay;
    this.setRepeatRate = setRepeatRate;
    this.enableMultitouch = enableMultitouch;
    this.enableRepeat = enableRepeat;
    this.enableInterrupts = enableInterrupts;
    this.enableInputs = enableInputs;
}

module.exports = CAP1XXX;