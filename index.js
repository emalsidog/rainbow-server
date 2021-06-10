require("dotenv").config({ path: __dirname + "/config/.env" });

// Dependenices
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const WebSocket = require("ws");
const http = require("http");
const jwt = require("jsonwebtoken");
const ErrorResponse = require("./utils/error-response");

// Configuring server
const app = express();
const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

// Connect db
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
		origin: "http://localhost:3000",
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
                id = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET).userId;
            } catch (error) {
                return next(new ErrorResponse("Your session has expired", 400));
            }
        } else {
            return next(error);
        }
    }
    next();
});

wss.on("connection", function connection(ws) {
    console.log("A client connected");
    ws.id = id;
    wss.clients.forEach(client => {
        console.log({ id: client.id });
    });
    ws.on("close", () => {
        console.log("A client disconnected");
    });
});

// Error handler
app.use(require("./middleware/error-handler"));

// Startup
const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
    console.log(`Server is listening on ${PORT}`);
});