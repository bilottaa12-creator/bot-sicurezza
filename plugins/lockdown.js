const { PermissionOverwrites } = require('discord.js');
const { eModeratoreOAdmin, inviaLogSicurezza } = require('../utils');

async function salvaSnapshot(guild, store) {
    try {
        const channels = await guild.channels.fetch();
        const snapshot = {};
        for (const [channelId, channel] of channels) {
            if (channel && channel.isTextBased() && !channel.isThread()) {
                const override = channel.permissionOverwrites.get(guild.roles.everyone.id);
                snapshot[channelId] = {
                    name: channel.name,
                    override: override ? {
                        allow: override.allow.toJSON(),
                        deny: override.deny.toJSON()
                    } : null
                };
            }
        }
        store.lockdownSnapshot = snapshot;
        console.log('[LOCKDOWN] Snapshot salvato:', Object.keys(snapshot).length, 'canali');
    } catch (error) {
        console.error('[ERRORE SNAPSHOT]:', error);
    }
}

async function bloccareTuttiCanali(guild) {
    try {
        const channels = await guild.channels.fetch();
        for (const [channelId, channel] of channels) {
            if (channel && channel.isTextBased() && !channel.isThread()) {
                try {
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
    } catch (error) {
        console.error('[ERRORE LOCKDOWN]:', error);
    }
}

async function ripristinareDaSnapshot(guild, store) {
    if (!store.lockdownSnapshot) {
        console.log('[LOCKDOWN] Nessuno snapshot da ripristinare');
        return;
    }

    try {
        const channels = await guild.channels.fetch();
        for (const [channelId, channel] of channels) {
            if (channel && channel.isTextBased() && !channel.isThread()) {
                try {
                    const stato = store.lockdownSnapshot[channelId];
                    if (stato) {
                        if (stato.override) {
                            // Ripristina esattamente i permessi salvati
                            await channel.permissionOverwrites.edit(guild.roles.everyone, {
                                allow: stato.override.allow,
                                deny: stato.override.deny
                            });
                        } else {
                            // Il canale non aveva override: rimuovilo completamente
                            const override = channel.permissionOverwrites.get(guild.roles.everyone.id);
                            if (override) {
                                await override.delete();
                            }
                        }
                    }
                } catch (err) {
                    console.error(`[ERRORE RIPRISTINO] Canale ${channel.name}:`, err.message);
                }
            }
        }
        store.lockdownSnapshot = null;
        console.log('[LOCKDOWN] Stato ripristinato');
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
