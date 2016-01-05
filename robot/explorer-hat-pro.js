// explorer-hat-pro.js
// An interface to the Explorer HAT

var raspi = require('raspi');
var gpio = require('raspi-gpio');
var I2C = require('raspi-i2c').I2C;

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

raspi.init(function () {
	var i2c = new I2C();

	// Start getting analog values
	ADC.startSampling(i2c);
	var capButtons = new cap1208(i2c);


});