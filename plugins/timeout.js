const { eModeratoreOAdmin, inviaLogSicurezza } = require('../utils');

const COMANDI = ['!timeout', '!muta', '!mute', '!blocca'];
const DURATA_DEFAULT_MIN = 5;    // se non specifichi i minuti, usa questo valore (allineato all'antispam)
const DURATA_MASSIMA_MIN = 40320; // limite di Discord: 28 giorni

module.exports = {
    name: 'timeout',

    async onMessage(message, ctx) {
        const parole = message.content.trim().split(/\s+/);
        const comando = parole[0]?.toLowerCase();

        if (!COMANDI.includes(comando)) return false;

        // 🛡️ SICUREZZA: solo Staff può dare un timeout
        const haPermessoMod = message.member.permissions.has('ModerateMembers') || message.member.permissions.has('ManageMessages');
        if (!(await eModeratoreOAdmin(message.member)) && !haPermessoMod) {
            await message.reply('❌ *Operazione negata. Questo comando richiede permessi di livello Staff.*');
            return true;
        }

        const utenteTaggato = message.mentions.members.first();
        if (!utenteTaggato) {
            await message.reply('⚠ *Specifica l\'utente da mettere in Time-out! Es: `!timeout @utente 10 spam`*');
            return true;
        }

        // Non si può dare il timeout a chi ha permessi alti quanto o più di te
        if (await eModeratoreOAdmin(utenteTaggato)) {
            await message.reply('❌ *Non puoi mettere in Time-out un altro membro dello Staff.*');
            return true;
        }

        // Cerca un numero tra gli argomenti (i minuti); tutto il resto dopo diventa il motivo
        const argomenti = parole.slice(1).filter(p => !p.startsWith('<@'));
        const indiceNumero = argomenti.findIndex(p => /^\d+$/.test(p));
        const minuti = indiceNumero !== -1
            ? Math.min(parseInt(argomenti[indiceNumero], 10), DURATA_MASSIMA_MIN)
            : DURATA_DEFAULT_MIN;
        const motivo = (indiceNumero !== -1
            ? [...argomenti.slice(0, indiceNumero), ...argomenti.slice(indiceNumero + 1)]
            : argomenti
        ).join(' ') || 'Nessun motivo specificato';

        try {
            await utenteTaggato.timeout(minuti * 60 * 1000, `${motivo} — da ${message.author.username}`);
        } catch (err) {
            console.error('[TIMEOUT] Errore nell\'applicare il timeout:', err.message);
            await message.reply('❌ *Impossibile applicare il Time-out (controlla la posizione del ruolo del bot).*');
            return true;
        }

        await message.channel.send({
            embeds: [{
                color: 0xff9900,
                title: '🔇 TIME-OUT APPLICATO',
                description:
                    `⛔ **L'utente è stato messo in Time-out**\n\n` +
                    `👤 *Membro:* <@${utenteTaggato.id}>\n` +
                    `⏱️ *Durata:* ${minuti} minuti\n` +
                    `📝 *Motivo:* ${motivo}\n\n` +
                    `👮 *Applicato da:* <@${message.author.id}>`
            }]
        });

        await inviaLogSicurezza(message.guild,
            `🔇 **Timeout** — <@${message.author.id}> ha messo in timeout <@${utenteTaggato.id}> per ${minuti} min (motivo: ${motivo}).`
        );

        return true;
    }
};
