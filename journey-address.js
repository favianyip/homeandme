// journey-address.js — live property resolution and classification.
//
// Two sources, each doing the one job it is authoritative for:
//
//   OneMap (onemap.gov.sg)          address resolution. Any Singapore postal code or address
//                                   string → block number, road name, coordinates.
//   HDB Property Information        property CLASS and unit mix. 13,357 blocks. Presence in
//   (data.gov.sg, live)             this register IS the definition of "HDB".
//
// WHY BOTH: OneMap cannot tell you what kind of housing an address is. Measured directly —
//   530683 (HDB Hougang)      BUILDING = "NIL"
//   560118 (HDB Ang Mo Kio)   BUILDING = "KEBUN BARU HEIGHTS"   ← sounds like a condo
//   328498 (private condo)    BUILDING = "M66"
// A name-based guess would misclassify all three. The register is the only sound test.
//
// JOINING THEM: the two sources spell streets differently — OneMap says "HOUGANG AVENUE 8",
// the register says "HOUGANG AVE 8". Rather than trust an abbreviation table to be complete,
// we filter the register by blk_no alone (683 returns 5 rows nationwide) and match the street
// client-side on normalised tokens. Bounded, and it cannot silently miss.

// REGISTER COVERAGE — the register lists blocks HDB built and manages. It is broader than it
// first appears: DBSS developments ARE generally in it (measured — The Premiere @ Tampines,
// City View @ Boon Keng and Park Central @ AMK all return register rows and classify as HDB).
// But it is not exhaustive. CityLife@Tampines (blk 51 Tampines Ctrl 7) returns no row at all,
// so a genuine HDB-type flat can still be absent. Executive Condominiums are absent by design,
// being developer-sold. So "absent from the register" is weak evidence, not proof of private
// property — anything that rejects on class must leave a declared-exception path open.
export const REGISTER_GAP = 'The HDB block register is not exhaustive: Executive Condominiums are absent by design, and some DBSS developments (measured: CityLife@Tampines) are missing from it.';
// Short reference form. The full sentence belongs where the customer is DECIDING; anywhere that
// merely leans on the fact should point at it, not restate it — printing the whole constant
// twice in one viewport is what the consolidation caused the first time.
export const REGISTER_GAP_SHORT = 'The HDB block register is not exhaustive';

import { dataGovHeaders } from './journey-config.js';
import { localBlock, loadSnapshot } from './journey-store.js';

const HDB_RESOURCE = 'd_17f5382f26140b1fdae0ba2ef6239d2f';
const DGS = 'https://data.gov.sg/api/action/datastore_search';
const ONEMAP = 'https://www.onemap.gov.sg/api/common/elastic/search';

// register spelling ← OneMap spelling
const ABBR = {
  AVENUE: 'AVE', STREET: 'ST', ROAD: 'RD', PLACE: 'PL', CENTRAL: 'CTRL', NORTH: 'NTH',
  SOUTH: 'STH', CRESCENT: 'CRES', DRIVE: 'DR', BUKIT: 'BT', JALAN: 'JLN', LORONG: 'LOR',
  UPPER: 'UPP', TERRACE: 'TER', CLOSE: 'CL', GARDEN: 'GDN', GARDENS: 'GDNS', HEIGHTS: 'HTS',
  PARK: 'PK', INDUSTRIAL: 'IND', KAMPONG: 'KG', TANJONG: 'TG', SAINT: 'ST', COMMONWEALTH: "C'WEALTH",
};

/** Canonical token form so "HOUGANG AVENUE 8" and "HOUGANG AVE 8" compare equal. */
export function normStreet(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ')
    .split(/\s+/).filter(Boolean).map((t) => ABBR[t] || t).join(' ');
}

// The register counts BOTH sold and rental stock in total_dwelling_units, so the mix has to
// fold rental columns into the same flat-type buckets — otherwise a block like 406 Ang Mo Kio
// Ave 10 (220 units: 81 sold + 139 rental, all 2-room) reports a mix that sums to 81, and the
// flat-type cross-check can reject a legitimate plan whose type exists only as rental stock.
const UNIT_FIELDS = {
  '1room': ['1room_sold', '1room_rental'],
  '2room': ['2room_sold', '2room_rental'],
  '3room': ['3room_sold', '3room_rental'],
  '4room': ['4room_sold'],
  '5room': ['5room_sold'],
  exec: ['exec_sold'],
  multigen: ['multigen_sold'],
  studio: ['studio_apartment_sold'],
  other: ['other_room_rental'],
};

