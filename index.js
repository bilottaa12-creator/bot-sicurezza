// ============================================
// SERVER HTTP PER RENDER
// ============================================
const http = require('http');
http.createServer((req, res) => res.end('Scudo Anti-Raid Online!')).listen(process.env.PORT || 10000);

// ============================================
// IMPORTAZIONI
// ============================================
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { connectDB } = require('./db');
const logger = require('./utils/logger');

// ============================================
// CONFIGURAZIONE
// ============================================
const TOKEN = process.env.DISCORD_TOKEN;
const PLUGINS_DIR = path.join(__dirname, 'plugins');

// ============================================
// VALIDAZIONE INIZIALE
// ============================================
if (!TOKEN) {
    logger.error('Variabile DISCORD_TOKEN non trovata. Verificare le impostazioni su Render.');
    process.exit(1);
}

// ============================================
// CONNESSIONE DATABASE
// ============================================
logger.info('Connessione al database...');
try {
    connectDB();
    logger.info('Database connesso con successo.');
} catch (err) {
    logger.error(`Errore connessione database: ${err.message}`);
    process.exit(1);
}

// ============================================
// CREAZIONE CLIENT DISCORD
// ============================================
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

// ============================================
// STATO CONDIVISO
// ============================================
const store = {};

// ============================================
// CARICAMENTO PLUGIN
// ============================================
function loadPlugins() {
    const plugins = [];
    
    if (!fs.existsSync(PLUGINS_DIR)) {
        logger.warn('Cartella plugins non trovata. Creazione...');
        fs.mkdirSync(PLUGINS_DIR, { recursive: true });
        return plugins;
    }

    const pluginFiles = fs.readdirSync(PLUGINS_DIR)
        .filter(file => file.endsWith('.js'));

    if (pluginFiles.length === 0) {
        logger.warn('Nessun plugin trovato nella cartella plugins/.');
        return plugins;
    }

    for (const file of pluginFiles) {
        const pluginPath = path.join(PLUGINS_DIR, file);
        const startTime = Date.now();

        try {
            const plugin = require(pluginPath);

            // Validazione struttura plugin
            if (!plugin || typeof plugin !== 'object') {
                logger.warn(`Plugin ${file} ignorato: export non valido.`);
                continue;
            }

            if (!plugin.name) {
                logger.warn(`Plugin ${file} ignorato: manca la proprietà "name".`);
                continue;
            }

            // Verifica che abbia almeno una funzione handler
            const hasHandler = ['onMessage', 'onAuditLogEntry', 'onMemberAdd', 'onReady']
                .some(method => typeof plugin[method] === 'function');

            if (!hasHandler) {
                logger.warn(`Plugin ${file} ignorato: nessun handler valido trovato.`);
                continue;
            }

            plugins.push(plugin);
            
            const loadTime = Date.now() - startTime;
            logger.info(`Plugin "${plugin.name}" caricato (${loadTime}ms)`);

        } catch (err) {
            logger.error(`Errore caricamento plugin ${file}: ${err.message}`);
            if (err.stack) {
                logger.debug(err.stack);
            }
        }
    }

    return plugins;
}

const plugins = loadPlugins();
logger.info(`Totale plugin caricati: ${plugins.length}`);

// ============================================
// HELPER PER ESECUZIONE SICURA DEI PLUGIN
// ============================================
async function executePluginMethod(plugins, methodName, args) {
    for (const plugin of plugins) {
        if (typeof plugin[methodName] !== 'function') continue;

        try {
            const result = await plugin[methodName](...args);
            
            // Se il plugin ritorna true, interrompe l'esecuzione degli altri
            if (result === true) {
                logger.debug(`Plugin "${plugin.name}" ha interrotto la catena.`);
                break;
            }
        } catch (err) {
            logger.error(`Errore nel plugin "${plugin.name}" (${methodName}): ${err.message}`);
            if (err.stack) {
                logger.debug(err.stack);
            }
        }
    }
}

// ============================================
// GESTIONE EVENTI
// ============================================

// Event: messageCreate
client.on('messageCreate', async (message) => {
    if (message.author.id === client.user.id) return;
    await executePluginMethod(plugins, 'onMessage', [message, { store, client }]);
});

// Event: guildAuditLogEntryCreate
client.on('guildAuditLogEntryCreate', async (entry, guild) => {
    await executePluginMethod(plugins, 'onAuditLogEntry', [entry, guild, { store, client }]);
});

// Event: guildMemberAdd
client.on('guildMemberAdd', async (member) => {
    await executePluginMethod(plugins, 'onMemberAdd', [member, { store, client }]);
});

// Event: ready
client.on('ready', () => {
    logger.info(`Bot online come ${client.user.tag}`);
    logger.info(`Server serviti: ${client.guilds.cache.size}`);
    logger.info(`Plugin attivi: ${plugins.length}`);
    
    // Esegue eventuali handler onReady nei plugin
    executePluginMethod(plugins, 'onReady', [{ store, client }]);
});

// ============================================
// GESTIONE ERRORI GLOBALE
// ============================================
client.on('debug', (info) => logger.debug(info));
client.on('warn', (warning) => logger.warn(warning));
client.on('error', (err) => logger.error(`Errore client Discord: ${err.message}`));

process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Promise non gestita: ${reason}`);
    if (reason && reason.stack) {
        logger.debug(reason.stack);
    }
});

process.on('uncaughtException', (err) => {
    logger.error(`Eccezione non catturata: ${err.message}`);
    if (err.stack) {
        logger.debug(err.stack);
    }
    // Non uscire dal processo per evitare downtime su Render
});

// ============================================
// AVVIO DEL BOT
// ============================================
logger.info('Tentativo di connessione a Discord...');

client.login(TOKEN).catch(err => {
    logger.error(`Errore critico durante il login: ${err.message}`);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('Ricevuto SIGTERM, chiusura in corso...');
    client.destroy();
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('Ricevuto SIGINT, chiusura in corso...');
    client.destroy();
    process.exit(0);
});