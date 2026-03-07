import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup Express and Socket.IO
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Since we are using ES Modules (type: module in package.json)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Admin Password Protection (Simple check)
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'wbc2026';

// Serve static files from the build directory (Vite's dist folder)
app.use(express.static(path.join(__dirname, 'dist')));

// Serve the index.html on any unknown routes to let SPA router handle it (if needed)
app.get(/^(.*)$/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// In-Memory Game State
let gameState = {
    tpe: 0,
    jpn: 0,
    inning: 1,
    isTopHalf: true, // true = top (▲), false = bottom (▼)
    balls: 0,
    strikes: 0,
    outs: 0,
    bases: { 1: false, 2: false, 3: false },
    logs: ['比賽即將於 18:00 開始，目前為賽前練習。']
};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Send the current state to the newly connected client
    socket.emit('state-updated', gameState);

    // Listen for updates from the admin
    socket.on('update-state', (data) => {
        // Basic authorization check
        if (data.password !== ADMIN_SECRET) {
            socket.emit('error', { message: 'Unauthorized: Incorrect password' });
            return;
        }

        // Update server state
        gameState = { ...gameState, ...data.newState };

        // Broadcast the updated state to ALL clients
        io.emit('state-updated', gameState);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
