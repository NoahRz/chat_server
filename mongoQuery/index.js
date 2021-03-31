// set up mongo
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27020/";
let db;
const dbName = "chat_server";

MongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
    if (err) throw err;
    console.log("Connected successfully to server");
    db = client.db(dbName);
});

function storeMsgToMongo(message) {
    db.collection("messages").insertOne(message, function (err, res) {
        if (err) throw err;
        console.log("1 document inserted");
    });
};

function loadMsgFromMongo(user1, user2, socket) {
    db.collection("messages").find({ $or: [{ from: user1, to: user2 }, { from: user2, to: user1 }] }).toArray(function (err, messages) { // vérifier l'ordre des messages (peut être envisagé de mettre une date)
        if (err) throw err;
        for (message in messages) {
            socket.emit('chat-message', messages[message]);
        }
    });
}

function loadUsersFromMongoToClient(socket) {
    console.log("loading users");
    db.collection("users").find().toArray(function (err, users) {
        if (err) throw err;
        for (user in users) {
            socket.emit('load-user', users[user].username);
        }
    });
}

function insertNewUserToMongo(user) {
    db.collection("users").findOne(user, function (err, existing_user) {
        if (err) throw err;
        if (!existing_user) {
            db.collection("users").insertOne(user, (err, res) => {
                if (err) throw err;
                console.log("1 document inserted");
            })
        }
    })
}

function isUserRegistered(user, callback) {
    db.collection("users").find({ username: user.username }).toArray((err, users) => { //findOne pour accélérer le process ?
        if (err) throw err;
        callback(users.length > 0);
    });
}

exports.storeMsgToMongo = storeMsgToMongo;
exports.loadMsgFromMongo = loadMsgFromMongo;
exports.loadUsersFromMongoToClient = loadUsersFromMongoToClient;
exports.insertNewUserToMongo = insertNewUserToMongo;
exports.isUserRegistered = isUserRegistered;
