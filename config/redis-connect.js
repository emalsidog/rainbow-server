// Dependenices
const redis = require('redis').createClient(6379, 'localhost');
const { promisify } = require("util");

// Promisify redis methods
const getAsync = promisify(redis.get).bind(redis);

redis.on("connect", () => {
    console.log("Connected to Redis")
});

module.exports = { redis, getAsync };
