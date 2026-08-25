const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'help',

    async onMessage(message, ctx) {
        const content = message.content.trim();
        if (content !== '!aiuto' && content !== '!comandi') return false;

        // Link diretto al file mp4 (raw GitHub, permanente)
        const videoUrl = 'https://raw.githubusercontent.com/bilottaa12-creator/bot-sicurezza/main/assets/help-banner.mp4';

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🛡️ — SICUREZZA BOT — 🛡️')
            .setDescription('Benvenuto nel pannello comandi ufficiale del bot!')
            .addFields(
                {
                    name: '🔒 — SICUREZZA —',
                    value:
                        '`!scudo-lock` → Blocca tutti i canali (lockdown emergenza)\n' +
                        '`!scudo-unlock` → Ripristina lo stato precedente dei canali\n' +
                        '`!timeout @utente <minuti>` → Applica timeout (alias: `!muta`, `!mute`, `!blocca`)\n' +
                        '`!untimeout @utente` → Rimuove il timeout (alias: `!smuta`, `!unmute`, `!sblocca`)\n' +
                        '`!purge <numero>` → Cancella in blocco gli ultimi messaggi (max 100, ultimi 14gg)\n' +
                        '`!warn @utente <motivo>` → Richiama un utente (al 3° richiamo: timeout automatico)\n' +
                        '`!warnings @utente` → Vedi i richiami di qualcuno (alias `!avvisi`)\n' +
                        '`!unwarn @utente [numero]` → Toglie un richiamo (senza numero, toglie l\'ultimo)\n' +
                        '`!clearwarn @utente` → Azzera tutti i richiami di un utente'
                },
                {
                    name: '🎉 — DIVERTIMENTO —',
                    value:
                        '`!tux-on` / `!tux-off` → Modalità Tux (immagine 🐧 ad ogni messaggio)\n' +
                        '`!parla` / `!parla-off` → Modalità frasi assurde generate dall\'AI\n' +
                        '`!duello @utente` → Sfida assurda generata dall\'AI, vince a caso\n' +
                        '`!palla <domanda>` → Palla magica, risponde sì/no/forse (alias `!8ball`)'
                },
                {
                    name: '🤖 — INTELLIGENZA ARTIFICIALE —',
                    value: '`!ask <domanda>` → Fai una domanda all\'AI del bot (aperto a tutti)'
                },
                {
                    name: 'ℹ️ — UTILITY —',
                    value:
                        '`!server` → Statistiche del server (membri, canali, boost, ecc.) (alias `!serverinfo`)\n' +
                        '`!top` → Classifica dei membri più attivi per messaggi (alias `!classifica`)\n' +
                        '`!rank [@utente]` → La tua posizione in classifica (o quella di qualcun altro)'
                }
            )
            .setFooter({ text: 'Solo mod/admin possono usare i comandi di sicurezza' });

        try {
            // Primo messaggio: il video come allegato
            await message.reply({ files: [videoUrl] });
            // Secondo messaggio: il pannello comandi
            await message.channel.send({ embeds: [embed] });
        } catch (err) {
            console.error('[ERRORE AIUTO]:', err.message);
            // Fallback: manda solo l'embed se il video fallisce
            await message.channel.send({ embeds: [embed] });
        }

        return true;
    }
};
