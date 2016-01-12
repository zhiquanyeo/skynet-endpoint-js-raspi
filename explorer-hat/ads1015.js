// JS Interface to a the ADS1015 ADC

var Promise = require('promise');

var ADDRESS = 0x48;
var R_CONV  = 0x00;
var R_CFG   = 0x01;

var SAMPLES_PER_SECOND = {
    128:    0x0000,
    250:    0x0020,
    490:    0x0040,
    920:    0x0060,
    1600:   0x0080,
    2400:   0x00A0,
    3300:   0x00C0
};

var CHANNELS = {
    0:  0x4000,
    1:  0x5000,
    2:  0x6000,
    3:  0x7000
};

var P_GAIN = {
    6144:   0x0000,
    4096:   0x0200,
    2048:   0x0400,
    1024:   0x0600,
    512:    0x0800,
    256:    0x0A00
};

var PGA_6_144V = 6144;
var PGA_4_096V = 4096;
var PGA_2_048V = 2048;
var PGA_1_024V = 1024;
var PGA_0_512V = 512;
var PGA_0_256V = 256;

var READ_TIMEOUT = 25; // 40 times per second


function ADS1015(i2c) {

    var d_timeoutToken;
    var d_values = [0.0, 0.0, 0.0, 0.0];

    var d_pgain = PGA_6_144V;
    var d_sps = 1600;


    function _read_se_adc(channel, prog_gain, samples_per_second) {
        return new Promise(function(fulfill, reject) {
            if (channel === undefined) channel = 0;
            if (prog_gain === undefined) prog_gain = PGA_6_144V;
            if (samples_per_second === undefined) samples_per_second = 1600;

            // Sane defaults
            var config = 0x0003 | 0x0100;
            config |= SAMPLES_PER_SECOND[samples_per_second];
            config |= CHANNELS[channel];
            config |= P_GAIN[prog_gain];

            // Set single shot mode
            config |= 0x8000;

            // write Single conversion
            i2c.writeSync(ADDRESS, R_CFG, new Buffer([((config >> 8) & 0xFF), (config & 0xFF)]));

            var delay = ((1.0 / samples_per_second) + 0.0001) * 1000; // in ms

            setTimeout(function() {
                var data = i2c.readSync(ADDRESS, R_CONV, 2);
                var value = (((data[0] << 8) | data[1]) >> 4) * prog_gain / 2048.0 / 1000.0; // in V
                d_values[channel] = value;
                fulfill();
            }, delay);
        });
    }

    function readADC(ch, gain, sps) {
        // update the defaults
        if (gain !== undefined) {
            if (P_GAIN[gain] !== undefined) {
                d_pgain = gain;
            }
        }

        if (sps !== undefined) {
            if (SAMPLES_PER_SECOND[sps] !== undefined) {
                d_sps = sps;
            }
        }

        return d_values[ch];
    }

    // Exports
    this.readADC = readADC;

    d_timeoutToken = setInterval(function () {
        _read_se_adc(0, d_pgain, d_sps)
        .then(_read_se_adc(1, d_pgain, d_sps))
        .then(_read_se_adc(2, d_pgain, d_sps))
        .then(_read_se_adc(3, d_pgain, d_sps))
        .then(function() {
            // Do whatever
        })
        .catch(function() {});

    }, READ_TIMEOUT);
}

module.exports = ADS1015;