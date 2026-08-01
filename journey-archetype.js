// journey-archetype.js — nearest-HDB-archetype matcher.
//
// The "training" the uploaded corpus makes honest: 85 real plans were distilled into
// plans/hdb-archetypes.json (envelopes, bedroom counts, hallmark rooms per archetype), and this
// module matches a traced plan against that knowledge. Deliberately NOT a neural net: with ~30
// distinct archetypes in the whole HDB stock, nearest-archetype matching on printed dimensions
// is more accurate, explainable, and auditable than a model trained on 85 images could be.
// Every verdict carries its reasons, so a wrong match is arguable rather than mystical.
//
// Keyed by archetype NAME, never by upload filename — a mislabelled file cannot poison this.

let ARCH = null;
export async function loadArchetypes(base) {
  if (ARCH) return ARCH;
  try { ARCH = await (await fetch((base || '') + 'plans/hdb-archetypes.json')).json(); }
  catch (e) { ARCH = { archetypes: [], code_prefix: {} }; }
  return ARCH;
}

/** HDB numerical-code heuristic observed across the corpus: first digit = room count. */
export function codeToType(code) {
  const d = String(code || '').trim()[0];
  return (ARCH && ARCH.code_prefix && ARCH.code_prefix[d]) || null;
}

/**
 * @param facts { W, D, bedrooms, roomNames[], internal_sqm } — envelope in metres.
 * @returns top matches [{ name, flat_type, score, reasons[] }] best-first, or [].
 */
export function matchArchetype(facts) {
  if (!ARCH || !facts || !(facts.W > 0)) return [];
  const names = (facts.roomNames || []).join(' ').toUpperCase();
  const out = [];
  for (const a of ARCH.archetypes) {
    let score = 0;
    const reasons = [];
    // envelope: best fit over observed envelopes, either orientation
    let bestFit = 0, bestEnv = null;
    for (const [w, d] of a.envelopes_m) {
      for (const [W, D] of [[facts.W, facts.D], [facts.D, facts.W]]) {
        const err = (Math.abs(W - w) / w + Math.abs(D - d) / d) / 2;
        const fit = Math.max(0, 1 - err * 8); // 0 at 12.5% mean error
        if (fit > bestFit) { bestFit = fit; bestEnv = [w, d]; }
      }
    }
    score += bestFit * 60;
    if (bestFit > 0.6 && bestEnv) reasons.push(`envelope within ${Math.round((1 - bestFit) * 12.5)}% of the observed ${bestEnv[0]}×${bestEnv[1]} m`);
    if (facts.bedrooms === a.bedrooms) { score += 25; reasons.push(`${a.bedrooms} bedroom${a.bedrooms === 1 ? '' : 's'}`); }
    else score -= 15 * Math.abs(facts.bedrooms - a.bedrooms);
    let hall = 0;
    (a.hallmarks || []).forEach((h) => { if (names.includes(h)) { hall += 5; reasons.push(h.toLowerCase() + ' present'); } });
    score += Math.min(15, hall);
    (a.anti || []).forEach((h) => { if (names.includes(h)) score -= 10; });
    if (score > 35) out.push({ name: a.name, flat_type: a.flat_type, era: a.era, score: Math.round(score), reasons });
  }
  return out.sort((x, y) => y.score - x.score).slice(0, 3);
}
