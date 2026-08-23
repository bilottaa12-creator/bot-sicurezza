const { eModeratoreOAdmin } = require('../utils');

// Parole casuali usate come "seme" per forzare frasi sempre diverse
const PAROLE_SEME = [
    'luna', 'frigorifero', 'coccodrillo', 'ombrello', 'pianeta', 'calzino',
    'vulcano', 'gatto', 'wifi', 'castello', 'banana', 'astronauta',
    'tastiera', 'nuvola', 'squalo', 'pizza', 'robot', 'foresta',
    'chitarra', 'medusa', 'treno', 'zaino', 'drago', 'panino'
];

function dueParoleCasuali() {
    const shuffled = [...PAROLE_SEME].sort(() => Math.random() - 0.5);
    return [shuffled[0], shuffled[1]];
}

// Frasi di riserva, usate solo se la chiamata all'AI fallisce
const FRASI_FALLBACK = [
    "Hai provato a spegnerlo e riaccenderlo?",
    "Non è un bug, è una feature!",
    "Stack overflow detected",
    "404 Soluzione non trovata",
    "Aggiorna i tuoi driver",
    "Sono tutti problemi di Windows",
    "Lo usate male voi, non è il codice"
];

function getGuildStore(store, guildId) {
    if (!store[guildId]) store[guildId] = {};
    return store[guildId];
}

function fraseFallback() {
    return FRASI_FALLBACK[Math.floor(Math.random() * FRASI_FALLBACK.length)];
}

async function fraseCasualeAI() {
    if (!process.env.GROQ_API_KEY) return fraseFallback();

    const [parola1, parola2] = dueParoleCasuali();

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
                            'Genera UNA sola frase breve (massimo 12 parole), in italiano, completamente ' +
                            'assurda e scollegata da qualsiasi contesto, come se rispondessi a caso senza ' +
                            'senso a chi ti scrive. Alterna casualmente tra affermazioni strane e domande ' +
                            'assurde rivolte a chi scrive. Niente spiegazioni, niente virgolette, solo la frase.'
                    },
                    {
                        role: 'user',
                        content: `Genera la frase incorporando in modo assurdo queste due parole: ${parola1} e ${parola2}.`
                    }
                ],
                max_tokens: 200,
                temperature: 1.3
            })
        });

        const data = await res.json();
        if (data.error || !data.choices) {
            console.error('[ERRORE FUN-PARLA]:', data.error?.message || 'risposta vuota');
            return fraseFallback();
        }

        const frase = data.choices[0].message.content.trim();
        if (!frase) {
            console.error('[ERRORE FUN-PARLA]: frase vuota ricevuta dall\'AI');
            return fraseFallback();
        }

        return frase;

    } catch (err) {
        console.error('[ERRORE FUN-PARLA]:', err.message);
        return fraseFallback();
    }
}

module.exports = {
    name: 'fun-parla',
    async onMessage(message, ctx) {
        const guildStore = getGuildStore(ctx.store, message.guildId);

        if (message.content.trim() === '!parla') {
            if (!(await eModeratoreOAdmin(message.member))) {
                await message.reply('❌ Solo mod/admin');
                return true;
            }
            guildStore.parlaActive = true;
            await message.reply(`💬 MODALITÀ PARLA ON\n"${await fraseCasualeAI()}"`);
            return true;
        }

        if (message.content.trim() === '!parla-off') {
            if (!(await eModeratoreOAdmin(message.member))) {
                await message.reply('❌ Solo mod/admin');
                return true;
            }
            guildStore.parlaActive = false;
            await message.reply('💬 MODALITÀ PARLA OFF');
            return true;
        }

        if (guildStore.parlaActive) {
            await message.reply(`💬 "${await fraseCasualeAI()}"`);
        }
    }
};
