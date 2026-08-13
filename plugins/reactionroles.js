const fs = require('fs');
const path = require('path');

// File locale per salvare le configurazioni senza toccare il codice su GitHub
const DATA_FILE = path.join(__dirname, '../reaction_roles_data.json');

// Carica i dati salvati all'avvio
let rrData = {};
if (fs.existsSync(DATA_FILE)) {
    try {
        rrData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {
        rrData = {};
    }
}

// Funzione per salvare le configurazioni su file
function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(rrData, null, 2));
    } catch (e) {
        console.error('Errore nel salvataggio dei reaction roles:', e);
    }
}

module.exports = {
    name: 'reactionroles',

    // COMANDO PER CONFIGURARE I RUOLI DA DISCORD
    async onMessage(message, { client }) {
        if (!message.content.startsWith('!rr')) return;

        // Verifica permessi di amministratore
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ Solo gli amministratori possono usare questo comando.');
        }

        const args = message.content.split(' ').slice(1);
        // Uso: !rr <id_messaggio> <emoji> <@ruolo>
        if (args.length < 3) {
            return message.reply('📌 **Uso corretto:** `!rr <ID_MESSAGGIO> <EMOJI> <@RUOLO>`');
        }

        const messageId = args[0];
        const emoji = args[1];
        const role = message.mentions.roles.first();

        if (!role) {
            return message.reply('❌ Devi menzionare un ruolo valido (es. `@NomeRuolo`).');
        }

        // Sicurezza extra: impedisce di assegnare ruoli con permessi amministrativi
        if (role.permissions.has('Administrator') || role.permissions.has('ManageGuild')) {
            return message.reply('⚠️ Non puoi collegare ruoli di Moderazione/Amministrazione alle emoji per sicurezza!');
        }

        if (!rrData[messageId]) {
            rrData[messageId] = {};
        }

        rrData[messageId][emoji] = role.id;
        saveData();

        // Aggiunge la reazione al messaggio per comodità
        try {
            const msg = await message.channel.messages.fetch(messageId);
            await msg.react(emoji);
        } catch (e) {
            // Ignora se il messaggio si trova in un altro canale
        }

        return message.reply(`✅ Reaction Role impostato! Emoji: ${emoji} ➔ Ruolo: **${role.name}**`);
    },

    // ASSEGNA IL RUOLO ALLA REAZIONE
    async onReactionAdd(reaction, user, { client }) {
        if (user.bot) return;

        if (reaction.partial) {
            try { await reaction.fetch(); } catch (err) { return; }
        }

        const messageId = reaction.message.id;
        const emojiName = reaction.emoji.name;

        if (rrData[messageId] && rrData[messageId][emojiName]) {
            const roleId = rrData[messageId][emojiName];
            const guild = reaction.message.guild;

            try {
                const member = await guild.members.fetch(user.id);
                const role = guild.roles.cache.get(roleId);

                if (role && member && !role.permissions.has('Administrator')) {
                    await member.roles.add(role);
                }
            } catch (err) {
                console.error(`Errore nell'assegnare il ruolo:`, err.message);
            }
        }
    },

    // RIMUOVE IL RUOLO SE TOGLI LA REAZIONE
    async onReactionRemove(reaction, user, { client }) {
        if (user.bot) return;

        if (reaction.partial) {
            try { await reaction.fetch(); } catch (err) { return; }
        }

        const messageId = reaction.message.id;
        const emojiName = reaction.emoji.name;

        if (rrData[messageId] && rrData[messageId][emojiName]) {
            const roleId = rrData[messageId][emojiName];
            const guild = reaction.message.guild;

            try {
                const member = await guild.members.fetch(user.id);
                const role = guild.roles.cache.get(roleId);

                if (role && member) {
                    await member.roles.remove(role);
                }
            } catch (err) {
                console.error(`Errore nel rimuovere il ruolo:`, err.message);
            }
        }
    }
};
