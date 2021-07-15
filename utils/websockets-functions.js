exports.sendToRecipients = (wss, recipients, json) => {
	wss.clients.forEach((client) => {
		if (recipients.includes(client.id)) {
			client.send(JSON.stringify(json));
		}
	});
};
