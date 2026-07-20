// Server web finto per non far spegnere Render (Piano Free)
const http = require('http');
http.createServer((req, res) => res.end('Scudo Online!')).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ] 
});

// LEGGE IL TOKEN IN SICUREZZA DAL PANNELLO DI RENDER
const TOKEN = process.env.DISCORD_TOKEN; 
const OWNER_ID = '1241667310771769408'; // Il tuo ID Utente fisso

const SOGLIA_MESSAGGI = 5;       
const SOGLIA_TEMPO = 3000;       
const messaggiRecenti = new Map(); 
let serverBloccato = false;      

client.once('ready', () => {
    console.log(`🛡️ Sistema Anti-Raid Cloud Online come ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    // Ignora messaggi dai bot (evita che altri bot attivino l'anti-spam) e messaggi privati
    if (message.author.bot || !message.guild) return;

    // NUOVO COMANDO DI UNLOCK PERSONALIZZATO
    if (message.content.trim() === '!scudo-unlock') {
        if (message.author.id !== OWNER_ID) {
            await message.reply('❌ Solo il proprietario dello Scudo può usare questo comando.');
            return;
        }
        
        serverBloccato = false;
        await message.reply('🔓 **REVOCA LOCKDOWN IN CORSO...**');
        await toggleServerLockdown(message.guild, false);
        await message.channel.send('✅ Server sbloccato manualmente dall\'Amministratore.');
        return;
    }

    // Se il server è già in lockdown, blocca la verifica dello spam
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
        // Se chi spamma è un admin del server, lo ignora
        if (message.member && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

        serverBloccato = true; 
        await message.channel.send(`🚨 **RILEVATO ATTACCO SPAM DA <@${utenteId}>!** 🚨\nLockdown automatico in corso...`);
        await toggleServerLockdown(message.guild, true);
        await message.channel.send('🔒 **Server Blindato.** Tutte le chat sono chiuse. Usa `!scudo-unlock` per riaprire.');
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
                    console.error(`[ERRORE PERMESSI] Impossibile modificare il canale ${channel.name}:`, err.message);
                }
            }
        }
    } catch (error) {
        console.error('[ERRORE GENERALE LOCKDOWN]:', error);
    }
}

client.login(TOKEN);
