const { eModeratoreOAdmin, inviaLogSicurezza } = require('../utils');

const SOGLIA_ESCALATION = 3;
const DURATA_TIMEOUT_MS = 10 * 60 * 1000; // 10 minuti

function getGuildStore(store, guildId) {
    if (!store[guildId]) store[guildId] = {};
    return store[guildId];
}

function getWarningsUtente(guildStore, userId) {
    if (!guildStore.warnings) guildStore.warnings = {};
    if (!guildStore.warnings[userId]) guildStore.warnings[userId] = [];
    return guildStore.warnings[userId];
}

module.exports = {
    name: 'warn',

    async onMessage(message, ctx) {
        const content = message.content.trim();
        const guildStore = getGuildStore(ctx.store, message.guildId);

        // !warn @utente <motivo>
        if (content.startsWith('!warn ') || content === '!warn') {
            if (!(await eModeratoreOAdmin(message.member))) {
                await message.reply('❌ Solo mod/admin');
                return true;
            }

            const target = message.mentions.members?.first();
            if (!target) {
                await message.reply('Usa `!warn @utente <motivo>` per aggiungere un richiamo.');
                return true;
            }

            // Rimuove la menzione dal testo per isolare il motivo
            const motivo = content
                .replace('!warn', '')
                .replace(/<@!?\d+>/, '')
                .trim() || 'Nessun motivo specificato';

            const warnings = getWarningsUtente(guildStore, target.id);
            warnings.push({
                motivo,
                moderatore: message.author.tag,
                data: new Date().toISOString()
            });

            await message.reply(
                `⚠️ **${target.displayName}** ha ricevuto un richiamo (${warnings.length}/${SOGLIA_ESCALATION}).\n` +
                `Motivo: ${motivo}`
            );

            await inviaLogSicurezza(
                message.guild,
                `⚠️ **WARN**: ${target.displayName} richiamato da ${message.author.tag}. ` +
                `Motivo: ${motivo}. Totale richiami: ${warnings.length}.`
            );

            // Escalation al terzo richiamo
            if (warnings.length >= SOGLIA_ESCALATION) {
                try {
                    await target.timeout(DURATA_TIMEOUT_MS, `Escalation automatica: ${SOGLIA_ESCALATION} richiami raggiunti`);
                    await message.channel.send(
                        `🚨 **${target.displayName}** ha raggiunto ${SOGLIA_ESCALATION} richiami: timeout automatico di 10 minuti applicato.`
                    );
                    await inviaLogSicurezza(
                        message.guild,
                        `🚨 **ESCALATION AUTOMATICA**: ${target.displayName} messo in timeout (10 min) per aver raggiunto ${SOGLIA_ESCALATION} richiami.`
                    );
                } catch (err) {
                    console.error('[ERRORE WARN - escalation]:', err.message);
                    await inviaLogSicurezza(
                        message.guild,
                        `⚠️ Escalation fallita per ${target.displayName}: verifica i permessi del bot (serve "Modera membri").`
                    );
                }
            }

            return true;
        }

        // !warnings @utente (alias !avvisi)
        if (content.startsWith('!warnings') || content.startsWith('!avvisi')) {
            const target = message.mentions.members?.first() || message.member;
            const warnings = getWarningsUtente(guildStore, target.id);

            if (warnings.length === 0) {
                await message.reply(`✅ **${target.displayName}** non ha nessun richiamo.`);
                return true;
            }

            const lista = warnings
                .map((w, i) => `**${i + 1}.** ${w.motivo} — da ${w.moderatore}`)
                .join('\n');

            await message.reply(
                `⚠️ **Richiami di ${target.displayName}** (${warnings.length}/${SOGLIA_ESCALATION})\n\n${lista}`
            );
            return true;
        }

        // !unwarn @utente [numero] — solo mod/admin. Senza numero toglie l'ultimo richiamo.
        if (content.startsWith('!unwarn')) {
            if (!(await eModeratoreOAdmin(message.member))) {
                await message.reply('❌ Solo mod/admin');
                return true;
            }

            const target = message.mentions.members?.first();
            if (!target) {
                await message.reply('Usa `!unwarn @utente [numero]` per togliere un richiamo (senza numero, toglie l\'ultimo).');
                return true;
            }

            const warnings = getWarningsUtente(guildStore, target.id);
            if (warnings.length === 0) {
                await message.reply(`✅ **${target.displayName}** non ha richiami da togliere.`);
                return true;
            }

            // Estrae un eventuale numero dal comando (es. "!unwarn @utente 2")
            const numeroMatch = content.match(/\s(\d+)\s*$/);
            const indice = numeroMatch ? parseInt(numeroMatch[1], 10) - 1 : warnings.length - 1;

            if (indice < 0 || indice >= warnings.length) {
                await message.reply(`⚠️ Numero non valido. **${target.displayName}** ha ${warnings.length} richiami (usa un numero da 1 a ${warnings.length}).`);
                return true;
            }

            const [rimosso] = warnings.splice(indice, 1);

            await message.reply(
                `✅ Rimosso richiamo **${indice + 1}** di **${target.displayName}** ("${rimosso.motivo}"). ` +
                `Richiami rimanenti: ${warnings.length}/${SOGLIA_ESCALATION}.`
            );
            await inviaLogSicurezza(
                message.guild,
                `🧹 Richiamo rimosso da ${target.displayName} ("${rimosso.motivo}") da parte di ${message.author.tag}.`
            );
            return true;
        }

        // !clearwarn @utente — solo mod/admin
        if (content.startsWith('!clearwarn')) {
            if (!(await eModeratoreOAdmin(message.member))) {
                await message.reply('❌ Solo mod/admin');
                return true;
            }

            const target = message.mentions.members?.first();
            if (!target) {
                await message.reply('Usa `!clearwarn @utente` per azzerare i suoi richiami.');
                return true;
            }

            if (!guildStore.warnings) guildStore.warnings = {};
            guildStore.warnings[target.id] = [];

            await message.reply(`✅ Richiami di **${target.displayName}** azzerati.`);
            await inviaLogSicurezza(
                message.guild,
                `🧹 Richiami di ${target.displayName} azzerati da ${message.author.tag}.`
            );
            return true;
        }

        return false;
    }
};
