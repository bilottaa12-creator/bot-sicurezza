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

        if (content === '!rank' || content.startsWith('!rank ')) {
            const target = message.mentions.members?.first() || message.member;

            try {
                const voceTarget = await MessageCount.findOne({ guildId: message.guildId, userId: target.id });

                if (!voceTarget || voceTarget.count === 0) {
                    await message.reply(`📊 **${target.displayName}** non ha ancora nessun messaggio contato.`);
                    return true;
                }

                const posizione = 1 + await MessageCount.countDocuments({
                    guildId: message.guildId,
                    count: { $gt: voceTarget.count }
                });

                const totalePartecipanti = await MessageCount.countDocuments({ guildId: message.guildId });

                // Trova la persona subito sopra in classifica, per calcolare quanti messaggi mancano
                const prossimo = await MessageCount.findOne({
                    guildId: message.guildId,
                    count: { $gt: voceTarget.count }
                }).sort({ count: 1 });

                let descrizione = `Posizione **#${posizione}** su ${totalePartecipanti} — **${voceTarget.count}** messaggi totali.`;

                if (prossimo) {
                    const distacco = prossimo.count - voceTarget.count;
                    descrizione += `\nTi mancano **${distacco}** messaggi per superare il prossimo in classifica.`;
                } else {
                    descrizione += `\n🥇 Sei primo in classifica!`;
                }

                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle(`📊 Posizione di ${target.displayName}`)
                    .setDescription(descrizione);

                await message.reply({ embeds: [embed] });

            } catch (err) {
                console.error('[ERRORE CLASSIFICA - rank]:', err.message);
                await message.reply('⚠️ Errore nel recuperare la posizione. Riprova tra poco.');
            }

            return true;
        }

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
