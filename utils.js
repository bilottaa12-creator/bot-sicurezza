const { PermissionsBitField } = require('discord.js');

function eModeratoreOAdmin(member) {
    if (!member) return false;
    const haPermessoAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
    const haRuoloMod = member.roles.cache.some(role => role.name.toLowerCase().includes('mod'));
    return haPermessoAdmin || haRuoloMod;
}

// Trova il canale dove scrivere i log di sicurezza:
// 1) se hai impostato la variabile d'ambiente LOG_CHANNEL_ID su Render, usa quello
// 2) altrimenti cerca un canale chiamato "log-sicurezza"
// 3) altrimenti usa il canale di sistema del server
async function trovaCanaleLog(guild) {
    if (process.env.LOG_CHANNEL_ID) {
        const canale = await guild.channels.fetch(process.env.LOG_CHANNEL_ID).catch(() => null);
        if (canale) return canale;
    }
    const perNome = guild.channels.cache.find(c => c.isTextBased?.() && c.name === 'log-sicurezza');
    if (perNome) return perNome;
    return guild.systemChannel || null;
}

async function inviaLogSicurezza(guild, testo) {
    const canale = await trovaCanaleLog(guild);
    if (!canale) return;
    try {
        await canale.send(testo);
    } catch (err) {
        console.error('[LOG SICUREZZA] Errore invio:', err.message);
    }
}

module.exports = { eModeratoreOAdmin, inviaLogSicurezza };
