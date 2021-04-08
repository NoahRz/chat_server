/*global io*/
/*jslint browser: true*/
var socket = io();
var i;

var userLogged;
var userSelected;

/*** Useful functions ***/

/**
 * Scroll down the page if the user has not moved up to read old messages
 */
function scrollToBottom() {
  if ($(window).scrollTop() + $(window).height() + 2 * $('#messages li').last().outerHeight() >= $(document).height()) {
    $('html, body').animate({ scrollTop: $(document).height() }, 0);
  }
}

/*** Event management ***/

/**
 * User login
 * Only if the username is not empty and the user is not already logged in
 */
$('#login form').submit(function (e) {
  e.preventDefault();
  var user = {
    username: $('#login input').val().trim()
  };
  if (user.username.length > 0) { // If the login field is not empty
    // we register the user in the list if it is not registered
    login(socket, user);
  }
});

/**
 * Sending a message
 */
$('#chat form').submit(function (e) {
  e.preventDefault();
  var message = {
    text: $('#m').val(),
    to: userSelected
  };
  $('#m').val('');
  if (message.text.trim().length !== 0 && message.to != null) { // Empty message management
    socket.emit('chat-message', message);
  }
  $('#chat input').focus(); // Focus on the message field
});

/**
 * Receiving a message
 */
socket.on('chat-message', function (message) {
  if (message.from == userSelected || message.to == userSelected) {
    $('#messages').append($('<li class="message">').html('<span class="username">' + message.from + '</span> ' + message.text));
  }
  scrollToBottom();
});

/**
 * Receiving a service message
 */
socket.on('service-message', function (message) {
  $('#messages').append($('<li class="' + message.type + '">').html('<span class="info">information</span> ' + message.text));
  scrollToBottom();
});

socket.on('load-user', function (user) {
  $('#users').append($('<li id="' + user + '" class="loggedOut">' + user + '</li>'))
  $('#' + user).click(function () {
    if (userLogged != user) {
      userSelected = user;
      $(".active").removeClass("active");
      $(this).addClass("active");
      var selector = 'li.message'; // remove messages
      $(selector).remove();
      socket.emit('load-previous-messages', userLogged, userSelected);
    }
  })
});

/**
 * Logging in of a new user
 */
socket.on('user-is-logged-in', function (user) {
  $('#' + user).removeClass("loggedOut");
  $('#' + user).addClass('new');
  setTimeout(function () {
    $('#users li.new').removeClass('new');
  }, 1000);
});

/**
 * Logging out of a user
 */
socket.on('user-is-logged-out', function (user) {
  var selector = '#' + user;
  $(selector).addClass('loggedOut');
});

socket.on('remove-current-users-list', function () {
  const selector = '#users li';
  $(selector).remove();
})


function signUpUser(socket, user, callback) {
  socket.emit('user-signup', user, callback);
}

function signInUser(socket, user) {
  socket.emit('user-login', user, function (success) {
    if (success) {
      userLogged = user.username;
      $('body').removeAttr('id'); // hide login form
      $('#chat input').focus(); // Focus message field
    }
  });
}

const login = async (socket, user) => {
  const result = await signUpUser(socket, user, function (res) {
    console.log(res, "login")
    signInUser(socket, user);
  });
}