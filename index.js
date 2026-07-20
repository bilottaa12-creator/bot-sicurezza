// Server HTTP per far capire a Render che il servizio è attivo
const http = require('http');
http.createServer((req, res) => res.end('Scudo Anti-Raid Online!')).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ] 
});

const TOKEN = process.env.DISCORD_TOKEN; 

const SOGLIA_MESSAGGI = 5;       
const SOGLIA_TEMPO = 3000;       
const messaggiRecenti = new Map(); 
let serverBloccato = false;      

client.once('ready', () => {
    console.log(`🛡️ Sistema Anti-Raid Cloud Online come ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // COMANDO UNLOCK: Funziona per qualsiasi Amministratore del server
    if (message.content.trim() === '!scudo-unlock') {
        if (!message.member || !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await message.reply('❌ Solo gli Amministratori possono sbloccare il server.');
            return;
        }
        
        serverBloccato = false;
        await message.reply('🔓 **REVOCA LOCKDOWN IN CORSO...**');
        await toggleServerLockdown(message.guild, false);
        await message.channel.send('✅ Server sbloccato manualmente.');
        return;
    }

    if (serverBloccato) return;

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
        if (message.member && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

        serverBloccato = true; 
        await message.channel.send(`🚨 **RILEVATO SPAM DA <@${utenteId}>!**\nLockdown automatico in corso...`);
        await toggleServerLockdown(message.guild, true);
        await message.channel.send('🔒 **Server Blindato.** Scrivi `!scudo-unlock` per sbloccare.');
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

    try {
        const channels = await guild.channels.fetch();
        for (const [channelId, channel] of channels) {
            if (channel && channel.isTextBased() && !channel.isThread()) {
                try {
                    await channel.permissionOverwrites.edit(everyoneRole, permissionsToModify);
                } catch (err) {
                    console.error(`[ERRORE PERMESSI] Canale ${channel.name}:`, err.message);
                }
            }
        }
    } catch (error) {
        console.error('[ERRORE LOCKDOWN]:', error);
    }
}

client.login(TOKEN);
