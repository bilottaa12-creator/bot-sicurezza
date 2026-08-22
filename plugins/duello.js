// Racconti di riserva se l'AI non risponde (il {vincitore} viene sostituito)
const RACCONTI_FALLBACK = [
    "{sfidante} sguainò la lama forgiata nel fuoco antico, fronteggiando {avversario} sotto un cielo di tempesta. Le spade cantarono scintille per un'eternità, finché {vincitore} non trovò la breccia fatale nella guardia nemica.",
    "Il sangue di drago scorreva ancora sul terreno quando {sfidante} e {avversario} si scontrarono, magia oscura e acciaio che si intrecciavano nell'aria. Con un ultimo, devastante fendente, {vincitore} pose fine allo scontro.",
    "Nessuna tregua fu concessa tra {sfidante} e {avversario}: incantesimi proibiti squarciarono il campo di battaglia. Quando la polvere si posò, solo {vincitore} restava in piedi, la lama ancora fumante."
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
                            'Scrivi un breve racconto epico e serio (massimo 4 frasi, in italiano) di un duello ' +
                            'in stile fantasy tra due guerrieri, con spade vere, magia oscura e toni drammatici. ' +
                            'Stile cinematografico e teso, come una scena di battaglia in un romanzo fantasy. ' +
                            'Alla fine deve chiaramente vincere la persona indicata come vincitore designato. ' +
                            'Niente titoli, niente spiegazioni, solo il racconto.'
                    },
                    {
                        role: 'user',
                        content: `Sfidante: ${nomeSfidante}. Avversario: ${nomeAvversario}. Vincitore designato: ${nomeVincitore}.`
                    }
                ],
                max_tokens: 400,
                temperature: 1.1
            })
        });

        const data = await res.json();
        if (data.error || !data.choices) {
            console.error('[ERRORE DUELLO]:', data.error?.message || 'risposta vuota');
            return raccontoFallback(nomeSfidante, nomeAvversario, nomeVincitore);
        }

        const racconto = data.choices[0].message.content.trim();
        const terminaBene = /[.!?]$/.test(racconto);

        if (!racconto || !terminaBene) {
            console.error('[ERRORE DUELLO]: racconto vuoto o troncato ricevuto dall\'AI');
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

        await message.reply(`⚔️ **${nomeSfidante} contro ${nomeAvversario}**\n\n${racconto}\n\n🏆 **Ha prevalso: ${nomeVincitore}**`);
        return true;
    }
};
