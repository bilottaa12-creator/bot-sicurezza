module.exports = {
    name: 'palla',

    async onMessage(message, ctx) {
        const content = message.content.trim();
        if (!content.startsWith('!palla') && !content.startsWith('!8ball')) return false;

        const query = content.replace(/^!palla|^!8ball/, '').trim();

        if (!query) {
            await message.reply('🎱 Fai una domanda alla palla magica! Esempio: `!palla passerò l\'esame?`');
            return true;
        }

        const risposte = [
            '🎱 È certamente così.',
            '🎱 Senza dubbio.',
            '🎱 Sì, decisamente.',
            '🎱 Puoi contarci.',
            '🎱 I miei calcoli dicono di sì.',
            '🎱 Non è molto chiaro, riprova.',
            '🎱 Chiedi di nuovo più tardi.',
            '🎱 Meglio non dirtelo adesso.',
            '🎱 Non ci fare affidamento.',
            '🎱 La mia risposta è no.',
            '🎱 Le mie fonti dicono di no.',
            '🎱 Molto dubbio.'
        ];

        const rispostaCasuale = risposte[Math.floor(Math.random() * risposte.length)];
        await message.reply(`🎱 **Domanda:** ${query}\n\n${rispostaCasuale}`);
        return true;
    }
};
