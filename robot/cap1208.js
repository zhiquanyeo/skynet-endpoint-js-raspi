// CAP1208 - 8 Input Capacitive Touch Input
vvar Promise = require('promise');

function CAP1208(i2c) {
	var ADDRESS = 0x28;

	// Registers
	var R_MAIN_CONTROL		= 0x00;
	var R_GENERAL_STATUS	= 0x02;
	var R_INPUT_STATUS		= 0x03;
	var R_LED_STATUS		= 0x04;
	var R_NOISE_FLAG_STATUS	= 0x0A;

	// Readonly delta counts for all inputs
	var R_INPUT_1_DELTA		= 0x10;
	var R_INPUT_2_DELTA		= 0x11;
	var R_INPUT_3_DELTA		= 0x12;
	var R_INPUT_4_DELTA		= 0x13;
	var R_INPUT_5_DELTA		= 0x14;
	var R_INPUT_6_DELTA		= 0x15;
	var R_INPUT_7_DELTA		= 0x16;
	var R_INPUT_8_DELTA		= 0x17;

	var R_SENSITIVITY		= 0x1F;
	var SENSITIVITY = {
		128: 	0x0,
		64: 	0x1,
		32: 	0x2,
		16: 	0x3,
		8: 		0x4,
		4: 		0x5,
		2: 		0x6,
		1: 		0x7
	};

	var R_GENERAL_CONFIG 	= 0x20;
	var R_INPUT_ENABLE 		= 0x21;
	var R_INPUT_CONFIG 		= 0x22;
	var R_INPUT_CONFIG2 	= 0x23;

	var R_SAMPLING_CONFIG	= 0x24;
	var R_CALIBRATION		= 0x25;
	var R_INTERRUPT_EN		= 0x27;
	var R_REPEAT_EN			= 0x28;
	var R_MTOUCH_CONFIG		= 0x2A;
	var R_MTOUCH_PAT_CONF	= 0x2B;
	var R_MTOUCH_PATTERN	= 0x2D;
	var R_COUNT_O_LIMIT		= 0x2E;
	var R_RECALIBRATION		= 0x2F;

	// R/W Touch detection thresholds for inputs
	var R_INPUT_1_THRESH	= 0x30;
	var R_INPUT_2_THRESH	= 0x31;
	var R_INPUT_3_THRESH	= 0x32;
	var R_INPUT_4_THRESH	= 0x33;
	var R_INPUT_5_THRESH	= 0x34;
	var R_INPUT_6_THRESH	= 0x35;
	var R_INPUT_7_THRESH	= 0x36;
	var R_INPUT_8_THRESH	= 0x37;

	var R_NOISE_THRESH		= 0x38;

	// R/W Standby and Config registers
	var R_STANDBY_CHANNEL	= 0x40;
	var R_STANDBY_CONFIG	= 0x41;
	var R_STANDBY_SENS		= 0x42;
	var R_STANDBY_THRESH	= 0x43;

	var R_CONFIGURATION2	= 0x44;



	var d_lastInputStatus = [false, false, false, false, false, false, false, false];
	var d_inputStatus = [null, null, null, null, null, null, null, null];
	var d_inputDelta = [0, 0, 0, 0, 0, 0, 0, 0];
	var d_inputPressed = [false, false, false, false, false, false, false, false];
	var d_repeatEnabled = 0x00;
	var d_releaseEnabled = 0xFF;

	function getInputStatus() {
		var touched = i2c.readByteSync(ADDRESS, R_INPUT_STATUS);
		var threshold = i2c.readSync(ADDRESS, R_INPUT_1_THRESH, 8);
		var delta = i2c.readSync(ADDRESS, R_INPUT_1_DELTA, 8);

		for (var i = 0; i < 8; i++) {
			if ((1 << i) & touched) {
				var status = 'none';
				var _delta = getTwosComp(delta[i]);

				if (_delta > threshold[i]) {
					d_inputDelta[i] = _delta;
					if (d_inputStatus[i] === 'press' || d_inputStatus[i] === 'held') {
						if (d_repeatEnabled & (1 << i)) {
							status = 'held';
						}
					}
					if (d_inputStatus[i] === 'none' || d_inputStatus[i] === 'release') {
						if (d_inputPressed[i]) {
							status = 'none';
						}
						else {
							status = 'press';
						}
					}
				}
				else {
					// Touch release event
					if ((d_releaseEnabled & (1 << i)) && d_inputStatus[i] !== 'release') {
						status = 'release';
					}
					else {
						status = 'none';
					}
				}

				d_inputStatus[i] = status;
				d_inputPressed[i] = (['press', 'held', 'none'].indexOf(status) !== -1);
			}
			else {
				d_inputStatus[i] = 'none';
				d_inputPressed[i] = false;
			}
		}

		return d_inputStatus;
	}

	function getTwosComp(val) {
		if ( (val & (1 << (8-1))) != 0 ) {
			val = val - (1 << 8);
		}
		return val;
	}

	function clearInterrupt() {
		var main = i2c.readByteSync(ADDRESS, R_MAIN_CONTROL);
		main &= ~0x01;
		i2c.writeByteSync(ADDRESS, R_MAIN_CONTROL, main);
	}

	function _interruptStatus() {
		
	}

	function enableInputs(pins) {
		i2c.writeByteSync(ADDRESS, R_INPUT_ENABLE, (pins & 0xFF));
	}

	function enableInterrupts(pins) {
		i2c.writeByteSync(ADDRESS, R_INTERRUPT_EN, (pins & 0xFF));
	}

	function enableRepeat(pins) {
		i2c.writeByteSync(ADDRESS, R_REPEAT_EN, (pins & 0xFF));
	}

	function enableMultitouch(en) {
		if (en === undefined) en = true;
		var ret_MT = i2c.readByteSync(ADDRESS, R_MTOUCH_CONFIG);
		if (en) {
			i2c.writeByteSync(ADDRESS, R_MTOUCH_CONFIG, ret_MT & ~0x80);
		}
		else {
			i2c.writeByteSync(ADDRESS, R_MTOUCH_CONFIG, ret_MT | 0x80);
		}
	}

	// Enable Inputs
	i2c.writeSync(ADDRESS, R_INPUT_ENABLE, [0xFF]);
	//
}