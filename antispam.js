const { eModeratoreOAdmin } = require('../utils');

// ---- CONFIGURAZIONE (modifica questi valori a piacere) ----
const SOGLIA_MESSAGGI = 5;        // quanti messaggi...
const FINESTRA_MS = 4000;         // ...in quanti millisecondi = spam
const DURATA_TIMEOUT_MIN = 10;    // minuti di timeout (mute) per chi spamma
const RIPETIZIONE_MAX = 3;        // messaggi identici di fila = spam anche sotto soglia

module.exports = {
    name: 'antispam',

    async onMessage(message, ctx) {
        const { store } = ctx;

        // I mod/admin non vengono mai considerati spammer
        if (eModeratoreOAdmin(message.member)) return false;

        // Non serve controllare i comandi del plugin lockdown
        if (message.content.trim() === '!scudo-lock' || message.content.trim() === '!scudo-unlock') {
            return false;
        }

        if (!store.antispam) store.antispam = new Map(); // userId -> { timestamps: [], ultimoMessaggio, ripetizioni }

        const userId = message.author.id;
        const ora = Date.now();
        const dati = store.antispam.get(userId) || { timestamps: [], ultimoMessaggio: null, ripetizioni: 0 };

        // Aggiorna cronologia timestamp, tenendo solo quelli dentro la finestra temporale
        dati.timestamps = dati.timestamps.filter(t => ora - t < FINESTRA_MS);
        dati.timestamps.push(ora);

        // Controllo messaggi ripetuti identici (tipico dello spam "a catena")
        if (message.content && message.content === dati.ultimoMessaggio) {
            dati.ripetizioni += 1;
        } else {
            dati.ripetizioni = 1;
            dati.ultimoMessaggio = message.content;
        }

        store.antispam.set(userId, dati);

        const troppiMessaggi = dati.timestamps.length >= SOGLIA_MESSAGGI;
        const troppeRipetizioni = dati.ripetizioni >= RIPETIZIONE_MAX;

        if (troppiMessaggi || troppeRipetizioni) {
            // Reset per evitare di ripetere l'azione ad ogni messaggio successivo
            store.antispam.set(userId, { timestamps: [], ultimoMessaggio: null, ripetizioni: 0 });

            try {
                // Recupera gli ultimi messaggi del canale e cancella TUTTI quelli
                // scritti da questo utente (non solo quello che ha fatto scattare la soglia).
                // Discord permette bulkDelete solo su messaggi con meno di 14 giorni.
                const recenti = await message.channel.messages.fetch({ limit: 100 });
                const messaggiSpammer = recenti.filter(m => m.author.id === userId);

                if (messaggiSpammer.size > 1) {
                    await message.channel.bulkDelete(messaggiSpammer, true);
                } else {
                    await message.delete();
                }
            } catch (err) {
                console.error("[ANTISPAM] Errore nel cancellare i messaggi:", err.message);
                // Fallback: prova almeno a cancellare l'ultimo messaggio
                try { await message.delete(); } catch (_) {}
            }

            try {
                await message.member.timeout(
                    DURATA_TIMEOUT_MIN * 60 * 1000,
                    'Rilevato spam automatico'
                );
                await message.channel.send(
                    `🤖 **Anti-spam:** ${message.author} è stato messo in timeout per ${DURATA_TIMEOUT_MIN} minuti e tutti i suoi messaggi recenti sono stati cancellati.`
                );
            } catch (err) {
                console.error("[ANTISPAM] Errore nel dare il timeout:", err.message);
                await message.channel.send(
                    `⚠️ Rilevato spam da ${message.author}, ma non ho i permessi per applicare il timeout (controlla la posizione del mio ruolo).`
                );
            }

            return true; // gestito, non passare oltre agli altri plugin
        }

        return false;
    }
};
