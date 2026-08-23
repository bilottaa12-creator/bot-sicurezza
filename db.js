const mongoose = require('mongoose');

async function connectDB() {
    if (!process.env.MONGODB_URI) {
        console.error('❌ ERRORE: MONGODB_URI non impostata su Render. Il salvataggio permanente (es. classifica messaggi) non funzionerà.');
        return;
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connesso a MongoDB (dati permanenti attivi)');
    } catch (err) {
        console.error('❌ Errore connessione MongoDB:', err.message);
    }
}

// Contatore messaggi per utente, per server (usato da !top)
const messageCountSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    count: { type: Number, default: 0 }
});
messageCountSchema.index({ guildId: 1, userId: 1 }, { unique: true });

const MessageCount = mongoose.model('MessageCount', messageCountSchema);

module.exports = { connectDB, MessageCount };
