const { eModeratoreOAdmin, inviaLogSicurezza } = require('../utils');

async function toggleServerLockdown(guild, blocca) {
    try {
        const channels = await guild.channels.fetch();
        for (const [channelId, channel] of channels) {
            if (channel && channel.isTextBased() && !channel.isThread()) {
                try {
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

module.exports = {
    name: 'lockdown',

    async onMessage(message, ctx) {
        const { store } = ctx;
        if (store.serverBloccato === undefined) store.serverBloccato = false;

        // COMANDO LOCK MANUALE
        if (message.content.trim() === '!scudo-lock') {
            if (!eModeratoreOAdmin(message.member)) {
                await message.reply('❌ Solo i Moderatori e gli Amministratori possono usare questo comando.');
                return true;
            }
            store.serverBloccato = true;
            await message.reply('🔒 **ATTIVAZIONE LOCKDOWN IN CORSO...**');
            await toggleServerLockdown(message.guild, true);
            await message.channel.send('🚨 **SERVER BLINDATO!** La scrittura è stata bloccata in tutti i canali.');
            await inviaLogSicurezza(message.guild,
                `🔒 **Lockdown attivato** da <@${message.author.id}> (${message.author.tag}) nel canale <#${message.channel.id}>.`
            );
            return true;
        }

        // COMANDO UNLOCK MANUALE
        if (message.content.trim() === '!scudo-unlock') {
            if (!eModeratoreOAdmin(message.member)) {
                await message.reply('❌ Solo i Moderatori e gli Amministratori possono usare questo comando.');
                return true;
            }
            store.serverBloccato = false;
            await message.reply('🔓 **DISATTIVAZIONE LOCKDOWN IN CORSO...**');
            await toggleServerLockdown(message.guild, false);
            await message.channel.send('✅ **SERVER SBLOCCATO!** I canali sono di nuovo aperti.');
            await inviaLogSicurezza(message.guild,
                `🔓 **Lockdown disattivato** da <@${message.author.id}> (${message.author.tag}) nel canale <#${message.channel.id}>.`
            );
            return true;
        }

        // SE IL SERVER È BLOCCATO, CANCELLA I MESSAGGI DEGLI UTENTI NORMALI
        if (store.serverBloccato) {
            if (!eModeratoreOAdmin(message.member)) {
                try {
                    await message.delete();
                } catch (err) {
                    console.error("Errore nell'eliminare il messaggio:", err.message);
                }
                return true;
            }
        }

        return false;
    }
};
