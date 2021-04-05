//redis
const redis = require("redis");
const redisClient = redis.createClient();

redisClient.on("error", function (error) {
    console.error(error);
});

var i;

function storeUserConnectedToRedis(loggedUser) {
    redisClient.sadd("loggedUsers", loggedUser);
};

function removeUserConnectedFromRedis(loggedUser) {
    redisClient.srem("loggedUsers", loggedUser);
};

function userAlreadyLoggedIn(username, callback) {
    console.log("username :", username);
    redisClient.smembers("loggedUsers", function (err, usersConnected) {
        for (i = 0; i < usersConnected.length; i++) {
            console.log(usersConnected[i], username);
            if (usersConnected[i] === username) {
                callback(true);
                return true;
            }
        }
        callback(false);
        return false;
    })
}

function loadUserConnectedFromRedisToClient(socket) {
    redisClient.smembers("loggedUsers", function (err, usersConnected) {
        for (i = 0; i < usersConnected.length; i++) {
            socket.emit('user-login', usersConnected[i]);
        }
    });
}

exports.storeUserConnectedToRedis = storeUserConnectedToRedis;
exports.removeUserConnectedFromRedis = removeUserConnectedFromRedis;
exports.userAlreadyLoggedIn = userAlreadyLoggedIn;
exports.loadUserConnectedFromRedisToClient = loadUserConnectedFromRedisToClient;