# chat_server

Based on https://github.com/BenjaminBini/socket.io-chat.git

## Technologies
* NodeJS (for the server)
* MongoDB (to store the messages)
* Redis (to store the connected users)
* Socket.io (for the real time messaging)

## Install the packages
```
npm install
```

## To run the app

⚠️ Prerequisite : you would have to configure the replicaSets

Start mongodb and replicaSets
```
mongod --replSet rs0 --port 27020 --dbpath ./data/r0s1
```
```
mongod --replSet rs0 --port 27021 --dbpath ./data/r0s2
```
```
mongod --replSet rs0 --port 27022 --dbpath ./data/r0s3
```

Start the arbiter
```
mongod --port 30000 --dbpath ./data/arb --replSet rs0
```

start redis server
```
cd redis-x.x.xx/          (complete with your version of redis)
src/redis-server
```

start the chat server
```
node server.js
```

Go to localhost:3000

## Users instructions

### Sign in
First you have to sign in using a unique username. 

**NB**:
* You cannot sign in if you are already signed in with another session.

### Send messages
* (1) Select the user you want to send the message to (his/her name will turn blue).
* (2) Write the message. 
* (3) Press Enter or click the Send Button.

**NB**:
* You cannot send a message to yourself.
* You cannot send a message to no one. 

### View previous messages
Just click on the user you had a discussion with, the previous messages should be displayed.

## Sign out
To properly sign out, just refresh the page. Then you can close the page.



## MongoDB collections

```js
Users : {
	"username" : string (unique),
	"nbLogged" : int
}
```

```js
messages : {
	"text" : string,
	"to" : string,
	"from" : string
}
```

```js
connections : {
	"user" : string,
	"loginDate" : Date,
	"logoutDate" : Date
}
```

## Interesting Queries

**Users who receive the highest number of messages**
```js
>> IN
db.messages.aggregate({$group:{_id: "$to", nb_msg_received : {$sum: 1}}}, {$sort:{nb_msg_received:-1}})

>> OUT
{ "_id" : "bob", "nb_msg_received" : 10 }
{ "_id" : "noah", "nb_msg_received" : 5 }
{ "_id" : "george", "nb_msg_received" : 5 }
{ "_id" : "jason", "nb_msg_received" : 3 }

```
**Users who send the highest number of messages**
```js
>> IN
db.messages.aggregate({$group:{_id: "$from", nb_msg_sent : {$sum: 1}}}, {$sort:{nb_msg_sent:-1}})

>> OUT
{ "_id" : "noah", "nb_msg_sent" : 7 }
{ "_id" : "jason", "nb_msg_sent" : 7 }
{ "_id" : "bob", "nb_msg_sent" : 5 }
{ "_id" : "george", "nb_msg_sent" : 4 }
```
**Users who have the highest number of log-in**
```js
>> IN
db.users.find().sort({"nbLogged":-1})

>> OUT
{ "_id" : ObjectId("606f3f4799757a071b20338f"), "username" : "noah", "nbLogged" : 2 }
{ "_id" : ObjectId("606f3f4e99757a071b203391"), "username" : "bob", "nbLogged" : 1 }
{ "_id" : ObjectId("606f3f6499757a071b203393"), "username" : "jason", "nbLogged" : 1 }
{ "_id" : ObjectId("606f3f8599757a071b203395"), "username" : "george", "nbLogged" : 1 }
```
**Users who have the lowest number of log-in**
```js
>> IN
db.users.find().sort({"nbLogged":1})

>> OUT
{ "_id" : ObjectId("606f3f4e99757a071b203391"), "username" : "bob", "nbLogged" : 1 }
{ "_id" : ObjectId("606f3f6499757a071b203393"), "username" : "jason", "nbLogged" : 1 }
{ "_id" : ObjectId("606f3f8599757a071b203395"), "username" : "george", "nbLogged" : 1 }
{ "_id" : ObjectId("606f3f4799757a071b20338f"), "username" : "noah", "nbLogged" : 2 }
```
**Number of registered users**
```js
>> IN
db.users.count()

>> OUT
4
```
**Users who speak the most to different people** (in other words : **most active users**)
```js
>> IN
db.messages.aggregate({$group:{_id: {from:"$from", to:"$to"}}}, {$group:{_id: "$_id.from", nb_dinstinct_receiver :  {$sum:1}}}, {$sort:{nb_dinstinct_receiver: -1}})

>> OUT
{ "_id" : "jason", "nb_dinstinct_receiver" : 3 }
{ "_id" : "bob", "nb_dinstinct_receiver" : 3 }
{ "_id" : "noah", "nb_dinstinct_receiver" : 2 }
{ "_id" : "george", "nb_dinstinct_receiver" : 2 }
```
**Users who are spoken the most from different people** (in other words : **most requested users**)
```js
>> IN
db.messages.aggregate({$group:{_id: {to:"$to", from:"$from"}}}, {$group:{_id: "$_id.to", nb_dinstinct_sender :  {$sum:1}}}, {$sort:{nb_dinstinct_sender:-1}})

>> OUT
{ "_id" : "noah", "nb_dinstinct_sender" : 3 }
{ "_id" : "bob", "nb_dinstinct_sender" : 3 }
{ "_id" : "jason", "nb_dinstinct_sender" : 2 }
{ "_id" : "george", "nb_dinstinct_sender" : 2 }
```
**Times (in hour) when people are most active**
```js
>> IN
db.connections.aggregate({$project : {hour : {$hour :"$loginDate"}}}, {$group:{_id:{hour:"$hour", count: {$sum:1}}}}, {$sort:{count:-1}})

>> OUT
{ "_id" : { "hour" : 17, "count" : 1 } }
{ "_id" : { "hour" : 19, "count" : 1 } }
```
⚠️ Beware of Timezone (here it is UTC)


