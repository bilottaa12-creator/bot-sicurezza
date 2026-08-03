const { eModeratoreOAdmin, inviaLogSicurezza } = require('../utils');

// Comandi che attivano questo plugin (con alias)
const COMANDI = ['!untimeout', '!smuta', '!unmute', '!sblocca'];

module.exports = {
    name: 'untimeout',

    async onMessage(message, ctx) {
        const parole = message.content.trim().split(/\s+/);
        const comando = parole[0]?.toLowerCase();

        if (!COMANDI.includes(comando)) return false;

        // 🛡️ SICUREZZA: solo Staff (permessi di moderazione/admin) può rimuovere un timeout
        const haPermessoMod = message.member.permissions.has('ModerateMembers') || message.member.permissions.has('ManageMessages');
        if (!eModeratoreOAdmin(message.member) && !haPermessoMod) {
            await message.reply('❌ *Operazione negata. Questo comando richiede permessi di livello Staff.*');
            return true;
        }

        const utenteTaggato = message.mentions.members.first();
        if (!utenteTaggato) {
            await message.reply('⚠ *Specifica l\'utente a cui revocare il Time-out! Es: `!untimeout @utente`*');
            return true;
        }

        if (!utenteTaggato.communicationDisabledUntilTimestamp || utenteTaggato.communicationDisabledUntilTimestamp < Date.now()) {
            await message.reply('❌ *Questo utente non ha nessun Time-out attivo sul server.*');
            return true;
        }

        try {
            await utenteTaggato.timeout(null, `Time-out revocato manualmente da ${message.author.username}`);
        } catch (err) {
            console.error('[UNTIMEOUT] Errore nella revoca:', err.message);
            await message.reply('❌ *Impossibile rimuovere il Time-out (controlla la posizione del ruolo del bot).*');
            return true;
        }

        await message.channel.send({
            embeds: [{
                color: 0x00ff00,
                title: '🔊 TIME-OUT REVOCATO CON SUCCESSO',
                description:
                    `✅ **L'utente è stato smutato correttamente**\n\n` +
                    `👤 *Membro riabilitato:* <@${utenteTaggato.id}>\n\n` +
                    `👮 *Provvedimento annullato da:* <@${message.author.id}>`
            }]
        });

        await inviaLogSicurezza(message.guild,
            `🔊 **Untimeout** — <@${message.author.id}> ha rimosso il timeout a <@${utenteTaggato.id}>.`
        );

        return true;
    }
};
