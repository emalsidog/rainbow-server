// Dependencies
const mongoose = require("mongoose");

const dbConnect = async () => {
	try {
		await mongoose.connect(process.env.MONGOOSE_URI, {
			useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true,
			useFindAndModify: false
		});
		console.log("Successfully connected to the database.");
	} catch (error) {
		console.log(error);
	}
};

module.exports = dbConnect;