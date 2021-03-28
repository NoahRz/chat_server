var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var i;

//Use chalk to add colours on the console
var chalk = require('chalk');


// set up mongo
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27020/";

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


/**
 * Historique des messages
 */
var messages = [];


io.on('connection', function (socket) {

  /**
   * Utilisateur connecté à la socket
   */
  var loggedUser;

  /**
  * Liste des utilisateurs connectés from redis
  */
  var loggedUsers = [];

  redisClient.smembers("loggedUsers", function (err, users) {
    loggedUsers = users;

    // Emission d'un événement "user-login" pour chaque utilisateur connecté
    for (i = 0; i < loggedUsers.length; i++) {
      socket.emit('user-login', loggedUsers[i]);
    }
  });

  /** 
   * Emission d'un événement "chat-message" pour chaque message de l'historique
   */

  for (i = 0; i < messages.length; i++) {
    if (messages[i].username !== undefined) {
      socket.emit('chat-message', messages[i]);
    } else {
      socket.emit('service-message', messages[i]);
    }
  }

  /**
 * Connexion d'un utilisateur via le formulaire :
 */
  socket.on('user-login', function (user, callback) {
    // Vérification que l'utilisateur n'existe pas
    var userIndex = -1;
    for (i = 0; i < loggedUsers.length; i++) {
      if (loggedUsers[i] === user) {
        userIndex = i;
      }
    }
    if (user !== undefined && userIndex === -1) { // S'il est bien nouveau
      // Sauvegarde de l'utilisateur et ajout à la liste des connectés
      loggedUser = user;

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
      io.emit('user-login', loggedUser);
      callback(true);
    } else {
      callback(false);
    }
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

      // Si jamais il était en train de saisir un texte, on l'enlève de la liste
      var typingUserIndex = typingUsers.indexOf(loggedUser);
      if (typingUserIndex !== -1) {
        typingUsers.splice(typingUserIndex, 1);
      }
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
  socket.on('load-previous-messages', function (user) {
    loadMsgFromMongo(user, socket);
  });


});

/**
 * Lancement du serveur en écoutant les connexions arrivant sur le port 3000
 */
http.listen(3000, function () {
  console.log('Server is listening on *:3000');
});

function storeMsgToMongo(message) {
  MongoClient.connect(url, function (err, client) {
    if (err) throw err;
    var db = client.db("chat_server");
    db.collection("messages").insertOne(message, function (err, res) {
      if (err) throw err;
      console.log("1 document inserted");
      client.close();
    });
  });
};

function storeUserConnectedToRedis(loggedUser) {
  redisClient.sadd("loggedUsers", loggedUser);
};

function removeUserConnectedFromRedis(loggedUser) {
  redisClient.srem("loggedUsers", loggedUser);
};

function loadMsgFromMongo(user, socket) {
  MongoClient.connect(url, function (err, client) {
    if (err) throw err;
    var db = client.db("chat_server");
    db.collection("messages").find({ $or: [{ from: user }, { to: user }] }).toArray(function (err, messages) { // vérifier l'ordre des messages (peut être envisagé de mettre une date)
      if (err) throw err;
      for (message in messages) {
        socket.emit('chat-message', messages[message]);
      }
      client.close();
    });
  });
}