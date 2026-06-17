// Lightweight, dependency-free profanity check for public review submissions.
// Not exhaustive — it's a first-pass filter to keep the most obvious abuse off
// the live property pages. The admin can still reject anything that slips through.

const BLOCKED_WORDS = [
  'anal',
  'anus',
  'arse',
  'ass',
  'asshole',
  'bastard',
  'bitch',
  'blowjob',
  'bollock',
  'boner',
  'boob',
  'bullshit',
  'cock',
  'cum',
  'cunt',
  'dick',
  'dildo',
  'dyke',
  'fag',
  'faggot',
  'fuck',
  'jerk off',
  'jizz',
  'motherfucker',
  'nigga',
  'nigger',
  'piss',
  'porn',
  'prick',
  'pussy',
  'retard',
  'rape',
  'shit',
  'slut',
  'spunk',
  'twat',
  'wank',
  'whore',
];

// Map common leetspeak substitutions back to letters so "sh1t" / "f@ck" are caught.
const LEET_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  '$': 's',
  '!': 'i',
};

function normalize(input: string): string {
  const lowered = input.toLowerCase();
  let out = '';
  for (const char of lowered) {
    out += LEET_MAP[char] ?? char;
  }
  // Drop punctuation that's used to break up words ("f.u.c.k", "f_u_c_k"),
  // collapsing them, but keep spaces so word boundaries survive.
  return out.replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
}

export function containsProfanity(...inputs: (string | null | undefined)[]): boolean {
  const text = inputs.filter(Boolean).join(' ');
  if (!text.trim()) return false;

  const normalized = normalize(text);
  if (!normalized) return false;

  // Word-boundary match only — avoids the Scunthorpe problem ("ass" in "class").
  return BLOCKED_WORDS.some((word) =>
    new RegExp(`\\b${word}\\b`).test(normalized),
  );
}
