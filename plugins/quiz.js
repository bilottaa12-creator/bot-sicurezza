const { EmbedBuilder } = require('discord.js');
const { QuizScore } = require('../db');

const TEMPO_LIMITE_MS = 30000; // 30 secondi per rispondere
const LETTERE = ['A', 'B', 'C', 'D'];
const PUNTI_PER_DIFFICOLTA = { facile: 1, medio: 2, difficile: 3 };

function getGuildStore(store, guildId) {
    if (!store[guildId]) store[guildId] = {};
    return store[guildId];
}

async function generaDomandaAI() {
    if (!process.env.GROQ_API_KEY) return null;

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
                            'Genera UNA domanda di cultura generale (storia, geografia, scienza, arte, sport, ' +
                            'attualità, cinema) in italiano, con esattamente 4 opzioni di risposta, di cui solo ' +
                            'una corretta. Scegli TU casualmente il livello di difficoltà tra "facile", "medio" ' +
                            'e "difficile", variando ad ogni domanda, e varia anche l\'argomento. Rispondi SOLO ' +
                            'con un oggetto JSON valido, senza markdown, senza testo attorno, in questo formato ' +
                            'esatto: {"domanda": "...", "opzioni": ["...", "...", "...", "..."], "corretta": 0, ' +
                            '"difficolta": "facile"}. Il campo "corretta" è l\'indice (0, 1, 2 o 3) dell\'opzione ' +
                            'giusta nell\'array. Il campo "difficolta" deve essere esattamente una di: "facile", "medio", "difficile".'
                    },
                    { role: 'user', content: 'Genera la domanda.' }
                ],
                max_tokens: 400,
                temperature: 1.0
            })
        });

        const data = await res.json();
        if (data.error || !data.choices) {
            console.error('[ERRORE QUIZ - generazione]:', data.error?.message || 'risposta vuota');
            return null;
        }

        const testo = data.choices[0].message.content.trim();
        const pulito = testo.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(pulito);

        if (!parsed.domanda || !Array.isArray(parsed.opzioni) || parsed.opzioni.length !== 4 ||
            typeof parsed.corretta !== 'number' || parsed.corretta < 0 || parsed.corretta > 3 ||
            !PUNTI_PER_DIFFICOLTA[parsed.difficolta]) {
            console.error('[ERRORE QUIZ - formato non valido]:', testo);
            return null;
        }

        return parsed;

    } catch (err) {
        console.error('[ERRORE QUIZ - generazione]:', err.message);
        return null;
    }
}

