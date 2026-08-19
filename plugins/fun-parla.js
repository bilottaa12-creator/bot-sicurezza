const { eModeratoreOAdmin } = require('../utils');

const FRASI = [
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

module.exports = {
    name: 'fun-parla',
    async onMessage(message, ctx) {
        const guildStore = getGuildStore(ctx.store, message.guildId);

        if (message.content.trim() === '!parla') {
            if (!eModeratoreOAdmin(message.member)) {
                await message.reply('❌ Solo mod/admin');
                return true;
            }
            guildStore.parlaActive = true;
            await message.reply(`💬 MODALITÀ PARLA ON\n"${FRASI[Math.floor(Math.random() * FRASI.length)]}"`);
            return true;
        }

        if (message.content.trim() === '!parla-off') {
            if (!eModeratoreOAdmin(message.member)) {
                await message.reply('❌ Solo mod/admin');
                return true;
            }
            guildStore.parlaActive = false;
            await message.reply('💬 MODALITÀ PARLA OFF');
            return true;
        }

        if (guildStore.parlaActive) {
            await message.reply(`💬 "${FRASI[Math.floor(Math.random() * FRASI.length)]}"`);
        }
    }
};
