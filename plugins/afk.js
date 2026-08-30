function getGuildStore(store, guildId) {
    if (!store[guildId]) store[guildId] = {};
    return store[guildId];
}

function formattaTempo(ms) {
    const minuti = Math.floor(ms / 60000);
    if (minuti < 1) return 'meno di un minuto';
    if (minuti < 60) return `${minuti} minut${minuti === 1 ? 'o' : 'i'}`;
    const ore = Math.floor(minuti / 60);
    return `${ore} or${ore === 1 ? 'a' : 'e'}`;
}

module.exports = {
    name: 'afk',

    async onMessage(message, ctx) {
        const guildStore = getGuildStore(ctx.store, message.guildId);
        if (!guildStore.afk) guildStore.afk = new Map(); // userId -> { motivo, dal }

        const content = message.content.trim();

        // !afk [motivo]
        if (content === '!afk' || content.startsWith('!afk ')) {
            const motivo = content.replace('!afk', '').trim() || 'Nessun motivo specificato';
            guildStore.afk.set(message.author.id, { motivo, dal: Date.now() });

            await message.reply(`💤 Sei stato segnato come **AFK**. Motivo: ${motivo}`);
            return true;
        }

        let bentornato = false;

        // chi scrive era AFK, si rimuove e da il bentornato
        if (guildStore.afk.has(message.author.id)) {
            const dati = guildStore.afk.get(message.author.id);
            guildStore.afk.delete(message.author.id);
            await message.reply(`👋 Bentornato/a **${message.member.displayName}**! Eri AFK da ${formattaTempo(Date.now() - dati.dal)}.`);
            bentornato = true;
        }

        // Se qualcuno menziona un utente AFK, avvisa
        if (message.mentions.users.size > 0) {
            for (const [userId, utente] of message.mentions.users) {
                if (userId === message.author.id) continue; //  gestito sopra
                if (guildStore.afk.has(userId)) {
                    const dati = guildStore.afk.get(userId);
                    await message.reply(
                        `💤 **${utente.username}** è AFK da ${formattaTempo(Date.now() - dati.dal)}. Motivo: ${dati.motivo}`
                    );
                }
            }
        }

        return bentornato; // se ha dato il bentornato, si ferma qui; altrimenti passa avanti agli altri plugin
    }
};
