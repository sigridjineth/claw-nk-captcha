/**
 * NK CAPTCHA — Local Demo Discord Bot
 *
 * This bot:
 * 1. Sends verification URL when user types /nk-verify
 * 2. Runs a callback server on port 9999
 * 3. When user completes captcha → bot posts "인증 완료!" in Discord
 *
 * Usage:
 *   DISCORD_TOKEN=your-token VERIFY_URL=https://your-tunnel.loca.lt node bot.mjs
 */

import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import express from 'express';
import cors from 'cors';

const TOKEN = process.env.DISCORD_TOKEN;
const VERIFY_URL = process.env.VERIFY_URL || 'http://localhost:3457';
const CALLBACK_PORT = 9999;
const ROLE_NAME = process.env.ROLE_NAME || 'Verified';

if (!TOKEN) {
  console.error('Missing DISCORD_TOKEN. Run:');
  console.error('  DISCORD_TOKEN=your-token VERIFY_URL=https://your-tunnel.loca.lt node bot.mjs');
  process.exit(1);
}

// ── Pending verifications ───────────────────────────────────
// sessionId → { channelId, userId, username, messageId }
const pending = new Map();
let sessionCounter = 0;

// ── Discord Bot ─────────────────────────────────────────────
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const command = new SlashCommandBuilder()
  .setName('nk-verify')
  .setDescription('Start NK CAPTCHA verification — prove you are not a DPRK operative');

client.once('ready', async () => {
  console.log(`\n🤖 Bot online: ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), { body: [command.toJSON()] });
  console.log('📝 /nk-verify command registered\n');
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'nk-verify') return;

  const sessionId = 'nk-' + (++sessionCounter) + '-' + Date.now().toString(36);
  const callbackUrl = `http://localhost:${CALLBACK_PORT}/callback`;
  const userId = interaction.user.id;
  const username = interaction.user.username;

  const verifyLink = `${VERIFY_URL}/?session=${sessionId}&callback=${encodeURIComponent(callbackUrl)}&user=${userId}&username=${encodeURIComponent(username)}`;

  pending.set(sessionId, {
    channelId: interaction.channelId,
    userId,
    username,
    guildId: interaction.guildId,
  });

  await interaction.reply({
    embeds: [{
      title: '🔒 NK CAPTCHA Verification',
      description: `**${username}**, complete the verification to prove you are not a DPRK operative.\n\n` +
        `**Step 1:** Reassemble Kim Jong-un's scrambled face\n` +
        `**Step 2:** Record yourself saying an anti-regime phrase\n\n` +
        `⏱️ You have 2 minutes.`,
      color: 0xdc2626,
      fields: [{
        name: '🔗 Verification Link',
        value: `[Click here to start verification](${verifyLink})`,
      }],
      footer: { text: `Session: ${sessionId}` },
      timestamp: new Date().toISOString(),
    }],
  });

  console.log(`🔗 Verification started for ${username} (${sessionId})`);

  // Auto-expire after 2 minutes
  setTimeout(() => {
    if (pending.has(sessionId)) {
      pending.delete(sessionId);
      console.log(`⏰ Session ${sessionId} expired`);
    }
  }, 120_000);
});

client.login(TOKEN);

// ── Callback Server ─────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

app.post('/callback', async (req, res) => {
  const { sessionId, userId, pass, code, transcript, similarity, puzzleMoves } = req.body;

  console.log('\n═══════════════════════════════════════');
  console.log('📩 CALLBACK RECEIVED');
  console.log(`   Session:    ${sessionId}`);
  console.log(`   Pass:       ${pass ? '✅ YES' : '🚫 NO'}`);
  console.log(`   Code:       ${code || 'N/A'}`);
  console.log(`   Transcript: ${transcript || 'N/A'}`);
  console.log(`   Similarity: ${similarity ? Math.round(similarity * 100) + '%' : 'N/A'}`);
  console.log(`   Moves:      ${puzzleMoves || 'N/A'}`);
  console.log('═══════════════════════════════════════\n');

  res.json({ status: 'ok' });

  // Find the pending session and notify Discord
  const session = pending.get(sessionId);
  if (!session) {
    console.log('⚠️  Session not found (expired or unknown)');
    return;
  }

  pending.delete(sessionId);

  try {
    const channel = await client.channels.fetch(session.channelId);
    if (!channel) return;

    if (pass) {
      await channel.send({
        embeds: [{
          title: '✅ Verification Complete!',
          description: `**${session.username}** has been verified.\n\n` +
            `> 🗣️ *"${transcript}"*\n` +
            `> 📊 Match: **${Math.round((similarity || 0) * 100)}%**\n` +
            `> 🧩 Puzzle solved in **${puzzleMoves || '?'}** moves`,
          color: 0x22c55e,
          fields: [{
            name: 'Status',
            value: '🛡️ **NOT A DPRK OPERATIVE**',
            inline: true,
          }, {
            name: 'Code',
            value: `\`${code}\``,
            inline: true,
          }],
          footer: { text: `Session: ${sessionId}` },
          timestamp: new Date().toISOString(),
        }],
      });

      // Try to assign role
      try {
        const guild = await client.guilds.fetch(session.guildId);
        const member = await guild.members.fetch(session.userId);
        const role = guild.roles.cache.find(r => r.name === ROLE_NAME);
        if (role) {
          await member.roles.add(role);
          console.log(`🎖️  Assigned "${ROLE_NAME}" role to ${session.username}`);
        } else {
          console.log(`⚠️  Role "${ROLE_NAME}" not found. Create it in server settings.`);
        }
      } catch (e) {
        console.log(`⚠️  Could not assign role: ${e.message}`);
      }

    } else {
      await channel.send({
        embeds: [{
          title: '🚫 Verification Failed',
          description: `**${session.username}** could not complete verification.\n\n**POTENTIAL DPRK OPERATIVE**`,
          color: 0xdc2626,
          footer: { text: `Session: ${sessionId}` },
          timestamp: new Date().toISOString(),
        }],
      });
    }
  } catch (e) {
    console.error('Discord message error:', e.message);
  }
});

app.listen(CALLBACK_PORT, () => {
  console.log(`📡 Callback server on http://localhost:${CALLBACK_PORT}/callback`);
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  NK CAPTCHA Local Demo`);
  console.log(`  React app:  ${VERIFY_URL}`);
  console.log(`  Callback:   http://localhost:${CALLBACK_PORT}/callback`);
  console.log(`${'─'.repeat(50)}\n`);
  console.log('Waiting for /nk-verify commands in Discord...\n');
});
