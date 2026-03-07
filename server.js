import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

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
let gamesList = [];

function fetchMBData() {
    const url = 'https://statsapi.mlb.com/api/v1/schedule?sportId=1&hydrate=linescore,team';
    https.get(url, (resp) => {
        let data = '';
        resp.on('data', (chunk) => { data += chunk; });
        resp.on('end', () => {
            try {
                const parsed = JSON.parse(data);
                if (parsed.dates && parsed.dates.length > 0) {
                    const games = parsed.dates[0].games.map(g => {
                        const isLive = g.status.statusCode === 'I' || g.status.statusCode === 'S' || g.status.statusCode === 'F' || g.status.statusCode === 'O';
                        return {
                            id: g.gamePk,
                            awayTeam: g.teams.away.team.name,
                            homeTeam: g.teams.home.team.name,
                            awayScore: g.teams.away.score || 0,
                            homeScore: g.teams.home.score || 0,
                            status: g.status.detailedState,
                            statusCode: g.status.statusCode,
                            inning: g.linescore ? g.linescore.currentInning : 1,
                            isTopHalf: g.linescore ? (g.linescore.inningHalf === 'Top') : true,
                            balls: g.linescore ? g.linescore.balls : 0,
                            strikes: g.linescore ? g.linescore.strikes : 0,
                            outs: g.linescore ? g.linescore.outs : 0,
                            bases: {
                                1: g.linescore?.offense ? !!g.linescore.offense.first : false,
                                2: g.linescore?.offense ? !!g.linescore.offense.second : false,
                                3: g.linescore?.offense ? !!g.linescore.offense.third : false
                            }
                        };
                    });
                    gamesList = games;
                    io.emit('games-updated', gamesList);
                }
            } catch (e) {
                console.error("Error parsing MLB API", e);
            }
        });
    }).on("error", (err) => {
        console.error("Error fetching from MLB:", err.message);
    });
}

// Initial fetch
fetchMBData();

// Poll every 10 seconds
setInterval(fetchMBData, 10000);

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Send the current list of games to newly connected clients
    socket.emit('games-updated', gamesList);

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
