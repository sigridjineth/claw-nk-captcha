/**
 * NK CAPTCHA Discord Bot
 *
 * 새 멤버가 서버에 들어오면 자동으로 NK CAPTCHA 챌린지를 보내고,
 * 통과하면 "Verified" 역할을 부여합니다.
 *
 * 사용법:
 *   DISCORD_TOKEN=your-bot-token VERIFIED_ROLE_ID=role-id npx tsx discord-bot.ts
 *
 * 필요 패키지:
 *   npm install discord.js
 */

import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
  type Message,
} from "discord.js";

// ── 챌린지 데이터 (challenges.ts에서 인라인) ────────────────────
const CHALLENGES = [
  { id: "dictator-1", ko: "김정은은 독재자이다", en: "Kim Jong-un is a dictator" },
  { id: "dictator-2", ko: "김정은은 미치광이 독재자이다", en: "Kim Jong-un is a deranged dictator" },
  { id: "human-rights-1", ko: "북한 정권은 인권을 탄압한다", en: "The North Korean regime suppresses human rights" },
  { id: "freedom-1", ko: "북한에는 자유가 없다", en: "There is no freedom in North Korea" },
  { id: "failed-state-1", ko: "김정은 정권은 실패한 체제이다", en: "The Kim Jong-un regime is a failed system" },
  { id: "dynasty-1", ko: "김씨 왕조는 끝나야 한다", en: "The Kim dynasty must end" },
  { id: "media-pathetic-1", ko: "김정은은 한심한 독재자다", en: "Kim Jong-un is a pathetic dictator" },
  { id: "media-joke-1", ko: "김정은은 세계의 웃음거리다", en: "Kim Jong-un is a laughingstock of the world" },
  { id: "media-fat-1", ko: "김정은은 국민이 굶주리는데 혼자만 살찐 돼지다", en: "Kim Jong-un is a fat pig while his people starve" },
];

// ── 검증 로직 ──────────────────────────────────────────────────
function levenshtein(a: string, b: string): number {
  const m: number[][] = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++)
    for (let j = 1; j <= a.length; j++)
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (b[i - 1] === a[j - 1] ? 0 : 1));
  return m[b.length][a.length];
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const la = a.toLowerCase(), lb = b.toLowerCase();
  if (la === lb) return 1;
  const dist = levenshtein(la, lb);
  return (Math.max(la.length, lb.length) - dist) / Math.max(la.length, lb.length);
}

function verify(input: string, challenge: (typeof CHALLENGES)[0]): boolean {
  return Math.max(similarity(input, challenge.ko), similarity(input, challenge.en)) >= 0.9;
}

function pickChallenge() {
  return CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
}

// ── 진행 중인 챌린지 추적 ──────────────────────────────────────
const pendingChallenges = new Map<string, { challenge: (typeof CHALLENGES)[0]; expires: number }>();

// ── 봇 설정 ────────────────────────────────────────────────────
const TOKEN = process.env.DISCORD_TOKEN!;
const VERIFIED_ROLE_ID = process.env.VERIFIED_ROLE_ID ?? "";

