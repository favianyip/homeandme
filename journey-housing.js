// journey-housing.js — location-based housing identity for Singapore.
//
// Goal: address in, housing type out. What matters for renovation is not the marketing
// category but WHO GOVERNS THE WORKS — HDB, an MCST, or URA/BCA — because that decides
// permits, hacking rules and lead times. The taxonomy is therefore built around authority.
//
// WHAT THE OPEN DATA CAN ACTUALLY PROVE (measured, not assumed):
//
//   HDB Property Information (data.gov.sg, no key)   definitive for HDB. 13,357 blocks.
//   OneMap search (no key)                           address, block, building name, coords.
//   OneMap themes / planning area                    401 Unauthorized — needs a registered key.
//   URA private residential property API             needs a URA key.
//   data.gov.sg collections API                      403 — needs auth.
//
// So two open sources, and they support exactly three definitive verdicts:
//
//   in register, dwelling units > 0   → HDB flat                        CERTAIN
//   in register, dwelling units = 0   → HDB non-residential block       CERTAIN
//   not in register, NO building name → an individually addressed house LIKELY LANDED
//   not in register, building name    → a named development             AMBIGUOUS
//
// That last bucket is the honest limit. Measured: M66 (condo), THE WOODGROVE (EC),
// CITYLIFE@TAMPINES (DBSS), VERANDA (strata landed) and a foreign high commission all present
// identically — a name and no register row. No open signal separates them. Development size
// does not: sameName counts were 2, 2, 10 and 1 respectively, tracking size not type.
//
// Rather than guess, the resolver PROPOSES with stated evidence and asks the customer to
// confirm — and then remembers. Confirmations are keyed by building name as well as address,
// so the second resident of a development inherits the first one's answer. The location→type
// index is therefore built from real confirmations instead of bought, and it is exactly the
// labelled data the detector wants later.

import { resolveProperty, buildingFootprint } from './journey-address.js';
import { blockProfile } from './journey-resale.js';

/* ── taxonomy ────────────────────────────────────────────────────────────── */
// `authority` is the renovation approver. `hdb_rules` means HDB's renovation guidelines apply
// even where the property is not HDB-managed (DBSS, and ECs inside their MOP).
export const TYPES = {
  hdb_flat:      { label: 'HDB flat',                 group: 'public',  authority: 'HDB',        hdb_rules: true  },
  hdb_nonres:    { label: 'HDB non-residential unit', group: 'public',  authority: 'HDB',        hdb_rules: true  },
  dbss:          { label: 'DBSS flat',                group: 'hybrid',  authority: 'HDB',        hdb_rules: true  },
  ec_mop:        { label: 'Executive Condominium (within MOP)', group: 'hybrid', authority: 'HDB + MCST', hdb_rules: true },
  ec_private:    { label: 'Executive Condominium (privatised)', group: 'private', authority: 'MCST', hdb_rules: false },
  condo:         { label: 'Condominium',              group: 'private', authority: 'MCST',       hdb_rules: false },
  apartment:     { label: 'Private apartment',        group: 'private', authority: 'MCST',       hdb_rules: false },
  walkup:        { label: 'Walk-up apartment',        group: 'private', authority: 'MCST',       hdb_rules: false },
  strata_landed: { label: 'Strata landed / cluster house', group: 'private', authority: 'MCST + URA', hdb_rules: false },
  // the open data can show a property IS landed (individually addressed, no register row) but
  // nothing in it separates terrace from semi-detached from bungalow. This is the honest
  // headline for that state — authority is already correct, subtype is still open.
  landed:        { label: 'Landed house — subtype not established', group: 'landed', authority: 'URA + BCA', hdb_rules: false },
  terrace:       { label: 'Terrace house',            group: 'landed',  authority: 'URA + BCA',  hdb_rules: false },
  semid:         { label: 'Semi-detached house',      group: 'landed',  authority: 'URA + BCA',  hdb_rules: false },
  detached:      { label: 'Detached house / bungalow', group: 'landed', authority: 'URA + BCA',  hdb_rules: false },
  shophouse:     { label: 'Shophouse',                group: 'landed',  authority: 'URA conservation', hdb_rules: false },
  nonres:        { label: 'Non-residential building', group: 'other',   authority: 'BCA / URA',  hdb_rules: false },
};
export const typeLabel = (t) => (TYPES[t] || {}).label || t;

/* ── learned index ───────────────────────────────────────────────────────── */
// Every confirmation is stored twice: against the exact address, and against the development
// name. The name key is what makes this compound — one confirmed unit in a 500-unit condo
// answers for every other unit in it.
const KEY = 'hnm_housing_index_v1';
const norm = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export function indexRead() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{"byAddress":{},"byBuilding":{}}'); }
  catch (e) { return { byAddress: {}, byBuilding: {} }; }
}

