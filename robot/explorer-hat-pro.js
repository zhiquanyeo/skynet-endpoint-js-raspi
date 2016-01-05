// explorer-hat-pro.js
// An interface to the Explorer HAT

var raspi = require('raspi');
var GPIO = require('raspi-gpio');
var I2C = require('raspi-i2c').I2C;
var PWM = require('raspi-pwm').PWM;

var ADC = require('ads1015');
var cap1208 = require('cap1208');

var LED1 = 4;
var LED2 = 17;
var LED3 = 27;
var LED4 = 5;

var M1B = 19; 
var M1F = 20;
var M2B = 21;
var M2F = 26;

var d_state = {
	analog: {		// Analog input
		0: 0.0,
		1: 0.0,
		2: 0.0,
		3: 0.0
	},
	digital: {		// Digital Input
		0: false,
		1: false,
		2: false,
		3: false
	},
	buttons: {		// Capacitive touch buttons
		0: false,
		1: false,
		2: false,
		3: false,
		4: false,
		5: false,
		6: false,
		7: false
	}
}

function AnalogInput(adc, channel) {
	var d_channel = channel;
	var d_sensitivity = 0.1;
	var d_tWatch = null;
	var d_lastValue = null;
	var d_handler = null;

	this.read = function () {
		return adc.getValue(d_channel);
	};

	this.sensitivity = function (val) {
		d_sensitivity = val;
	};

	this.changed = function (handler, sensitivity) {
		d_handler = handler;
		if (sensitivity !== undefined) {
			d_sensitivity = sensitivity;
		}
	}
}

function CapTouchInput(capButtons, channel, alias) {
	var d_channel = channel;
	var d_alias = alias;
	var d_pressed = false;
	var d_held = false;
	var d_handlers = {
		'press': null,
		'release': null,
		'held': null
	};

	['press', 'release', 'held'].forEach(function(currVal, index, array) {
		capButtons.on(channel, currVal, _handleState.bind(this));
	}, this);

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

	this.isPressed = function () {
		return d_pressed;
	};

	this.isHeld = function () {
		return d_held;
	};

	this.pressed = function(handler) {
		d_handlers['press'] = handler;
	};

	this.released = function(handler) {
		d_handlers['release'] = handler;
	};

	this.held = function(handler) {
		d_handlers['held'] = handler;
	};
}

// For analog, provide the following:
// getValue()
// onChange(handler, throttling)
var d_analogHandlers = [];
function analogGetValue(ch) {
	return d_state.analog[ch];
}

function onAnalogChange(handler, throttle) {
	d_analogHandlers.push({
		callback: handler,
		throttle: throttle || 0,
		lastPublished: 0
	});
}


// MOTOR OBJECT
function Motor(pin_f, pin_b) {
	var d_invert = false;
	var d_pinForward = pin_f;
	var d_pinBackward = pin_b;
	var d_speed = 0;

	var pwmFwd = new PWM(d_pinForward);
	var pwmBack = new PWM(d_pinBackward);

	this.invert = function() {
		d_invert = !d_invert;
		d_speed = -d_speed;
		this.speed(d_speed);
		return d_invert;
	};

	this.forwards = function(speed) {
		if (speed > 100) speed = 100;
		if (speed < 0)  speed = 0;

		if (d_invert) {
			this.setSpeed(-speed);
		}
		else {
			this.setSpeed(speed);
		}
	};

	this.backwards = function(speed) {
		if (speed > 100) speed = 100;
		if (speed < 0)  speed = 0;

		if (d_invert) {
			this.setSpeed(speed);
		}
		else {
			this.setSpeed(-speed);
		}
	};

	this.speed = function(speed) {
		if (speed > 100) speed = 100;
		if (speed < -100) speed = -100;

		d_speed = speed;

		// we need to convert to 0 - 1024
		var writeVal = Math.round(Math.abs(speed) / 100.0 * 1024);
		if (speed > 0) {
			d_pinBackward.write(0);
			d_pinForward.write(writeVal);
		}
		else if (speed < 0) {
			d_pinBackward.write(writeVal);
			d_pinForward.write(0);
		}
		else {
			d_pinForward.write(0);
			d_pinBackward.write(0);
		}

		return speed;
	};

	this.stop = function() {
		this.speed(0);
	}

}

// Array of analog inputs
var d_analogInputs = {};

raspi.init(function () {
	var i2c = new I2C();

	// Start getting analog values
	ADC.startSampling(i2c);
	d_analogInputs['one'] = new AnalogInput(ADC, 3);
	d_analogInputs['two'] = new AnalogInput(ADC, 2);
	d_analogInputs['three'] = new AnalogInput(ADC, 1);
	d_analogInputs['four'] = new AnalogInput(ADC, 0);

	var capButtons = new cap1208(i2c);


});