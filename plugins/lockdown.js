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

async function bloccareCanalyPublici(guild, store) {
    try {
        if (!store.lockdownSnapshot) return;
        
        const channels = await guild.channels.fetch();
        for (const [channelId, channel] of channels) {
            if (channel && channel.isTextBased() && !channel.isThread()) {
                const statoSalvato = store.lockdownSnapshot[channelId];
                // Chiudi solo se il canale era completamente pubblico (null per tutti i permessi)
                if (statoSalvato && 
                    statoSalvato.ViewChannel === null && 
                    statoSalvato.SendMessages === null && 
                    statoSalvato.SendMessagesInThreads === null && 
                    statoSalvato.AddReactions === null) {
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
                        // Ripristina ESATTAMENTE com'era (anche neutro/null)
                        await channel.permissionOverwrites.edit(guild.roles.everyone, {
                            ViewChannel: stato.ViewChannel,
                            SendMessages: stato.SendMessages,
                            SendMessagesInThreads: stato.SendMessagesInThreads,
                            AddReactions: stato.AddReactions
                        });
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
            await bloccareCanalyPublici(message.guild, store);
            await message.channel.send('🚨 **SERVER BLINDATO!** I canali pubblici sono stati chiusi.');
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
