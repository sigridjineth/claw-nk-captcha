export interface Challenge {
  id: string;
  ko: string;
  en: string;
  category: "leader" | "regime" | "ideology" | "freedom";
  severity: 1 | 2 | 3;
  mediaMode?: boolean;
}

export const CHALLENGES: Challenge[] = [
  {
    id: "dictator-1",
    ko: "김정은은 독재자이다",
    en: "Kim Jong-un is a dictator",
    category: "leader",
    severity: 2,
  },
  {
    id: "dictator-2",
    ko: "김정은은 미치광이 독재자이다",
    en: "Kim Jong-un is a deranged dictator",
    category: "leader",
    severity: 3,
  },
  {
    id: "human-rights-1",
    ko: "북한 정권은 인권을 탄압한다",
    en: "The North Korean regime suppresses human rights",
    category: "regime",
    severity: 2,
  },
  {
    id: "freedom-1",
    ko: "북한에는 자유가 없다",
    en: "There is no freedom in North Korea",
    category: "freedom",
    severity: 1,
  },
  {
    id: "failed-state-1",
    ko: "김정은 정권은 실패한 체제이다",
    en: "The Kim Jong-un regime is a failed system",
    category: "regime",
    severity: 2,
  },
  {
    id: "juche-1",
    ko: "주체사상은 거짓 이념이다",
    en: "Juche ideology is a false ideology",
    category: "ideology",
    severity: 2,
  },
  {
    id: "liberation-1",
    ko: "북한 주민들은 해방되어야 한다",
    en: "The North Korean people must be liberated",
    category: "freedom",
    severity: 1,
  },
  {
    id: "dynasty-1",
    ko: "김씨 왕조는 끝나야 한다",
    en: "The Kim dynasty must end",
    category: "leader",
    severity: 3,
  },
  {
    id: "propaganda-1",
    ko: "북한의 선전은 모두 거짓말이다",
    en: "North Korean propaganda is all lies",
    category: "ideology",
    severity: 2,
  },
  {
    id: "gulags-1",
    ko: "정치범 수용소를 폐쇄하라",
    en: "Shut down the political prison camps",
    category: "regime",
    severity: 3,
  },
  // ── Media-specific challenges (designed for spoken delivery) ──
  {
    id: "media-pathetic-1",
    ko: "김정은은 한심한 독재자다",
    en: "Kim Jong-un is a pathetic dictator",
    category: "leader",
    severity: 3,
    mediaMode: true,
  },
  {
    id: "media-joke-1",
    ko: "김정은은 세계의 웃음거리다",
    en: "Kim Jong-un is a laughingstock of the world",
    category: "leader",
    severity: 3,
    mediaMode: true,
  },
  {
    id: "media-slaves-1",
    ko: "북한은 국민을 노예로 만든다",
    en: "North Korea enslaves its own people",
    category: "regime",
    severity: 3,
    mediaMode: true,
  },
  {
    id: "media-collapse-1",
    ko: "북한 정권은 반드시 무너진다",
    en: "The North Korean regime will surely collapse",
    category: "regime",
    severity: 3,
    mediaMode: true,
  },
  {
    id: "media-fat-1",
    ko: "김정은은 국민이 굶주리는데 혼자만 살찐 돼지다",
    en: "Kim Jong-un is a fat pig while his people starve",
    category: "leader",
    severity: 3,
    mediaMode: true,
  },
  {
    id: "pink-pig-1",
    ko: "김정은은 뚱뚱한 분홍 돼지다",
    en: "Kim Jong-un is a fat pink pig",
    category: "leader",
    severity: 3,
    mediaMode: true,
  },
  {
    id: "clown-1",
    ko: "김정은은 핵무기를 가진 광대다",
    en: "Kim Jong-un is a clown with nuclear weapons",
    category: "leader",
    severity: 3,
    mediaMode: true,
  },
  {
    id: "coward-1",
    ko: "김정은은 국민이 두려운 겁쟁이다",
    en: "Kim Jong-un is a coward afraid of his own people",
    category: "leader",
    severity: 3,
    mediaMode: true,
  },
];

export function pickRandom(count: number = 1): Challenge[] {
  const shuffled = [...CHALLENGES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, CHALLENGES.length));
}

export function verify(challengeId: string, userInput: string, locale: "ko" | "en" | "both"): {
  pass: boolean;
  expected: string;
  similarity: number;
} {
  const challenge = CHALLENGES.find((c) => c.id === challengeId);
  if (!challenge) return { pass: false, expected: "", similarity: 0 };

  const targets: string[] = [];
  if (locale === "ko" || locale === "both") targets.push(challenge.ko);
  if (locale === "en" || locale === "both") targets.push(challenge.en);

  const normalized = userInput.trim().toLowerCase();
  let bestSimilarity = 0;

  for (const target of targets) {
    const norm = target.toLowerCase();
    if (normalized === norm) return { pass: true, expected: target, similarity: 1.0 };
    const sim = stringSimilarity(normalized, norm);
    if (sim > bestSimilarity) bestSimilarity = sim;
  }

  // Allow 90%+ similarity to account for minor typos
  const pass = bestSimilarity >= 0.9;
  const expected = locale === "en" ? challenge.en : challenge.ko;
  return { pass, expected, similarity: bestSimilarity };
}

function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  const editDist = levenshtein(longer, shorter);
  return (longer.length - editDist) / longer.length;
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[b.length][a.length];
}
