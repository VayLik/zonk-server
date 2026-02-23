// === КОД СЕРВЕРА (server.js) ===
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let rooms = {};

io.on('connection', (socket) => {
    console.log('Гравець підключився:', socket.id);

    // Створення кімнати (ТЕПЕР ІЗ ВИБОРОМ ОЧОК)
    socket.on('createRoom', (data) => {
        const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        rooms[roomCode] = { 
            p1: { id: socket.id, name: data.name },
            targetScore: data.targetScore || 10000 // Зберігаємо цільові очки
        };
        socket.join(roomCode);
        socket.emit('roomCreated', roomCode);
    });

    socket.on('joinRoom', (data) => {
        const room = rooms[data.roomCode];
        if (room && !room.p2) {
            room.p2 = { id: socket.id, name: data.name };
            socket.join(data.roomCode);
            // Відправляємо обом інформацію про старт І кількість очок
            io.to(data.roomCode).emit('gameStarted', { 
                roomCode: data.roomCode, 
                p1: room.p1, 
                p2: room.p2,
                targetScore: room.targetScore
            });
        } else {
            socket.emit('errorMsg', 'Кімнату не знайдено або вона вже повна!');
        }
    });

    socket.on('rollDice', (data) => socket.to(data.roomCode).emit('opponentRolled', data));
    socket.on('bank', (data) => socket.to(data.roomCode).emit('opponentBanked', data));
    socket.on('zonk', (data) => socket.to(data.roomCode).emit('opponentZonked'));
    socket.on('rematch', (data) => socket.to(data.roomCode).emit('opponentRematch'));

    socket.on('disconnect', () => {
        for (let code in rooms) {
            if (rooms[code].p1.id === socket.id || (rooms[code].p2 && rooms[code].p2.id === socket.id)) {
                socket.to(code).emit('opponentDisconnected');
                delete rooms[code];
            }
        }
    });
});

server.listen(process.env.PORT || 3000, () => {
    console.log('Zonk Server is running!');
});
