const { AuditLogEvent } = require('discord.js');
const { inviaLogSicurezza } = require('../utils');

function getGuildStore(store, guildId) {
    if (!store[guildId]) store[guildId] = {};
    return store[guildId];
}

// ---- CONFIGURAZIONE ----
const SOGLIA_AZIONI = 3;       // quante azioni pericolose...
const FINESTRA_MS = 10000;     // ...in quanti millisecondi = probabile nuke/raid

// Azioni considerate distruttive: cancellare canali/ruoli, bannare, kickare,
// creare webhook (usati per spammare da fuori Discord), dare ruoli a qualcuno.
const AZIONI_PERICOLOSE = new Set([
    AuditLogEvent.ChannelDelete,
    AuditLogEvent.RoleDelete,
    AuditLogEvent.MemberBanAdd,
    AuditLogEvent.MemberKick,
    AuditLogEvent.WebhookCreate,
    AuditLogEvent.MemberRoleUpdate
]);

module.exports = {
    name: 'antinuke',

    // Questo plugin non reagisce ai messaggi, solo all'audit log del server.
    async onAuditLogEntry(entry, guild, ctx) {
        if (!AZIONI_PERICOLOSE.has(entry.action)) return;

        const executorId = entry.executorId;
        if (!executorId) return;
        if (executorId === guild.ownerId) return;        // non tocchiamo il proprietario del server
        if (executorId === guild.client.user.id) return; // non blocchiamo il nostro stesso bot

        const guildStore = getGuildStore(ctx.store, guild.id);
        if (!guildStore.antinuke) guildStore.antinuke = new Map(); // executorId -> [timestamp, timestamp, ...]

        const ora = Date.now();
        const azioni = (guildStore.antinuke.get(executorId) || []).filter(t => ora - t < FINESTRA_MS);
        azioni.push(ora);
        guildStore.antinuke.set(executorId, azioni);

        if (azioni.length < SOGLIA_AZIONI) return; // ancora sotto soglia, non fare nulla

        guildStore.antinuke.set(executorId, []); // reset, evita di ripetere l'azione ad ogni evento successivo

        const member = await guild.members.fetch(executorId).catch(() => null);

        let esito = 'utente non più nel server';
        if (member) {
            try {
                await member.roles.set([], 'Anti-nuke: troppe azioni distruttive rilevate in poco tempo');
                esito = 'tutti i ruoli sono stati rimossi';
            } catch (err) {
                esito = `ruoli NON rimossi (${err.message}) — controlla la posizione del ruolo del bot`;
            }
        }

        await inviaLogSicurezza(guild,
            `🚨 **ANTI-NUKE:** <@${executorId}> ha eseguito ${azioni.length} azioni distruttive in pochi secondi ` +
            `(cancellazioni canali/ruoli, ban, kick o simili). Esito: ${esito}. Controlla i registri di controllo del server per i dettagli.`
        );
    }
};
