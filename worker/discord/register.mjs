// Registers (overwrites) the bot's global slash commands with Discord.
// Needs DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN in .dev.vars (git-ignored) or the
// environment. Run after changing src/commands.js:  node register.mjs
import { readFileSync, existsSync } from 'node:fs';
import { COMMANDS } from './src/commands.js';

const vars = {};
const path = new URL('./.dev.vars', import.meta.url);
if (existsSync(path)) {
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
        const m = /^\s*([A-Z_]+)\s*=\s*"?([^"]*)"?\s*$/.exec(line);
        if (m) vars[m[1]] = m[2];
    }
}
const appId = process.env.DISCORD_APPLICATION_ID || vars.DISCORD_APPLICATION_ID;
const token = process.env.DISCORD_BOT_TOKEN || vars.DISCORD_BOT_TOKEN;
if (!appId || !token) {
    console.error('DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN are needed (.dev.vars or environment)');
    process.exit(1);
}
const res = await fetch(`https://discord.com/api/v10/applications/${appId}/commands`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bot ${token}` },
    body: JSON.stringify(COMMANDS)
});
const text = await res.text();
if (!res.ok) {
    console.error('Discord said', res.status, text);
    process.exit(1);
}
console.log('registered:', JSON.parse(text).map(c => '/' + c.name).join(' '));
