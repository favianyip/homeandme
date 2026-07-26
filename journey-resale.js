// journey-resale.js — block profile from HDB resale transactions.
//
// The property register says what was BUILT in a block. This says what has actually been SOLD
// out of it, and every row carries three things the register does not:
//
//   flat_model        the layout archetype — 16 values across the stock: Improved, New
//                     Generation, Model A, Model A2, Simplified, Standard, Premium Apartment,
//                     Apartment, Adjoined flat, Maisonette, Model A-Maisonette, Multi
//                     Generation, Terrace, Type S1, Type S2, DBSS.
//   floor_area_sqm    the real measured area of a real unit, not a published band.
//   lease_commence    build year per unit, independent of the register's completion year.
//
// Measured, 236,386 transactions from Jan 2017. Three things this buys:
//
//   1. DBSS DETECTION. flat_model === 'DBSS' identifies 60 blocks outright — the blind spot
//      that previously needed a customer to declare it. POSITIVE-ONLY: a DBSS row proves DBSS,
//      but absence proves nothing, because a development that has not reached resale yet has no
//      rows at all. CityLife@Tampines is exactly that case. So this narrows the manual path,
//      it does not remove it.
//   2. EMPIRICAL AREA. Generic published bands are wide because they span the whole stock.
//      Block 683 Hougang Ave 8 sells 3-room at exactly 64 m² and 4-room at 85 m². Checking a
//      trace against the block's own areas is a far tighter test than a national band.
//   3. A LAYOUT PRIOR. flat_model is the strongest public hint about interior arrangement:
//      a Maisonette has an internal stair, Multi Generation is dual-key, Type S1/S2 are the
//      Pinnacle towers. It does not name rooms — nothing public does — but it tells a detector
//      which archetype to expect before it looks at a single pixel.

import { dataGovHeaders } from './journey-config.js';
import { normStreet } from './journey-address.js';

const RESALE = 'd_8b84c4ee58e3cfc0ece0d773c8ca6abc';
const DGS = 'https://data.gov.sg/api/action/datastore_search';

// What each archetype implies for a traced plan. `storeys` and `stair` are checkable against
// geometry; `note` is for the human reading the report. Deliberately conservative — only
// claims that hold for the whole archetype.
export const MODELS = {
  'Improved':           { era: '1960s–80s', storeys: 1, note: 'Early standard layout; compact service areas.' },
  'New Generation':     { era: '1970s–80s', storeys: 1, note: 'Distinct from Improved: larger living, separate service yard.' },
  'Model A':            { era: '1980s–90s', storeys: 1, note: 'Common 4/5-room archetype.' },
  'Model A2':           { era: '1990s',     storeys: 1, note: 'Model A variant, generally tighter.' },
  'Simplified':         { era: '1980s',     storeys: 1, note: 'Reduced-spec build; smaller than Model A of the same type.' },
  'Standard':           { era: '1960s–70s', storeys: 1, note: 'Earliest standard layout.' },
  'Premium Apartment':  { era: '1990s+',    storeys: 1, note: 'Higher finish; often household shelter present.' },
  'Apartment':          { era: '1980s–90s', storeys: 1, note: 'Apartment-type block layout.' },
  'Adjoined flat':      { era: 'various',   storeys: 1, note: 'Two units combined — expect a non-standard envelope.' },
  'Maisonette':         { era: '1980s',     storeys: 2, stair: true, note: 'Two storeys with an internal stair.' },
  'Model A-Maisonette': { era: '1980s–90s', storeys: 2, stair: true, note: 'Two storeys with an internal stair.' },
  'Multi Generation':   { era: '1980s–90s', storeys: 2, stair: true, note: 'Dual-key: two households, separate entries.' },
  'Terrace':            { era: '1960s',     storeys: 2, stair: true, note: 'HDB landed terrace — a house, not a flat.' },
  'Type S1':            { era: '2009',      storeys: 1, note: 'Pinnacle@Duxton.' },
  'Type S2':            { era: '2009',      storeys: 1, note: 'Pinnacle@Duxton, larger variant.' },
  'DBSS':               { era: '2000s–10s', storeys: 1, note: 'Design, Build and Sell Scheme; an HDB flat built by a private developer.' },
};

const cache = new Map();