module.exports = {
    name: 'quiz',

    async onMessage(message, ctx) {
        const content = message.content.trim();
        const guildStore = getGuildStore(ctx.store, message.guildId);
        if (!guildStore.quizAttivi) guildStore.quizAttivi = new Map(); // channelId -> { corretta, opzioni, timer, domandaTesto }

        // Avvio di un nuovo quiz
        if (content === '!quiz') {
            if (guildStore.quizAttivi.has(message.channelId)) {
                await message.reply('⚠️ C\'è già un quiz in corso in questo canale, rispondi prima a quello!');
                return true;
            }

            await message.channel.sendTyping();
            const domanda = await generaDomandaAI();

            if (!domanda) {
                await message.reply('⚠️ Non sono riuscito a generare una domanda, riprova tra poco.');
                return true;
            }

            const listaOpzioni = domanda.opzioni
                .map((opz, i) => `**${LETTERE[i]}.** ${opz}`)
                .join('\n');

            const emojiDifficolta = { facile: '🟢', medio: '🟡', difficile: '🔴' }[domanda.difficolta];

            const embed = new EmbedBuilder()
                .setColor(0xFEE75C)
                .setTitle('🧠 Quiz di cultura generale')
                .setDescription(`${domanda.domanda}\n\n${listaOpzioni}`)
                .setFooter({
                    text: `${emojiDifficolta} ${domanda.difficolta.toUpperCase()} (vale ${PUNTI_PER_DIFFICOLTA[domanda.difficolta]} punti) — Rispondi con una lettera (A-D), hai ${TEMPO_LIMITE_MS / 1000} secondi!`
                });

            await message.channel.send({ embeds: [embed] });

            const timer = setTimeout(async () => {
                if (!guildStore.quizAttivi.has(message.channelId)) return; // già risposto
                guildStore.quizAttivi.delete(message.channelId);
                await message.channel.send(
                    `⏰ Tempo scaduto! La risposta corretta era **${LETTERE[domanda.corretta]}. ${domanda.opzioni[domanda.corretta]}**.`
                ).catch(() => {});
            }, TEMPO_LIMITE_MS);

            guildStore.quizAttivi.set(message.channelId, {
                corretta: domanda.corretta,
                opzioni: domanda.opzioni,
                difficolta: domanda.difficolta,
                timer
            });

            return true;
        }

        // !quizrank (alias !classifica-quiz)
        if (content === '!quizrank' || content === '!classifica-quiz') {
            try {
                const classifica = await QuizScore
                    .find({ guildId: message.guildId })
                    .sort({ punti: -1 })
                    .limit(10);

                if (classifica.length === 0) {
                    await message.reply('🧠 Nessuna vittoria ancora registrata su questo server.');
                    return true;
                }

                const righe = await Promise.all(
                    classifica.map(async (voce, i) => {
                        const membro = await message.guild.members.fetch(voce.userId).catch(() => null);
                        const nome = membro ? membro.displayName : 'Utente sconosciuto';
                        const medaglia = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
                        return `${medaglia} **${nome}** — ${voce.punti} punti (${voce.vittorie} vittorie)`;
                    })
                );

                const embed = new EmbedBuilder()
                    .setColor(0xFEE75C)
                    .setTitle(`🧠 Classifica quiz — ${message.guild.name}`)
                    .setDescription(righe.join('\n'));

                await message.reply({ embeds: [embed] });

            } catch (err) {
                console.error('[ERRORE QUIZ - classifica]:', err.message);
                await message.reply('⚠️ Errore nel recuperare la classifica. Riprova tra poco.');
            }

            return true;
        }

        // Controllo risposta (solo se c'è un quiz attivo in questo canale)
        if (guildStore.quizAttivi.has(message.channelId)) {
            const rispostaData = /^[a-dA-D]$/.test(content) ? content.toUpperCase() : null;
            if (!rispostaData) return false; // non è una risposta valida, ignora (lascia passare ad altri plugin)

            const quiz = guildStore.quizAttivi.get(message.channelId);
            const indiceRisposta = LETTERE.indexOf(rispostaData);

            if (indiceRisposta !== quiz.corretta) return false; // risposta sbagliata, il quiz resta attivo

            clearTimeout(quiz.timer);
            guildStore.quizAttivi.delete(message.channelId);

            try {
                const punti = PUNTI_PER_DIFFICOLTA[quiz.difficolta];
                const aggiornato = await QuizScore.findOneAndUpdate(
                    { guildId: message.guildId, userId: message.author.id },
                    { $inc: { vittorie: 1, punti } },
                    { upsert: true, new: true }
                );

                await message.reply(
                    `🎉 **Esatto!** La risposta era **${LETTERE[quiz.corretta]}. ${quiz.opzioni[quiz.corretta]}**. ` +
                    `+${punti} punti (${quiz.difficolta}) — ora hai **${aggiornato.punti}** punti totali (${aggiornato.vittorie} vittorie)!`
                );
            } catch (err) {
                console.error('[ERRORE QUIZ - salvataggio vittoria]:', err.message);
                await message.reply(`🎉 **Esatto!** La risposta era **${LETTERE[quiz.corretta]}. ${quiz.opzioni[quiz.corretta]}**.`);
            }

            return true;
        }

        return false;
    }
};