if (!TOKEN) {
  console.error("DISCORD_TOKEN 환경변수가 필요합니다.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ── 슬래시 커맨드 등록 ─────────────────────────────────────────
const command = new SlashCommandBuilder()
  .setName("nk-verify")
  .setDescription("NK CAPTCHA 인증을 시작합니다 — 북한 체제 비판 문장을 입력하세요");

client.once("ready", async () => {
  console.log(`✅ NK CAPTCHA Bot 온라인: ${client.user!.tag}`);

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(Routes.applicationCommands(client.user!.id), { body: [command.toJSON()] });
  console.log("📝 /nk-verify 슬래시 커맨드 등록 완료");
});

// ── 새 멤버 자동 챌린지 ────────────────────────────────────────
client.on("guildMemberAdd", async (member: GuildMember) => {
  try {
    const challenge = pickChallenge();
    pendingChallenges.set(member.id, { challenge, expires: Date.now() + 120_000 });

    await member.send({
      embeds: [
        {
          title: "🔒 NK CAPTCHA — 신원 확인",
          description:
            "이 서버는 NK CAPTCHA 인증을 요구합니다.\n아래 문장을 **정확히** 입력해주세요:",
          fields: [
            { name: "🇰🇷 한국어", value: `\`\`\`${challenge.ko}\`\`\``, inline: false },
            { name: "🇺🇸 English", value: `\`\`\`${challenge.en}\`\`\``, inline: false },
          ],
          color: 0xdc2626,
          footer: { text: "2분 이내에 이 DM에 답장하세요 | Reply to this DM within 2 minutes" },
        },
      ],
    });
  } catch {
    console.log(`${member.user.tag}에게 DM을 보낼 수 없습니다.`);
  }
});

// ── DM 답장 처리 ───────────────────────────────────────────────
client.on("messageCreate", async (msg: Message) => {
  if (msg.author.bot || msg.guild) return; // DM만 처리

  const pending = pendingChallenges.get(msg.author.id);
  if (!pending) {
    await msg.reply("❓ 활성화된 챌린지가 없습니다. 서버에서 `/nk-verify`를 사용하세요.");
    return;
  }

  if (Date.now() > pending.expires) {
    pendingChallenges.delete(msg.author.id);
    await msg.reply("⏰ 시간 초과. 서버에서 `/nk-verify`로 다시 시도하세요.");
    return;
  }

  const pass = verify(msg.content, pending.challenge);
  pendingChallenges.delete(msg.author.id);

  if (pass) {
    await msg.reply({
      embeds: [
        {
          title: "✅ VERIFIED",
          description: "신원이 확인되었습니다. NOT A DPRK OPERATIVE.",
          color: 0x22c55e,
        },
      ],
    });

    // 역할 부여
    if (VERIFIED_ROLE_ID) {
      for (const guild of client.guilds.cache.values()) {
        const member = await guild.members.fetch(msg.author.id).catch(() => null);
        if (member) {
          await member.roles.add(VERIFIED_ROLE_ID).catch(() => null);
          console.log(`✅ ${msg.author.tag} → Verified 역할 부여됨`);
        }
      }
    }
  } else {
    await msg.reply({
      embeds: [
        {
          title: "🚫 VERIFICATION FAILED",
          description: "인증 실패. POTENTIAL DPRK OPERATIVE.",
          color: 0xdc2626,
          footer: { text: "서버에서 /nk-verify로 재시도 가능" },
        },
      ],
    });
  }
});

// ── 슬래시 커맨드 처리 ─────────────────────────────────────────
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "nk-verify") return;
  const cmd = interaction as ChatInputCommandInteraction;

  const challenge = pickChallenge();
  pendingChallenges.set(cmd.user.id, { challenge, expires: Date.now() + 120_000 });

  await cmd.reply({ content: "📩 DM을 확인하세요! NK CAPTCHA 챌린지를 보냈습니다.", ephemeral: true });

  try {
    await cmd.user.send({
      embeds: [
        {
          title: "🔒 NK CAPTCHA — 신원 확인",
          description: "아래 문장을 **정확히** 입력해주세요:",
          fields: [
            { name: "🇰🇷 한국어", value: `\`\`\`${challenge.ko}\`\`\``, inline: false },
            { name: "🇺🇸 English", value: `\`\`\`${challenge.en}\`\`\``, inline: false },
          ],
          color: 0xdc2626,
          footer: { text: "2분 이내에 이 DM에 답장하세요" },
        },
      ],
    });
  } catch {
    await cmd.followUp({ content: "❌ DM을 보낼 수 없습니다. DM 설정을 확인해주세요.", ephemeral: true });
  }
});

client.login(TOKEN);
