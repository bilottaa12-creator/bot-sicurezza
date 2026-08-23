const { EmbedBuilder } = require('discord.js');
const { MessageCount } = require('../db');

module.exports = {
    name: 'classifica',

    async onMessage(message, ctx) {
        const content = message.content.trim();

        // Conta OGNI messaggio (non solo i comandi), quindi niente "return true" qui:
        // se non è un comando riconosciuto, il messaggio continua verso gli altri plugin.
        // Nessun "await" qui apposta: la scrittura sul database non deve rallentare
        // la catena di plugin per ogni singolo messaggio del server.
        MessageCount.findOneAndUpdate(
            { guildId: message.guildId, userId: message.author.id },
            { $inc: { count: 1 } },
            { upsert: true }
        ).catch(err => {
            console.error('[ERRORE CLASSIFICA - conteggio]:', err.message);
        });

        if (content !== '!top' && content !== '!classifica') return false;

        try {
            const classifica = await MessageCount
                .find({ guildId: message.guildId })
                .sort({ count: -1 })
                .limit(10);

            if (classifica.length === 0) {
                await message.reply('📊 Nessun messaggio ancora contato su questo server.');
                return true;
            }

            const righe = await Promise.all(
                classifica.map(async (voce, i) => {
                    const membro = await message.guild.members.fetch(voce.userId).catch(() => null);
                    const nome = membro ? membro.displayName : 'Utente sconosciuto';
                    const medaglia = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
                    return `${medaglia} **${nome}** — ${voce.count} messaggi`;
                })
            );

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(`📊 Classifica messaggi — ${message.guild.name}`)
                .setDescription(righe.join('\n'))
                .setFooter({ text: 'Conteggio permanente, salvato su database' });

            await message.reply({ embeds: [embed] });

        } catch (err) {
            console.error('[ERRORE CLASSIFICA - lettura]:', err.message);
            await message.reply('⚠️ Errore nel recuperare la classifica. Riprova tra poco.');
        }

        return true;
    }
};
