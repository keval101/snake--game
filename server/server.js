const express = require('express');
const app = express();
const http = require('http');
const { gameLoop, getUpdateVelocity, initGame } = require('./game');
const { FRAME_RATE } = require('./constants');
const { makeid } = require("./utils");
const { getUnpackedSettings } = require('http2');
const httpServer =  http.Server(app);

const state = {};
const clientRooms = {}; //global

const io = require('socket.io')(httpServer);

io.on( 'connection' , client => {

    client.on('keydown', handleKeydown);
    client.on('newGame', handlNewGame);
    client.on('joinGame', handlJoinGame);

    function handlJoinGame(roomName){
        const room = io.sockets.adapter.rooms[roomName];

        
        let allUsers;
        if(room){
            allUsers = room.sockets;
        }

        let numClients = 0;
        if(allUsers){
            numClients = Object.keys(allUsers).length;
        }

        if(numClients === 0){
            client.emit('unknownGame');
            return;
        }else if(numClients > 1){
            client.emit('tooManyPlayers');
            return;
        }

        clientRooms[client.id] = roomName;
        client.join(roomName);
        client.number = 2;
        client.emit('init', 2);

        startGameInterval(roomName);
    }


    function handlNewGame(){
        let roomName = makeid(5);
        clientRooms[client.id] = roomName;
        client.emit('gameCode', roomName);

        state[roomName] = initGame();

        client.join(roomName);
        client.number = 1;
        client.emit('init', 1);
    }

    function handleKeydown(keyCode){

        const roomName  = clientRooms[client.id];

        if(!roomName){
            return;
        }
        try{
            keyCode = parseInt(keyCode);
        }catch(e){
            console.error(e);
            return;
        };

        const vel = getUpdateVelocity(keyCode);
        if(vel){
            state[roomName].players[client.number - 1].vel = vel;
            
        };
    };

});

function startGameInterval(roomName){
    const intervalId = setInterval(() =>{
        const winner = gameLoop(state[roomName]);
        

        if(!winner){
            emitGameState(roomName, state[roomName])
            client.emit('gameState', JSON.stringify(state));
        } else{
            emitGameOver(roomName, winner)
            client.emit('gameOver');
            state[roomName] = null;
            clearInterval(intervalId);
        }
    }, 1000 / FRAME_RATE)   
}

function emitGameState(roomName, gameState) {

    io.sockets.in(roomName)
      .emit('gameState', JSON.stringify(state));
  }
  
  function emitGameOver(roomName, winner) {
    io.sockets.in(roomName)
      .emit('gameOver', JSON.stringify({ winner }));
  }





app.get('/test', (req,res) =>{
    res.sendFile(__dirname + '/frontend/index.html');
});

httpServer.listen(3000, () => {
    console.log('Server is running on the port 3000');
});