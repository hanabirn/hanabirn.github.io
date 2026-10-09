// Registers (overwrites) the bot's global slash commands with Discord.
// Needs DISCORD_BOT_TOKEN in .dev.vars (git-ignored) or the environment; the application
// id comes from wrangler.jsonc. Run after changing src/commands.js:  node register.mjs
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { COMMANDS } from './src/commands.js';

const vars = {};
const path = new URL('./.dev.vars', import.meta.url);
if (existsSync(path)) {
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
        const m = /^\s*([A-Z_]+)\s*=\s*"?([^"]*)"?\s*$/.exec(line);
        if (m) vars[m[1]] = m[2];
    }
}
// the application id is public and also sits in wrangler.jsonc
const wranglerId = /"DISCORD_APPLICATION_ID"\s*:\s*"(\d+)"/.exec(readFileSync(new URL('./wrangler.jsonc', import.meta.url), 'utf8'));
const appId = process.env.DISCORD_APPLICATION_ID || vars.DISCORD_APPLICATION_ID || (wranglerId && wranglerId[1]);
const token = process.env.DISCORD_BOT_TOKEN || vars.DISCORD_BOT_TOKEN;
if (!appId || !token) {
    console.error(appId ? 'DISCORD_BOT_TOKEN is missing: put DISCORD_BOT_TOKEN=... in .dev.vars' : 'no DISCORD_APPLICATION_ID in wrangler.jsonc');
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
const registered = JSON.parse(text);
console.log('registered:', registered.map(c => '/' + c.name).join(' '));
// /help mentions the commands as </name:id> — Discord shows each in the reader's own
// client language and makes it clickable. The ids stay the same on re-registration;
// redeploy the Worker if this file changed.
const ids = Object.fromEntries(registered.map(c => [c.name, c.id]));
writeFileSync(new URL('./src/command-ids.js', import.meta.url),
    '/* Written by register.mjs: the registered commands\' ids, for clickable </name:id> mentions. */\n' +
    `export const COMMAND_IDS = ${JSON.stringify(ids, null, 4)};\n`);
console.log('command ids saved to src/command-ids.js');
