const { EmbedBuilder } = require('discord.js');
const { CtfScore } = require('../db');

const TEMPO_LIMITE_MS = 60000; // 60 secondi per decifrare

// Lista di parole locali usata come fallback in caso di errore API
const PAROLE_CTF = [
    'firewall', 'malware', 'backdoor', 'phishing', 'exploit', 'rootkit',
    'botnet', 'ransomware', 'keylogger', 'honeypot', 'sandbox', 'zeroday',
    'spyware', 'trojan', 'worm', 'payload', 'cracker', 'bruteforce',
    'ddos', 'vulnerabilita', 'crittografia', 'autenticazione', 'sniffer',
    'hacker', 'cracking', 'spoofing', 'keystroke', 'antivirus',
    'steganografia', 'spearphishing', 'whaling', 'smishing', 'vishing',
    'cryptojacking', 'adware', 'bluejacking', 'sessionhijack', 'clickjacking',
    'typosquatting', 'credentialstuffing', 'passwordspray', 'dictionaryattack',
    'rainbowtable', 'salting', 'hashing', 'checksum', 'tunneling',
    'darkweb', 'deepweb', 'patch', 'sandboxing', 'quarantena', 'endpoint',
    'forensics', 'exfiltration', 'obfuscation', 'polymorphic', 'bootkit',
    'wiper', 'cryptolocker', 'logicbomb', 'dropper', 'packer', 'crypter',
    'screenlogger', 'formjacking', 'skimming', 'mitm', 'dnsspoofing', 'arpspoofing'
];

function getGuildStore(store, guildId) {
    if (!store[guildId]) store[guildId] = {};
    return store[guildId];
}

// Funzioni per l'offuscamento delle parole
function rot13(str) {
    return str.replace(/[a-zA-Z]/g, c => {
        const base = c <= 'Z' ? 65 : 97;
        return String.fromCharCode((c.charCodeAt(0) - base + 13) % 26 + base);
    });
}

function cesare(str, shift) {
    return str.replace(/[a-zA-Z]/g, c => {
        const base = c <= 'Z' ? 65 : 97;
        return String.fromCharCode((c.charCodeAt(0) - base + shift) % 26 + base);
    });
}

function esadecimale(str) {
    return Array.from(str).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
}

function binario(str) {
    return Array.from(str).map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
}

// Helper per interrogare Groq
async function ottieniParolaDaGroq() {
    if (!process.env.GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY non configurata');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 sec timeout

    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            signal: controller.signal,
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
                        content: 'Rispondi SOLO con una singola parola in italiano a tema informatica, cybersecurity o hacking. Nessuna punteggiatura, nessun testo aggiuntivo, tutto in minuscolo.'
                    },
                    { role: 'user', content: 'Genera una parola per il gioco CTF.' }
                ],
                max_tokens: 20,
                temperature: 0.9
            })
        });

        clearTimeout(timeoutId);
        const data = await res.json();

        if (data.error) throw new Error(data.error.message);

        const parolaGenerata = data.choices[0]?.message?.content?.trim().toLowerCase().replace(/[^a-z]/g, '');
        if (!parolaGenerata || parolaGenerata.length < 3) throw new Error('Parola generata non valida');

        return parolaGenerata;

    } catch (err) {
        clearTimeout(timeoutId);
        throw err;
    }
}

// Generatore della sfida asincrono con gestione del fallback
async function generaSfida() {
    let parola;
    let fonte;

    try {
        parola = await ottieniParolaDaGroq();
        fonte = 'AI (Groq)';
    } catch (err) {
        console.warn('[CTF Fallback]: Impossibile recuperare parola da Groq ->', err.message);
        parola = PAROLE_CTF[Math.floor(Math.random() * PAROLE_CTF.length)];
        fonte = 'Database Locale';
    }

    const tipi = ['rot13', 'base64', 'esadecimale', 'binario', 'rovesciato', 'cesare'];
    const tipo = tipi[Math.floor(Math.random() * tipi.length)];

    let testoCifrato, indizio;

    switch (tipo) {
        case 'rot13':
            testoCifrato = rot13(parola);
            indizio = 'Cifrato con **ROT13** (ogni lettera spostata di 13 posizioni nell\'alfabeto).';
            break;
        case 'base64':
            testoCifrato = Buffer.from(parola).toString('base64');
            indizio = 'Codificato in **Base64**.';
            break;
        case 'esadecimale':
            testoCifrato = esadecimale(parola);
            indizio = 'Ogni coppia di caratteri è un byte in **esadecimale** (es. 68 = "h").';
            break;
        case 'binario':
            testoCifrato = binario(parola);
            indizio = 'Ogni gruppo di 8 cifre è un carattere in **binario**.';
            break;
        case 'rovesciato':
            testoCifrato = parola.split('').reverse().join('');
            indizio = 'Il testo è semplicemente **letto al contrario**.';
            break;
        case 'cesare': {
            const shift = 1 + Math.floor(Math.random() * 24);
            testoCifrato = cesare(parola, shift);
            indizio = `Cifrario di **Cesare** con scorrimento di **${shift}** posizioni.`;
            break;
        }
    }

    return { parola, testoCifrato, indizio, tipo, fonte };
}

