// journey-store.js — local snapshot of the HDB block register.
//
// WHY: every classification currently depends on data.gov.sg answering right now. An outage,
// a schema change or a rate-limit spike takes the whole verification flow down, and the flow's
// job is due diligence — "we cannot tell you anything today" is a bad answer for a business.
//
// WHAT IS SNAPSHOTTABLE, AND WHAT IS NOT:
//   HDB register    13,357 rows, 6.6 MB raw. Derived to the seven fields we actually use it
//                   collapses to ~765 KB — small enough to hold locally. It changes only when
//                   blocks complete or are demolished, so a quarterly refresh is ample.
//   Resale profile  236k transactions. Only fetched AFTER class is established, and only for
//                   one block, so an outage degrades it to "no empirical area" rather than
//                   breaking classification. Left live.
//   OneMap          cannot be snapshotted — it geocodes every address in Singapore, including
//                   the private ones that are the whole point of the classifier. Stays live.
//
// THE RULE THAT MATTERS — a snapshot MISS is weaker evidence than a live miss:
//   snapshot HIT              authoritative. A block in the register is in the register.
//   snapshot MISS             inconclusive on its own; the block may simply postdate the
//                             snapshot. Must be confirmed live before concluding "private".
//   MISS + live unavailable   'unknown', never 'private'. Refusing to answer is correct here;
//                             guessing private would misclassify every new BTO.

const KEY = 'hnm_hdb_snapshot_v2';
const RESOURCE = 'd_17f5382f26140b1fdae0ba2ef6239d2f';
const DGS = 'https://data.gov.sg/api/action/datastore_search';
const PAGE = 2000;
const UNIT_FIELDS = { '1room': '1room_sold', '2room': '2room_sold', '3room': '3room_sold', '4room': '4room_sold', '5room': '5room_sold', exec: 'exec_sold', multigen: 'multigen_sold', studio: 'studio_apartment_sold' };

let mem = null;

/** Compact row: [street, maxFloor, yearCompleted, units, residential, commercial, town, mix] */
function derive(r) {
  const mix = {};
  Object.entries(UNIT_FIELDS).forEach(([k, f]) => { const n = parseInt(r[f], 10) || 0; if (n > 0) mix[k] = n; });
  return [r.street, parseInt(r.max_floor_lvl, 10) || 0, parseInt(r.year_completed, 10) || 0,
    parseInt(r.total_dwelling_units, 10) || 0, r.residential === 'Y' ? 1 : 0, r.commercial === 'Y' ? 1 : 0,
    r.bldg_contract_town || '', mix];
}

/** Re-inflate to the shape resolveProperty() already expects, so callers need no special case.
 *  Every field a caller reads must round-trip: dropping bldg_contract_town here silently blanked
 *  the town on every snapshot-resolved address while live lookups still had it. */
export function inflate(blk_no, row) {
  const [street, maxFloor, year, units, res, comm, town, mix] = row;
  const out = { blk_no, street, max_floor_lvl: String(maxFloor), year_completed: String(year),
    total_dwelling_units: String(units), residential: res ? 'Y' : 'N', commercial: comm ? 'Y' : 'N',
    bldg_contract_town: town || '' };
  Object.entries(UNIT_FIELDS).forEach(([k, f]) => { out[f] = String(mix[k] || 0); });
  return out;
}

export function loadSnapshot() {
  if (mem) return mem;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    mem = JSON.parse(raw);
    return mem;
  } catch (e) { return null; }
}

export function snapshotInfo() {
  const s = loadSnapshot();
  if (!s) return { present: false };
  const days = Math.floor((Date.now() - new Date(s.generated_at).getTime()) / 86400000);
  return { present: true, generated_at: s.generated_at, blocks: s.count, days, stale: days > 120 };
}

/** All register rows for a block number, or null when no snapshot is held. */
export function localBlock(blk_no) {
  const s = loadSnapshot();
  if (!s) return null;
  const rows = s.blocks[String(blk_no)];
  return rows ? rows.map((r) => inflate(String(blk_no), r)) : [];
}

/** Pull the whole register and store it. onProgress(fetched) for UI. */
export async function buildSnapshot(onProgress, headers) {
  const blocks = {};
  let off = 0, total = 0, count = 0;
  for (;;) {
    const res = await fetch(`${DGS}?resource_id=${RESOURCE}&limit=${PAGE}&offset=${off}`, { headers: headers || {} });
    if (!res.ok) throw new Error(`register ${res.status}`);
    const result = (await res.json()).result || {};
    const recs = result.records || [];
    total = result.total || total;
    recs.forEach((r) => {
      const k = String(r.blk_no);
      (blocks[k] = blocks[k] || []).push(derive(r));
      count++;
    });
    if (onProgress) onProgress(count, total);
    if (recs.length < PAGE) break;
    off += PAGE;
    if (off > 40000) break; // guard against a pagination change looping forever
  }
  const snap = { generated_at: new Date().toISOString(), count, blocks };
  try { localStorage.setItem(KEY, JSON.stringify(snap)); }
  catch (e) { throw new Error('snapshot too large for local storage'); }
  // a superseded version is dead weight (~765 KB) and counts against the storage quota
  try { localStorage.removeItem('hnm_hdb_snapshot_v1'); } catch (e) { /* nothing to reclaim */ }
  mem = snap;
  return snapshotInfo();
}

export function clearSnapshot() {
  mem = null;
  try { localStorage.removeItem(KEY); } catch (e) { /* nothing held */ }
}
