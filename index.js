require("dotenv").config({ path: __dirname + "/config/.env" });

// Dependenices
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const WebSocket = require("ws");
const http = require("http");
const jwt = require("jsonwebtoken");

// Utils
const ErrorResponse = require("./utils/error-response");

// Configuring server
const app = express();
const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

// Connect MongoDB
require("./config/db-connect")();

// Sockets
app.use((req, res, next) => {
	req.wss = wss;
	next();
});

// CORS policy
app.use(
	cors({
		credentials: true,
		origin:
			process.env.NODE_ENV === "development"
				? "http://localhost:3000"
				: "https://rainbow-client.herokuapp.com",
	})
);

// Static files
app.use(express.static("public"));

// Body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// Routes
require("./routes")(app);

// Socket configuration
let id;

app.use((req, res, next) => {
	let accessToken;
	let refreshToken;

	if (!req.cookies.accessToken && !req.cookies.refreshToken) {
		accessToken = res.locals.accessToken;
		refreshToken = res.locals.refreshToken;
	} else {
		accessToken = req.cookies.accessToken;
		refreshToken = req.cookies.refreshToken;
	}

	try {
		id = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET).userId;
	} catch (error) {
		if (error instanceof jwt.TokenExpiredError) {
			try {
				id = jwt.verify(
					refreshToken,
					process.env.REFRESH_TOKEN_SECRET
				).userId;
			} catch (error) {
				return next(new ErrorResponse("Your session has expired", 400));
			}
		} else {
			return next(error);
		}
	}
	next();
});

const noop = () => {};

const heartbeat = () => {
	this.isAlive = true;
};

const interval = setInterval(function ping() {
	wss.clients.forEach(function each(ws) {
		if (ws.isAlive === false) return ws.terminate();

		ws.isAlive = false;
		ws.ping(noop);
	});
}, 30000);

wss.on("connection", function connection(ws) {
	console.log("A client connected");

	if (id) {
		ws.id = id;

		ws.isAlive = true;

		ws.send(
			JSON.stringify({
				type: "CONNECTED_USER_ID",
				id,
			})
		);
	}

	ws.on("pong", heartbeat);

	ws.on("message", (data) => {
		const response = JSON.parse(data);

		switch (response.type) {
			case "GET_USER_ID":
				if (response.id) {
					ws.isAlive = true;
					return (ws.id = response.id);
				}
		}
	});

	ws.on("close", () => {
		console.log("A client disconnected");
		id = undefined;
	});
});

wss.on("close", () => {
    clearInterval(interval);
});

// Error handler
app.use(require("./middleware/error-handler"));

// Startup
server.listen(process.env.PORT, () => {
	console.log(
		`Server is listening on ${process.env.PORT} in ${process.env.NODE_ENV} mode`
	);
});
