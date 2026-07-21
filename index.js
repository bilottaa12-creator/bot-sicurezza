// Server HTTP per mantenere attivo il servizio su Render
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

function eModeratoreOAdmin(member) {
    if (!member) return false;
    const haPermessoAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
    const haRuoloMod = member.roles.cache.some(role => role.name.toLowerCase().includes('mod'));
    return haPermessoAdmin || haRuoloMod;
}

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // COMANDO UNLOCK
    if (message.content.trim() === '!scudo-unlock') {
        if (!eModeratoreOAdmin(message.member)) {
            await message.reply('❌ Solo i Moderatori e gli Amministratori possono sbloccare il server.');
            return;
        }
        
        serverBloccato = false;
        await message.reply('🔓 **REVOCA LOCKDOWN IN CORSO...**');
        await toggleServerLockdown(message.guild, false);
        await message.channel.send('✅ Server sbloccato manualmente.');
        return;
    }

    // Se il server è in lockdown, cancella i messaggi degli utenti non autorizzati
    if (serverBloccato) {
        if (!eModeratoreOAdmin(message.member)) {
            try {
                await message.delete(); // Cancella il messaggio inviato durante il blocco
            } catch (err) {
                console.error("Impossibile eliminare il messaggio:", err.message);
            }
        }
        return;
    }

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
        if (eModeratoreOAdmin(message.member)) return;

        serverBloccato = true; 
        await message.channel.send(`🚨 **RILEVATO SPAM DA <@${utenteId}>!**\nLockdown automatico in corso...`);
        
        // Applica il lockdown
        await toggleServerLockdown(message.guild, true);
        await message.channel.send('🔒 **Server Blindato.** Scrivi `!scudo-unlock` per sbloccare.');
    }
});

async function toggleServerLockdown(guild, lockStatus) {
    try {
        const channels = await guild.channels.fetch();

        for (const [channelId, channel] of channels) {
            if (channel && channel.isTextBased() && !channel.isThread()) {
                try {
                    // Applica l'override per @everyone direttamente sul canale
                    await channel.permissionOverwrites.edit(guild.roles.everyone, {
                        SendMessages: lockStatus ? false : null,
                        SendMessagesInThreads: lockStatus ? false : null,
                        AddReactions: lockStatus ? false : null
                    });
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
