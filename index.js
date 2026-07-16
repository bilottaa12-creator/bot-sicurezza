


const http = require('http');
http.createServer((req, res) => res.end('Bot Online!')).listen(process.env.PORT || 3000);
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ] 
});

// I tuoi dati configurati
const TOKEN = 'MTUyNzI2NzE1ODI2NDkwOTgyNA.GSH--r.9LnffpkL5c-RZOnuTyiNMQaaZxS9nGVrTg6XmY'; 
const OWNER_ID = '1241667310771769408'; 

// Configurazione della soglia Anti-Raid
const SOGLIA_MESSAGGI = 5;       // Massimo 5 messaggi consentiti...
const SOGLIA_TEMPO = 3000;       // ...in 3 secondi (3000 ms)
const messaggiRecenti = new Map(); 
let serverBloccato = false;      

client.once('ready', () => {
    console.log(`🛡️ Sistema Anti-Raid Automatico Online come ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // Comando di sblocco manuale
    if (message.content === '!unlock') {
        if (message.author.id !== OWNER_ID) return;
        serverBloccato = false;
        await message.reply('🔓 **REVOCA LOCKDOWN IN CORSO...**');
        await toggleServerLockdown(message.guild, false);
        await message.channel.send('✅ Server sbloccato manualmente dall\'Amministratore.');
        return;
    }

    if (serverBloccato) return;

    // Logica anti-spam automatica
    const utenteId = message.author.id;
    const oraAttuale = Date.now();

    if (!messaggiRecenti.has(utenteId)) {
        messaggiRecenti.set(utenteId, []);
    }

    const timestamps = messaggiRecenti.get(utenteId);
    timestamps.push(oraAttuale);

    const messaggiRecentiFiltrati = timestamps.filter(t => oraAttuale - t < SOGLIA_TEMPO);
    messaggiRecenti.set(utenteId, messaggiRecentiFiltrati);

    if (messaggiRecentiFiltrati.length > SOGLIA_MESSAGGI) {
        if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

        serverBloccato = true; 
        
        await message.channel.send(`🚨 **RILEVATO ATTACCO SPAM DA <@${utenteId}>!** 🚨\nAttivazione Lockdown automatico di emergenza in corso...`);
        await toggleServerLockdown(message.guild, true);
        await message.channel.send('🔒 **Server Blindato Automaticamente.** Tutti i canali testuali sono stati chiusi per sicurezza.');
    }
});

async function toggleServerLockdown(guild, lockStatus) {
    const everyoneRole = guild.roles.everyone;
    const permissionsToModify = {
        SendMessages: !lockStatus,
        SendMessagesInThreads: !lockStatus,
        ReadMessageHistory: !lockStatus,
        AddReactions: !lockStatus
    };

    const channels = await guild.channels.fetch();
    for (const [channelId, channel] of channels) {
        if (channel.isTextBased() && !channel.isThread()) {
            try {
                await channel.permissionOverwrites.edit(everyoneRole, permissionsToModify);
            } catch (error) {
                // Canale ignorato se mancano i permessi di gestione
            }
        }
    }
}

client.login(TOKEN);
