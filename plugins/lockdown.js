const { eModeratoreOAdmin, inviaLogSicurezza } = require('../utils');

function getGuildStore(store, guildId) {
    if (!store[guildId]) store[guildId] = {};
    return store[guildId];
}

async function salvaSnapshotEBlocca(guild, guildStore) {
    try {
        const channels = await guild.channels.fetch();
        guildStore.lockedChannels = []; // Salva solo i canali effettivamente modificati

        for (const [channelId, channel] of channels) {
            // Controlla solo i canali testuali e non le discussioni/thread
            if (channel && channel.isTextBased() && !channel.isThread()) {
                const override = channel.permissionOverwrites.resolve(guild.roles.everyone);

                // Controlla se il canale è visibile e scrivibile di base
                const puoVedere = !override?.deny.has('ViewChannel');
                const puoInviare = !override?.deny.has('SendMessages');

                // Se il canale è già nascosto o chiuso (es. staff/regolamento), NON lo tocca!
                if (puoVedere && puoInviare) {
                    guildStore.lockedChannels.push(channelId);

                    try {
                        // NOTA: Non tocchiamo ViewChannel! Modifica solo la scrittura.
                        await channel.permissionOverwrites.edit(guild.roles.everyone, {
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

async function ripristinareDaSnapshot(guild, guildStore) {
    if (!guildStore.lockedChannels || guildStore.lockedChannels.length === 0) return;

    try {
        for (const channelId of guildStore.lockedChannels) {
            const channel = guild.channels.cache.get(channelId);
            if (channel) {
                try {
                    // Impostando a null rimuoviamo il blocco temporaneo
                    // e ripristiniamo i permessi originali/della categoria
                    await channel.permissionOverwrites.edit(guild.roles.everyone, {
                        SendMessages: null,
                        SendMessagesInThreads: null,
                        AddReactions: null
                    });
                } catch (err) {
                    console.error(`[ERRORE RIPRISTINO] Canale ${channel.name}:`, err.message);
                }
            }
        }
        guildStore.lockedChannels = []; // Reset memoria
    } catch (error) {
        console.error('[ERRORE RIPRISTINO]:', error);
    }
}

module.exports = {
    name: 'lockdown',

    async onMessage(message, ctx) {
        const guildStore = getGuildStore(ctx.store, message.guildId);
        if (guildStore.serverBloccato === undefined) guildStore.serverBloccato = false;

        if (message.content.trim() === '!scudo-lock') {
            if (!(await eModeratoreOAdmin(message.member))) {
                await message.reply('❌ Solo i Moderatori e gli Amministratori possono usare questo comando.');
                return true;
            }
            guildStore.serverBloccato = true;
            await message.reply('🔒 **ATTIVAZIONE LOCKDOWN IN CORSO...**');
            await salvaSnapshotEBlocca(message.guild, guildStore);
            await message.channel.send('🚨 **SERVER BLINDATO!** La scrittura nei canali pubblici è stata disattivata.');
            await inviaLogSicurezza(message.guild,
                `🔒 **Lockdown attivato** da <@${message.author.id}> (${message.author.tag})`
            );
            return true;
        }

        if (message.content.trim() === '!scudo-unlock') {
            if (!(await eModeratoreOAdmin(message.member))) {
                await message.reply('❌ Solo i Moderatori e gli Amministratori possono usare questo comando.');
                return true;
            }
            guildStore.serverBloccato = false;
            await message.reply('🔓 **DISATTIVAZIONE LOCKDOWN IN CORSO...**');
            await ripristinareDaSnapshot(message.guild, guildStore);
            await message.channel.send('✅ **LOCKDOWN DISATTIVATO!** I canali sono stati ripristinati.');
            await inviaLogSicurezza(message.guild,
                `🔓 **Lockdown disattivato** da <@${message.author.id}> (${message.author.tag})`
            );
            return true;
        }

        if (guildStore.serverBloccato) {
            if (!(await eModeratoreOAdmin(message.member))) {
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