**Map reduce : Word count in messages**
```js
>> IN
var mapFunction = function() {
    var englishStopWords = ["i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours", "yourself", "yourselves", "he", "him", "his", "himself", "she", "her", "hers", "herself", "it", "its", "itself", "they", "them", "their", "theirs", "themselves", "what", "which", "who", "whom", "this", "that", "these", "those", "am", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "having", "do", "does", "did", "doing", "a", "an", "the", "and", "but", "if", "or", "because", "as", "until", "while", "of", "at", "by", "for", "with", "about", "against", "between", "into", "through", "during", "before", "after", "above", "below", "to", "from", "up", "down", "in", "out", "on", "off", "over", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s", "t", "can", "will", "just", "don", "should", "now"]
    var text = this.text;
    if (text){
        text = text.replace(/[.,\/#?!$%\^&\*;:{}<=>\-_`~()]/g,"");
        text = text.toLowerCase().split(" ");
        for (var i = 0; i<text.length; i++){
            if(text[i] && !englishStopWords.includes(text[i])){
                emit(text[i], 1);
            }
        }
    }
}

var reduceFunction = function(keyWords, numbers){
    return Array.sum(numbers);
}

db.messages.mapReduce(mapFunction, reduceFunction, {out: "word_count_in_messages"});

db.word_count_in_messages.find().sort({value:-1});

>> OUT
{ "_id" : "hey", "value" : 5 }
{ "_id" : "great", "value" : 3 }
{ "_id" : "problem", "value" : 2 }
{ "_id" : "yes", "value" : 2 }
{ "_id" : "bob", "value" : 2 }
{ "_id" : "hello", "value" : 2 }
{ "_id" : "marvel", "value" : 1 }
{ "_id" : "thank", "value" : 1 }
{ "_id" : "waiting", "value" : 1 }
{ "_id" : "tonight", "value" : 1 }
{ "_id" : "snacks", "value" : 1 }
{ "_id" : "friend", "value" : 1 }
{ "_id" : "sometime", "value" : 1 }
{ "_id" : "bring", "value" : 1 }
{ "_id" : "give", "value" : 1 }
{ "_id" : "homework", "value" : 1 }
{ "_id" : "tomorrow", "value" : 1 }
{ "_id" : "good", "value" : 1 }
{ "_id" : "watched", "value" : 1 }
{ "_id" : "still", "value" : 1 }
[...]
```

**Map reduce : Periods when users are most active**

```js
>> IN
var mapFunction = function() {
    var loginHour = this.loginDate.getHours();
    var logoutHour = this.logoutDate.getHours() + 1;
    for (var i=loginHour; i < logoutHour; i++){
        var period = `${i}h - ${i+1}h`;
        emit(period, 1);
    }
}

var reduceFunction = function(periods, numbers) {
    return Array.sum(numbers);
}

db.connections.mapReduce(mapFunction, reduceFunction, {out: "Most_active_periods"});

db.Most_active_periods.find().sort({value:-1})

>> OUT
{ "_id" : "19h - 20h", "value" : 4 }
{ "_id" : "21h - 22h", "value" : 3 }
{ "_id" : "20h - 21h", "value" : 3 }

```
⚠️ Beware of Timezone (here it is my local Timezone -> UTC +2)
