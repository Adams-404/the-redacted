/* Shared state and constants */

export const BOARD_W = 132, BOARD_H = 76, PAPER_Z = 0.22, PIN_Z = 1.05;

export const THREADS = [
  { name: "Crimson", color: 0xb01722 },
  { name: "Twine", color: 0xc9a76a },
  { name: "Cobalt", color: 0x2f5f9e },
  { name: "Shadow", color: 0x22201d },
];
export let THREAD_I = 0;
export function setTHREAD_I(val) { THREAD_I = val; }

export const PIN_COLORS = {
  photo: 0xb01722, suspect: 0x1a1a1a, sticky: 0xd9a520, doc: 0x2f5f9e,
  news: 0xb01722, print: 0x1a1a1a, map: 0x2e7d4f, statement: 0x2f5f9e,
  bag: 0x8a5a20, key: 0xa8823c, plan: 0x2f5f9e,
};

export const TYPE_LABEL = {
  photo: "Image", suspect: "Suspect card", sticky: "Sticky note",
  doc: "Document", news: "Clipping", print: "Fingerprint",
  map: "Location card", statement: "Note", bag: "Evidence bag",
  key: "Physical evidence", plan: "Floor plan",
};

export const TYPE_TAGS = {
  photo: ["crime scene", "image"], suspect: ["person"], sticky: ["note"],
  doc: ["document"], news: ["press"], print: ["forensics"],
  map: ["location"], statement: ["witness"], bag: ["forensics", "evidence"],
  key: ["evidence"], plan: ["interior", "loft"],
};

/* Runtime state */
export const items = [];
export const hitMeshes = [];
export const ropes = [];
export const sel = new Set();
export let primary = null;
export function setPrimary(val) { primary = val; }

export const filterState = {};

/* DOM refs */
export const canvasEl = document.getElementById("stage");

/* Utility */
export const rnd = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let UID = 1;
export const uid = () => "ev" + UID++;
export const $ = (id) => document.getElementById(id);
