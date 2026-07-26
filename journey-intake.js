// journey-intake.js — address ↔ floor-plan cross-validation.
//
// The address is the ground truth, not the drawing. A customer can upload the wrong file,
// a neighbour's plan, or a plan for the unit they used to own. The address is the one thing
// we can check against an authoritative register, so it arbitrates.
//
// Signals, strongest first:
//   1. PROPERTY CLASS  is the address in the HDB block register? HDB address + condo plan is a
//                      hard contradiction — the single most common wrong-file case.
//   2. FLAT TYPE       an HDB block record lists which flat types were built in it. A 5-room
//                      plan against a block that only ever had 3- and 4-room cannot be right.
//   3. FLOOR AREA      traced internal area against the expected band for that flat type.
//   4. BUILD ERA       household shelters became mandatory for flats designed from 1998
//                      (Civil Defence Shelter Act 1997). A shelter in a 1975 block is a flag,
//                      not a failure — upgrading programmes and re-traces do exist.
//
// Only ACCEPTED plans are written to the training corpus. An unverified trace in the corpus
// is worse than no trace at all: it teaches the detector to reproduce someone's mistake.

import { layoutPrior, fmtRange, plural } from './journey-resale.js';
import { REGISTER_GAP_SHORT } from './journey-address.js';
import { TYPES as HOUSING_TYPES, typeLabel } from './journey-housing.js';

export const AREA_BANDS = {   // internal floor area, m² — HDB published ranges (national fallback)
  '2room': [36, 48], '3room': [58, 72], '4room': [83, 108], '5room': [108, 126], 'exec': [138, 152],
};
// HDB "N-Room" counts TOTAL rooms, not bedrooms: a 2-Room flat is one bedroom plus a living
// room, a 3-Room is two bedrooms, a 4-Room is three. Conflating the two silently disables the
// mismatch check, so the mapping is written from the nomenclature rather than by widening for
// tolerance. 1-Room is a single space with no separate bedroom, so no bedroom count maps to it;
// a plan tracing 0 bedrooms is treated as "cannot infer" instead.
const BED_TO_TYPE = {
  1: ['2room', 'studio'],
  2: ['3room'],
  3: ['4room', '5room', 'exec', 'multigen'],
  4: ['exec', 'multigen'],
};

// What a plan asserts it is, from its layout key. Binary hdb/private was the bug that let a
// condominium plan pass at a landed address — both merely read "private". Categories must be
// as fine as the evidence: hdb / condo (strata) / landed / shophouse (out of scope).
export const planClass = (key) => /^hdb/.test(key || '') ? 'hdb' : /^l\d/.test(key || '') ? 'landed' : /^sh/.test(key || '') ? 'shophouse' : 'condo';

const isOut = (s) => !!(s.out || s.outdoor) || s.key === 'ac' || /^ledge/.test(s.key || '');

/** Derive the facts a plan asserts about itself, from its traced geometry only. */
export function planFacts(doc) {
  const beds = new Set(), floors = doc.floors || [];
  let internal = 0, shelter = false;
  floors.forEach((f) => (f.spaces || []).forEach((s) => {
    if (!isOut(s)) internal += s.w * s.d;
    const k = s.key || '';
    if (/^(master|common|common2|common3|study)$/.test(k) && !/study/.test(k)) beds.add(k);
    if (k === 'master' || /^common/.test(k)) beds.add(k);
    if (k === 'hs' || /shelter/i.test(s.lbl || '')) shelter = true;
  }));
  const bedrooms = beds.size;
  return {
    internal_sqm: internal,
    bedrooms,
    storeys: floors.length,
    shelter,
    // a plan doc declares its own class through its layout key — hdb / condo / landed
    declared_class: planClass(doc.layout_key),
    candidate_types: BED_TO_TYPE[bedrooms] || [],
    confidence: doc.trace_confidence || 'undeclared',
  };
}

const PASS = 'pass', FAIL = 'fail', WARN = 'warn', NA = 'na';

