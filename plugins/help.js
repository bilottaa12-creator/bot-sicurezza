const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'help',

    async onMessage(message, ctx) {
        const content = message.content.trim();
        if (content !== '!help' && content !== '!comandi') return false;

        // Link diretto al file mp4 (raw GitHub, permanente)
        const videoUrl = 'https://raw.githubusercontent.com/bilottaa12-creator/bot-sicurezza/main/assets/help-banner.mp4';

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🛡️ — SCUDO BOT — 🛡️')
            .setDescription('Benvenuto nel pannello comandi ufficiale del bot!')
            .addFields(
                {
                    name: '🔒 — SICUREZZA —',
                    value:
                        '`!scudo-lock` → Blocca tutti i canali (lockdown emergenza)\n' +
                        '`!scudo-unlock` → Ripristina lo stato precedente dei canali\n' +
                        '`!timeout @utente <minuti>` → Applica timeout (alias: `!muta`, `!mute`, `!blocca`)\n' +
                        '`!untimeout @utente` → Rimuove il timeout (alias: `!smuta`, `!unmute`, `!sblocca`)'
                },
                {
                    name: '🎉 — DIVERTIMENTO —',
                    value:
                        '`!tux-on` / `!tux-off` → Modalità Tux (emoji 🐧 ad ogni messaggio)\n' +
                        '`!parla` / `!parla-off` → Modalità frasi informatiche random'
                }
            )
            .setFooter({ text: 'Solo mod/admin possono usare i comandi di sicurezza' });

        try {
            // Primo messaggio: il video come allegato
            await message.reply({ files: [videoUrl] });
            // Secondo messaggio: il pannello comandi
            await message.channel.send({ embeds: [embed] });
        } catch (err) {
            console.error('[ERRORE HELP]:', err.message);
            // Fallback: manda solo l'embed se il video fallisce
            await message.channel.send({ embeds: [embed] });
        }

        return true;
    }
};
