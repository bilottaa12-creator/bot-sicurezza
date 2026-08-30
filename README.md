# sicurezzabot — Bot Discord

Bot di moderazione, sicurezza e intrattenimento per Discord, con architettura a plugin. Rileva e blocca automaticamente spam e tentativi di raid/nuke senza intervento manuale, offre strumenti di moderazione per lo staff, un'AI integrata e alcune funzioni divertenti.

## 🔗 Invita il bot nel tuo server

**[Clicca qui per aggiungere sicurezzabot al tuo server](https://discord.com/oauth2/authorize?client_id=1536121062599688222&permissions=8&integration_type=0&scope=bot)**

Richiede il permesso Amministratore per funzionare correttamente (vedi sezione [Permessi richiesti](#permessi-richiesti) più sotto per il perché). Disponibile anche su [top.gg](https://top.gg) (in fase di verifica).

## Funzionalità

### 🔒 Sicurezza
- **Anti-spam automatico** — rileva raffiche di messaggi o messaggi ripetuti da uno stesso utente (anche bot) e li cancella in blocco, applicando un timeout temporaneo.
- **Anti-nuke** — monitora l'audit log del server: se qualcuno esegue troppe azioni distruttive in pochi secondi (cancellazione canali/ruoli, ban, kick, creazione webhook), gli vengono rimossi immediatamente tutti i ruoli.
- **Antilink** — `!antilink-on` / `!antilink-off` blocca link sospetti (accorciatori URL, servizi di tracciamento/IP-grabbing, domini phishing che imitano Discord/Steam) — non blocca link normali. `!antilink-test <link>` verifica un link senza doverlo mandare come messaggio vero.
- **Lockdown manuale** — `!scudo-lock` / `!scudo-unlock` blocca/sblocca la scrittura in tutti i canali del server in caso di emergenza, isolato per singolo server. Lo stato dei canali viene salvato e ripristinato perfettamente. I ruoli con "mod" nel nome mantengono sempre la possibilità di scrivere durante il lockdown.
- **Timeout manuale** — `!timeout @utente <minuti>` (alias `!muta`, `!mute`, `!blocca`).
- **Untimeout** — `!untimeout @utente` (alias `!smuta`, `!unmute`, `!sblocca`).
- **Warning permanenti** — `!warn @utente <motivo>` per richiamare un utente (salvato su database, sopravvive ai redeploy); `!warnings`/`!avvisi` per consultare i richiami; `!unwarn` per toglierne uno; `!clearwarn` per azzerarli tutti. Al terzo richiamo scatta un timeout automatico di 10 minuti.
- **Pulizia messaggi** — `!purge <numero>` cancella in blocco gli ultimi messaggi di un canale (max 100, entro i 14 giorni per limite di Discord).
- **Log di sicurezza** — ogni azione automatica viene registrata in un canale dedicato (`log-sicurezza`), storico sempre consultabile.

### 🤖 Intelligenza artificiale
- **`!ask <domanda>`** — chiedi qualsiasi cosa, risponde un'AI (Groq). Aperto a tutti.
- **`!parla` / `!parla-off`** — modalità in cui il bot risponde ad ogni messaggio con una frase generata dall'AI, sempre diversa e scollegata dal contesto.
- **`!duello @utente`** — sfida un altro membro a un duello epico in stile fantasy, raccontato dall'AI; il vincitore è deciso in modo equo (50/50) prima ancora di generare il racconto.
- **`!quiz`** — quiz di cultura generale con domande generate dall'AI, difficoltà variabile (facile/media/difficile, punti pesati di conseguenza), 30 secondi per rispondere. `!quizrank` per la classifica.

### 🎉 Divertimento
- **`!tux-on` / `!tux-off`** — ad ogni messaggio, il bot risponde con un'immagine di Tux a rotazione casuale.
- **`!palla <domanda>`** (alias `!8ball`) — la classica palla magica, risponde sì/no/forse.

### ℹ️ Utility
- **`!server`** (alias `!serverinfo`) — statistiche del server: membri, canali, boost, data di creazione, proprietario.
- **`!top`** (alias `!classifica`) — classifica dei membri più attivi per numero di messaggi, salvata su database (permanente). `!rank` mostra la propria posizione.
- **`!afk [motivo]`** — ti segna come assente; chi ti tagga riceve una risposta automatica, rimosso appena torni a scrivere.
- **Messaggio di benvenuto** — `!welcome-on` / `!welcome-off` (solo mod) attiva/disattiva un embed di benvenuto per i nuovi membri, con immagine personalizzabile.
- **`!aiuto`** (alias `!comandi`) — pannello con tutti i comandi disponibili.

## Architettura

Il bot è costruito con un sistema di plugin: `index.js` fa solo da motore (connessione a Discord, caricamento plugin, smistamento eventi), mentre ogni funzionalità vive in un file separato dentro `plugins/`. `db.js` gestisce la connessione al database per i dati che devono restare permanenti tra un riavvio e l'altro.

```
├── index.js            # motore del bot, carica automaticamente i plugin
├── db.js                # connessione MongoDB e modelli dati permanenti
├── utils.js              # funzioni condivise (permessi, log di sicurezza)
├── package.json
├── assets/                # immagini e video usati dai plugin (embed, benvenuto, ecc.)
└── plugins/
    ├── antinuke.js         # rilevamento azioni distruttive
    ├── antispam.js          # rilevamento spam automatico
    ├── antilink.js           # !antilink-on/off — blocco link sospetti
    ├── lockdown.js            # !scudo-lock / !scudo-unlock
    ├── timeout.js              # !timeout / applicazione timeout manuale
    ├── untimeout.js             # !untimeout / rimozione timeout manuale
    ├── warn.js                   # !warn / !warnings / !unwarn / !clearwarn (permanente su DB)
    ├── purge.js                   # !purge — cancellazione messaggi in blocco
    ├── ai-ask.js                   # !ask — domande libere all'AI
    ├── fun-parla.js                 # !parla / !parla-off — frasi assurde generate dall'AI
    ├── duello.js                     # !duello — sfida epica generata dall'AI
    ├── quiz.js                        # !quiz / !quizrank — quiz generato dall'AI (permanente su DB)
    ├── fun-tux.js                      # !tux-on / !tux-off — immagini Tux a rotazione
    ├── palla.js                         # !palla / !8ball — palla magica
    ├── server-info.js                    # !server / !serverinfo — statistiche server
    ├── classifica.js                      # !top / !classifica / !rank — classifica messaggi (permanente su DB)
    ├── afk.js                              # !afk — sistema assenza
    ├── welcome.js                           # !welcome-on / !welcome-off — messaggio di benvenuto
    └── help.js                               # !aiuto / !comandi — pannello comandi
```

Per aggiungere una nuova funzionalità basta creare un nuovo file in `plugins/` che esporta `{ name, onMessage }` (per reagire ai messaggi), `{ onAuditLogEntry }` (per reagire alle azioni nell'audit log) e/o `{ onMemberAdd }` (per reagire a nuovi membri) — viene caricato automaticamente all'avvio, senza toccare il resto del codice.

## Permessi richiesti

Il bot richiede il permesso `Amministratore` per funzionare correttamente su tutte le sue funzionalità. Nota: Discord impedisce sempre di applicare un timeout a un membro con permesso Amministratore, indipendentemente dai permessi del bot — è una restrizione della piattaforma, non aggirabile.

## Nota

Progetto sviluppato per uso personale/community. Non è (ancora) pensato per una configurazione multi-server con impostazioni diverse per ogni server — le soglie di anti-spam e anti-nuke sono impostate direttamente nel codice dei rispettivi plugin.

## Autori

- **Creator:** [bilottaa12-creator]
- **Contributors:** [Yervinboss]
