// Server HTTP per mantenere attivo il servizio su Render
const http = require('http');
http.createServer((req, res) => res.end('Scudo Anti-Raid Online!')).listen(process.env.PORT || 10000);

const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration
    ]
});

const TOKEN = process.env.DISCORD_TOKEN;

// Stato condiviso tra tutti i plugin (es. serverBloccato, contatori, ecc.)
const store = {};

// Carica TUTTI i plugin dalla cartella plugins/
const plugins = [];
const pluginsDir = path.join(__dirname, 'plugins');
if (fs.existsSync(pluginsDir)) {
    fs.readdirSync(pluginsDir)
        .filter(file => file.endsWith('.js'))
        .forEach(file => {
            try {
                const plugin = require(path.join(pluginsDir, file));
                plugins.push(plugin);
            } catch (err) {
                console.error(`Errore nel caricamento plugin ${file}:`, err.message);
            }
        });
}

// Event: messageCreate - smista ai plugin
client.on('messageCreate', async (message) => {
    // Ignora solo se il messaggio è stato inviato dal bot stesso (evita loop)
    if (message.author.id === client.user.id) return;

    for (const plugin of plugins) {
        if (plugin.onMessage) {
            try {
                const shouldReturn = await plugin.onMessage(message, { store, client });
                if (shouldReturn === true) break; // Se il plugin ritorna true, stop
            } catch (err) {
                console.error(`Errore in plugin ${plugin.name}:`, err.message);
            }
        }
    }
});

// Event: guildAuditLogEntryCreate - smista ai plugin
client.on('guildAuditLogEntryCreate', async (entry, guild) => {
    for (const plugin of plugins) {
        if (plugin.onAuditLogEntry) {
            try {
                await plugin.onAuditLogEntry(entry, guild, { store, client });
            } catch (err) {
                console.error(`Errore in plugin ${plugin.name} (audit log):`, err.message);
            }
        }
    }
});

// Event: ready - bot online
client.on('ready', () => {
    console.log(`🛡️ Sistema Anti-Raid Online come ${client.user.tag}! (${plugins.length} plugin attivi)`);
});

// Login
client.login(TOKEN);

 