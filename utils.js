const { PermissionsBitField } = require('discord.js');

function eModeratoreOAdmin(member) {
    if (!member) return false;
    const haPermessoAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
    const haRuoloMod = member.roles.cache.some(role => role.name.toLowerCase().includes('mod'));
    return haPermessoAdmin || haRuoloMod;
}

module.exports = { eModeratoreOAdmin };
