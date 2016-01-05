var mqtt = require('mqtt');
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