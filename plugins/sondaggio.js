const { EmbedBuilder } = require('discord.js');

const EMOJI_NUMERI = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
const DURATA_DEFAULT_MS = 60000; // 1 minuto se non specificata
const DURATA_MIN_MS = 10000;     // 10 secondi
const DURATA_MAX_MS = 24 * 60 * 60 * 1000; // 24 ore

function parseDurata(testo) {
    const match = testo.match(/^(\d+)(s|m|h)\s+(.*)/i);
    if (!match) return { durataMs: DURATA_DEFAULT_MS, resto: testo };

    const numero = parseInt(match[1], 10);
    const unita = match[2].toLowerCase();
    const moltiplicatore = { s: 1000, m: 60000, h: 3600000 }[unita];
    let durataMs = numero * moltiplicatore;

    durataMs = Math.max(DURATA_MIN_MS, Math.min(DURATA_MAX_MS, durataMs));

    return { durataMs, resto: match[3] };
}

async function pubblicaRisultati(messaggioSondaggio, opzioni, domanda) {
    let fresco;
    try {
        fresco = await messaggioSondaggio.fetch();
    } catch (err) {
        console.error('[ERRORE SONDAGGIO - risultati]:', err.message);
        return;
    }

    const emojiDaContare = opzioni.length === 0 ? ['👍', '👎'] : EMOJI_NUMERI.slice(0, opzioni.length);
    const etichette = opzioni.length === 0 ? ['Sì', 'No'] : opzioni;

    const conteggi = emojiDaContare.map((emoji, i) => {
        const reazione = fresco.reactions.cache.get(emoji);
        const voti = reazione ? Math.max(0, reazione.count - 1) : 0; // -1 per togliere la reazione del bot
        return { etichetta: etichette[i], voti };
    });

    const totaleVoti = conteggi.reduce((somma, c) => somma + c.voti, 0);

    if (totaleVoti === 0) {
        await messaggioSondaggio.reply('📊 Sondaggio concluso — nessun voto ricevuto.');
        return;
    }

    const maxVoti = Math.max(...conteggi.map(c => c.voti));
    const vincitori = conteggi.filter(c => c.voti === maxVoti);

    const righe = conteggi
        .sort((a, b) => b.voti - a.voti)
        .map(c => `${c.voti === maxVoti ? '🏆' : '▫️'} **${c.etichetta}** — ${c.voti} voti`)
        .join('\n');

    const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('📊 Risultati sondaggio')
        .setDescription(`${domanda}\n\n${righe}`)
        .setFooter({ text: vincitori.length > 1 ? 'Pareggio!' : 'Vince questa opzione' });

    await messaggioSondaggio.reply({ embeds: [embed] });
}

module.exports = {
    name: 'sondaggio',

    async onMessage(message, ctx) {
        const content = message.content.trim();
        if (!content.startsWith('!sondaggio')) return false;

        const testoGrezzo = content.replace('!sondaggio', '').trim();
        if (!testoGrezzo) {
            await message.reply(
                'Usa `!sondaggio [durata] <domanda>` per un sondaggio sì/no, oppure ' +
                '`!sondaggio [durata] <domanda> | opzione1 | opzione2 | ...` per scelta multipla (fino a 9 opzioni).\n' +
                'La durata è opzionale (es. `30s`, `5m`, `2h`) — default 1 minuto se non specificata.'
            );
            return true;
        }

        const { durataMs, resto } = parseDurata(testoGrezzo);

        const parti = resto.split('|').map(p => p.trim()).filter(Boolean);
        const domanda = parti[0];
        const opzioni = parti.slice(1);

        if (!domanda) {
            await message.reply('⚠️ Manca la domanda del sondaggio.');
            return true;
        }

        if (opzioni.length === 1) {
            await message.reply('⚠️ Servono almeno 2 opzioni per un sondaggio a scelta multipla, oppure nessuna per un sì/no.');
            return true;
        }

        if (opzioni.length > 9) {
            await message.reply('⚠️ Massimo 9 opzioni per sondaggio.');
            return true;
        }

        const durataSecondi = Math.round(durataMs / 1000);
        const durataLeggibile = durataSecondi >= 3600
            ? `${Math.round(durataSecondi / 3600)}h`
            : durataSecondi >= 60
                ? `${Math.round(durataSecondi / 60)}min`
                : `${durataSecondi}s`;

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📊 Sondaggio')
            .setDescription(
                opzioni.length === 0
                    ? domanda
                    : `${domanda}\n\n${opzioni.map((opz, i) => `${EMOJI_NUMERI[i]} ${opz}`).join('\n')}`
            )
            .setFooter({ text: `Sondaggio avviato da ${message.member.displayName} — si chiude tra ${durataLeggibile}` });

        let messaggioSondaggio;
        try {
            messaggioSondaggio = await message.channel.send({ embeds: [embed] });

            if (opzioni.length === 0) {
                await messaggioSondaggio.react('👍');
                await messaggioSondaggio.react('👎');
            } else {
                for (let i = 0; i < opzioni.length; i++) {
                    await messaggioSondaggio.react(EMOJI_NUMERI[i]);
                }
            }
        } catch (err) {
            console.error('[ERRORE SONDAGGIO]:', err.message);
            await message.reply('⚠️ Errore nella creazione del sondaggio. Riprova tra poco.');
            return true;
        }

        setTimeout(() => {
            pubblicaRisultati(messaggioSondaggio, opzioni, domanda).catch(err => {
                console.error('[ERRORE SONDAGGIO - risultati]:', err.message);
            });
        }, durataMs);

        try {
            await message.delete();
        } catch {
            // non grave se fallisce, es. permessi mancanti
        }

        return true;
    }
};
