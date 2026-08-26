const { EmbedBuilder } = require('discord.js');
const { eModeratoreOAdmin } = require('../utils');
const { GuildSettings } = require('../db');

// Immagine di sfondo per l'embed di benvenuto
const IMMAGINE_BENVENUTO = 'https://raw.githubusercontent.com/bilottaa12-creator/bot-sicurezza/main/assets/eva.rei.gif';

async function isWelcomeAttivo(guildId) {
    const settings = await GuildSettings.findOne({ guildId });
    return settings?.welcomeEnabled || false;
}

module.exports = {
    name: 'welcome',

    async onMessage(message, ctx) {
        const content = message.content.trim();
        if (content !== '!welcome-on' && content !== '!welcome-off') return false;

        if (!(await eModeratoreOAdmin(message.member))) {
            await message.reply('❌ Solo mod/admin');
            return true;
        }

        const attivo = content === '!welcome-on';

        try {
            await GuildSettings.findOneAndUpdate(
                { guildId: message.guildId },
                { welcomeEnabled: attivo },
                { upsert: true }
            );
        } catch (err) {
            console.error('[ERRORE WELCOME - toggle]:', err.message);
            await message.reply('⚠️ Errore nel salvare l\'impostazione. Riprova tra poco.');
            return true;
        }

        await message.reply(
            attivo
                ? '✅ Messaggio di benvenuto **attivato**.'
                : '✅ Messaggio di benvenuto **disattivato**.'
        );
        return true;
    },

    async onMemberAdd(member, ctx) {
        let attivo;
        try {
            attivo = await isWelcomeAttivo(member.guild.id);
        } catch (err) {
            console.error('[ERRORE WELCOME - lettura]:', err.message);
            return;
        }

        if (!attivo) return;

        // Canale dove mandare il benvenuto: cerca "benvenuto" o "welcome",
        // altrimenti usa il canale di sistema del server
        const canale =
            member.guild.channels.cache.find(c => c.isTextBased?.() && (c.name === 'benvenuto' || c.name === 'welcome')) ||
            member.guild.systemChannel;

        if (!canale) return;

        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle(`🎉 Benvenuto/a, ${member.user.username}!`)
            .setDescription(`Sei il membro **#${member.guild.memberCount}** di **${member.guild.name}**!`)
            .setThumbnail(member.user.displayAvatarURL())
            .setImage(IMMAGINE_BENVENUTO)
            .setFooter({ text: 'Buon divertimento nel server!' });

        try {
            await canale.send({ embeds: [embed] });
        } catch (err) {
            console.error('[ERRORE WELCOME - invio]:', err.message);
        }
    }
};
