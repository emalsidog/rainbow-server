// Dependencies
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendMail = (options) => {

    const { to, subject, html } = options

	const msg = {
		to,
		from: process.env.SENDGRID_SENDER,
		subject,
		html
	};

	sgMail
		.send(msg)
		.then((data) => {
			console.log("Sent.");
		})
		.catch((error) => {
			console.error(error);
		});
};

module.exports = sendMail;