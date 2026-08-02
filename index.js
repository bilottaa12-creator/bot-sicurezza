// Server HTTP per mantenere attivo il servizio su Render
const http = require('http');
http.createServer((req, res) => res.end('Scudo Anti-Raid Online!')).listen(process.env.PORT || 3000);

const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const TOKEN = process.env.DISCORD_TOKEN;

// Stato condiviso tra tutti i plugin (es. serverBloccato, contatori, ecc.)
const store = {};

// ---- CARICAMENTO PLUGIN ----
// Ogni file in ./plugins deve esportare un oggetto:
// { name: 'nome', onMessage: async (message, ctx) => {} }
// Se onMessage ritorna true, significa "gestito, fermati qui" (stoppa gli altri plugin sul messaggio).
const pluginsDir = path.join(__dirname, 'plugins');
const plugins = fs.readdirSync(pluginsDir)
    .filter(file => file.endsWith('.js'))
    .map(file => {
        const plugin = require(path.join(pluginsDir, file));
        console.log(`🔌 Plugin caricato: ${plugin.name || file}`);
        return plugin;
    });

client.once('ready', () => {
    console.log(`🛡️ Sistema Anti-Raid Online come ${client.user.tag}! (${plugins.length} plugin attivi)`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // Contesto passato a ogni plugin: stato condiviso + funzioni di utilità
    const ctx = { store, client };

    for (const plugin of plugins) {
        if (typeof plugin.onMessage !== 'function') continue;
        try {
            const gestito = await plugin.onMessage(message, ctx);
            if (gestito) break; // un plugin ha già gestito il messaggio, fermiamoci
        } catch (err) {
            console.error(`[ERRORE PLUGIN ${plugin.name || '?'}]:`, err.message);
        }
    }
});

client.login(TOKEN);
