// Generates a single MDT-styled slide summarizing FY26 work item counts by
// workstream for the LiveLink - Yellow Box program. Conventions sourced from
// `.cursor/skills/mdt_slides.md` (navy/blue palette, 32pt regular titles,
// alternating-row tables, standard footer with page number + wordmark).

import PptxGenJS from 'pptxgenjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FONT = 'Calibri';
const COLOR = {
  navy: '1C1F4D',
  blue: '1E22AA',
  black: '000000',
  bodyMuted: '5A5A5A',
  rowAlt: 'F2F2F2',
  rule: 'D9D9D9',
  white: 'FFFFFF',
};

const rows = [
  ['Streams',                          126,  91,  31, 29],
  ['Pitch Tracker',                    193, 110,  76, 76],
  ['Action Tracker',                   118,  62,  94, 91],
  ['KPI Services (Tier Boards)',       130,  43,  49, 41],
  ['UCM (Unified Configuration Mgr)',  147,  88,  59, 50],
  ['Other / unmapped sub-areas',       124,  19,  25,  8],
];
const totals = ['Total',               838, 413, 334, 295];

const pres = new PptxGenJS();
pres.layout = 'LAYOUT_WIDE'; // 13.333" x 7.5"
pres.title = 'LiveLink - Yellow Box | FY26 Work Item Counts';

const slide = pres.addSlide();

slide.addText('FY26 work items by workstream', {
  x: 0.7, y: 0.35, w: 12, h: 0.6,
  fontFace: FONT, fontSize: 32, bold: false, color: COLOR.navy, valign: 'middle',
});

slide.addText('LiveLink - Yellow Box  |  Apr 26, 2025 - Apr 24, 2026  |  source: Azure DevOps', {
  x: 0.7, y: 0.95, w: 12, h: 0.35,
  fontFace: FONT, fontSize: 14, bold: true, color: COLOR.black, valign: 'middle',
});

const headerCell = (text) => ({
  text,
  options: {
    fill: { color: COLOR.navy },
    color: COLOR.white,
    bold: true,
    align: 'center',
    valign: 'middle',
    fontFace: FONT,
    fontSize: 14,
  },
});

const bodyCell = (text, rowIdx, opts = {}) => ({
  text: String(text),
  options: {
    fill: { color: rowIdx % 2 === 0 ? COLOR.white : COLOR.rowAlt },
    color: COLOR.black,
    align: opts.align ?? 'center',
    valign: 'middle',
    fontFace: FONT,
    fontSize: 13,
    bold: opts.bold ?? false,
  },
});

const totalCell = (text, opts = {}) => ({
  text: String(text),
  options: {
    fill: { color: COLOR.navy },
    color: COLOR.white,
    align: opts.align ?? 'center',
    valign: 'middle',
    fontFace: FONT,
    fontSize: 13,
    bold: true,
  },
});

const header = [
  headerCell('Workstream'),
  headerCell('Stories created'),
  headerCell('Stories resolved/closed'),
  headerCell('Bugs created'),
  headerCell('Bugs resolved/closed'),
];

const dataRows = rows.map((r, i) => [
  bodyCell(r[0], i, { align: 'left' }),
  bodyCell(r[1], i),
  bodyCell(r[2], i),
  bodyCell(r[3], i),
  bodyCell(r[4], i),
]);

const totalRow = [
  totalCell(totals[0], { align: 'left' }),
  totalCell(totals[1]),
  totalCell(totals[2]),
  totalCell(totals[3]),
  totalCell(totals[4]),
];

slide.addTable([header, ...dataRows, totalRow], {
  x: 0.7,
  y: 1.6,
  w: 11.9,
  colW: [3.5, 2.1, 2.4, 2.0, 1.9],
  rowH: [0.55, ...new Array(rows.length).fill(0.45), 0.5],
  border: { type: 'solid', pt: 0.75, color: COLOR.rule },
  fontFace: FONT,
});

// Takeaway block (left-aligned body text, per MDT skill: prose is never centered)
slide.addText(
  [
    {
      text: 'Takeaways  ',
      options: { fontFace: FONT, fontSize: 14, bold: true, color: COLOR.blue },
    },
    { text: '\n', options: { fontFace: FONT, fontSize: 6 } },
    {
      text: 'Pitch Tracker leads on volume (193 stories created, 110 resolved); bug create/close at 76/76.\n',
      options: { fontFace: FONT, fontSize: 12, color: COLOR.black },
    },
    {
      text: 'Action Tracker carries the highest bug load (94 created) with a 97% close ratio.\n',
      options: { fontFace: FONT, fontSize: 12, color: COLOR.black },
    },
    {
      text: 'KPI Services (Tier Boards) shows a 33% close ratio on stories - large in-flight backlog worth a closer look.\n',
      options: { fontFace: FONT, fontSize: 12, color: COLOR.black },
    },
    {
      text: 'Resolved/closed counts filter on ClosedDate within FY26; some items were created in earlier fiscal years.',
      options: { fontFace: FONT, fontSize: 12, color: COLOR.bodyMuted, italic: true },
    },
  ],
  {
    x: 0.7,
    y: 5.5,
    w: 11.9,
    h: 1.5,
    valign: 'top',
    align: 'left',
    paraSpaceAfter: 2,
  }
);

// Footer: page number + meta + wordmark
const footerY = 7.15;
slide.addText('1', {
  x: 0.4, y: footerY, w: 0.45, h: 0.3,
  fontFace: FONT, fontSize: 10, color: COLOR.bodyMuted, valign: 'middle',
});

const today = new Date().toLocaleDateString('en-US', {
  month: 'long', day: 'numeric', year: 'numeric',
});

slide.addText(
  `LiveLink Health Report  |  ${today}  |  Internal use only`,
  {
    x: 0.9, y: footerY, w: 10.2, h: 0.35,
    fontFace: FONT, fontSize: 10, color: COLOR.bodyMuted, valign: 'middle',
  }
);

slide.addText('Medtronic', {
  x: 11.4, y: 7.05, w: 1.5, h: 0.35,
  fontFace: FONT, fontSize: 10, color: COLOR.navy, align: 'right', valign: 'middle',
});

const outPath = path.resolve(__dirname, '..', 'fy26-workstream-breakdown.pptx');
await pres.writeFile({ fileName: outPath });
console.log('Wrote', outPath);
