const { eModeratoreOAdmin } = require('../utils');
const { EmbedBuilder } = require('discord.js');

const FOTO_TUX = [
    'https://www.tux.org/~torvalds/linux/linux-logo.png',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Tux.svg/1200px-Tux.svg.png',
    'https://raw.githubusercontent.com/torvalds/linux/master/Documentation/logo.png'
];

function getFotoRandom() {
    return FOTO_TUX[Math.floor(Math.random() * FOTO_TUX.length)];
}

function getGuildStore(store, guildId) {
    if (!store[guildId]) store[guildId] = {};
    return store[guildId];
}

module.exports = {
    name: 'fun-tux',

    async onMessage(message, ctx) {
        const { store } = ctx;
        const guildStore = getGuildStore(store, message.guildId);

        // COMANDO TUX-ON
        if (message.content.trim() === '!tux-on') {
            if (!eModeratoreOAdmin(message.member)) {
                await message.reply('❌ Solo i Moderatori e gli Amministratori possono usare questo comando.');
                return true;
            }
            guildStore.tuxSpamActive = true;
            await message.reply('🐧 **TUX MODE ATTIVATO!** Tux arriva ad ogni messaggio!');
            return true;
        }

        // COMANDO TUX-OFF
        if (message.content.trim() === '!tux-off') {
            if (!eModeratoreOAdmin(message.member)) {
                await message.reply('❌ Solo i Moderatori e gli Amministratori possono usare questo comando.');
                return true;
            }
            guildStore.tuxSpamActive = false;
            await message.reply('🐧 **TUX MODE DISATTIVATO!**');
            return true;
        }

        // SE TUX SPAM ATTIVO, MANDA TUX AD OGNI MESSAGGIO
        if (guildStore.tuxSpamActive) {
            try {
                const embed = new EmbedBuilder()
                    .setImage(getFotoRandom())
                    .setColor('#FFD700')
                    .setFooter({ text: '🐧 Tux approva!' });
                await message.reply({ embeds: [embed] });
            } catch (err) {
                console.error('Errore nel mandare Tux:', err.message);
            }
            return false;
        }

        return false;
    }
};
