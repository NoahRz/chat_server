const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

//Use chalk to add colours on the console
const chalk = require('chalk');


const redisQuery = require('./redisQuery/index.js');
const mongoQuery = require('./mongoQuery/index.js');
const mongoRedisQuery = require('./mongoRedisQuery/index.js');

/**
 * Management of users' HTTP requests by returning files from the 'public' folder
 */
app.use('/', express.static(__dirname + '/public'));


io.on('connection', function (socket) {

  /**
   * User connected to the socket
   */
  var loggedUser;


  /**
   * User registration in mongo
   */
  socket.on('user-signup', function (user, callback) {
    mongoQuery.insertNewUserToMongo(user, function (res) {
      callback(res);
    })
  });

  /**
  * Connection of a user via the form:
  */
  socket.on('user-login', function (user, callback) {


    // Checking that the user is not already logged in

    let isUserLoggedIn;

    redisQuery.userAlreadyLoggedIn(user.username, function (isAlreadyLoggedIn) {
      isUserLoggedIn = isAlreadyLoggedIn;
    });

    mongoQuery.isUserRegistered(user, function (userRegistered) {
      if (user.username !== undefined && !isUserLoggedIn && userRegistered) { // S'il est bien nouveau

        // Save the user and add to the connected list
        loggedUser = user.username;

        // Saving the logged in user in redis
        redisQuery.storeUserConnectedToRedis(loggedUser);

        mongoRedisQuery.refreshUsersList(io);

        socket.join(loggedUser);

        // Sending service messages
        sendServiceMessage(socket, loggedUser, 'login');
        sendServiceMessage(socket, loggedUser, 'login', broadcast = true);

        // Issue of 'user-login' and callback call
        io.emit('user-login', loggedUser);

        mongoQuery.increaseNbLogged(loggedUser);
        mongoQuery.writeConnectionToMongo(loggedUser);

        callback(true);
      } else {
        callback(false);
      }
    })
  });

  /**
   * Logging out of a user
   */
  socket.on('disconnect', function () {
    if (loggedUser !== undefined) {
      // Broadcast of a 'service-message'
      sendServiceMessage(socket, loggedUser, 'logout', broadcast = true);

      // Removing the user from Redis
      redisQuery.removeUserConnectedFromRedis(loggedUser);

      // Issue of a 'user-logout' containing the user
      io.emit('user-is-logged-out', loggedUser);

      mongoQuery.writeDeconnectionToMongo(loggedUser);
    }
  });

  /**
   * Reception of the 'chat-message' event and re-transmission to all users
   */
  socket.on('chat-message', function (message) {

    //We add the username to the message and we send the event
    message.from = loggedUser;

    mongoQuery.storeMsgToMongo(message);

    io.to(message.to).to(message.from).emit('chat-message', message);
  });

  /**
   * load previous messages of user
   */
  socket.on('load-previous-messages', function (user1, user2) {
    mongoQuery.loadMsgFromMongo(user1, user2, socket);
  });
});

/**
 * Starting the server by listening for connections arriving on port 3000
 */
http.listen(3000, function () {
  console.log('Server is listening on *:3000');
});



function sendServiceMessage(socket, loggedUser, type, broadcast = false) {
  if (broadcast) {
    if (type == 'login') {
      var broadcastedServiceMessage = {
        text: 'User "' + loggedUser + '" logged in',
        type: type
      };
      socket.broadcast.emit('service-message', broadcastedServiceMessage);
    }
    if (type == 'logout') {
      var serviceMessage = {
        text: 'User "' + loggedUser + '" is logged out',
        type: type
      };
      socket.broadcast.emit('service-message', serviceMessage);
    }

  }
  else {
    var userServiceMessage = {
      text: 'You logged in as "' + loggedUser + '"',
      type: type
    };
    socket.emit('service-message', userServiceMessage);
  }
}