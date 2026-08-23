const { EmbedBuilder } = require('discord.js');
const { eModeratoreOAdmin } = require('../utils');

function getGuildStore(store, guildId) {
    if (!store[guildId]) store[guildId] = {};
    return store[guildId];
}

// Immagini Tux a rotazione casuale (link raw GitHub)
const TUX_IMAGES = [
    'https://raw.githubusercontent.com/bilottaa12-creator/bot-sicurezza/main/assets/tux1.webp'
    // aggiungi qui altri link man mano che carichi altre immagini
];

function tuxImageCasuale() {
    return TUX_IMAGES[Math.floor(Math.random() * TUX_IMAGES.length)];
}

module.exports = {
    name: 'fun-tux',
    async onMessage(message, ctx) {
        const guildStore = getGuildStore(ctx.store, message.guildId);

        if (message.content.trim() === '!tux-on') {
            if (!(await eModeratoreOAdmin(message.member))) {
                await message.reply('❌ Solo mod/admin');
                return true;
            }
            guildStore.tuxSpamActive = true;
            await message.reply('🐧 TUX MODE ON! Tux arriva ad ogni messaggio!');
            return true;
        }

        if (message.content.trim() === '!tux-off') {
            if (!(await eModeratoreOAdmin(message.member))) {
                await message.reply('❌ Solo mod/admin');
                return true;
            }
            guildStore.tuxSpamActive = false;
            await message.reply('🐧 TUX MODE OFF!');
            return true;
        }

        if (guildStore.tuxSpamActive) {
            const embed = new EmbedBuilder()
                .setColor(0xFFCC00)
                .setDescription('🐧 Tux approva!')
                .setThumbnail(tuxImageCasuale());

            try {
                await message.reply({ embeds: [embed] });
            } catch (err) {
                console.error('[ERRORE FUN-TUX]:', err.message);
                await message.reply('🐧 Tux approva!');
            }
        }
    }
};
