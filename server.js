const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mineflayer = require('mineflayer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

const bots = new Map();

io.on('connection', (socket) => {
  console.log('👤 Usuário conectado:', socket.id);

  socket.on('spawn', (data) => {
    let { ip, username } = data;
    username = username.trim() || `Alt_${Math.floor(Math.random() * 9999)}`;
    ip = ip.trim();

    const key = `${ip}-${username}`;
    if (bots.has(key)) {
      return socket.emit('log', `⚠️ ${username} já está no mundo!`);
    }

    let host = 'localhost', port = 25565;
    if (ip.includes(':')) {
      [host, port] = ip.split(':');
      port = parseInt(port);
    } else {
      host = ip;
    }

    socket.emit('log', `🚀 Conectando ${username} em ${host}:${port}...`);

    const bot = mineflayer.createBot({
      host, port, username,
      version: false,
      auth: 'offline' // ← alts cracked
    });

    bots.set(key, bot);

    bot.on('login', () => {
      socket.emit('log', `✅ <b>${username} ENTROU NO MUNDO!</b>`);
      io.emit('log', `🌍 ${username} online em ${ip}`);
      
      // ANTI-AFK AUTOMÁTICO
      setInterval(() => {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 100);
      }, 20000);
    });

    bot.on('chat', (u, msg) => {
      if (u !== bot.username) io.emit('log', `💬 [${u}]: ${msg}`);
    });

    bot.on('error', (err) => {
      socket.emit('error', `❌ Erro: ${err.message}`);
      bots.delete(key);
    });

    bot.on('kicked', (reason) => {
      socket.emit('log', `🚫 ${username} kickado: ${reason}`);
      bots.delete(key);
    });

    bot.on('end', () => {
      socket.emit('log', `⚰️ ${username} desconectou.`);
      bots.delete(key);
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🌐 SERVIDOR RODANDO NA PORTA ${PORT}`);
  console.log(`   Acesse: http://localhost:${PORT}\n`);
});
