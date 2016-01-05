// Interface to the ADS 1015
var raspi = require('raspi');
var I2C = require('raspi-i2c').I2C;
var Promise = require('promise');

function ADS1015() {
	var ADDRESS = 0x48;
	
	var REG_CONV = 0x00;
	var REG_CFG = 0x01;

	var SAMPLES_PER_SECOND = {
		128: 	0x0000,
		250: 	0x0020,
		490: 	0x0040,
		920: 	0x0060,
		1600: 	0x0080,
		2400: 	0x00A0,
		3300: 	0x00C0
	};

	var CHANNEL = {
		0: 0x4000,
		1: 0x5000,
		2: 0x6000,
		3: 0x7000
	};

	var PROGRAMMABLE_GAIN = {
		6144: 	0x0000,
		4096: 	0x0200,
		2048: 	0x0400,
		1024:  	0x0600,
		512: 	0x0800,
		256: 	0x0A00
	};

	var PGA_6_144V = 6144;
	var PGA_4_096V = 4096;
	var PGA_2_048V = 2048;
	var PGA_1_024V = 1024;
	var PGA_0_512V = 512;
	var PGA_0_256V = 256;

	var d_started = false;

	var d_lastValues = [0.0, 0.0, 0.0, 0.0];
	var d_i2c = null;
	var d_interval = null;

	this.startSampling = function(i2c) {
		d_started = true;
		d_i2c = i2c;

		if (d_interval) {
			d_interval();
		}
		d_interval = setInterval(function () {
			readADC(0)
			.then(readADC(1))
			.then(readADC(2))
			.then(readADC(3))
			.then(function () {

			})
			.catch(function() {

			});
		}, 20); //50 times a second
	}

	this.stopSampling = function () {
		if (d_interval) {
			d_interval();
		}
		d_interval = null;
	}

	this.getValue = function(ch) {
		return d_lastValues[ch];
	}

	function readADC(channel, programmable_gain, samples_per_second) {
		return new Promise(function (fulfill, reject) {
			console.log("Reading ADC Channel: " + channel);
			if (channel === undefined) channel = 0;
			if (programmable_gain === undefined) programmable_gain = PGA_6_144V;
			if (samples_per_second === undefined) samples_per_second = 1600;

			// Sane defaults
			var config = 0x0003 | 0x0100;
			if (SAMPLES_PER_SECOND[samples_per_second] !== undefined) {
				config |= SAMPLES_PER_SECOND[samples_per_second];
			}

			if (CHANNEL[channel] !== undefined) {
				config |= CHANNEL[channel];
			}

			if (PROGRAMMABLE_GAIN[programmable_gain] !== undefined) {
				config |= PROGRAMMABLE_GAIN[programmable_gain];
			}

			// Set "Single Shot" mode
			config |= 0x8000;

			// Write single conversion flag
			d_i2c.writeSync(ADDRESS, REG_CFG, [(config >> 8) & 0xFF, config & 0xFF]);
			var sleepTime = ((1.0 / samples_per_second) + 0.0001) * 1000; //in ms
			// Sleep for some time
			setTimeout(function () {
				var data = d_i2c.readSync(ADDRESS, REG_CONV, 2);
				// Return in Volts

				// Shove the value into array
				d_lastValues[channel] = (((data[0] << 8) | data[1]) >> 4) * programmable_gain / 2048.0 / 1000.0;
				fulfill();
			}, sleepTime);
		});
	}
}

module.exports = new ADS1015();