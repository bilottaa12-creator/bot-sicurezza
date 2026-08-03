const untimeoutPlugin = {
    command: 'untimeout',
    category: 'admin',
    aliases: ['smuta', 'unmute', 'sblocca'],
    description: 'Rimuove immediatamente il Time-out (muto) di Discord da un utente taggato (Solo Staff)',
    handler: async (client, message, args, isOwner) => {
        try {
            // 🛡️ SICUREZZA: Solo chi ha i permessi di moderazione o amministrazione può sboccare la gente
            const haPermessoMod = message.member.permissions.has('ModerateMembers') || message.member.permissions.has('ManageMessages');
            const haPermessoAdmin = message.member.permissions.has('Administrator');

            if (!isOwner && !haPermessoMod && !haPermessoAdmin) {
                return await message.reply('❌ *Operazione negata. Questo modulo richiede permessi di livello Staff per revocare i provvedimenti.*');
            }

            // Prende l'utente taggato nel messaggio
            const utenteTaggato = message.mentions.members.first();

            if (!utenteTaggato) {
                return await message.reply('⚠ *Zio, specifica l\'utente a cui revocare il Time-out! Es: .untimeout @utente*');
            }

            // Controlla se l'utente ha effettivamente un Time-out attivo in questo momento
            if (!utenteTaggato.communicationDisabledUntilTimestamp || utenteTaggato.communicationDisabledUntilTimestamp < Date.now()) {
                return await message.reply('❌ *Questo utente non ha nessun Time-out o blocco attivo sul server.*');
            }

            // AZIONE SUPREMA: Impostando il time-out a "null", Discord cancella all'istante il blocco temporaneo!
            await utenteTaggato.timeout(null, `Time-out revocato manualmente da ${message.author.username}`).catch(err => {
                console.error("Errore durante la revoca del timeout:", err.message);
                return null;
            });

            const embedSblocco = {
                color: 0x00ff00, // Verde riattivazione
                title: `🔊 TIME-OUT REVOCATO CON SUCCESSO`,
                description: `✅ **L'UTENTE È STATO SMUTATO CORRETTAMENTE**\n\n` +
                             `👤 *Membro riabilitato:* <@${utenteTaggato.id}>\n` +
                             `⚙️ *Stato canale:* \`Restituito il permesso di scrittura e parola\`\n\n` +
                             `👮 *Provvedimento annullato da:* <@${message.author.id}>`
            };

            return await message.channel.send({ embeds: [embedSblocco] });

        } catch (err) {
            console.error("Errore generale nel plugin untimeout:", err);
            return await message.reply('❌ *Impossibile completare la revoca del blocco di rete.*').catch(() => null);
        }
    }
};

export default untimeoutPlugin;
EOF
