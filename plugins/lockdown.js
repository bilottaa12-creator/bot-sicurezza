const { eModeratoreOAdmin, inviaLogSicurezza } = require('../utils');

async function salvaSnapshot(guild, store) {
    try {
        const channels = await guild.channels.fetch();
        const snapshot = {};
        for (const [channelId, channel] of channels) {
            if (channel && channel.isTextBased() && !channel.isThread()) {
                const override = channel.permissionOverwrites.resolve(guild.roles.everyone);
                snapshot[channelId] = {
                    name: channel.name,
                    ViewChannel: override?.allow.has('ViewChannel') ? true : override?.deny.has('ViewChannel') ? false : null,
                    SendMessages: override?.allow.has('SendMessages') ? true : override?.deny.has('SendMessages') ? false : null,
                    SendMessagesInThreads: override?.allow.has('SendMessagesInThreads') ? true : override?.deny.has('SendMessagesInThreads') ? false : null,
                    AddReactions: override?.allow.has('AddReactions') ? true : override?.deny.has('AddReactions') ? false : null
                };
            }
        }
        store.lockdownSnapshot = snapshot;
    } catch (error) {
        console.error('[ERRORE SNAPSHOT]:', error);
    }
}

async function bloccareTuttiCanali(guild) {
    // Chiude TUTTI i canali completamente, indipendentemente da com'erano prima
    try {
        const channels = await guild.channels.fetch();
        for (const [channelId, channel] of channels) {
            if (channel && channel.isTextBased() && !channel.isThread()) {
                try {
                    await channel.permissionOverwrites.edit(guild.roles.everyone, {
                        ViewChannel: false,
                        SendMessages: false,
                        SendMessagesInThreads: false,
                        AddReactions: false
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

async function ripristinareDaSnapshot(guild, store) {
    if (!store.lockdownSnapshot) return;

    try {
        const channels = await guild.channels.fetch();
        for (const [channelId, channel] of channels) {
            if (channel && channel.isTextBased() && !channel.isThread()) {
                try {
                    const stato = store.lockdownSnapshot[channelId];
                    if (stato) {
                        // Costruisci l'oggetto dei permessi
                        const permsToSet = {};
                        
                        // Se il permesso era null (neutro), omettilo dall'edit così Discord lo toglie dall'override
                        if (stato.ViewChannel !== null) permsToSet.ViewChannel = stato.ViewChannel;
                        if (stato.SendMessages !== null) permsToSet.SendMessages = stato.SendMessages;
                        if (stato.SendMessagesInThreads !== null) permsToSet.SendMessagesInThreads = stato.SendMessagesInThreads;
                        if (stato.AddReactions !== null) permsToSet.AddReactions = stato.AddReactions;
                        
                        // Se tutti i permessi erano null (canale completamente pubblico), elimina l'override
                        if (Object.keys(permsToSet).length === 0) {
                            await channel.permissionOverwrites.delete(guild.roles.everyone);
                        } else {
                            await channel.permissionOverwrites.edit(guild.roles.everyone, permsToSet);
                        }
                    }
                } catch (err) {
                    console.error(`[ERRORE RIPRISTINO] Canale ${channel.name}:`, err.message);
                }
            }
        }
        store.lockdownSnapshot = null;
    } catch (error) {
        console.error('[ERRORE RIPRISTINO]:', error);
    }
}

module.exports = {
    name: 'lockdown',

    async onMessage(message, ctx) {
        const { store } = ctx;
        if (store.serverBloccato === undefined) store.serverBloccato = false;

        if (message.content.trim() === '!scudo-lock') {
            if (!eModeratoreOAdmin(message.member)) {
                await message.reply('❌ Solo i Moderatori e gli Amministratori possono usare questo comando.');
                return true;
            }
            store.serverBloccato = true;
            await message.reply('🔒 **ATTIVAZIONE LOCKDOWN IN CORSO...**');
            await salvaSnapshot(message.guild, store);
            await bloccareTuttiCanali(message.guild);
            await message.channel.send('🚨 **SERVER BLINDATO!** Tutti i canali sono stati chiusi.');
            await inviaLogSicurezza(message.guild,
                `🔒 **Lockdown attivato** da <@${message.author.id}> (${message.author.tag})`
            );
            return true;
        }

        if (message.content.trim() === '!scudo-unlock') {
            if (!eModeratoreOAdmin(message.member)) {
                await message.reply('❌ Solo i Moderatori e gli Amministratori possono usare questo comando.');
                return true;
            }
            store.serverBloccato = false;
            await message.reply('🔓 **DISATTIVAZIONE LOCKDOWN IN CORSO...**');
            await ripristinareDaSnapshot(message.guild, store);
            await message.channel.send('✅ **LOCKDOWN DISATTIVATO!** I canali sono stati ripristinati al loro stato precedente.');
            await inviaLogSicurezza(message.guild,
                `🔓 **Lockdown disattivato** da <@${message.author.id}> (${message.author.tag})`
            );
            return true;
        }

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
