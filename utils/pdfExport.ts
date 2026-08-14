import jsPDF from 'jspdf';
import { MatchState, Language, MatchStats, PlayerId } from '../types';
import { translations } from './translations';
import { DEJAVU_SANS_REGULAR_B64, DEJAVU_SANS_BOLD_B64 } from './pdfFonts';

const getPercentage = (num: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((num / total) * 100);
};

// Match colors used elsewhere in the app (kept in sync with the tailwind config in index.html).
const INK = '#0f172a';
const MUTED = '#64748b';
const RULE = '#cbd5e1';
const ACCENT = '#7a9900'; // a print-safe darker shade of tennis-green (#ccff00 is unreadable on white)
const CLAY = '#b1592f';

interface Cursor {
  y: number;
}

export function downloadMatchPdf(state: MatchState, lang: Language): void {
  const t = translations[lang];
  const { players, teamPlayers, sets, journal, stats, individualStats, winner, startTime, config } = state;
  const isDoubles = config.matchType === 'doubles' && !!teamPlayers;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // jsPDF's built-in "standard 14" fonts (helvetica/courier/times) only support Latin
  // (WinAnsi) characters — Cyrillic text renders as garbled glyphs with them. Embedding a
  // real Unicode font fixes this for both English and Russian in the same document.
  doc.addFileToVFS('DejaVuSans.ttf', DEJAVU_SANS_REGULAR_B64);
  doc.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
  doc.addFileToVFS('DejaVuSans-Bold.ttf', DEJAVU_SANS_BOLD_B64);
  doc.addFont('DejaVuSans-Bold.ttf', 'DejaVuSans', 'bold');
  doc.setFont('DejaVuSans', 'normal');

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 16;
  const contentW = pageW - marginX * 2;
  const colMid = pageW / 2;
  const cursor: Cursor = { y: 18 };

  const ensureSpace = (needed: number) => {
    if (cursor.y + needed > pageH - 16) {
      doc.addPage();
      cursor.y = 18;
    }
  };

  const setColor = (hex: string) => {
    const c = hex.replace('#', '');
    doc.setTextColor(parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16));
  };
  const setDrawColorHex = (hex: string) => {
    const c = hex.replace('#', '');
    doc.setDrawColor(parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16));
  };

  const pageHeader = (label: string) => {
    doc.setFont('DejaVuSans', 'bold');
    doc.setFontSize(9);
    setColor(MUTED);
    doc.text('COURT IQ', marginX, cursor.y);
    doc.text(label.toUpperCase(), pageW - marginX, cursor.y, { align: 'right' });
    cursor.y += 8;
    setDrawColorHex(RULE);
    doc.setLineWidth(0.4);
    doc.line(marginX, cursor.y, pageW - marginX, cursor.y);
    cursor.y += 10;
  };

  // --- Header ---
  pageHeader(t.matchResult || '');

  // --- Scoreboard table: one row per side, one column per set (TV broadcast style) ---
  const playedSets = sets.filter((s) => s.winner || s.p1 > 0 || s.p2 > 0);
  const numSets = Math.max(playedSets.length, 1);
  const nameColW = 60;
  const totalColW = 14;
  const setColW = (contentW - nameColW - totalColW) / numSets;
  const headerH = 6;
  const rowH = 13;
  const tableH = headerH + rowH * 2;
  const tableTop = cursor.y;
  const totalX = marginX + nameColW + setColW * numSets;
  const setsWon = { p1: 0, p2: 0 };
  playedSets.forEach((s) => {
    if (s.winner === 'p1') setsWon.p1++;
    if (s.winner === 'p2') setsWon.p2++;
  });

  setDrawColorHex(RULE);
  doc.setLineWidth(0.3);
  doc.rect(marginX, tableTop, contentW, tableH);
  doc.line(marginX, tableTop + headerH, marginX + contentW, tableTop + headerH);
  doc.line(marginX, tableTop + headerH + rowH, marginX + contentW, tableTop + headerH + rowH);
  doc.line(marginX + nameColW, tableTop, marginX + nameColW, tableTop + tableH);
  for (let i = 1; i < numSets; i++) {
    const lx = marginX + nameColW + setColW * i;
    doc.line(lx, tableTop, lx, tableTop + tableH);
  }
  doc.line(totalX, tableTop, totalX, tableTop + tableH);

  doc.setFont('DejaVuSans', 'normal');
  doc.setFontSize(7);
  setColor(MUTED);
  playedSets.forEach((_s, i) => {
    const cx = marginX + nameColW + setColW * i + setColW / 2;
    doc.text(String(i + 1), cx, tableTop + 4.2, { align: 'center' });
  });
  doc.text('\u2022', totalX + totalColW / 2, tableTop + 4.2, { align: 'center' });

  (['p1', 'p2'] as PlayerId[]).forEach((side, rowIdx) => {
    const rowY = tableTop + headerH + rowH * rowIdx;
    const isMatchWinner = winner === side;

    doc.setFont('DejaVuSans', isMatchWinner ? 'bold' : 'normal');
    doc.setFontSize(11);
    setColor(isMatchWinner ? ACCENT : INK);
    const nameLines = doc.splitTextToSize(players[side] + (isMatchWinner ? '  \u2605' : ''), nameColW - 6);
    doc.text(nameLines, marginX + 3, rowY + rowH / 2 - (nameLines.length - 1) * 2 + 1.5);

    playedSets.forEach((s, i) => {
      const val = side === 'p1' ? s.p1 : s.p2;
      const wonSet = s.winner === side;
      const cx = marginX + nameColW + setColW * i + setColW / 2;
      doc.setFont('DejaVuSans', wonSet ? 'bold' : 'normal');
      doc.setFontSize(13);
      setColor(wonSet ? ACCENT : INK);
      doc.text(String(val), cx, rowY + rowH / 2 + 2, { align: 'center' });
      if (s.tiebreakPoints) {
        const tbVal = side === 'p1' ? s.tiebreakPoints.p1 : s.tiebreakPoints.p2;
        doc.setFont('DejaVuSans', 'normal');
        doc.setFontSize(6);
        setColor(MUTED);
        doc.text(String(tbVal), cx + 4.5, rowY + rowH / 2 - 3);
      }
    });

    doc.setFont('DejaVuSans', 'bold');
    doc.setFontSize(13);
    setColor(isMatchWinner ? ACCENT : INK);
    doc.text(String(setsWon[side]), totalX + totalColW / 2, rowY + rowH / 2 + 2, { align: 'center' });
  });

  cursor.y = tableTop + tableH + 8;

  // Date + duration
  doc.setFont('DejaVuSans', 'normal');
  doc.setFontSize(9.5);
  setColor(MUTED);
  const dateStr = new Date(startTime || Date.now()).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const durationStr = (() => {
    if (!startTime) return '';
    const diff = Date.now() - startTime;
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${t.duration}: ${hours}h ${mins}m`;
  })();
  doc.text([dateStr, durationStr].filter(Boolean).join('   \u2022   '), marginX, cursor.y);
  cursor.y += 4;

  setDrawColorHex(RULE);
  doc.line(marginX, cursor.y, pageW - marginX, cursor.y);
  cursor.y += 9;

  // --- Section + row helpers ---
  const sectionHeader = (label: string) => {
    ensureSpace(10);
    doc.setFont('DejaVuSans', 'bold');
    doc.setFontSize(10);
    setColor(INK);
    doc.text(label.toUpperCase(), marginX, cursor.y);
    cursor.y += 2;
    setDrawColorHex(RULE);
    doc.line(marginX, cursor.y, pageW - marginX, cursor.y);
    cursor.y += 6.5;
  };

  const statRow = (label: string, v1: string | number, v2: string | number, n1?: number, n2?: number, lowerIsBetter = false) => {
    ensureSpace(7);
    let p1Better = false;
    let p2Better = false;
    if (n1 !== undefined && n2 !== undefined) {
      p1Better = n1 !== n2 && (lowerIsBetter ? n1 < n2 : n1 > n2);
      p2Better = n1 !== n2 && (lowerIsBetter ? n2 < n1 : n2 > n1);
    }

    doc.setFont('DejaVuSans', 'normal');
    doc.setFontSize(9.5);
    setColor(MUTED);
    doc.text(label, colMid, cursor.y, { align: 'center' });

    doc.setFont('DejaVuSans', p1Better ? 'bold' : 'normal');
    setColor(p1Better ? ACCENT : INK);
    doc.text(String(v1), marginX, cursor.y);

    doc.setFont('DejaVuSans', p2Better ? 'bold' : 'normal');
    setColor(p2Better ? ACCENT : INK);
    doc.text(String(v2), pageW - marginX, cursor.y, { align: 'right' });

    cursor.y += 6.4;
  };

  // --- Overview ---
  sectionHeader(t.totalPoints);
  statRow(t.totalPoints, stats.p1.totalPointsWon, stats.p2.totalPointsWon, stats.p1.totalPointsWon, stats.p2.totalPointsWon);

  // --- Service ---
  sectionHeader(t.serviceStats);
  statRow(t.aces, stats.p1.aces, stats.p2.aces, stats.p1.aces, stats.p2.aces);
  statRow(t.doubleFaults, stats.p1.doubleFaults, stats.p2.doubleFaults, stats.p1.doubleFaults, stats.p2.doubleFaults, true);
  statRow(
    t.firstServeIn,
    `${getPercentage(stats.p1.firstServesIn, stats.p1.servicePointsTotal)}%`,
    `${getPercentage(stats.p2.firstServesIn, stats.p2.servicePointsTotal)}%`,
    stats.p1.firstServesIn,
    stats.p2.firstServesIn
  );
  statRow(
    t.firstServePointsWon,
    `${getPercentage(stats.p1.firstServePointsWon, stats.p1.firstServesIn)}%`,
    `${getPercentage(stats.p2.firstServePointsWon, stats.p2.firstServesIn)}%`
  );
  statRow(
    t.secondServePointsWon,
    `${getPercentage(stats.p1.secondServePointsWon, stats.p1.secondServePointsTotal)}%`,
    `${getPercentage(stats.p2.secondServePointsWon, stats.p2.secondServePointsTotal)}%`
  );
  statRow(
    t.breakPointsSaved,
    `${stats.p1.breakPointsSaved}/${stats.p1.breakPointsFaced}`,
    `${stats.p2.breakPointsSaved}/${stats.p2.breakPointsFaced}`,
    stats.p1.breakPointsSaved,
    stats.p2.breakPointsSaved
  );

  // --- Return ---
  sectionHeader(t.returnStats);
  statRow(
    t.returnFirstServePointsWon,
    `${getPercentage(stats.p1.returnFirstServePointsWon, stats.p2.firstServesIn)}%`,
    `${getPercentage(stats.p2.returnFirstServePointsWon, stats.p1.firstServesIn)}%`
  );
  statRow(
    t.returnSecondServePointsWon,
    `${getPercentage(stats.p1.returnSecondServePointsWon, stats.p2.secondServePointsTotal)}%`,
    `${getPercentage(stats.p2.returnSecondServePointsWon, stats.p1.secondServePointsTotal)}%`
  );
  statRow(t.returnWinners, stats.p1.returnWinners, stats.p2.returnWinners, stats.p1.returnWinners, stats.p2.returnWinners);
  statRow(
    t.breakPointsConverted,
    `${stats.p1.breakPointsWon}/${stats.p1.breakPointsOpportunities}`,
    `${stats.p2.breakPointsWon}/${stats.p2.breakPointsOpportunities}`,
    stats.p1.breakPointsWon,
    stats.p2.breakPointsWon
  );

  // --- Efficiency ---
  sectionHeader(t.efficiencyStats);
  statRow(t.winners, stats.p1.winners, stats.p2.winners, stats.p1.winners, stats.p2.winners);
  statRow(t.unforcedErrors, stats.p1.unforcedErrors, stats.p2.unforcedErrors, stats.p1.unforcedErrors, stats.p2.unforcedErrors, true);
  statRow(t.forcedErrors, stats.p1.forcedErrors, stats.p2.forcedErrors, stats.p1.forcedErrors, stats.p2.forcedErrors, true);
  const margin1 = stats.p1.winners - stats.p1.unforcedErrors;
  const margin2 = stats.p2.winners - stats.p2.unforcedErrors;
  statRow(t.aggressiveMargin, margin1, margin2, margin1, margin2);

  // --- By Player (doubles only) ---
  if (isDoubles && individualStats && teamPlayers) {
    (['p1', 'p2'] as const).forEach((side) => {
      const [nameA, nameB] = teamPlayers[side];
      const a: MatchStats = individualStats[`${side}a`];
      const b: MatchStats = individualStats[`${side}b`];

      ensureSpace(14);
      cursor.y += 2;
      doc.setFont('DejaVuSans', 'bold');
      doc.setFontSize(10);
      setColor(CLAY);
      doc.text(`${t.byPlayer.toUpperCase()}: ${nameA} vs ${nameB}`, marginX, cursor.y);
      cursor.y += 2;
      setDrawColorHex(RULE);
      doc.line(marginX, cursor.y, pageW - marginX, cursor.y);
      cursor.y += 6.5;

      statRow(t.winners, a.winners, b.winners, a.winners, b.winners);
      statRow(t.unforcedErrors, a.unforcedErrors, b.unforcedErrors, a.unforcedErrors, b.unforcedErrors, true);
      statRow(t.forcedErrors, a.forcedErrors, b.forcedErrors, a.forcedErrors, b.forcedErrors, true);
      statRow(t.aces, a.aces, b.aces, a.aces, b.aces);
      statRow(t.doubleFaults, a.doubleFaults, b.doubleFaults, a.doubleFaults, b.doubleFaults, true);
      statRow(t.returnWinners, a.returnWinners, b.returnWinners, a.returnWinners, b.returnWinners);
    });
  }

  // --- Match Journal: always starts on its own fresh page ---
  if (journal.length > 0) {
    doc.addPage();
    cursor.y = 18;
    pageHeader(t.journal || '');

    doc.setFont('DejaVuSans', 'bold');
    doc.setFontSize(13);
    setColor(INK);
    doc.text(t.journal, marginX, cursor.y);
    cursor.y += 9;

    const timeColW = 20;
    const scoreColW = 22;
    const descColW = contentW - timeColW - scoreColW - 4;

    journal.forEach((entry) => {
      const isGameEnd = entry.score === '0-0';
      const timeStr = entry.timestamp
        ? new Date(entry.timestamp).toLocaleTimeString(lang === 'ru' ? 'ru-RU' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '';
      const descLines = doc.splitTextToSize(entry.description, descColW);
      const rowH = Math.max(descLines.length * 4.2, 5) + (isGameEnd ? 1.5 : 0.5);
      ensureSpace(rowH + 1);

      if (isGameEnd) {
        setDrawColorHex(RULE);
        doc.setLineWidth(0.2);
        doc.line(marginX, cursor.y - 2.6, pageW - marginX, cursor.y - 2.6);
      }

      doc.setFont('DejaVuSans', 'normal');
      doc.setFontSize(7.5);
      setColor(MUTED);
      doc.text(timeStr, marginX, cursor.y + 3);

      doc.setFont('DejaVuSans', isGameEnd ? 'bold' : 'normal');
      doc.setFontSize(8.5);
      setColor(INK);
      doc.text(descLines, marginX + timeColW, cursor.y + 3);

      doc.setFont('DejaVuSans', isGameEnd ? 'bold' : 'normal');
      setColor(isGameEnd ? ACCENT : MUTED);
      doc.text(entry.score, pageW - marginX, cursor.y + 3, { align: 'right' });

      cursor.y += rowH;
    });
  }

  // --- Footer on every page ---
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('DejaVuSans', 'normal');
    doc.setFontSize(7.5);
    setColor(MUTED);
    doc.text('Court IQ', marginX, pageH - 10);
    doc.text(`${i} / ${pageCount}`, pageW - marginX, pageH - 10, { align: 'right' });
  }

  const dateSlug = new Date().toISOString().slice(0, 10);
  doc.save(`court-iq-${dateSlug}.pdf`);
}
