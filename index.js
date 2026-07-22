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
let serverBloccato = false;      

client.once('ready', () => {
    console.log(`🛡️ Sistema Anti-Raid Online come ${client.user.tag}!`);
});

// Funzione di controllo per Mod e Admin
function eModeratoreOAdmin(member) {
    if (!member) return false;
    const haPermessoAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
    const haRuoloMod = member.roles.cache.some(role => role.name.toLowerCase().includes('mod'));
    return haPermessoAdmin || haRuoloMod;
}

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // 1. COMANDO LOCK MANUALE (BLOCCA TUTTO)
    if (message.content.trim() === '!scudo-lock') {
        if (!eModeratoreOAdmin(message.member)) {
            await message.reply('❌ Solo i Moderatori e gli Amministratori possono usare questo comando.');
            return;
        }
        
        serverBloccato = true;
        await message.reply('🔒 **ATTIVAZIONE LOCKDOWN IN CORSO...**');
        await toggleServerLockdown(message.guild, true);
        await message.channel.send('🚨 **SERVER BLINDATO!** La scrittura è stata bloccata in tutti i canali.');
        return;
    }

    // 2. COMANDO UNLOCK MANUALE (SBLOCCA TUTTO)
    if (message.content.trim() === '!scudo-unlock') {
        if (!eModeratoreOAdmin(message.member)) {
            await message.reply('❌ Solo i Moderatori e gli Amministratori possono usare questo comando.');
            return;
        }
        
        serverBloccato = false;
        await message.reply('🔓 **DISATTIVAZIONE LOCKDOWN IN CORSO...**');
        await toggleServerLockdown(message.guild, false);
        await message.channel.send('✅ **SERVER SBLOCCATO!** I canali sono di nuovo aperti.');
        return;
    }

    // 3. SE IL SERVER È BLOCCATO, CANCELLA I MESSAGGI DEGLI UTENTI NORMALI
    if (serverBloccato) {
        if (!eModeratoreOAdmin(message.member)) {
            try {
                await message.delete();
            } catch (err) {
                console.error("Errore nell'eliminare il messaggio:", err.message);
            }
        }
    }
});

// FUNZIONE PER APPLICARE O RIMUOVERE IL BLOCCO SU TUTTI I CANALI
async function toggleServerLockdown(guild, blocca) {
    try {
        const channels = await guild.channels.fetch();

        for (const [channelId, channel] of channels) {
            if (channel && channel.isTextBased() && !channel.isThread()) {
                try {
                    // Applica l'override sul ruolo @everyone
                    await channel.permissionOverwrites.edit(guild.roles.everyone, {
                        SendMessages: blocca ? false : null,
                        SendMessagesInThreads: blocca ? false : null,
                        AddReactions: blocca ? false : null
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