/** "85" not "85–85" — a block that sells one size should say one number. */
export const fmtRange = (r) => (!r ? '' : r[0] === r[1] ? `${r[0]}` : `${r[0]}–${r[1]}`);
/** "1 transaction", "6 transactions". */
export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

async function fetchRows(filters, limit = 300) {
  const url = `${DGS}?resource_id=${RESALE}&limit=${limit}&filters=${encodeURIComponent(JSON.stringify(filters))}`;
  const res = await fetch(url, { headers: dataGovHeaders() });
  if (!res.ok) throw new Error(`resale ${res.status}`);
  return ((await res.json()).result || {}).records || [];
}

const TYPE_KEY = { '1 ROOM': '1room', '2 ROOM': '2room', '3 ROOM': '3room', '4 ROOM': '4room', '5 ROOM': '5room', 'EXECUTIVE': 'exec', 'MULTI-GENERATION': 'multigen' };

/**
 * Resale profile for one block. Street is matched on normalised tokens, same as the register,
 * because resale spells it "TAMPINES CTRL 7" where OneMap says "TAMPINES CENTRAL 7".
 * @returns {{found, transactions, byType:{[k]:{n,minArea,maxArea,models[]}}, models[], isDbss, leaseFrom}}
 */
export async function blockProfile(blk_no, road) {
  const key = `${blk_no}|${normStreet(road)}`;
  if (cache.has(key)) return cache.get(key);
  const p = (async () => {
    let rows = [];
    try { rows = await fetchRows({ block: String(blk_no) }, 500); }
    catch (e) { return { found: false, error: e.message, transactions: 0, byType: {}, models: [], isDbss: false }; }
    const want = normStreet(road);
    rows = rows.filter((r) => normStreet(r.street_name) === want);
    if (!rows.length) return { found: false, transactions: 0, byType: {}, models: [], isDbss: false };

    const byType = {};
    rows.forEach((r) => {
      const k = TYPE_KEY[r.flat_type] || r.flat_type;
      const a = parseFloat(r.floor_area_sqm);
      const t = byType[k] || (byType[k] = { n: 0, minArea: Infinity, maxArea: -Infinity, models: [] });
      t.n++;
      if (a > 0) { t.minArea = Math.min(t.minArea, a); t.maxArea = Math.max(t.maxArea, a); }
      if (r.flat_model && !t.models.includes(r.flat_model)) t.models.push(r.flat_model);
    });
    const models = [...new Set(rows.map((r) => r.flat_model).filter(Boolean))];
    const leases = rows.map((r) => parseInt(r.lease_commence_date, 10)).filter(Boolean);
    return {
      found: true,
      transactions: rows.length,
      byType, models,
      isDbss: models.includes('DBSS'),
      leaseFrom: leases.length ? Math.min(...leases) : null,
      latest: rows.map((r) => r.month).sort().pop(),
    };
  })();
  cache.set(key, p);
  return p;
}

/**
 * The layout prior a detector should carry into a plan from this block.
 * `basis` matters: 'type' means transactions of THIS flat type in THIS block — measured.
 * 'block' means the block sells only other types, so the model is inferred block-wide and no
 * area is claimed. Never let a 'block' prior drive a hard check; block 406 Ang Mo Kio has only
 * ever sold 2-room, so anything it implies about a 5-room there is speculation.
 */
export function layoutPrior(profile, typeKey) {
  if (!profile || !profile.found) return null;
  const t = profile.byType[typeKey];
  const measured = !!(t && t.n);
  const models = (measured && t.models.length ? t.models : profile.models).filter((m) => MODELS[m]);
  if (!models.length) return null;
  const storeys = [...new Set(models.map((m) => MODELS[m].storeys))];
  return {
    basis: measured ? 'type' : 'block',
    models,
    expected_storeys: storeys.length === 1 ? storeys[0] : null,
    expects_stair: models.every((m) => MODELS[m].stair),
    area_range: measured && isFinite(t.minArea) ? [t.minArea, t.maxArea] : null,
    sample: measured ? t.n : 0,
    // note text only — every caller leads with the model name, so prefixing it here printed
    // it twice in a row ("Simplified, 1 transactions. Simplified — Reduced-spec build…")
    notes: models.map((m) => MODELS[m].note),
  };
}