/**
 * @param addr  registry record: { class:'hdb'|'private', blk_no, street, town, year_completed, m:{type:count} }
 * @param doc   canonical plan document
 * @param opts  { dbss_ec: true } — customer asserts this private-classified address is a DBSS
 *              flat or Executive Condominium. Those are HDB-type housing that can be absent
 *              from the HDB block register (measured: CityLife@Tampines returns no row), so the
 *              class contradiction stops being proof of a wrong file. It is a named, recorded
 *              exception — never a silent widening of the rule.
 *              { profile } — resale block profile from journey-resale.js. When present, the area
 *              test runs against what this block actually sells rather than a national band,
 *              and the flat model adds an archetype check.
 */
export function crossCheck(addr, doc, opts) {
  const o = opts || {};
  const f = planFacts(doc);
  const checks = [];
  // `why` is the plain-language headline for a failure — what a customer reads first, before
  // any register vocabulary. It travels with the check that failed, so the reason shown can
  // never drift from the finding that produced it.
  const add = (id, label, state, detail, why) => checks.push({ id, label, state, detail, why: why || null });

  if (!addr) {
    add('class', 'Property class', NA, 'No address resolved yet.');
    return { checks, facts: f, verdict: 'incomplete', headline: 'Enter an address to verify this plan.' };
  }
  if (addr.class === 'unknown') {
    add('class', 'Property class', WARN, addr.note || 'Property class could not be confirmed against the register.');
    return { checks, facts: f, verdict: 'incomplete', headline: 'Property register unavailable — cannot verify right now.' };
  }
  if (addr.class === 'hdb-nonres') {
    add('class', 'Property class', FAIL, addr.note || 'This block is in the HDB register with no dwelling units — it is not housing.',
      'This is not a residential address');
    return { checks, facts: f, verdict: 'rejected', headline: `${addr.label} is not a residential address.`,
      reason: reasonFrom(checks), fails: 1, warns: 0 };
  }

  // 1 — property class, at the granularity the evidence supports.
  // Within "private" the register is silent, but OneMap still separates a NAMED strata
  // development from an individually addressed house: measured, every condo/EC/DBSS presents a
  // development name and landed homes present none. Treating both as one "private" bucket let a
  // condominium plan pass at 37 SUNBIRD (postal 487347) — a landed terrace street.
  const planCls = f.declared_class;
  const ht = o.housing && o.housing.type;
  const htGroup = ht ? (HOUSING_TYPES[ht] || {}).group : null;
  const addrCat = addr.class === 'manual' ? 'manual'
    : addr.class === 'hdb' ? 'hdb'
    : ht === 'strata_landed' ? 'landed'         // cluster houses are landed geometry under an MCST
    : htGroup === 'landed' ? 'landed'
    : (htGroup === 'private' || htGroup === 'hybrid') ? 'strata'
    : addr.building ? 'strata' : 'landed';
  const catName = { hdb: 'an HDB flat', strata: `a strata development${addr.building ? ` (${addr.building})` : ''}`, landed: `a landed property${addr.building ? ` in the ${addr.building} estate` : ''}` };
  const confirmedNote = o.housing && o.housing.confirmed && ht && addr.class !== 'hdb'
    ? ` Recorded housing type: ${typeLabel(ht)}.` : '';

  // A brand-new BTO can exist in the world before it exists in the datasets — the register
  // updates on a cadence and even OneMap can lag a new street. Both get a named, recorded
  // exception (same machinery as DBSS/EC): the customer is never dead-ended, but nothing is
  // presented as verified and the record is held for a human.
  const BTO_NOTE = `Declared a newly completed HDB block (BTO) not yet in the property register. ${addr.manual ? 'Neither OneMap nor the register has it yet' : 'OneMap resolves the address but the register lags new completions'}, so the class cannot be confirmed either way — held for human review and re-checked against the next register update.`;

  if (addrCat === 'manual') {
    add('class', 'Property class', WARN,
      addr.note || 'Entered manually — no register can vouch for this address; a person must verify it before works are quoted.');
  } else if (planCls === 'shophouse') {
    add('class', 'Property class', FAIL,
      'Shophouse layouts are conservation / commercial stock, which this residential service does not verify or quote.',
      'Shophouses are outside our residential scope');
  } else if (addrCat === 'hdb') {
    if (planCls === 'hdb') add('class', 'Property class', PASS, 'HDB address, HDB layout.');
    else add('class', 'Property class', FAIL,
      `${addr.label} is a registered HDB block, but this plan is a ${planCls === 'landed' ? 'landed-house' : 'condominium'} layout.`,
      `This is not a ${planCls === 'landed' ? 'landed house' : 'condominium'} — the address is an HDB flat`);
  } else if (addrCat === 'strata') {
    if (planCls === 'condo') {
      add('class', 'Property class', PASS, `Named private development${addr.building ? ` (${addr.building})` : ''}, condominium-type layout.${confirmedNote}`);
    } else if (o.dbss_ec && planCls === 'hdb') {
      add('class', 'Property class', WARN,
        `Declared a DBSS flat or Executive Condominium at ${addr.building || addr.label}. ${REGISTER_GAP_SHORT}, so the class cannot be confirmed either way here — a person must check this one.`);
    } else if (o.bto && planCls === 'hdb') {
      add('class', 'Property class', WARN, BTO_NOTE);
    } else {
      add('class', 'Property class', FAIL,
        `${addr.label} is not in the HDB block register — it is ${catName.strata} — but this is ${planCls === 'hdb' ? 'an HDB' : 'a landed-house'} layout.${confirmedNote}`,
        `This is not ${planCls === 'hdb' ? 'an HDB flat' : 'a landed house'} — the address is a private development`);
    }
  } else if (addrCat === 'landed') {
    if (planCls === 'landed') {
      add('class', 'Property class', PASS,
        `Not in the HDB register${addr.building ? ` — "${addr.building}" is a landed housing estate` : ', no development name on record'} — landed property, landed layout.${confirmedNote}`);
    } else if (o.bto && planCls === 'hdb') {
      add('class', 'Property class', WARN, BTO_NOTE);
    } else {
      add('class', 'Property class', FAIL,
        `${addr.label} is not in the HDB block register — it is ${catName.landed} — but this plan is ${planCls === 'hdb' ? 'an HDB flat' : 'a condominium'} layout.${confirmedNote}`,
        `This is not ${planCls === 'hdb' ? 'an HDB flat' : 'a condominium'} — the address is a landed property`);
    }
  }

  // 2 — flat type present in the block
  if (addr.class !== 'hdb') {
    add('type', 'Flat type in block', NA, 'Private property — no unit-mix register to check against.');
  } else if (addr.mix_reconciles === false) {
    // the published columns do not sum to the published total, so absence from the mix is not
    // evidence of absence from the block — never reject a plan on an incomplete mix
    add('type', 'Flat type in block', WARN,
      `Register mix sums to ${addr.mix_sum} of ${addr.total_dwelling_units} dwelling units, so it is incomplete — a flat type missing from it cannot be ruled out.`);
  } else {
    const built = Object.keys(addr.m || {});
    const MAPPABLE = new Set(Object.values(BED_TO_TYPE).flat());
    const overlap = f.candidate_types.filter((t) => built.includes(t));
    if (!f.candidate_types.length) {
      add('type', 'Flat type in block', WARN, `Could not infer a flat type from ${f.bedrooms} bedrooms.`);
    } else if (overlap.length) {
      add('type', 'Flat type in block', PASS,
        `${f.bedrooms} bedrooms is consistent with ${overlap.map(nameOf).join(' or ')}, which this block has.`);
    } else if (!built.some((t) => MAPPABLE.has(t))) {
      // the block's whole stock is a category no bedroom count maps to (e.g. other rental) —
      // that is a gap in our mapping, not evidence the customer's plan is wrong
      add('type', 'Flat type in block', WARN,
        `This block is recorded only as ${built.map(nameOf).join(' and ')}, which we cannot match to a bedroom count — needs a human look.`);
    } else {
      add('type', 'Flat type in block', FAIL,
        `A ${f.bedrooms}-bedroom plan suggests ${f.candidate_types.map(nameOf).join('/')}, but this block was built with only ${built.map(nameOf).join(' and ')}.`,
        `This block has no ${f.candidate_types.map(nameOf).join(' or ')} flats`);
    }
  }

  // 3 — floor area: the block's own transactions beat a national band when we have them
  const relevant = (addr.class === 'hdb' && addr.mix_reconciles !== false)
    ? (f.candidate_types.filter((t) => Object.keys(addr.m || {}).includes(t))[0] || f.candidate_types[0])
    : (addr.class === 'hdb' ? f.candidate_types[0] : null);
  const prior = relevant ? layoutPrior(o.profile, relevant) : null;
  const measured = prior && prior.basis === 'type' && prior.area_range;
  if (!relevant) {
    add('area', 'Floor area', NA, `Traced internal area ${f.internal_sqm.toFixed(1)} m² — no published band to compare against.`);
  } else {
    const a = f.internal_sqm;
    // published areas include the wall footprint; a traced internal area sits a few percent
    // under, so the empirical window is widened rather than treated as an exact equality
    const [lo, hi] = measured ? [prior.area_range[0] * 0.9, prior.area_range[1] * 1.04] : AREA_BANDS[relevant];
    const src = measured
      ? `what this block actually sells (${fmtRange(prior.area_range)} m² across ${prior.sample} ${nameOf(relevant)} ${prior.sample === 1 ? 'transaction' : 'transactions'})`
      : `the national ${nameOf(relevant)} band (${lo}–${hi} m²)`;
    if (a >= lo && a <= hi) add('area', 'Floor area', PASS, `${a.toFixed(1)} m² is consistent with ${src}.`);
    else if (a >= lo * 0.9 && a <= hi * 1.1) add('area', 'Floor area', WARN, `${a.toFixed(1)} m² is just outside ${src}.`);
    else add('area', 'Floor area', FAIL, `${a.toFixed(1)} m² is well outside ${src}.`,
      'The floor area does not match this address');
  }

  // 3b — layout archetype. flat_model is the strongest public hint about interior arrangement:
  // a Maisonette or Multi-Generation flat has two storeys and an internal stair, so a
  // single-storey trace against one of those blocks is a wrong file, not a rounding error.
  if (prior) {
    const label = 'Layout archetype';
    if (prior.basis === 'block') {
      add('model', label, NA, `This block sells only other flat types, so its model (${prior.models.join(' / ')}) says nothing measured about a ${nameOf(relevant)} here.`);
    } else if (prior.expected_storeys && prior.expected_storeys !== f.storeys) {
      add('model', label, FAIL,
        `${prior.models.join(' / ')} — ${prior.notes[0]} But this plan traces ${plural(f.storeys, 'storey')}.`,
        `Flats here have ${plural(prior.expected_storeys, 'storey')} — this plan has ${f.storeys}`);
    } else {
      // only the storey count was tested here — say so, rather than implying the whole
      // transaction record agrees, which sits badly next to an area line that may disagree
      add('model', label, PASS,
        `${prior.models.join(' / ')} — ${prior.notes[0]} Storey count is consistent with the ${plural(prior.sample, 'transaction')} on record for this block.`);
    }
  }

  // 4 — build era vs shelter
  if (addr.class !== 'hdb') {
    add('era', 'Build era', NA, 'The household shelter rule is an HDB design standard, so it does not apply to private property.');
  } else if (!addr.year_completed) {
    add('era', 'Build era', NA, 'No completion year on record for this block.');
  } else if (f.shelter && addr.year_completed < 1998) {
    add('era', 'Build era', WARN,
      `Plan shows a household shelter, but this block completed in ${addr.year_completed} — shelters became mandatory for flats designed from 1998.`);
  } else if (!f.shelter && addr.year_completed >= 1998) {
    add('era', 'Build era', WARN, `Block completed ${addr.year_completed}; a household shelter would be expected but none is traced.`);
  } else {
    add('era', 'Build era', PASS, `Shelter presence is consistent with a ${addr.year_completed} block.`);
  }

  const fails = checks.filter((c) => c.state === FAIL);
  const warns = checks.filter((c) => c.state === WARN);
  const verdict = fails.length ? 'rejected' : warns.length ? 'review' : 'accepted';
  // A "matches" headline may only be asserted once the property class is ESTABLISHED. Counting
  // fails and warns cannot tell "matched, with minor caveats" from "we could not establish what
  // this property is" — and the declared-exception path produces exactly the latter, so keying
  // the headline on counts let a customer's own checkbox flip it from "does not match" to
  // "matches" with no new evidence.
  const classOk = (checks.find((c) => c.id === 'class') || {}).state === PASS;
  const headline = fails.length
    ? `This plan does not match ${addr.label}.`
    : !classOk ? `Property class unconfirmed at ${addr.label} — held for review.`
    : warns.length ? `Plan matches ${addr.label}, with points to confirm.`
    : `Plan matches ${addr.label}.`;
  // offer the exception only where it could actually apply, so it never reads as a way to
  // click past a genuine mismatch
  const offer_dbss_ec = addrCat === 'strata' && planCls === 'hdb' && !o.dbss_ec;
  const offer_bto = (addrCat === 'strata' || addrCat === 'landed' || addrCat === 'manual') && planCls === 'hdb' && !o.bto;
  return { checks, facts: f, verdict, headline, reason: reasonFrom(checks), fails: fails.length, warns: warns.length, offer_dbss_ec, dbss_ec: !!o.dbss_ec, offer_bto, bto: !!o.bto, prior, addr_category: addrCat };
}

