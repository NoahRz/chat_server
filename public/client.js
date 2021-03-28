/*global io*/
/*jslint browser: true*/
var socket = io();
var i;

var userLogged;
var userSelected;

/*** Fonctions utiles ***/

/**
 * Scroll vers le bas de page si l'utilisateur n'est pas remonté pour lire d'anciens messages
 */
function scrollToBottom() {
  if ($(window).scrollTop() + $(window).height() + 2 * $('#messages li').last().outerHeight() >= $(document).height()) {
    $('html, body').animate({ scrollTop: $(document).height() }, 0);
  }
}

/*** Gestion des événements ***/

/**
 * Connexion de l'utilisateur
 * Uniquement si le username n'est pas vide et n'existe pas encore
 */
$('#login form').submit(function (e) {
  e.preventDefault();
  var user = $('#login input').val().trim();
  if (user.length > 0) { // Si le champ de connexion n'est pas vide
    userLogged = user;
    socket.emit('user-login', user, function (success) {
      if (success) {
        $('body').removeAttr('id'); // Cache formulaire de connexion
        $('#chat input').focus(); // Focus sur le champ du message
      }
    });
  }
});

/**
 * Envoi d'un message
 */
$('#chat form').submit(function (e) {
  e.preventDefault();
  var message = {
    text: $('#m').val(),
    to: userSelected
  };
  $('#m').val('');
  if (message.text.trim().length !== 0 && message.to != null) { // Gestion message vide
    socket.emit('chat-message', message);
  }
  $('#chat input').focus(); // Focus sur le champ du message
});

/**
 * Réception d'un message
 */
socket.on('chat-message', function (message) {
  $('#messages').append($('<li class="message">').html('<span class="username">' + message.from + '</span> ' + message.text));
  scrollToBottom();
});

/**
 * Réception d'un message de service
 */
socket.on('service-message', function (message) {
  $('#messages').append($('<li class="' + message.type + '">').html('<span class="info">information</span> ' + message.text));
  scrollToBottom();
});

/**
 * Connexion d'un nouvel utilisateur
 */
socket.on('user-login', function (user) {
  $('#users').append($('<li class="' + user + ' new">').click(function () {
    if (userLogged != user) {
      console.log("hello3");
      userSelected = user;
      $(".active").removeClass("active");
      $(this).addClass("active");
      var selector = 'li.message'; // enlève les messages présents
      $(selector).remove();
      socket.emit('load-previous-messages', userLogged, userSelected);
    }
  }).html(user + '<span class="typing">typing</span>'))
  setTimeout(function () {
    $('#users li.new').removeClass('new');
  }, 1000);
});

/**
 * Déconnexion d'un utilisateur
 */
socket.on('user-logout', function (user) {
  var selector = '#users li.' + user;
  $(selector).remove();
});