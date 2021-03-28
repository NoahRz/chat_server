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
Start mongodb
```
mongod --dbpath ./data
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