export function indexConfirm(addr, type, source) {
  const ix = indexRead();
  const rec = { type, source: source || 'customer', at: new Date().toISOString() };
  if (addr.postal) ix.byAddress[addr.postal] = rec;
  if (addr.building) ix.byBuilding[norm(addr.building)] = rec;
  try { localStorage.setItem(KEY, JSON.stringify(ix)); } catch (e) { console.warn('index full', e); }
  return ix;
}

export function indexStats() {
  const ix = indexRead();
  const byType = {};
  Object.values(ix.byAddress).forEach((r) => { byType[r.type] = (byType[r.type] || 0) + 1; });
  return { addresses: Object.keys(ix.byAddress).length, developments: Object.keys(ix.byBuilding).length, byType };
}

/* ── resolution ──────────────────────────────────────────────────────────── */
// Candidate sets for the ambiguous bucket, most likely first. Deliberately NOT a guess
// dressed as an answer — the UI shows these as choices, not as a verdict.
const NAMED_CANDIDATES = ['condo', 'apartment', 'ec_private', 'ec_mop', 'dbss', 'strata_landed', 'walkup', 'nonres'];
// shophouse removed from the residential offer — conservation/commercial stock is out of
// scope; an address that is genuinely one routes to 'nonres' and a human.
const HOUSE_CANDIDATES = ['terrace', 'semid', 'detached', 'nonres'];

/**
 * @returns {{type, confidence:'certain'|'likely'|'ambiguous', evidence:string[],
 *            candidates:string[], confirmed:boolean, address}}
 */
export async function identify(hit) {
  const addr = await resolveProperty(hit);
  const ix = indexRead();
  const learned = (addr.postal && ix.byAddress[addr.postal])
    || (addr.building && ix.byBuilding[norm(addr.building)]);

  const base = { address: addr, confirmed: false, learned: null };

  if (addr.class === 'unknown') {
    return Object.assign(base, {
      type: null, confidence: 'ambiguous', candidates: [],
      evidence: ['The HDB register could not be reached, so nothing is claimed about this address.'],
    });
  }
  if (addr.class === 'hdb') {
    // resale transactions refine WHICH KIND of HDB flat. DBSS is developer-built to its own
    // layouts, so calling it a plain HDB flat would hand the detector the wrong prior.
    let prof = null;
    try { prof = await blockProfile(addr.blk_no, addr.road); } catch (e) { /* register verdict stands */ }
    const ev = [`In the HDB block register with ${addr.total_dwelling_units} dwelling units.`];
    if (prof && prof.found) {
      ev.push(`${prof.transactions} resale transactions on record${prof.models.length ? `, all of model ${prof.models.join(' / ')}` : ''}.`);
    }
    return Object.assign(base, {
      type: prof && prof.isDbss ? 'dbss' : 'hdb_flat',
      confidence: 'certain', candidates: [], confirmed: true,
      profile: prof, evidence: ev,
    });
  }
  if (addr.class === 'hdb-nonres') {
    return Object.assign(base, {
      type: 'hdb_nonres', confidence: 'certain', candidates: [], confirmed: true,
      evidence: ['In the HDB block register, recorded with no dwelling units.'],
    });
  }

  // not in the register — the open data runs out here, EXCEPT for one measurable signal:
  // landed estates put their name on a hundred-plus individually addressed houses across
  // several roads, while even Singapore's largest condo spans 29 addresses on one road.
  let named = !!addr.building;
  let fp = null;
  if (named) {
    fp = await buildingFootprint(addr.building);
    if (fp && fp.estate) named = false; // the "development" is an estate of houses
  }
  const evidence = [named
    ? `Not in the HDB block register, and OneMap names the development "${addr.building}" (${fp ? `${fp.found} address${fp.found === 1 ? '' : 'es'} on ${fp.roads} road${fp.roads === 1 ? '' : 's'}` : 'footprint unavailable'}) — a strata development, but the open data cannot say which kind.`
    : addr.building && fp && fp.estate
      ? `Not in the HDB block register. "${addr.building}" spans ${fp.found} addresses across ${fp.roads} roads — that is a landed housing estate, not a strata development.`
      : 'Not in the HDB block register, and OneMap returns no development name — individually addressed, which is characteristic of a landed house.'];

  if (learned) {
    evidence.push(learned.source === 'customer'
      ? `A previous resident confirmed this ${named ? 'development' : 'address'} as ${typeLabel(learned.type)}.`
      : `Recorded as ${typeLabel(learned.type)} (${learned.source}).`);
    return Object.assign(base, {
      type: learned.type, confidence: 'likely', confirmed: true, learned,
      candidates: named ? NAMED_CANDIDATES : HOUSE_CANDIDATES, evidence,
    });
  }
  return Object.assign(base, {
    // "landed" is supported by the evidence; a SUBTYPE is not — measured, 1 BINJAI RISE (a
    // bungalow area) and 18 JALAN KEMBANGAN (terrace) return identical signals. Naming one
    // would put a guess into an index other units inherit from.
    type: named ? null : 'landed',
    confidence: named ? 'ambiguous' : 'likely',
    candidates: named ? NAMED_CANDIDATES : HOUSE_CANDIDATES,
    evidence,
  });
}
