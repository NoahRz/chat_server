var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var i;


// set up mongo
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27020/";
let db;
const dbName = "chat_server";

MongoClient.connect(url, function (err, client) {
  if (err) throw err;
  console.log("Connected successfully to server");
  db = client.db(dbName);
});


//Use chalk to add colours on the console
var chalk = require('chalk');

//redis
const redis = require("redis");
const redisClient = redis.createClient();

redisClient.on("error", function (error) {
  console.error(error);
});

/**
 * Gestion des requêtes HTTP des utilisateurs en leur renvoyant les fichiers du dossier 'public'
 */
app.use('/', express.static(__dirname + '/public'));


io.on('connection', function (socket) {

  /**
   * Utilisateur connecté à la socket
   */
  var loggedUser;

  loadUsersFromMongoToClient(socket);

  loadUserConnectedFromRedisToClient(socket);

  /**
   * Inscription de l'utilisateur dans mongo
   */
  socket.on('user-signup', function (user) {
    insertNewUserToMongo(user);
  });

  /**
  * Connexion d'un utilisateur via le formulaire :
  */
  socket.on('user-login', function (user, callback) {
    // Vérification que l'utilisateur n'est pas déjà connecté
    isUserLoggedIn = userAlreadyLoggedIn(user.username);

    isUserRegistered(user, function (userRegistered) {
      if (user.username !== undefined && !isUserLoggedIn && userRegistered) { // S'il est bien nouveau

        // Sauvegarde de l'utilisateur et ajout à la liste des connectés
        loggedUser = user.username;

        // sauvegarde du user connecte dans redis
        storeUserConnectedToRedis(loggedUser);

        socket.join(loggedUser);

        // Envoi et sauvegarde des messages de service
        var userServiceMessage = {
          text: 'You logged in as "' + loggedUser + '"',
          type: 'login'
        };
        var broadcastedServiceMessage = {
          text: 'User "' + loggedUser + '" logged in',
          type: 'login'
        };
        socket.emit('service-message', userServiceMessage);
        socket.broadcast.emit('service-message', broadcastedServiceMessage);

        // Emission de 'user-login' et appel du callback
        console.log("loggedUsers", loggedUser);
        io.emit('user-login', loggedUser);
        callback(true);
      } else {
        callback(false);
      }
    })
  });

  /**
   * Déconnexion d'un utilisateur
   */
  socket.on('disconnect', function () {
    if (loggedUser !== undefined) {
      // Broadcast d'un 'service-message'
      var serviceMessage = {
        text: 'User "' + loggedUser + '" disconnected',
        type: 'logout'
      };
      socket.broadcast.emit('service-message', serviceMessage);

      // Suppresion de l'utilisateur de Redis
      removeUserConnectedFromRedis(loggedUser);


      // Emission d'un 'user-logout' contenant le user
      io.emit('user-logout', loggedUser);
    }
  });
  /**
   * Réception de l'événement 'chat-message' et réémission vers tous les utilisateurs
   */
  socket.on('chat-message', function (message) {
    // On ajoute le username au message et on émet l'événement
    message.from = loggedUser;

    // stocke le message dans mongodb
    storeMsgToMongo(message);

    io.to(message.to).to(message.from).emit('chat-message', message);
    //io.emit('chat-message', message);
  });

  /**
   * load previous messages of user
   */
  socket.on('load-previous-messages', function (user1, user2) {
    loadMsgFromMongo(user1, user2, socket);
  });
});

/**
 * Lancement du serveur en écoutant les connexions arrivant sur le port 3000
 */
http.listen(3000, function () {
  console.log('Server is listening on *:3000');
});

function storeMsgToMongo(message) {
  db.collection("messages").insertOne(message, function (err, res) {
    if (err) throw err;
    console.log("1 document inserted");
  });
};

function storeUserConnectedToRedis(loggedUser) {
  redisClient.sadd("loggedUsers", loggedUser);
};

function removeUserConnectedFromRedis(loggedUser) {
  redisClient.srem("loggedUsers", loggedUser);
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
  // vérifie qu'il n'est pas déjà inscrit
  db.collection("users").findOne(user, function (err, existing_user) {
    if (err) throw err;
    if (!existing_user) {
      db.collection("users").insertOne(user, (err, res) => {
        if (err) throw err;
        console.log("1 document inserted");
      })
      // il faut refraichir la liste

    }
  })
}

function isUserRegistered(user, callback) {
  db.collection("users").find({ username: user.username }).toArray((err, users) => { //findOne pour accélérer le process ?
    if (err) throw err;
    callback(users.length > 0);
  });
}

function userAlreadyLoggedIn(username) {
  redisClient.smembers("loggedUsers", function (err, usersConnected) {
    for (i = 0; i < usersConnected.length; i++) {
      if (usersConnected[i] === username) {
        return true
      }
    }
    return false
  })
}

function loadUserConnectedFromRedisToClient(socket) {
  redisClient.smembers("loggedUsers", function (err, usersConnected) {
    for (i = 0; i < usersConnected.length; i++) {
      socket.emit('user-login', usersConnected[i].username);
    }
  });
}