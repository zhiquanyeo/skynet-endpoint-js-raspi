var mqtt = require('mqtt');
var explorer_hat = require('./explorer-hat/explorer-hat');
var client = mqtt.connect('tcp://localhost', {
	clientId: 'skynet_ep_' + Math.random().toString(16).substr(2,5)
});

client.on('connect', function () {
	// Subscribe to the relevant topics
	client.subscribe('skynet/control/#');
	client.subscribe('skynet/clients/#');
});

client.on('message', function (topic, message) {

});

console.log(explorer_hat);

explorer_hat.touch().one.pressed(function(channel, evt) {
	console.log("hey! I got a touch on button ", channel);
});
