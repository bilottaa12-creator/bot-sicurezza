// Server HTTP per mantenere attivo il servizio su Render
const http = require('http');
http.createServer((req, res) => res.end('Scudo Anti-Raid Online!')).listen(process.env.PORT || 10000);

const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { connectDB } = require('./db');

console.log('🔄 Avvio del bot in corso...');

connectDB();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction
    ]
});

const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
    console.error('❌ ERRORE: La variabile DISCORD_TOKEN non è stata trovata su Render!');
} else {
    console.log('🔑 Token trovato, tentativo di connessione a Discord...');
}

// Caricamento dello Stato Condiviso
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
                console.log(`🧩 Plugin caricato: ${file}`);
            } catch (err) {
                console.error(`❌ Errore nel caricamento del plugin ${file}:`, err.message);
            }
        });
}

// Event: messageCreate - smista ai plugin
client.on('messageCreate', async (message) => {
    if (message.author.id === client.user.id) return;

    for (const plugin of plugins) {
        if (plugin.onMessage) {
            try {
                const shouldReturn = await plugin.onMessage(message, { store, client });
                if (shouldReturn === true) break;
            } catch (err) {
                console.error(`Errore in plugin ${plugin.name}:`, err.message);
            }
        }
    }
});



// Event: guildAuditLogEntryCreate
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

// Event: guildMemberAdd - qualcuno è entrato nel server
client.on('guildMemberAdd', async (member) => {
    for (const plugin of plugins) {
        if (plugin.onMemberAdd) {
            try {
                await plugin.onMemberAdd(member, { store, client });
            } catch (err) {
                console.error(`Errore in plugin ${plugin.name} (member add):`, err.message);
            }
        }
    }
});

// Event: ready - bot online
client.on('ready', () => {
    console.log(`✅ DISCORD CONNESSO! Online come ${client.user.tag} (${plugins.length} plugin attivi)`);
});

// Debug e Gestione Errori di Connessione
client.on('debug', (info) => console.log(`🔍 [DEBUG]: ${info}`));
client.on('warn', (warning) => console.log(`⚠️ [WARN]: ${warning}`));
client.on('error', (err) => console.error('❌ Errore Client Discord:', err));
process.on('unhandledRejection', (reason) => console.error('❌ Errore Non Gestito:', reason));

// Login con cattura degli errori
client.login(TOKEN).catch(err => {
    console.error('❌ ERRORE CRITICO DURANTE IL LOGIN:', err.message);
});
