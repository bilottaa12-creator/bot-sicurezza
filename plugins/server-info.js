const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'server-info',

    async onMessage(message, ctx) {
        const content = message.content.trim();
        if (content !== '!server' && content !== '!serverinfo') return false;

        const guild = message.guild;

        // Conta i canali per tipo
        const canaliTesto = guild.channels.cache.filter(c => c.isTextBased() && !c.isVoiceBased()).size;
        const canaliVoce = guild.channels.cache.filter(c => c.isVoiceBased()).size;

        const dataCreazione = guild.createdAt.toLocaleDateString('it-IT', {
            day: 'numeric', month: 'long', year: 'numeric'
        });

        const owner = await guild.fetchOwner().catch(() => null);

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`📊 Statistiche di ${guild.name}`)
            .setThumbnail(guild.iconURL() || null)
            .addFields(
                { name: '👥 Membri', value: `${guild.memberCount}`, inline: true },
                { name: '💬 Canali testo', value: `${canaliTesto}`, inline: true },
                { name: '🔊 Canali voce', value: `${canaliVoce}`, inline: true },
                { name: '🚀 Boost', value: `Livello ${guild.premiumTier} (${guild.premiumSubscriptionCount || 0} boost)`, inline: true },
                { name: '📅 Creato il', value: dataCreazione, inline: true },
                { name: '👑 Proprietario', value: owner ? owner.user.tag : 'Sconosciuto', inline: true }
            )
            .setFooter({ text: `ID Server: ${guild.id}` });

        await message.reply({ embeds: [embed] });
        return true;
    }
};
