const http = require('http');
http.createServer((req, res) => res.end('Scudo Anti-Raid Online!')).listen(process.env.PORT || 10000);

const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

console.log('🔄 Avvio del bot in corso...');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessageReactions
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

const store = {};
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

client.on('messageReactionAdd', async (reaction, user) => {
    for (const plugin of plugins) {
        if (plugin.onReactionAdd) {
            try {
                await plugin.onReactionAdd(reaction, user, { store, client });
            } catch (err) {
                console.error(`Errore in plugin ${plugin.name} (reaction add):`, err.message);
            }
        }
    }
});

client.on('messageReactionRemove', async (reaction, user) => {
    for (const plugin of plugins) {
        if (plugin.onReactionRemove) {
            try {
                await plugin.onReactionRemove(reaction, user, { store, client });
            } catch (err) {
                console.error(`Errore in plugin ${plugin.name} (reaction remove):`, err.message);
            }
        }
    }
});

client.on('ready', () => {
    console.log(`✅ DISCORD CONNESSO! Online come ${client.user.tag}`);
});

// Cattura errori di login
client.login(TOKEN).catch(err => {
    console.error('❌ ERRORE DURANTE IL LOGIN:', err.message);
});
