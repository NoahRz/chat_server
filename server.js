var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var i;

//Use chalk to add colours on the console
var chalk = require('chalk');

/**
 * Gestion des requêtes HTTP des utilisateurs en leur renvoyant les fichiers du dossier 'public'
 */
app.use('/', express.static(__dirname + '/public'));

/**
 * Liste des utilisateurs connectés
 */
var users = [];

/**
 * Historique des messages
 */
var messages = [];

/**
 * Liste des utilisateurs en train de saisir un message
 */
var typingUsers = [];

// set up mongo
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27020/";

//redis
const redis = require("redis");
const redisClient = redis.createClient();

redisClient.on("error", function (error) {
  console.error(error);
});


io.on('connection', function (socket) {

  /**
   * Utilisateur connecté à la socket
   */
  var loggedUser;

  /**
   * Emission d'un événement "user-login" pour chaque utilisateur connecté
   */
  for (i = 0; i < users.length; i++) {
    socket.emit('user-login', users[i]);
  }

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
   * Déconnexion d'un utilisateur
   */
  socket.on('disconnect', function () {
    if (loggedUser !== undefined) {
      // Broadcast d'un 'service-message'
      var serviceMessage = {
        text: 'User "' + loggedUser.username + '" disconnected',
        type: 'logout'
      };
      socket.broadcast.emit('service-message', serviceMessage);
      // Suppression de la liste des connectés
      var userIndex = users.indexOf(loggedUser);
      if (userIndex !== -1) {
        users.splice(userIndex, 1);
      }

      // Suppresion de l'utilisateur de Redis
      removeUserConnectedFromRedis(loggedUser);

      // Ajout du message à l'historique
      messages.push(serviceMessage);
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
   * Connexion d'un utilisateur via le formulaire :
   */
  socket.on('user-login', function (user, callback) {
    // Vérification que l'utilisateur n'existe pas
    var userIndex = -1;
    for (i = 0; i < users.length; i++) {
      if (users[i].username === user.username) {
        userIndex = i;
      }
    }
    if (user !== undefined && userIndex === -1) { // S'il est bien nouveau
      // Sauvegarde de l'utilisateur et ajout à la liste des connectés
      loggedUser = user;
      users.push(loggedUser);

      // sauvegarde du user connecte dans redis
      storeUserConnectedToRedis(loggedUser);

      // Envoi et sauvegarde des messages de service
      var userServiceMessage = {
        text: 'You logged in as "' + loggedUser.username + '"',
        type: 'login'
      };
      var broadcastedServiceMessage = {
        text: 'User "' + loggedUser.username + '" logged in',
        type: 'login'
      };
      socket.emit('service-message', userServiceMessage);
      socket.broadcast.emit('service-message', broadcastedServiceMessage);
      messages.push(broadcastedServiceMessage);
      // Emission de 'user-login' et appel du callback
      io.emit('user-login', loggedUser);
      callback(true);
    } else {
      callback(false);
    }
  });

  /**
   * Réception de l'événement 'chat-message' et réémission vers tous les utilisateurs
   */
  socket.on('chat-message', function (message) {
    // On ajoute le username au message et on émet l'événement
    message.username = loggedUser.username;

    // stocke le message dans mongodb
    storeMsgToMongo(message);

    io.emit('chat-message', message);


  });

  /**
   * Réception de l'événement 'start-typing'
   * L'utilisateur commence à saisir son message
   */
  socket.on('start-typing', function () {
    // Ajout du user à la liste des utilisateurs en cours de saisie
    if (typingUsers.indexOf(loggedUser) === -1) {
      typingUsers.push(loggedUser);
    }
    io.emit('update-typing', typingUsers);
  });

  /**
   * Réception de l'événement 'stop-typing'
   * L'utilisateur a arrêter de saisir son message
   */
  socket.on('stop-typing', function () {
    var typingUserIndex = typingUsers.indexOf(loggedUser);
    if (typingUserIndex !== -1) {
      typingUsers.splice(typingUserIndex, 1);
    }
    io.emit('update-typing', typingUsers);
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
  redisClient.sadd("loggedUsers", loggedUser.username);
};

function removeUserConnectedFromRedis(loggedUser) {
  redisClient.srem("loggedUsers", loggedUser.username);
};