module.exports = {
    name: 'ctf',

    async onMessage(message, ctx) {
        const content = message.content.trim();
        const guildStore = getGuildStore(ctx.store, message.guildId);
        if (!guildStore.ctfAttivi) guildStore.ctfAttivi = new Map(); // channelId -> { parola, timer }

        if (content === '!ctf') {
            if (guildStore.ctfAttivi.has(message.channelId)) {
                await message.reply('⚠️ C\'è già una sfida CTF in corso in questo canale!');
                return true;
            }

            // Chiamata asincrona gestita con await
            const sfida = await generaSfida();

            const embed = new EmbedBuilder()
                .setColor(0x2B2D31)
                .setTitle('🔐 Mini-CTF: decifra il messaggio')
                .setDescription(
                    `\`\`\`${sfida.testoCifrato}\`\`\`\n${sfida.indizio}\n\n` +
                    `Scrivi la parola decifrata nel canale — hai ${TEMPO_LIMITE_MS / 1000} secondi!`
                )
                .setFooter({ text: `Fonte: ${sfida.fonte} • Un solo canale alla volta` });

            await message.channel.send({ embeds: [embed] });

            const timer = setTimeout(async () => {
                if (!guildStore.ctfAttivi.has(message.channelId)) return;
                guildStore.ctfAttivi.delete(message.channelId);
                await message.channel.send(
                    `⏰ Tempo scaduto! La parola era **${sfida.parola}**.`
                ).catch(() => {});
            }, TEMPO_LIMITE_MS);

            guildStore.ctfAttivi.set(message.channelId, { parola: sfida.parola, timer });
            return true;
        }

        if (content === '!ctfrank' || content === '!classifica-ctf') {
            try {
                const classifica = await CtfScore
                    .find({ guildId: message.guildId })
                    .sort({ vittorie: -1 })
                    .limit(10);

                if (classifica.length === 0) {
                    await message.reply('🔐 Nessuna sfida CTF vinta ancora su questo server.');
                    return true;
                }

                const righe = await Promise.all(
                    classifica.map(async (voce, i) => {
                        let membro = message.guild.members.cache.get(voce.userId);
                        if (!membro) {
                            membro = await message.guild.members.fetch(voce.userId).catch(() => null);
                        }
                        const nome = membro ? membro.displayName : 'Utente sconosciuto';
                        const medaglia = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
                        return `${medaglia} **${nome}** — ${voce.vittorie} decifrature`;
                    })
                );

                const embed = new EmbedBuilder()
                    .setColor(0x2B2D31)
                    .setTitle(`🔐 Classifica CTF — ${message.guild.name}`)
                    .setDescription(righe.join('\n'));

                await message.reply({ embeds: [embed] });
            } catch (err) {
                console.error('[ERRORE CTF - classifica]:', err.message);
                await message.reply('⚠️ Errore nel recuperare la classifica. Riprova tra poco.');
            }
            return true;
        }

        // Controllo tentativo di decifratura
        if (guildStore.ctfAttivi.has(message.channelId)) {
            const sfida = guildStore.ctfAttivi.get(message.channelId);
            const tentativo = content.toLowerCase().replace(/\s+/g, '');

            if (tentativo !== sfida.parola) return false;

            clearTimeout(sfida.timer);
            guildStore.ctfAttivi.delete(message.channelId);

            let aggiornato;
            try {
                aggiornato = await CtfScore.findOneAndUpdate(
                    { guildId: message.guildId, userId: message.author.id },
                    { $inc: { vittorie: 1 } },
                    { upsert: true, returnDocument: 'after' }
                );
            } catch (err) {
                console.error('[ERRORE CTF - salvataggio]:', err.message);
                await message.reply(`🎉 **Decifrato correttamente!** La parola era **${sfida.parola}**.`);
                return true;
            }

            await message.reply(
                `🎉 **Decifrato correttamente!** La parola era **${sfida.parola}**. ` +
                `Ora hai **${aggiornato.vittorie}** decifrature totali!`
            );

            return true;
        }

        return false;
    }
};
