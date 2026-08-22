// Racconti di riserva se l'AI non risponde (il {vincitore} viene sostituito)
const RACCONTI_FALLBACK = [
    "{sfidante} e {avversario} si sono affrontati a colpi di tastiera meccanica. Alla fine {vincitore} ha vinto lanciando un mouse wireless come un boomerang.",
    "Duello leggendario tra {sfidante} e {avversario}, combattuto a suon di meme. {vincitore} ha trionfato con una gif perfettamente sincronizzata.",
    "{sfidante} ha sfidato {avversario} a duello. Dopo una lotta epica a colpi di emoji, {vincitore} ha vinto per squalifica dell'avversario (aveva finito la batteria)."
];

function getGuildStore(store, guildId) {
    if (!store[guildId]) store[guildId] = {};
    return store[guildId];
}

function raccontoFallback(nomeSfidante, nomeAvversario, nomeVincitore) {
    const modello = RACCONTI_FALLBACK[Math.floor(Math.random() * RACCONTI_FALLBACK.length)];
    return modello
        .replaceAll('{sfidante}', nomeSfidante)
        .replaceAll('{avversario}', nomeAvversario)
        .replaceAll('{vincitore}', nomeVincitore);
}

async function raccontoDuelloAI(nomeSfidante, nomeAvversario, nomeVincitore) {
    if (!process.env.GROQ_API_KEY) return raccontoFallback(nomeSfidante, nomeAvversario, nomeVincitore);

    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + process.env.GROQ_API_KEY
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-20b',
                reasoning_effort: 'low',
                messages: [
                    {
                        role: 'system',
                        content:
                            'Scrivi un breve racconto assurdo e divertente (massimo 5 frasi, in italiano) di un ' +
                            'duello epico e ridicolo tra due persone, con armi/poteri improbabili. Alla fine deve ' +
                            'chiaramente vincere la persona indicata come vincitore designato, in un modo assurdo. ' +
                            'Niente titoli, niente spiegazioni, solo il racconto.'
                    },
                    {
                        role: 'user',
                        content: `Sfidante: ${nomeSfidante}. Avversario: ${nomeAvversario}. Vincitore designato: ${nomeVincitore}.`
                    }
                ],
                max_tokens: 250,
                temperature: 1.1
            })
        });

        const data = await res.json();
        if (data.error || !data.choices) {
            console.error('[ERRORE DUELLO]:', data.error?.message || 'risposta vuota');
            return raccontoFallback(nomeSfidante, nomeAvversario, nomeVincitore);
        }

        const racconto = data.choices[0].message.content.trim();
        if (!racconto) {
            console.error('[ERRORE DUELLO]: racconto vuoto ricevuto dall\'AI');
            return raccontoFallback(nomeSfidante, nomeAvversario, nomeVincitore);
        }

        return racconto;

    } catch (err) {
        console.error('[ERRORE DUELLO]:', err.message);
        return raccontoFallback(nomeSfidante, nomeAvversario, nomeVincitore);
    }
}

module.exports = {
    name: 'duello',

    async onMessage(message, ctx) {
        if (!message.content.trim().startsWith('!duello')) return false;

        const avversario = message.mentions.members?.first();

        if (!avversario) {
            await message.reply('Usa `!duello @utente` per sfidare qualcuno a duello!');
            return true;
        }

        if (avversario.id === message.author.id) {
            await message.reply('❌ Non puoi sfidare te stesso a duello!');
            return true;
        }

        if (avversario.user.bot) {
            await message.reply('❌ Non puoi sfidare un bot a duello!');
            return true;
        }

        const nomeSfidante = message.member.displayName;
        const nomeAvversario = avversario.displayName;

        // Vincitore deciso qui, in modo equo (50/50), PRIMA di chiedere il racconto all'AI
        const vinceSfidante = Math.random() < 0.5;
        const nomeVincitore = vinceSfidante ? nomeSfidante : nomeAvversario;

        await message.channel.sendTyping();

        const racconto = await raccontoDuelloAI(nomeSfidante, nomeAvversario, nomeVincitore);

        await message.reply(`⚔️ **DUELLO: ${nomeSfidante} vs ${nomeAvversario}**\n\n${racconto}\n\n🏆 **Vincitore: ${nomeVincitore}**`);
        return true;
    }
};
