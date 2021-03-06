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
const websocket = require("./utils/websockets-functions");

// Models
const User = require("./models/User");
const Message = require("./models/Message");
const Chat = require("./models/Chat");

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
				: "https://rainbow-tm.herokuapp.com",
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

wss.on("connection", function connection(ws) {
	console.log("A client connected");

	if (id) {
		ws.id = id;

		ws.send(JSON.stringify({ type: "CONNECTED_USER_ID", id }));

		let onlineClientsIds = [];
		wss.clients.forEach((client) => {
			onlineClientsIds.push(client.id);
		});

		ws.send(JSON.stringify({ type: "ONLINE_CLIENTS", onlineClientsIds }));

		wss.clients.forEach((client) => {
			client.send(
				JSON.stringify({
					type: "ONLINE_STATUS",
					payload: {
						isOnline: true,
						id,
					},
				})
			);
		});
	}

	ws.on("message", async (data) => {
		const response = JSON.parse(data);

		switch (response.type) {
			case "GET_USER_ID":
				if (response.id) {
					return (ws.id = response.id);
				}
			case "PING": {
				return;
			}

			case "ADD_MESSAGE": {
				const { message, recipients } = response.payload;

				websocket.sendToRecipients(wss, recipients, {
					type: "ADD_MESSAGE",
					payload: message,
				});

				try {
					const chat = await Chat.findOne({ chatId: message.chatId });
					if (!chat) throw new Error("Error");

					const newMessage = new Message({
						...message,
						_id: message.messageId
					});

					chat.messages.push(newMessage._id);

					await chat.save();
					await newMessage.save();

					break;
				} catch (error) {
					throw error;
				}
			}

			case "DELETE_MESSAGE": {
				const { messageData, recipients } = response.payload;
				const { chatId, messagesToDelete } = messageData;

				websocket.sendToRecipients(wss, recipients, {
					type: "DELETE_MESSAGE",
					payload: messageData,
				});

				try {
					const chat = await Chat.findOne({ chatId });
					if (!chat) throw new Error("Can not find chat");

					chat.messages = chat.messages.filter((message) => !messagesToDelete.includes(message));

					await chat.save();
					await Message.deleteMany({
						messageId: { $in: messagesToDelete },
					});
				} catch (error) {
					throw error;
				}
				break;
			}

			case "EDIT_MESSAGE": {
				const { data, recipients } = response.payload;

				websocket.sendToRecipients(wss, recipients, {
					type: "EDIT_MESSAGE",
					payload: data,
				});

				try {
					const {
						meta,
						updatedMessageFields: { text, dateEdited },
					} = data;

					await Message.findOneAndUpdate(
						{ messageId: meta.messageId },
						{
							text,
							isEdited: true,
							timeEdited: dateEdited,
						}
					);
				} catch (error) {
					throw error;
				}

				break;
			}

			case "FORWARD_MESSAGE": {
				const { recipients, ...rest } = response.payload;

				websocket.sendToRecipients(wss, recipients, {
					type: "FORWARD_MESSAGE",
					payload: rest
				});

				try {

					if (rest.type === "SINGLE_FORWARDED") {
						const chat = await Chat.findOne({ chatId: rest.message.chatId });
						if (!chat) throw new Error("Error");

						const newMessage = new Message({
							...rest.message,
							repliedToMessage: rest.message.repliedToMessage.messageId,
							_id: rest.message.messageId,
						});

						chat.messages.push(newMessage._id);

						await chat.save();
						await newMessage.save();

						return;
					}

					if (rest.type === "MULTIPLE_FORWARDED") {
						const chat = await Chat.findOne({ chatId: rest.meta.chatId });
						if (!chat) throw new Error("Error");

						const mongoDocs = rest.messages.map((message) => new Message({ ...message, _id: message.messageId }));
						
						for (let doc of mongoDocs) {
							await doc.save();
						}

						const forwardedMessagesIds = rest.messages.map(({ messageId }) => messageId);

						chat.messages.push(...forwardedMessagesIds);
						await chat.save();

						return;
					}

					break;
				} catch (error) {
					throw error;
				}
			}

			case "CHANGE_CHAT_PROCESS": {
				const { process, chatId, whoInAction, chatParticipantsIds } =
					response.payload;

				return wss.clients.forEach((client) => {
					if (chatParticipantsIds.includes(client.id)) {
						client.send(
							JSON.stringify({
								type: "CHANGE_CHAT_PROCESS",
								payload: {
									processType: process,
									chatId,
									whoInAction,
								},
							})
						);
					}
				});
			}
		}
	});

	ws.on("close", async () => {
		const lastSeenOnline = new Date();

		wss.clients.forEach((client) => {
			client.send(
				JSON.stringify({
					type: "ONLINE_STATUS",
					payload: {
						isOnline: false,
						id: ws.id,
					},
				})
			);
		});
		id = undefined;

		await User.findByIdAndUpdate(ws.id, { lastSeenOnline });
	});
});

// Error handler
app.use(require("./middleware/error-handler"));

// Startup
server.listen(process.env.PORT, () => {
	console.log(
		`Server is listening on ${process.env.PORT} in ${process.env.NODE_ENV} mode`
	);
});
