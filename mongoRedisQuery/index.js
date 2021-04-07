// set up mongo
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27020,localhost:27021,localhost:27022/?replicaSet=rs0";
let db;
const dbName = "chat_server";

MongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
    if (err) throw err;
    db = client.db(dbName);
});

//redis
const redis = require("redis");
const redisClient = redis.createClient();

redisClient.on("error", function (error) {
    console.error(error);
});

const refreshUsersList = (socket) => {
    socket.emit('remove-current-users-list');
    db.collection("users").find().toArray(function (err, users) {
        if (err) throw err;
        redisClient.smembers("loggedUsers", function (err, usersConnected) {
            for (user in users) {
                socket.emit('load-user', users[user].username);
                if (usersConnected.includes(users[user].username)) {
                    socket.emit('user-is-logged-in', users[user].username);
                }
            }
        });
    });

}

exports.refreshUsersList = refreshUsersList;