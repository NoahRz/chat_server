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