/**
 * The first failing check IS the reason — checks run strongest evidence first.
 * Carries the plain-language line ONLY: the register detail stays with the check that owns it,
 * one row below. Copying it here printed the same sentence twice in one viewport.
 */
function reasonFrom(checks) {
  const hit = checks.find((c) => c.state === FAIL && c.why);
  return hit ? { code: hit.id, title: hit.why } : null;
}

export function nameOf(t) {
  return ({
    '1room': '1-Room', '2room': '2-Room', '3room': '3-Room', '4room': '4-Room', '5room': '5-Room',
    exec: 'Executive', multigen: 'Multi-Generation', studio: 'Studio Apartment', other: 'Other Rental',
  })[t] || t;
}

/* ── area schedule ──────────────────────────────────────────────────────
   Every space in the submitted plan, named and measured — the per-room detection the 3D model
   is built from. Names come from the trace's own labels first; the key map covers the rest. */
const ROOM_NAMES = {
  living: 'LIVING', kitchen: 'KITCHEN', master: 'MAIN BEDROOM', common: 'BEDROOM 2',
  common2: 'BEDROOM 3', common3: 'BEDROOM 4', study: 'STUDY', family: 'FAMILY',
  bath: 'BATH / WC', bath_m: 'BATH 1', bath_c: 'BATH 2', corr: 'HALL', corr2: 'HALL',
  foyer: 'FOYER', hs: 'SHELTER', yard: 'SERVICE YARD', ac: 'AC LEDGE', balcony: 'BALCONY',
  garden: 'PORCH & GARDEN', terrace: 'TERRACE', landing: 'LANDING', hall: 'STAIRS & HALL',
  store: 'STORE', wic: 'WARDROBE', sit: 'SITTING', living2: 'DINING', hall2: 'PASSAGE',
};
export function areaSchedule(doc) {
  let internal = 0, outdoor = 0;
  const floors = (doc.floors || []).map((fl, i) => ({
    label: `L${i + 1}`,
    rooms: (fl.spaces || []).map((s) => {
      const sqm = +(s.w * s.d).toFixed(1), out = isOut(s);
      if (out) outdoor += sqm; else internal += sqm;
      return { name: s.lbl || ROOM_NAMES[s.key] || String(s.key || '').toUpperCase(), sqm, out };
    }),
  }));
  return { floors, internal_sqm: +internal.toFixed(1), outdoor_sqm: +outdoor.toFixed(1) };
}

/* ── verified-plan corpus ──────────────────────────────────────────────────
   Every accepted submission is a labelled Singapore floor plan: source image +
   traced geometry + an address-verified ground truth. This is the asset a
   detector can actually be trained on — the thing a generic CAD symbol dataset
   cannot provide. Rejected and review-state plans are deliberately NOT stored. */
const KEY = 'hnm_plan_corpus_v1';

export function corpusRead() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
}

export function corpusAdd(entry) {
  const all = corpusRead();
  all.unshift(entry);
  try { localStorage.setItem(KEY, JSON.stringify(all.slice(0, 200))); } catch (e) { console.warn('corpus full', e); }
  return all;
}

export function corpusStats() {
  const all = corpusRead();
  const byType = {};
  all.forEach((e) => { byType[e.unit_type || 'unknown'] = (byType[e.unit_type || 'unknown'] || 0) + 1; });
  return { count: all.length, byType, withImage: all.filter((e) => e.has_source_image).length };
}