function unitMix(rec) {
  const m = {};
  Object.entries(UNIT_FIELDS).forEach(([k, fields]) => {
    const n = fields.reduce((t, f) => t + (parseInt(rec[f], 10) || 0), 0);
    if (n > 0) m[k] = n;
  });
  return m;
}

/**
 * Split a unit number out of a free-text address.
 * Customers are asked for "address including unit number", so they type the whole thing — and
 * OneMap returns ZERO hits for any query containing one (measured: "447B JALAN KAYU #18-348",
 * "791447 #18-348" and the bare "18-348" form all fail, while the same address without it
 * resolves). Stripping it here means the natural input works instead of silently finding nothing.
 * A `#`-prefixed unit is unambiguous anywhere; a bare NN-NNN form is only treated as a unit at
 * the END of the string, so street numbering is left alone.
 */
export function splitUnit(raw) {
  let q = String(raw || '');
  let unit = '';
  const hash = q.match(/#\s*([A-Za-z]?\d{1,3})\s*-\s*(\d{1,4}[A-Za-z]?)/);
  if (hash) {
    unit = `#${hash[1].toUpperCase()}-${hash[2].toUpperCase()}`;
    q = q.replace(hash[0], ' ');
  } else {
    const tail = q.match(/\s([A-Za-z]?\d{1,3})\s*-\s*(\d{1,4}[A-Za-z]?)\s*$/);
    if (tail) {
      unit = `#${tail[1].toUpperCase()}-${tail[2].toUpperCase()}`;
      q = q.slice(0, tail.index);
    }
  }
  return { query: q.replace(/\s{2,}/g, ' ').trim(), unit };
}

/**
 * How big is the footprint behind a building name? Landed ESTATES carry names too — measured:
 * OneMap returns BUILDING "APOLLO GARDENS" for the terrace at 37 Sunbird Avenue — so a name
 * alone cannot mean "strata". What separates them is scale and spread:
 *   strata (measured):  M66 2 addrs/1 road · The Woodgrove 2/2 · CityLife@Tampines 10/1 ·
 *                       D'Leedon 21/1 · Treasure at Tampines (SG's largest condo) 29/1
 *   estates (measured): Apollo Gardens 117/4 · Opera Estate 1108/14 · Serangoon Gdn 2651/20
 * Rule: ≥60 addresses OR ≥3 roads under one name ⇒ landed estate. Margin on both sides is
 * >2×. Cached per name; on fetch failure returns null so callers fall back to asking, never
 * to guessing.
 */
const fpCache = new Map();
export async function buildingFootprint(name) {
  const key = String(name || '').trim().toUpperCase();
  if (!key) return null;
  if (fpCache.has(key)) return fpCache.get(key);
  const p = (async () => {
    try {
      const pages = [];
      for (let pg = 1; pg <= 3; pg++) {
        const j = await fetchJSON(`${ONEMAP}?searchVal=${encodeURIComponent(key)}&returnGeom=N&getAddrDetails=Y&pageNum=${pg}`);
        pages.push(j);
        if (pg >= (j.totalNumPages || 1)) break;
      }
      const rows = pages.flatMap((j) => j.results || []).filter((x) => String(x.BUILDING || '').toUpperCase() === key);
      const roads = [...new Set(rows.map((x) => x.ROAD_NAME))].length;
      const found = pages[0].found || rows.length;
      return { found, roads, estate: found >= 60 || roads >= 3 };
    } catch (e) { fpCache.delete(key); return null; }
  })();
  fpCache.set(key, p);
  return p;
}

/**
 * OneMap's elastic search returns ZERO hits when the query contains filler words customers
 * naturally type — measured: "Blk 447B Jalan Kayu" → 0 while "447B Jalan Kayu" → 1. Same for
 * "block", "hdb", a trailing "Singapore", commas, and the "S123456" postal form. Strip that
 * noise so the natural input works Singapore-wide.
 */
function cleanQuery(raw) {
  return String(raw || '')
    .replace(/[,;]+/g, ' ')
    .replace(/\b(?:blk|block|blok|hdb|apt|apartment|tower|unit|no\.?)\b\.?/gi, ' ')
    .replace(/\bs(\d{6})\b/gi, '$1')
    .replace(/\bsingapore\b/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Address search. Returns up to `limit` OneMap hits, normalised. */
export async function searchAddress(query, limit = 6) {
  const q = String(query || '').trim();
  if (q.length < 3) return [];
  // OneMap drops requests under load exactly as the register does — observed mid-test as a
  // bare "Failed to fetch". Same retry budget, or the address step becomes the flaky one.
  let data = await fetchJSON(`${ONEMAP}?searchVal=${encodeURIComponent(q)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`);
  if (!(data.results || []).length) {
    const cleaned = cleanQuery(q);
    if (cleaned && cleaned.toUpperCase() !== q.toUpperCase() && cleaned.length >= 3) {
      data = await fetchJSON(`${ONEMAP}?searchVal=${encodeURIComponent(cleaned)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`);
    }
  }
  return (data.results || []).filter((r) => r.POSTAL && r.POSTAL !== 'NIL').slice(0, limit).map((r) => {
    const building = r.BUILDING && r.BUILDING !== 'NIL' ? r.BUILDING : '';
    const address = String(r.ADDRESS || '').replace(/ SINGAPORE \d{6}$/, '');
    // OneMap's ADDRESS already ends with BUILDING. Callers that show both would print the
    // development name twice, so hand them a street-only form as well.
    const street_address = building && address.endsWith(building)
      ? address.slice(0, -building.length).trim() : address;
    return {
      postal: r.POSTAL,
      blk_no: r.BLK_NO || '',
      road: r.ROAD_NAME || '',
      building,
      address,
      street_address,
      lat: parseFloat(r.LATITUDE), lng: parseFloat(r.LONGITUDE),
    };
  });
}

// A single dropped request must never read as "class unconfirmed" — measured: under rapid
// sequential load data.gov.sg intermittently drops a request, and a 3-try/1s budget was still
// too tight to ride out the window. Four tries over ~3s clears it, and per-block caching means
// a retried or repeated address costs nothing.
const blockCache = new Map();
const BACKOFF = [400, 900, 1800];

async function fetchJSON(url, init) {
  let last;
  for (let i = 0; i <= BACKOFF.length; i++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return await res.json();
      last = new Error(`request failed ${res.status}`);
      if (res.status < 500 && res.status !== 429) throw last;
    } catch (e) { last = e; }
    if (i < BACKOFF.length) await new Promise((r) => setTimeout(r, BACKOFF[i]));
  }
  throw last;
}

/**
 * Is this block in the HDB register? Snapshot first, live to confirm a miss.
 * A snapshot HIT is authoritative. A snapshot MISS is not — the block may simply postdate the
 * snapshot — so it must be confirmed live before anyone concludes "private".
 * @returns {{rec, source:'snapshot'|'live'}}  throws when neither source can answer
 */
export async function lookupBlock(blk_no, road) {
  if (!blk_no) return { rec: null, source: 'live' };
  const want = normStreet(road);
  if (loadSnapshot()) {
    const hit = (localBlock(blk_no) || []).find((r) => normStreet(r.street) === want);
    if (hit) return { rec: hit, source: 'snapshot' };
  }
  const key = String(blk_no);
  if (!blockCache.has(key)) {
    const url = `${DGS}?resource_id=${HDB_RESOURCE}&limit=100&filters=${encodeURIComponent(JSON.stringify({ blk_no: key }))}`;
    blockCache.set(key, fetchJSON(url, { headers: dataGovHeaders() }).then((j) => ((j.result || {}).records || []))
      .catch((e) => { blockCache.delete(key); throw e; }));
  }
  const recs = await blockCache.get(key);
  return { rec: recs.find((r) => normStreet(r.street) === want) || null, source: 'live' };
}

/** Back-compat: the record only. */
export async function hdbBlock(blk_no, road) {
  return (await lookupBlock(blk_no, road)).rec;
}

/**
 * Full resolution: address → class + register record.
 * Never guesses. If the register cannot be reached it says so rather than assuming private.
 */
export async function resolveProperty(hit) {
  const base = {
    postal: hit.postal, address: hit.address, street_address: hit.street_address || hit.address,
    blk_no: hit.blk_no, road: hit.road,
    building: hit.building, lat: hit.lat, lng: hit.lng,
    label: `BLK ${hit.blk_no} ${hit.road}`.replace(/^BLK\s+(?=\s|$)/, ''),
  };
  let rec = null, error = null, source = 'live';
  try { const r = await lookupBlock(hit.blk_no, hit.road); rec = r.rec; source = r.source; }
  catch (e) { error = e.message; }

  if (error) {
    return Object.assign(base, {
      class: 'unknown', source: 'onemap', register_error: error,
      label: hit.street_address || hit.address,
      note: 'Could not reach the HDB register, and no local snapshot covers this block, so property class is unconfirmed. Verification cannot proceed on a guess.',
    });
  }
  if (!rec) {
    return Object.assign(base, {
      class: 'private', sub: hit.building ? 'named development' : 'private',
      label: hit.street_address || hit.address,
      source: 'onemap + hdb register (absent)',
      register_gap: REGISTER_GAP,
      note: 'Not in the HDB block register. That means it is not an HDB-managed block — but it does not by itself rule out a DBSS flat or Executive Condominium, which are HDB-type housing sold by private developers.',
    });
  }
  const units = parseInt(rec.total_dwelling_units, 10) || 0;
  const residential = rec.residential === 'Y' && units > 0;
  const m = unitMix(rec);
  const mixSum = Object.values(m).reduce((a, c) => a + c, 0);
  return Object.assign(base, {
    class: residential ? 'hdb' : 'hdb-nonres',
    source: source === 'snapshot' ? 'onemap + hdb register (local snapshot)' : 'onemap + hdb register',
    register_source: source,
    town: rec.bldg_contract_town,
    year_completed: parseInt(rec.year_completed, 10) || null,
    max_floor_lvl: parseInt(rec.max_floor_lvl, 10) || null,
    total_dwelling_units: units,
    m,
    mix_sum: mixSum,
    // if the published columns do not add up to the published total, the mix is incomplete and
    // any "this flat type does not exist here" conclusion drawn from it is unsafe
    mix_reconciles: !units || mixSum === units,
    commercial: rec.commercial === 'Y',
    note: residential ? null : 'In the HDB register but recorded with no dwelling units — this is a non-residential block.',
    raw: rec,
  });
}

/**
 * Manual address entry — the recovery path when OneMap has no hit (brand-new BTO streets can
 * lag the geocoder). CRITICAL: OneMap failing does not mean the REGISTER fails — the two update
 * independently — so the block is still tried against the register (snapshot + live). Register
 * hit ⇒ fully classified HDB, no worse than the normal path. No hit anywhere ⇒ class 'manual':
 * unverifiable, held for human review — never silently treated as private.
 */
export async function manualAddress({ postal, blk_no, road }) {
  const clean = (s) => String(s || '').trim().toUpperCase();
  postal = clean(postal); blk_no = clean(blk_no); road = clean(road);
  const base = {
    postal, blk_no, road, building: '', lat: null, lng: null, manual: true,
    address: `${blk_no} ${road}`.trim(), street_address: `${blk_no} ${road}`.trim(),
    label: blk_no ? `BLK ${blk_no} ${road}` : road,
  };
  let rec = null;
  try { rec = (await lookupBlock(blk_no, road)).rec; } catch (e) { /* register unreachable — stays manual */ }
  if (rec) {
    const units = parseInt(rec.total_dwelling_units, 10) || 0;
    const residential = rec.residential === 'Y' && units > 0;
    // unitMix folds sold + rental columns — hand-rolling this loop here silently dropped every
    // type (UNIT_FIELDS values are ARRAYS), showing a 58-unit block as "4-Room × 8" only
    const m = unitMix(rec);
    return Object.assign(base, {
      class: residential ? 'hdb' : 'hdb-nonres',
      source: 'manual entry + hdb register',
      town: rec.bldg_contract_town, year_completed: parseInt(rec.year_completed, 10) || null,
      max_floor_lvl: parseInt(rec.max_floor_lvl, 10) || null,
      total_dwelling_units: units, m, commercial: rec.commercial === 'Y',
      note: residential ? 'OneMap has no entry for this address yet, but the HDB register confirms the block — classification stands on the register alone.' : 'In the HDB register but recorded with no dwelling units — this is a non-residential block.',
      raw: rec,
    });
  }
  return Object.assign(base, {
    class: 'manual', source: 'manual entry — unverified',
    note: 'Entered manually: OneMap has no record of this address and it is not in the HDB register. Nothing can vouch for it automatically — it is held for human verification.',
  });
}

/** data.gov.sg publishes towns as codes; expand the common ones for display. */
export const TOWNS = {
  AMK: 'Ang Mo Kio', BB: 'Bukit Batok', BD: 'Bedok', BH: 'Bishan', BM: 'Bukit Merah',
  BP: 'Bukit Panjang', BT: 'Bukit Timah', CCK: 'Choa Chu Kang', CL: 'Clementi', CT: 'Central',
  GL: 'Geylang', HG: 'Hougang', JE: 'Jurong East', JW: 'Jurong West', KWN: 'Kallang/Whampoa',
  MP: 'Marine Parade', PG: 'Punggol', PRC: 'Pasir Ris', QT: 'Queenstown', SB: 'Sembawang',
  SGN: 'Serangoon', SK: 'Sengkang', TAP: 'Tampines', TG: 'Tengah', TP: 'Toa Payoh', WL: 'Woodlands', YS: 'Yishun',
};
export const townName = (c) => TOWNS[c] || c || '';
