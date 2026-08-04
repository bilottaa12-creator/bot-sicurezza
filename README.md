
# Bot Sicurezza Discord

Bot di moderazione e sicurezza per Discord, con architettura a plugin. Rileva e blocca automaticamente spam e tentativi di raid/nuke, senza bisogno di intervento manuale.

## Funzionalità

- **Anti-spam automatico** — rileva raffiche di messaggi o messaggi ripetuti da uno stesso utente (anche bot) e li cancella in blocco, applicando un timeout temporaneo.
- **Anti-nuke** — monitora l'audit log del server: se qualcuno esegue troppe azioni distruttive in pochi secondi (cancellazione canali/ruoli, ban, kick, creazione webhook), gli vengono rimossi immediatamente tutti i ruoli.
- **Lockdown manuale** — comando `!scudo-lock` / `!scudo-unlock` per bloccare/sbloccare la scrittura in tutti i canali del server in caso di emergenza.
- **Untimeout** — comando `!untimeout` (alias `!smuta`, `!unmute`, `!sblocca`) per rimuovere manualmente un timeout attivo, riservato allo staff.
- **Log di sicurezza** — ogni azione automatica viene registrata in un canale dedicato (`log-sicurezza`), per avere uno storico consultabile in ogni momento.

## Architettura

Il bot è costruito con un sistema di plugin: `index.js` fa solo da motore (connessione a Discord, caricamento plugin, smistamento eventi), mentre ogni funzionalità vive in un file separato dentro `plugins/`.

```
├── index.js          # motore del bot, carica automaticamente i plugin
├── utils.js           # funzioni condivise (permessi, log di sicurezza)
├── package.json
└── plugins/
    ├── lockdown.js     # !scudo-lock / !scudo-unlock
    ├── antispam.js      # rilevamento spam automatico
    ├── antinuke.js       # rilevamento azioni distruttive
    └── untimeout.js       # rimozione timeout manuale
```

Per aggiungere una nuova funzionalità basta creare un nuovo file in `plugins/` che esporta `{ name, onMessage }` (per reagire ai messaggi) e/o `{ onAuditLogEntry }` (per reagire alle azioni nell'audit log) — viene caricato automaticamente all'avvio, senza toccare il resto del codice.

## Deploy

1. Clona il repository e installa le dipendenze:
   ```bash
   npm install
   ```
2. Crea un'applicazione e un bot dal [Discord Developer Portal](https://discord.com/developers/applications), attivando l'intent **Message Content**.
3. Imposta la variabile d'ambiente `DISCORD_TOKEN` con il token del bot (e opzionalmente `LOG_CHANNEL_ID` con l'ID del canale dove vuoi i log, se non usi un canale chiamato `log-sicurezza`).
4. Avvia il bot:
   ```bash
   npm start
   ```

Pensato per girare su servizi come [Render](https://render.com) (include un piccolo server HTTP per restare attivo sui piani gratuiti).

## Permessi richiesti

Il ruolo del bot deve avere: `Gestisci messaggi`, `Modera membri` (timeout), `Gestisci ruoli`, `Visualizza registro di controllo`. Per funzionare correttamente contro altri bot o utenti con ruoli alti, il ruolo del bot deve stare **più in alto** nella gerarchia dei ruoli del server.

## Nota

Progetto sviluppato per uso personale/community. Non è (ancora) pensato per una configurazione multi-server con impostazioni diverse per ogni server — le soglie di anti-spam e anti-nuke sono impostate direttamente nel codice dei rispettivi plugin.

## Autori

- **Creator:** [bilottaa12-creator] 
- **Contributors:** [Yervinboss] 
