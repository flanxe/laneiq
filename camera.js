(() => {
  // core/src/ballid.ts
  var HUE_BINS = 12;
  var SIG_LEN = HUE_BINS + 3;
  function signatureCounts(rgba, size) {
    const c = new Array(SIG_LEN).fill(0);
    const cx = (size - 1) / 2;
    const r = size / 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (Math.hypot(x - cx, y - cx) > r) continue;
        const i = (y * size + x) * 4;
        const R2 = rgba[i] / 255;
        const G = rgba[i + 1] / 255;
        const B = rgba[i + 2] / 255;
        const max = Math.max(R2, G, B);
        const min = Math.min(R2, G, B);
        const v = max;
        const s = max === 0 ? 0 : (max - min) / max;
        if (v < 0.25) c[HUE_BINS]++;
        else if (s < 0.25) c[v > 0.7 ? HUE_BINS + 2 : HUE_BINS + 1]++;
        else {
          const d = max - min;
          let h = max === R2 ? (G - B) / d % 6 : max === G ? (B - R2) / d + 2 : (R2 - G) / d + 4;
          h = (h * 60 + 360) % 360;
          c[Math.min(HUE_BINS - 1, Math.floor(h / 360 * HUE_BINS))]++;
        }
      }
    }
    return c;
  }
  function normalize(counts) {
    const t = counts.reduce((a, b) => a + b, 0);
    return t === 0 ? counts.slice() : counts.map((x) => x / t);
  }
  function distance(a, b) {
    const sm = (v) => v.map((x, i) => i < HUE_BINS ? x * 0.6 + 0.2 * v[(i + 1) % HUE_BINS] + 0.2 * v[(i + HUE_BINS - 1) % HUE_BINS] : x);
    const A = sm(a);
    const B = sm(b);
    return A.reduce((s, x, i) => s + Math.abs(x - B[i]), 0) / 2;
  }
  function classifyBall(sig, arsenal) {
    const ranking = arsenal.filter((b) => b.exemplars.length > 0).map((b) => ({ id: b.id, distance: Math.min(...b.exemplars.map((e) => distance(sig, e))) })).sort((x, y) => x.distance - y.distance);
    if (!ranking.length) return { ballId: null, confidence: 0, auto: false, ranking };
    const d1 = ranking[0].distance;
    const d2 = ranking[1]?.distance ?? 1;
    const confidence = Math.max(0, Math.min(1, (d2 - d1) / 0.25)) * Math.max(0, Math.min(1, 1 - d1 / 0.45));
    const exemplarCount = arsenal.find((b) => b.id === ranking[0].id).exemplars.length;
    const auto = confidence >= 0.6 && exemplarCount >= 2;
    return { ballId: ranking[0].id, confidence, auto, ranking };
  }

  // core/src/vision.ts
  var LANE_BOARDS = 39;
  var LANE_LENGTH_FT = 60;
  var ARROWS_FT = 15;
  function solveHomography(src, dst) {
    const A = [];
    for (let i = 0; i < 4; i++) {
      const { x, y } = src[i];
      const { x: u, y: v } = dst[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
    }
    for (let c = 0; c < 8; c++) {
      let p = c;
      for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      if (Math.abs(A[p][c]) < 1e-12) throw new Error("degenerate calibration points");
      [A[c], A[p]] = [A[p], A[c]];
      for (let r = 0; r < 8; r++) {
        if (r === c) continue;
        const f = A[r][c] / A[c][c];
        for (let k2 = c; k2 < 9; k2++) A[r][k2] -= f * A[c][k2];
      }
    }
    return [...A.map((row, i) => row[8] / row[i]), 1];
  }
  function applyHomography(h, p) {
    const w = h[6] * p.x + h[7] * p.y + h[8];
    return { x: (h[0] * p.x + h[1] * p.y + h[2]) / w, y: (h[3] * p.x + h[4] * p.y + h[5]) / w };
  }
  var boardFromRight = (xBoards) => LANE_BOARDS + 0.5 - xBoards;
  var boardToX = (board) => LANE_BOARDS + 0.5 - board;
  function linearFit(xs, ys) {
    const n = xs.length;
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    let sxx = 0;
    let sxy = 0;
    for (let i = 0; i < n; i++) {
      sxx += (xs[i] - mx) ** 2;
      sxy += (xs[i] - mx) * (ys[i] - my);
    }
    const slope = sxy / sxx;
    const intercept = my - slope * mx;
    const rmse = Math.sqrt(xs.reduce((a, x, i) => a + (ys[i] - (slope * x + intercept)) ** 2, 0) / n);
    return { slope, intercept, rmse };
  }
  function interp(path2, yFt) {
    for (let i = 1; i < path2.length; i++) {
      const a = path2[i - 1];
      const b = path2[i];
      if (a.y <= yFt && b.y >= yFt && b.y > a.y) return a.x + (yFt - a.y) / (b.y - a.y) * (b.x - a.x);
    }
    return null;
  }
  var ENTRY_FT = 59.5;
  var BOARD_IN = 41.5 / LANE_BOARDS;
  function headingDeg(path2, y0, y1) {
    const w = path2.filter((s) => s.y >= y0 && s.y <= y1);
    if (w.length < 4 || w[w.length - 1].y - w[0].y < 4) return null;
    const f = linearFit(w.map((s) => s.y), w.map((s) => s.x));
    return { deg: Math.atan(f.slope * BOARD_IN / 12) * 180 / Math.PI, slopeBoardsPerFt: f.slope };
  }
  function analyzeShot(path2) {
    const p = path2.filter((s) => s.y >= 3 && s.y <= 58).sort((a, b) => a.t - b.t);
    if (p.length < 8 || p[p.length - 1].y - p[0].y < 20) return null;
    const fit = linearFit(p.map((s) => s.t), p.map((s) => s.y));
    if (fit.slope <= 0) return null;
    const fps = fit.slope;
    const speed = fps * (3600 / 5280);
    const speedUnc = fit.rmse / (p[p.length - 1].t - p[0].t) * (3600 / 5280) * 2;
    const mid = p.filter((s) => s.y >= ARROWS_FT && s.y <= 55);
    let bpBoard = null;
    let bpFt = null;
    if (mid.length >= 4) {
      const c = LANE_BOARDS / 2;
      const ext = mid.reduce((best, s) => Math.abs(s.x - c) > Math.abs(best.x - c) ? s : best);
      bpBoard = boardFromRight(ext.x);
      bpFt = ext.y;
    }
    const arrows = interp(p, ARROWS_FT);
    const tail = p.filter((s) => s.y >= 50);
    let entry = null;
    if (tail.length >= 4 && tail[tail.length - 1].y - tail[0].y >= 3) {
      const f = linearFit(tail.map((s) => s.y), tail.map((s) => s.x));
      entry = f.slope * ENTRY_FT + f.intercept;
    }
    const launch = headingDeg(p, 3, 20);
    const impact = headingDeg(p, 50, 58);
    const coverage = Math.min(1, (p[p.length - 1].y - p[0].y) / 45);
    const confidence = Math.max(0, Math.min(1, coverage * (1 - Math.min(1, fit.rmse / 5))));
    return {
      speedMph: speed,
      speedUncertainty: speedUnc,
      boardAtArrows: arrows === null ? null : boardFromRight(arrows),
      breakpointBoard: bpBoard,
      breakpointFt: bpFt,
      entryBoard: entry === null ? null : boardFromRight(entry),
      launchAngleDeg: launch?.deg ?? null,
      impactAngleDeg: impact?.deg ?? null,
      samples: p.length,
      confidence
    };
  }

  // core/src/metrics.ts
  var POCKET_BOARD = { R: 17.5, L: 22.5 };
  var MPH = 3600 / 5280;
  function speedBetween(path2, y0, y1) {
    const w = path2.filter((s) => s.y >= y0 && s.y <= y1);
    if (w.length < 4) return null;
    const dt = w[w.length - 1].t - w[0].t;
    const dy = w[w.length - 1].y - w[0].y;
    return dt > 0.05 && dy > 3 ? dy / dt * MPH : null;
  }
  function classifyZone(miss) {
    const a = Math.abs(miss);
    if (a <= 1) return "pocket";
    if (a <= 2.5) return miss > 0 ? "high" : "light";
    return miss > 0 ? "very-high" : "very-light";
  }
  function deriveMetrics(a, path2, hand) {
    const early = path2.filter((s) => s.y >= 2 && s.y <= 8);
    const startBoard = early.length ? boardFromRight(early.reduce((t, s) => t + s.x, 0) / early.length) : null;
    const launchSpeed = speedBetween(path2, 3, 20);
    const entrySpeed = speedBetween(path2, 40, 58);
    const speedLossPct = launchSpeed && entrySpeed ? (launchSpeed - entrySpeed) / launchSpeed * 100 : null;
    const hookBoards = a.breakpointBoard !== null && a.entryBoard !== null ? Math.abs(a.entryBoard - a.breakpointBoard) : null;
    const hookLengthFt = a.breakpointFt !== null ? Math.max(0, 59.5 - a.breakpointFt) : null;
    const pocket = POCKET_BOARD[hand];
    const pocketMiss = a.entryBoard === null ? null : hand === "R" ? a.entryBoard - pocket : pocket - a.entryBoard;
    return {
      hand,
      startBoard,
      arrowsBoard: a.boardAtArrows,
      breakpointBoard: a.breakpointBoard,
      breakpointFt: a.breakpointFt,
      entryBoard: a.entryBoard,
      launchAngle: a.launchAngleDeg,
      entryAngle: a.impactAngleDeg === null ? null : Math.abs(a.impactAngleDeg),
      launchSpeed,
      entrySpeed,
      speedLossPct,
      hookBoards,
      hookLengthFt,
      pocketMiss,
      zone: pocketMiss === null ? null : classifyZone(pocketMiss)
    };
  }

  // core/src/lanedetect.ts
  var LANE_END_FT = 62.85;
  var ASSUMED_HFOV_DEG = 63;
  var LANE_LEN = 60;
  var newDiag = () => ({ edgePixels: 0, leftLines: 0, rightLines: 0, pairs: 0, guess: null, foulRow: null, pitRow: null, hint: "" });
  function detectLanes(gray, w, h, maxCandidates = 3, seed, diag) {
    const first = detectLanesOnce(gray, w, h, maxCandidates, seed, diag);
    if (first.length && first.some(isSolid)) return first;
    const inv = new Uint8ClampedArray(w * h);
    for (let i = 0; i < inv.length; i++) inv[i] = 255 - gray[i];
    const dg2 = diag ? newDiag() : void 0;
    const second = detectLanesOnce(inv, w, h, maxCandidates, seed, dg2);
    const best = (l) => l.reduce((m, d) => Math.max(m, d.confidence), 0);
    if (best(second) > best(first)) {
      if (diag && dg2) Object.assign(diag, dg2);
      return second;
    }
    return first;
  }
  function detectLanesOnce(gray, w, h, maxCandidates = 3, seed, diag) {
    const dbg = (m) => globalThis.__laneDbg?.push(m);
    const sm = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        sm[i] = (4 * gray[i] + 2 * (gray[i - 1] + gray[i + 1] + gray[i - w] + gray[i + w]) + gray[i - w - 1] + gray[i - w + 1] + gray[i + w - 1] + gray[i + w + 1]) / 16;
      }
    const gx = new Float32Array(w * h);
    const gy = new Float32Array(w * h);
    const mag = new Float32Array(w * h);
    for (let y = 2; y < h - 2; y++)
      for (let x = 2; x < w - 2; x++) {
        const i = y * w + x;
        const dx = -sm[i - w - 1] + sm[i - w + 1] - 2 * sm[i - 1] + 2 * sm[i + 1] - sm[i + w - 1] + sm[i + w + 1];
        const dy = -sm[i - w - 1] - 2 * sm[i - w] - sm[i - w + 1] + sm[i + w - 1] + 2 * sm[i + w] + sm[i + w + 1];
        gx[i] = dx;
        gy[i] = dy;
        mag[i] = Math.hypot(dx, dy);
      }
    const sample2 = Float32Array.from({ length: 4e3 }, (_, k2) => mag[Math.floor(k2 / 4e3 * mag.length)]).sort();
    let thr = Math.max(14, sample2[Math.floor(sample2.length * 0.9)], 7 * sample2[Math.floor(sample2.length * 0.5)]);
    if (seed) {
      const near = [];
      for (let y = Math.max(2, Math.round(seed.y - h * 0.2)); y < Math.min(h - 2, Math.round(seed.y + h * 0.2)); y += 2)
        for (let x = Math.max(2, Math.round(seed.x - w * 0.25)); x < Math.min(w - 2, Math.round(seed.x + w * 0.25)); x += 2) near.push(mag[y * w + x]);
      near.sort((a, b) => a - b);
      thr = Math.max(14, near[Math.floor(near.length * 0.85)] * 0.7, 6 * near[Math.floor(near.length * 0.5)]);
    }
    const yA = Math.round(h * 0.1);
    const yB = Math.round(h * 0.9);
    const span = yB - yA;
    const yMin = seed ? 2 : Math.round(h * 0.1);
    const STEP = Math.max(1, Math.round(w / 320));
    const PHI_MAX = 68 * Math.PI / 180;
    const DPHI = 0.4 * Math.PI / 180;
    const WIN = 15 * Math.PI / 180;
    const NPHI = Math.floor(2 * PHI_MAX / DPHI) + 1;
    const tanTab = Float32Array.from({ length: NPHI }, (_, k2) => Math.tan(-PHI_MAX + k2 * DPHI));
    const lo = -w * 1.5;
    const NX = Math.ceil(w * 4 / STEP);
    const accL = new Float32Array(seed ? 0 : NPHI * NX);
    const accR = new Float32Array(seed ? 0 : NPHI * NX);
    const agrees = (i, slope, sign) => (gx[i] - gy[i] * slope) / Math.sqrt(1 + slope * slope) / mag[i] * sign > 0.93;
    const edges = [];
    for (let y = yMin; y < h - 2; y++)
      for (let x = 2; x < w - 2; x++) {
        const i = y * w + x;
        if (mag[i] < thr || Math.abs(gx[i]) < (seed ? 0.55 : 0.4) * Math.abs(gy[i])) continue;
        edges.push(i);
        if (seed) continue;
        const acc = gx[i] > 0 ? accL : accR;
        const sgn = gx[i] > 0 ? 1 : -1;
        void sgn;
        const phiE = Math.atan(-gy[i] / gx[i]);
        const k0 = Math.max(0, Math.ceil((phiE - WIN + PHI_MAX) / DPHI));
        const k1 = Math.min(NPHI - 1, Math.floor((phiE + WIN + PHI_MAX) / DPHI));
        for (let k2 = k0; k2 <= k1; k2++) {
          const xi = Math.round((x - tanTab[k2] * (y - yA) - lo) / STEP);
          if (xi >= 0 && xi < NX) acc[k2 * NX + xi]++;
        }
      }
    dbg(`thr ${thr.toFixed(1)} edges ${edges.length}`);
    if (diag) diag.edgePixels = edges.length;
    if (edges.length < 60) {
      if (diag) diag.hint = "I can barely see any edges: the picture may be too dark, blurry or flat.";
      return [];
    }
    const xAt = (l, y) => l.xa + (l.xb - l.xa) * (y - yA) / span;
    const supportOf = (xa, xb, sign) => {
      const rows = new Uint8Array(h);
      const slope = (xb - xa) / span;
      for (const i of edges) {
        if (gx[i] * sign <= 0 || !agrees(i, slope, sign)) continue;
        const y = Math.floor(i / w);
        if (Math.abs(i % w - (xa + (xb - xa) * (y - yA) / span)) <= 2.5 * STEP * Math.sqrt(1 + slope * slope)) rows[y] = 1;
      }
      let top = -1;
      let bot = -1;
      for (let y = 0; y < h - 8; y++) {
        let c = 0;
        for (let k2 = 0; k2 < 8; k2++) c += rows[y + k2];
        if (c >= 6) {
          if (top < 0) top = y;
          bot = y + 7;
        }
      }
      return { top, bot, rows };
    };
    const refine = (xa, xb, sign, top, bot, tol = 2.5 * STEP) => {
      for (let it = 0; it < 3; it++) {
        let sw = 0, sy = 0, sx = 0, syy = 0, sxy = 0;
        const cur = (xb - xa) / span;
        for (const i of edges) {
          if (gx[i] * sign <= 0 || !agrees(i, cur, sign)) continue;
          const y = Math.floor(i / w);
          if (y < top || y > bot) continue;
          const px = i % w;
          const lx = xa + (xb - xa) * (y - yA) / span;
          if (Math.abs(px - lx) > tol * Math.sqrt(1 + cur * cur)) continue;
          const wgt = mag[i];
          sw += wgt;
          sy += wgt * y;
          sx += wgt * px;
          syy += wgt * y * y;
          sxy += wgt * y * px;
        }
        const den = sw * syy - sy * sy;
        if (sw < 1 || Math.abs(den) < 1e-6) break;
        const slope = (sw * sxy - sy * sx) / den;
        const icpt = (sx - slope * sy) / sw;
        xa = icpt + slope * yA;
        xb = icpt + slope * yB;
      }
      return { xa, xb };
    };
    const linesOf = (acc, sign, k2) => {
      let best = 0;
      for (let i = 0; i < acc.length; i++) if (acc[i] > best) best = acc[i];
      const floorV = Math.max(10, best * 0.15);
      const cells = [];
      for (let i = 0; i < acc.length; i++) if (acc[i] >= floorV) cells.push(i);
      cells.sort((p, q) => acc[q] - acc[p]);
      const out = [];
      const taken = [];
      for (const c of cells.slice(0, 8e3)) {
        const xa = lo + c % NX * STEP;
        const xb = xa + tanTab[Math.floor(c / NX)] * span;
        if (taken.some((p) => Math.abs(p.a - xa) <= 6 * STEP && Math.abs(p.b - xb) <= 8 * STEP)) continue;
        taken.push({ a: xa, b: xb });
        let s = supportOf(xa, xb, sign);
        if (s.top < 0 || s.bot - s.top < h * 0.06) continue;
        const ref = refine(xa, xb, sign, s.top, s.bot);
        s = supportOf(ref.xa, ref.xb, sign);
        if (s.top < 0 || s.bot - s.top < h * 0.06) continue;
        out.push({ xa: ref.xa, xb: ref.xb, votes: acc[c], top: s.top, bot: s.bot, rows: s.rows });
        if (out.length >= k2) break;
      }
      return out;
    };
    const seededLines = (sign) => {
      if (!seed) return [];
      const sx = Math.round(seed.x);
      const sy = Math.round(seed.y);
      const g = (x, y) => x < 2 || x >= w - 2 || y < 2 || y >= h - 2 ? 0 : gx[y * w + x] * sign;
      let x0 = -1;
      for (let d = 4; d < w; d++) {
        const x = sign > 0 ? sx - d : sx + d;
        if (x < 3 || x > w - 4) break;
        if (g(x, sy) > thr) {
          let bx = x;
          for (let k2 = -3; k2 <= 3; k2++) if (g(x + k2, sy) > g(bx, sy)) bx = x + k2;
          x0 = bx;
          break;
        }
      }
      if (x0 < 0) return [];
      const pts = [{ x: x0, y: sy }];
      for (const dir of [1, -1]) {
        let x = x0;
        let slope = 0;
        let miss = 0;
        const recent = [{ x: x0, y: sy }];
        for (let y = sy + dir; y > 2 && y < h - 3; y += dir) {
          const tol = recent.length < 12 ? 6 : 3;
          const pred = x + slope * dir;
          let best = -1;
          let bv = thr * 0.6;
          for (let cx = Math.round(pred - tol); cx <= Math.round(pred + tol); cx++) {
            const v = g(cx, y);
            if (v > bv && Math.abs(gx[y * w + cx]) >= 0.4 * Math.abs(gy[y * w + cx])) {
              bv = v;
              best = cx;
            }
          }
          if (best < 0) {
            if (++miss > 8) break;
            x = pred;
            continue;
          }
          miss = 0;
          x = best;
          pts.push({ x, y });
          recent.push({ x, y });
          if (recent.length > 14) recent.shift();
          if (recent.length >= 6) slope = (recent[recent.length - 1].x - recent[0].x) / (recent[recent.length - 1].y - recent[0].y);
        }
      }
      if (pts.length < 40) return [];
      let inl = pts;
      let a = 0;
      let b = 0;
      for (let round = 0; round < 4; round++) {
        let sw = 0, sy2 = 0, sx2 = 0, syy = 0, sxy = 0;
        for (const p of inl) {
          sw++;
          sy2 += p.y;
          sx2 += p.x;
          syy += p.y * p.y;
          sxy += p.y * p.x;
        }
        const den = sw * syy - sy2 * sy2;
        if (Math.abs(den) < 1e-9) return [];
        b = (sw * sxy - sy2 * sx2) / den;
        a = (sx2 - b * sy2) / sw;
        const res = pts.map((p) => Math.abs(p.x - (a + b * p.y)));
        const med = [...res].sort((p, q) => p - q)[Math.floor(res.length / 2)];
        const lim = Math.max(1.5, 2.5 * med);
        inl = pts.filter((_, k2) => res[k2] <= lim);
        if (inl.length < 30) return [];
      }
      const ys = inl.map((p) => p.y);
      const top = Math.min(...ys);
      const bot = Math.max(...ys);
      const rows = new Uint8Array(h);
      for (const p of inl) for (let k2 = -2; k2 <= 2; k2++) if (p.y + k2 >= 0 && p.y + k2 < h) rows[p.y + k2] = 1;
      return [{ xa: a + b * yA, xb: a + b * yB, votes: inl.length, top, bot, rows }];
    };
    const Ls = seed ? seededLines(1) : linesOf(accL, 1, 16);
    const Rs = seed ? seededLines(-1) : linesOf(accR, -1, 16);
    globalThis.__laneLines = { Ls, Rs, yA, span };
    dbg(`lines L ${Ls.length} R ${Rs.length}`);
    if (diag) {
      diag.leftLines = Ls.length;
      diag.rightLines = Rs.length;
    }
    dbg("L lines @row200: " + Ls.map((l) => `${(l.xa + (l.xb - l.xa) * (200 - yA) / span).toFixed(0)}[v${l.votes},${l.top}-${l.bot}]`).join(" "));
    dbg("R lines @row200: " + Rs.map((l) => `${(l.xa + (l.xb - l.xa) * (200 - yA) / span).toFixed(0)}[v${l.votes},${l.top}-${l.bot}]`).join(" "));
    if (!Ls.length || !Rs.length) {
      if (diag) diag.hint = Ls.length || Rs.length ? "I can see one edge of the lane but not the other. Make sure both gutters are in view." : "I can't pick out the lane edges. Aim so the whole lane, with both gutters, fills the middle of the picture.";
      return [];
    }
    const rowMean = (y, xl, xr) => {
      let s = 0;
      let n = 0;
      for (let x = Math.max(0, Math.ceil(xl)); x <= Math.min(w - 1, Math.floor(xr)); x++) {
        s += sm[Math.round(y) * w + x];
        n++;
      }
      return n ? s / n : NaN;
    };
    const cands = [];
    const maxV = Math.max(Ls[0].votes, Rs[0].votes);
    let why = { range: 0, shape: 0, contrast: 0 };
    for (const L of Ls)
      for (const R2 of Rs) {
        const t = Math.max(L.top, R2.top);
        const b = Math.min(L.bot, R2.bot);
        if (b - t < h * 0.06) {
          why.range++;
          continue;
        }
        const wt = xAt(R2, t) - xAt(L, t);
        const wb = xAt(R2, b) - xAt(L, b);
        if (wt < 2 || wb < wt * 1.02 || wb > w * 1.05) {
          why.shape++;
          continue;
        }
        let good = 0;
        let rowsN = 0;
        for (let y = t + 2; y <= b - 2; y += 3) {
          const xl = xAt(L, y);
          const xr = xAt(R2, y);
          const wid = xr - xl;
          if (wid < 3) continue;
          const inside = rowMean(y, xl + wid * 0.2, xr - wid * 0.2);
          const left = xl - wid * 0.2 < 1 ? NaN : rowMean(y, xl - wid * 0.3, xl - wid * 0.08);
          const right = xr + wid * 0.2 > w - 2 ? NaN : rowMean(y, xr + wid * 0.08, xr + wid * 0.3);
          if (!Number.isFinite(left) && !Number.isFinite(right)) continue;
          rowsN++;
          if ((!Number.isFinite(left) || inside - left > 6) && (!Number.isFinite(right) || inside - right > 6)) good++;
        }
        if (rowsN < 5 || good / rowsN < 0.45) {
          why.contrast++;
          continue;
        }
        const contrast = good / rowsN;
        const votes = (L.votes + R2.votes) / (2 * maxV);
        const cb = (xAt(L, b) + xAt(R2, b)) / 2;
        const centered = 1 - 0.12 * Math.min(1, Math.abs(cb - w / 2) / (w * 0.5));
        const lenScore = Math.min(1, (b - t) / (h * 0.25));
        cands.push({ L, R: R2, t, b, base: (votes + contrast + 0.5 * lenScore) * centered });
      }
    dbg(`pairs ${cands.length}; rejected ${JSON.stringify(why)}`);
    if (diag) {
      diag.pairs = cands.length;
      if (!cands.length) diag.hint = "I see edges, but nothing that looks like a bright lane between two dark gutters yet.";
    }
    cands.sort((p, q) => q.base - p.base);
    const distinct = [];
    for (const c of cands) {
      const cb = (xAt(c.L, c.b) + xAt(c.R, c.b)) / 2;
      if (distinct.every((d) => Math.abs((xAt(d.L, d.b) + xAt(d.R, d.b)) / 2 - cb) > 0.04 * w)) distinct.push(c);
      if (distinct.length >= maxCandidates + 9) break;
    }
    if (diag && distinct[0]) {
      const c = distinct[0];
      diag.guess = { left: { x0: xAt(c.L, c.t), y0: c.t, x1: xAt(c.L, c.b), y1: c.b }, right: { x0: xAt(c.R, c.t), y0: c.t, x1: xAt(c.R, c.b), y1: c.b } };
    }
    const results = [];
    for (const c of distinct) {
      const r = geometry(c);
      if (r) results.push(r);
    }
    const sorted = results.sort((p, q) => q.confidence - p.confidence).slice(0, maxCandidates);
    if (diag && sorted.length) diag.hint = "";
    return sorted;
    function geometry(c) {
      let { L, R: R2 } = c;
      const { t, b } = c;
      const notes = [];
      const sL = (L.xb - L.xa) / span;
      const sR = (R2.xb - R2.xa) / span;
      if (Math.abs(sL - sR) < 1e-6) return dbg("reject: parallel lines"), null;
      const yv = yA + (R2.xa - L.xa) / (sL - sR);
      if (!Number.isFinite(yv) || yv > t - 3) return dbg(`reject: vanishing row ${yv.toFixed(1)} vs top ${t}`), null;
      const prof = new Float32Array(h);
      const up = new Float32Array(h);
      const yStart = Math.max(3, Math.ceil(yv) + 3);
      for (let y = yStart; y < h - 3; y++) {
        const cl = xAt(L, y) + 2 * STEP;
        const cr = xAt(R2, y) - 2 * STEP;
        if (cr - cl < 4) continue;
        let cnt = 0;
        let s = 0;
        let n = 0;
        for (let x = Math.max(2, Math.ceil(cl)); x <= Math.min(w - 3, Math.floor(cr)); x++) {
          const i = y * w + x;
          n++;
          if (Math.abs(gy[i]) > thr * 0.6 && Math.abs(gy[i]) > 1.3 * Math.abs(gx[i])) {
            cnt++;
            s += gy[i];
          }
        }
        if (n) {
          prof[y] = cnt / n;
          up[y] = s / n / Math.max(1, thr);
        }
      }
      const localMax = (arr, min, k2, from = yStart + 1, to = h - 4) => {
        const out = [];
        for (let y = Math.max(from, yStart + 1); y < to; y++) if (arr[y] >= min && arr[y] >= arr[y - 1] && arr[y] >= arr[y + 1]) out.push(y);
        return out.sort((p, q) => arr[q] - arr[p]).slice(0, k2);
      };
      const topRows = (arr) => Array.from({ length: h }, (_, y) => y).filter((y) => y >= yStart && y < h - 4).sort((p, q) => arr[q] - arr[p]).slice(0, 6).map((y) => `${y}:${arr[y].toFixed(2)}`).join(" ");
      dbg(`profile peaks (density): ${topRows(prof)} | pit step peaks: ${topRows(up)} thr ${thr.toFixed(1)}`);
      const prow = new Float32Array(h).fill(NaN);
      for (let y = yStart; y < h - 3; y++) {
        const wid = xAt(R2, y) - xAt(L, y);
        if (wid < 6) continue;
        const a = Math.max(2, Math.ceil(xAt(L, y) + 0.2 * wid));
        const b2 = Math.min(w - 3, Math.floor(xAt(R2, y) - 0.2 * wid));
        if (b2 - a < 3) continue;
        const vals = [];
        for (let x = a; x <= b2; x++) vals.push(sm[y * w + x]);
        vals.sort((p, q) => p - q);
        prow[y] = vals[vals.length >> 1];
      }
      const pAvg = (ya, yb, y) => {
        let s = 0, n = 0;
        for (let k2 = ya; k2 <= yb; k2++) {
          const v = prow[Math.round(y + k2)];
          if (Number.isFinite(v)) {
            s += v;
            n++;
          }
        }
        return n >= Math.max(1, (yb - ya + 1) / 2) ? s / n : NaN;
      };
      const foulCands = localMax(prof, 0.2, 8, Math.floor(t + h * 0.05), h - 4);
      const pitCands = localMax(up, 0.3, 6, Math.floor(t - 14), Math.floor(t + 18));
      {
        const dip = new Float32Array(h);
        const stp = new Float32Array(h);
        for (let y = yStart + 11; y < h - 12; y++) {
          const a = pAvg(-9, -4, y), b2 = pAvg(4, 9, y), m = pAvg(-1, 1, y);
          if (Number.isFinite(a) && Number.isFinite(b2) && Number.isFinite(m)) {
            dip[y] = Math.max(Math.min(a, b2) - m, m - Math.max(a, b2));
            stp[y] = Math.abs(a - b2) - 0.5 * Math.max(0, Math.max(Math.min(a, b2) - m, m - Math.max(a, b2)));
          }
        }
        const peaks = (arr, min, k2, from, to) => {
          const out = [];
          for (let y = Math.max(from, yStart + 12); y < Math.min(to, h - 13); y++) if (arr[y] >= min && arr[y] >= arr[y - 1] && arr[y] >= arr[y + 1]) out.push(y);
          return out.sort((p, q) => arr[q] - arr[p]).slice(0, k2);
        };
        for (const y of peaks(dip, 2.5, 8, Math.floor(t + h * 0.05), h - 4)) if (!foulCands.some((c2) => Math.abs(c2 - y) <= 2)) foulCands.push(y);
        for (const y of peaks(stp, 6, 6, Math.floor(t - 14), Math.floor(t + 18))) if (!pitCands.some((c2) => Math.abs(c2 - y) <= 2)) pitCands.push(y);
        for (const y of peaks(stp, 4, 4, Math.floor(b - 0.05 * h), Math.floor(b + 0.05 * h))) if (!foulCands.some((c2) => Math.abs(c2 - y) <= 2)) foulCands.push(y);
      }
      const supported = (y) => (L.rows[y] || L.rows[y - 1] || L.rows[y + 1] || L.rows[y - 2] || L.rows[y + 2]) && (R2.rows[y] || R2.rows[y - 1] || R2.rows[y + 1] || R2.rows[y - 2] || R2.rows[y + 2]);
      const bandMean = (ya, yb, y) => {
        let s = 0, n = 0;
        for (let k2 = ya; k2 <= yb; k2++) {
          const yy = Math.round(y + k2);
          if (yy < 2 || yy >= h - 2) return NaN;
          const wid = xAt(R2, yy) - xAt(L, yy);
          if (wid < 3) return NaN;
          const m = rowMean(yy, xAt(L, yy) + 0.2 * wid, xAt(R2, yy) - 0.2 * wid);
          if (Number.isFinite(m)) {
            s += m;
            n++;
          }
        }
        return n ? s / n : NaN;
      };
      const isThinLine = (f) => {
        const above = pAvg(-9, -4, f);
        const below = pAvg(4, 9, f);
        const mid = pAvg(-1, 1, f);
        dbg(`thin? f${f}: above ${above.toFixed(0)} mid ${mid.toFixed(0)} below ${below.toFixed(0)}`);
        if (![above, below, mid].every(Number.isFinite)) return false;
        const margin = Math.max(2.5, (above + below) / 2 * 0.03);
        return mid < Math.min(above, below) - margin || mid > Math.max(above, below) + margin;
      };
      const isLaneToApproach = (f) => {
        const a = pAvg(-9, -4, f);
        const c2 = pAvg(4, 9, f);
        return Number.isFinite(a) && Number.isFinite(c2) && Math.abs(a - c2) > Math.max(5, Math.max(a, c2) * 0.07);
      };
      const isPitStep = (p) => {
        const above = pAvg(-10, -4, p);
        const below = pAvg(4, 10, p);
        dbg(`pit? p${p}: above ${above.toFixed(0)} below ${below.toFixed(0)}`);
        return Number.isFinite(above) && Number.isFinite(below) && Math.abs(above - below) > Math.max(6, Math.max(above, below) * 0.12);
      };
      let best = null;
      const tried = [];
      for (const f of foulCands) {
        if (!isThinLine(f) && !(Math.abs(f - b) <= 0.05 * h && isLaneToApproach(f))) continue;
        for (const p of pitCands) {
          if (f - p < h * 0.06 || !isPitStep(p)) continue;
          const rho = (p - yv) / (f - yv);
          if (!(rho > 0.03 && rho < 0.75)) continue;
          let cov = 0;
          let n = 0;
          for (let y = p + 3; y <= f - 3; y += 2) {
            n++;
            if (supported(y)) cov++;
          }
          tried.push(`f${f}/p${p}:cov${n ? (cov / n).toFixed(2) : "-"}`);
          if (!n || cov / n < 0.5) continue;
          const nearB = Math.max(0, 1 - Math.abs(f - b) / (0.06 * h));
          const nearT = Math.max(0, 1 - Math.abs(p - t) / (0.05 * h));
          const score = cov / n * 1 + prof[f] * 0.5 + Math.min(1, up[p]) * 0.5 + 1.2 * nearB + 0.6 * nearT;
          if (!best || score > best.score) best = { pit: p, foul: f, score };
        }
      }
      if (!best && diag && !diag.hint) diag.hint = "I found both lane edges but not the foul line and the end of the lane together. Tilt the phone so the foul line, the arrows and the pins are all in view.";
      if (!best) return fallback(L, R2, t, b, yv, up, notes) ?? (dbg(`reject: no foul/pit pair foul ${foulCands.join(",")} pit ${pitCands.join(",")} yv ${yv.toFixed(1)} t ${t} b ${b} | ${tried.slice(0, 8).join(" ")} | L(${L.xa.toFixed(0)},${L.xb.toFixed(0)}) R(${R2.xa.toFixed(0)},${R2.xb.toFixed(0)})`), null);
      const centroid = (arr, y, r, base) => {
        let sw = 0;
        let sy = 0;
        for (let k2 = Math.max(3, y - r); k2 <= Math.min(h - 4, y + r); k2++) {
          const v = Math.max(0, arr[k2] - base);
          sw += v;
          sy += v * k2;
        }
        return sw > 0 ? sy / sw : y;
      };
      const foul = prof[best.foul] > 0.05 ? centroid(prof, best.foul, 4, prof[best.foul] * 0.4) : best.foul;
      const pit = up[best.pit] > 0.1 ? centroid(up, best.pit, 3, up[best.pit] * 0.3) : best.pit;
      if (diag && !diag.foulRow) {
        diag.foulRow = foul;
        diag.pitRow = pit;
      }
      const foulOk = true;
      const pitOk = true;
      const LR = refine(L.xa, L.xb, 1, Math.ceil(pit) + 4, Math.floor(foul) - 3, 2 * STEP);
      const RR = refine(R2.xa, R2.xb, -1, Math.ceil(pit) + 4, Math.floor(foul) - 3, 2 * STEP);
      L = { ...L, xa: LR.xa, xb: LR.xb };
      R2 = { ...R2, xa: RR.xa, xb: RR.xb };
      const sideRow = (guess, side, kind) => {
        let sw = 0;
        let sy = 0;
        for (let y = Math.round(guess) - 7; y <= Math.round(guess) + 7; y++) {
          if (y < 3 || y >= h - 3) continue;
          const xl = xAt(L, y);
          const xr = xAt(R2, y);
          const wid = xr - xl;
          if (wid < 6) continue;
          const x0 = side === "L" ? xl + 0.08 * wid : xl + 0.55 * wid;
          const x1 = side === "L" ? xl + 0.45 * wid : xr - 0.08 * wid;
          let c2 = 0;
          let n = 0;
          for (let x = Math.max(2, Math.ceil(x0)); x <= Math.min(w - 3, Math.floor(x1)); x++) {
            const i = y * w + x;
            n++;
            if (kind === "foul") {
              if (Math.abs(gy[i]) > thr * 0.6 && Math.abs(gy[i]) > 1.3 * Math.abs(gx[i])) c2++;
            } else if (gy[i] > thr * 0.6 && gy[i] > 1.3 * Math.abs(gx[i])) c2++;
          }
          const v = n ? c2 / n : 0;
          sw += v * v;
          sy += v * v * y;
        }
        return sw > 0 ? sy / sw : guess;
      };
      const fyL = sideRow(foul, "L", "foul");
      const fyR = sideRow(foul, "R", "foul");
      const pL = sideRow(pit, "L", "pit");
      const pR = sideRow(pit, "R", "pit");
      const rowFor = (fyS, pS) => {
        const rho = (pS - yv) / (fyS - yv);
        if (!(rho > 0.03 && rho < 0.75)) return null;
        const K = LANE_END_FT * rho / (1 - rho);
        return yv + (fyS - yv) * K / (K + LANE_LEN);
      };
      const r60L = rowFor(fyL, pL);
      const r60R = rowFor(fyR, pR);
      if (r60L === null || r60R === null) return dbg(`reject: rho out of range yv ${yv.toFixed(1)} foul ${fyL.toFixed(1)}/${fyR.toFixed(1)} pit ${pL.toFixed(1)}/${pR.toFixed(1)}`), null;
      if (!(r60L < fyL - 4 && r60R < fyR - 4)) return dbg(`reject: row60 ${r60L} ${r60R}`), null;
      const fy = (fyL + fyR) / 2;
      const row60 = (r60L + r60R) / 2;
      const corners2 = [
        { x: xAt(L, fyL), y: fyL },
        { x: xAt(R2, fyR), y: fyR },
        { x: xAt(R2, r60R), y: r60R },
        { x: xAt(L, r60L), y: r60L }
      ];
      const wFoul = corners2[1].x - corners2[0].x;
      const fPx = w / 2 / Math.tan(ASSUMED_HFOV_DEG * Math.PI / 360);
      const distFromWidth = fPx * (41.5 / 12) / Math.max(1, wFoul);
      const rhoMid = (pit - yv) / (fy - yv);
      const distFromRows = LANE_END_FT * rhoMid / (1 - rhoMid);
      const impliedHfov = 2 * Math.atan(w / 2 * (41.5 / 12) / (Math.max(1, wFoul) * distFromRows)) * 180 / Math.PI;
      if (!(impliedHfov > 30 && impliedHfov < 118)) return dbg(`reject: the rows and the lane width imply a ${impliedHfov.toFixed(0)} degree field of view`), null;
      const agree = distFromWidth / distFromRows;
      const wBot = corners2[1].x - corners2[0].x;
      const wTop = corners2[2].x - corners2[3].x;
      if (!(wBot > 6 && wTop > 0.3 && wTop < wBot)) return dbg(`reject: widths ${wBot.toFixed(1)} ${wTop.toFixed(1)}`), null;
      const confidence = Math.max(0, Math.min(1, 0.35 * Math.min(1, c.base / 1.6) + 0.25 * (foulOk ? 1 : 0.2) + 0.3 * (pitOk ? 1 : 0) + 0.1 * Math.min(1, (fy - row60) / (h * 0.15))));
      return { corners: corners2, confidence, notes, rows: { foul: foulOk ? foul : null, pit: pitOk ? pit : null, vanishing: yv } };
    }
    function fallback(L, R2, t, b, yv, up, notes) {
      let pit = t;
      let pv = 0;
      for (let y = Math.max(3, Math.floor(t - 12)); y <= Math.min(h - 4, Math.floor(t + 16)); y++) if (up[y] > pv) pv = up[y], pit = y;
      const stepFound = pv > 0.2;
      if (!stepFound) pit = t;
      const wPit = xAt(R2, pit) - xAt(L, pit);
      if (wPit < 4) return null;
      const fPx = w / 2 / Math.tan(ASSUMED_HFOV_DEG * Math.PI / 360);
      const zPit = fPx * (41.5 / 12) / wPit;
      const zFoul = zPit - LANE_END_FT;
      if (zFoul < 3 || pit - yv < 2) return null;
      const c = (pit - yv) * zPit;
      const rowAt = (ft) => yv + c / (zFoul + ft);
      const fy = rowAt(0);
      const r60 = rowAt(LANE_LEN);
      const corners2 = [
        { x: xAt(L, fy), y: fy },
        { x: xAt(R2, fy), y: fy },
        { x: xAt(R2, r60), y: r60 },
        { x: xAt(L, r60), y: r60 }
      ];
      notes.push("foul line not visible: distances come from the lane's width and a typical phone field of view, so they are approximate");
      if (!stepFound) notes.push("end of lane not clearly visible");
      return { corners: corners2, confidence: stepFound ? 0.6 : 0.45, notes, rows: { foul: null, pit: stepFound ? pit : null, vanishing: yv } };
    }
  }
  var isSolid = (d) => d.confidence >= 0.85 && d.rows.foul !== null && d.rows.pit !== null;
  function chooseLane(cands, w) {
    const solid2 = cands.filter(isSolid);
    if (solid2.length <= 1) return { pick: solid2[0] ?? null, choices: solid2 };
    const off = (d) => Math.abs((d.corners[0].x + d.corners[1].x) / 2 - w / 2) / w;
    const ranked = [...solid2].sort((a, b) => off(a) - off(b));
    if (off(ranked[0]) < 0.12 && off(ranked[1]) - off(ranked[0]) > 0.1) return { pick: ranked[0], choices: solid2 };
    return { pick: null, choices: ranked };
  }
  function detectLaneAt(gray, w, h, x, y) {
    return detectLanes(gray, w, h, 1, { x, y })[0] ?? null;
  }
  function detectionsAgree(a, b, tol) {
    return a.every((p, i) => Math.hypot(p.x - b[i].x, p.y - b[i].y) <= tol);
  }

  // core/src/recommend.ts
  var COVER_BONUS = { solid: 0.5, hybrid: 0.2, pearl: -0.3, urethane: -0.8, plastic: -1 };
  function motionIndex(b) {
    const rg = b.rg?.value;
    const diff = b.differential?.value;
    if (rg === void 0 || diff === void 0) return null;
    const cover = b.coverstockType ? COVER_BONUS[b.coverstockType.value] ?? 0 : 0;
    return (2.55 - rg) * 6 + (diff - 0.04) * 20 + cover;
  }
  function recommendBall(read2, currentBallId, arsenal) {
    const scored = arsenal.map((b) => ({ b, m: b.catalog ? motionIndex(b.catalog) : null })).filter((x) => x.m !== null);
    if (read2.status !== "ok") return { status: "none", text: "No equipment change suggested yet: I need a lane read first.", basis: [] };
    if (scored.length < 2) {
      return { status: "none", text: "I need at least two arsenal balls matched to the catalog to compare options.", basis: [`${scored.length} of your balls have catalog specs.`] };
    }
    const drying = /earlier/.test(read2.headline);
    const carrydown = /skidding farther/.test(read2.headline);
    if (!drying && !carrydown) return { status: "none", text: "The lane looks stable, so stay with your current ball.", basis: [] };
    const cur = scored.find((x) => x.b.id === currentBallId);
    if (!cur) return { status: "none", text: "Tell me which ball you're throwing so I can compare against it.", basis: [] };
    const want = drying ? scored.filter((x) => x.m < cur.m) : scored.filter((x) => x.m > cur.m);
    if (!want.length) {
      return { status: "none", text: `Nothing in your arsenal is ${drying ? "cleaner" : "stronger"} than ${cur.b.name} by published specs. Consider a surface or line change instead.`, basis: [] };
    }
    const pick = want.sort((x, y) => drying ? y.m - x.m : x.m - y.m)[0];
    const c = pick.b.catalog;
    const basis = [
      `${cur.b.name}: motion index ${cur.m.toFixed(2)}; ${pick.b.name}: ${pick.m.toFixed(2)} (from RG ${c.rg?.value}, differential ${c.differential?.value}${c.coverstockType ? `, ${c.coverstockType.value} cover` : ""}).`,
      "Spec-based estimate, not a measurement of how this ball behaves for you. Confirm with two shots."
    ];
    return {
      status: "ok",
      ballId: pick.b.id,
      text: `${drying ? "Try the cleaner" : "Try the stronger"} ${pick.b.name}: ${drying ? "your current ball is reading the lane early" : "oil is carrying down and your current ball is skidding long"}. Change only the ball and keep your line, then judge two shots.`,
      basis
    };
  }

  // camera/render.ts
  var k = (v) => v.width / 1280;
  var lerp = (a, b, t) => a + (b - a) * t;
  var ramp = (t, alpha = 1) => `hsla(${lerp(190, 320, t)}, 100%, ${lerp(62, 58, t)}%, ${alpha})`;
  var DECK_END_FT = 63;
  var ROW_FT = 10.39 / 12;
  var PIN_SPACING_BOARDS = 12 / (41.5 / LANE_BOARDS);
  function strokeTrail(v, points, baseAlpha, headBoost) {
    const n = points.length;
    if (n < 2) return;
    const { ctx: ctx2 } = v;
    const s = k(v);
    ctx2.save();
    ctx2.globalCompositeOperation = "lighter";
    ctx2.lineCap = "round";
    ctx2.lineJoin = "round";
    for (let i = 1; i < n; i++) {
      const t = i / (n - 1);
      const a = points[i - 1];
      const b = points[i];
      ctx2.shadowBlur = 24 * s;
      ctx2.shadowColor = ramp(t);
      ctx2.strokeStyle = ramp(t, baseAlpha * (headBoost ? 0.15 + 0.85 * t : 0.9));
      ctx2.lineWidth = (headBoost ? lerp(3, 14, t) : 10) * s;
      ctx2.beginPath();
      ctx2.moveTo(a.x, a.y);
      ctx2.lineTo(b.x, b.y);
      ctx2.stroke();
      ctx2.shadowBlur = 0;
      ctx2.strokeStyle = `rgba(255,255,255,${baseAlpha * (headBoost ? t : 0.8)})`;
      ctx2.lineWidth = (headBoost ? lerp(1, 4, t) : 3.5) * s;
      ctx2.beginPath();
      ctx2.moveTo(a.x, a.y);
      ctx2.lineTo(b.x, b.y);
      ctx2.stroke();
    }
    ctx2.restore();
  }
  function drawBallHead(v, h) {
    const s = k(v);
    const g = v.ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 26 * s);
    g.addColorStop(0, "rgba(255,255,255,.95)");
    g.addColorStop(0.25, "rgba(120,230,255,.6)");
    g.addColorStop(1, "rgba(120,230,255,0)");
    v.ctx.save();
    v.ctx.globalCompositeOperation = "lighter";
    v.ctx.fillStyle = g;
    v.ctx.beginPath();
    v.ctx.arc(h.x, h.y, 26 * s, 0, 7);
    v.ctx.fill();
    v.ctx.restore();
  }
  function label(v, text, p, color) {
    const { ctx: ctx2 } = v;
    const s = k(v);
    ctx2.save();
    ctx2.font = `600 ${15 * s}px -apple-system, system-ui, sans-serif`;
    const w = ctx2.measureText(text).width + 16 * s;
    const h = 24 * s;
    ctx2.fillStyle = "rgba(10,14,22,.75)";
    ctx2.strokeStyle = color;
    ctx2.lineWidth = 1.5 * s;
    ctx2.beginPath();
    ctx2.roundRect(p.x - w / 2, p.y - h - 10 * s, w, h, 12 * s);
    ctx2.fill();
    ctx2.stroke();
    ctx2.fillStyle = "#fff";
    ctx2.textAlign = "center";
    ctx2.textBaseline = "middle";
    ctx2.fillText(text, p.x, p.y - h / 2 - 10 * s);
    ctx2.beginPath();
    ctx2.fillStyle = color;
    ctx2.arc(p.x, p.y, 5 * s, 0, 7);
    ctx2.fill();
    ctx2.restore();
  }
  function drawShotMarkers(v, a) {
    if (a.boardAtArrows !== null) label(v, `Arrows ${a.boardAtArrows.toFixed(1)}`, v.P(boardToX(a.boardAtArrows), 15), "#ffd25a");
    if (a.breakpointBoard !== null && a.breakpointFt !== null) label(v, `Breakpoint ${a.breakpointBoard.toFixed(1)}`, v.P(boardToX(a.breakpointBoard), a.breakpointFt), "#ff5ad6");
    if (a.entryBoard !== null) label(v, `Entry ${a.entryBoard.toFixed(1)}`, v.P(boardToX(a.entryBoard), 59.5), "#5affb0");
  }
  function drawCorners(v, corners2) {
    const { ctx: ctx2 } = v;
    const s = k(v);
    ctx2.save();
    corners2.forEach((c, i) => {
      ctx2.fillStyle = "#4da3ff";
      ctx2.shadowColor = "#4da3ff";
      ctx2.shadowBlur = 16 * s;
      ctx2.beginPath();
      ctx2.arc(c.x, c.y, 9 * s, 0, 7);
      ctx2.fill();
      ctx2.shadowBlur = 0;
      ctx2.fillStyle = "#06101c";
      ctx2.font = `700 ${12 * s}px system-ui`;
      ctx2.textAlign = "center";
      ctx2.textBaseline = "middle";
      ctx2.fillText(String(i + 1), c.x, c.y + 0.5 * s);
      if (i > 0) {
        ctx2.strokeStyle = "rgba(77,163,255,.8)";
        ctx2.lineWidth = 2 * s;
        ctx2.beginPath();
        ctx2.moveTo(corners2[i - 1].x, corners2[i - 1].y);
        ctx2.lineTo(c.x, c.y);
        ctx2.stroke();
      }
    });
    ctx2.restore();
  }
  function line(v, a, b) {
    v.ctx.beginPath();
    v.ctx.moveTo(a.x, a.y);
    v.ctx.lineTo(b.x, b.y);
    v.ctx.stroke();
  }
  function drawLaneGrid(v) {
    const { ctx: ctx2, P } = v;
    const s = k(v);
    ctx2.save();
    const quad = [P(0, 0), P(LANE_BOARDS, 0), P(LANE_BOARDS, DECK_END_FT), P(0, DECK_END_FT)];
    ctx2.beginPath();
    quad.forEach((p, i) => i ? ctx2.lineTo(p.x, p.y) : ctx2.moveTo(p.x, p.y));
    ctx2.closePath();
    ctx2.fillStyle = "rgba(255,214,150,.07)";
    ctx2.fill();
    for (let i = 0; i <= LANE_BOARDS; i++) {
      const fromRight = LANE_BOARDS - i;
      const major = fromRight % 5 === 0;
      const edge = i === 0 || i === LANE_BOARDS;
      ctx2.strokeStyle = edge ? "rgba(120,200,255,.8)" : major ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.12)";
      ctx2.lineWidth = (edge ? 2.4 : major ? 1.3 : 0.8) * s;
      line(v, P(i, 0), P(i, LANE_LENGTH_FT));
    }
    ctx2.strokeStyle = "rgba(255,90,110,.95)";
    ctx2.lineWidth = 3 * s;
    ctx2.shadowColor = "rgba(255,90,110,.9)";
    ctx2.shadowBlur = 10 * s;
    line(v, P(0, 0), P(LANE_BOARDS, 0));
    ctx2.shadowBlur = 0;
    ctx2.setLineDash([6 * s, 8 * s]);
    ctx2.lineWidth = 1 * s;
    for (const ft of [30, 45]) {
      ctx2.strokeStyle = "rgba(255,255,255,.2)";
      line(v, P(0, ft), P(LANE_BOARDS, ft));
    }
    ctx2.setLineDash([]);
    ctx2.strokeStyle = "rgba(255,255,255,.35)";
    ctx2.lineWidth = 1.5 * s;
    line(v, P(0, LANE_LENGTH_FT), P(LANE_BOARDS, LANE_LENGTH_FT));
    line(v, P(0, DECK_END_FT), P(LANE_BOARDS, DECK_END_FT));
    ctx2.fillStyle = "rgba(255,255,255,.55)";
    for (let b = 5; b <= 35; b += 5) {
      const c = P(boardToX(b), 7);
      ctx2.beginPath();
      ctx2.arc(c.x, c.y, 2.5 * s, 0, 7);
      ctx2.fill();
    }
    for (let b = 5; b <= 35; b += 5) {
      const cx = boardToX(b);
      const tip = 12 + 4 * (1 - Math.abs(b - 20) / 15);
      const tri = [P(cx - 1.2, tip - 1.6), P(cx + 1.2, tip - 1.6), P(cx, tip)];
      ctx2.beginPath();
      tri.forEach((p, i) => i ? ctx2.lineTo(p.x, p.y) : ctx2.moveTo(p.x, p.y));
      ctx2.closePath();
      ctx2.fillStyle = b === 20 ? "rgba(255,210,90,.95)" : "rgba(255,210,90,.7)";
      ctx2.shadowColor = "rgba(255,210,90,.8)";
      ctx2.shadowBlur = 8 * s;
      ctx2.fill();
    }
    ctx2.shadowBlur = 0;
    ctx2.font = `600 ${12 * s}px -apple-system, system-ui, sans-serif`;
    ctx2.textAlign = "center";
    ctx2.textBaseline = "middle";
    ctx2.fillStyle = "rgba(255,255,255,.75)";
    for (let b = 5; b <= 35; b += 5) {
      const c = P(boardToX(b), 3.2);
      ctx2.fillText(String(b), c.x, c.y);
    }
    ctx2.fillStyle = "rgba(255,255,255,.88)";
    ctx2.shadowColor = "rgba(255,255,255,.6)";
    ctx2.shadowBlur = 6 * s;
    for (let r = 0; r < 4; r++) {
      for (let i = 0; i <= r; i++) {
        const x = LANE_BOARDS / 2 + (i - r / 2) * PIN_SPACING_BOARDS;
        const y = LANE_LENGTH_FT + r * ROW_FT;
        const c = P(x, y);
        const edge = P(x + 1.2, y);
        ctx2.beginPath();
        ctx2.arc(c.x, c.y, Math.max(2, Math.hypot(edge.x - c.x, edge.y - c.y)), 0, 7);
        ctx2.fill();
      }
    }
    ctx2.restore();
  }
  function drawTopDown(ctx2, w, h, paths, pocket) {
    const padX = 18;
    const top = 24;
    const bottom = 18;
    const laneW = w - padX * 2;
    const laneH = h - top - bottom;
    const px = (x) => padX + x / LANE_BOARDS * laneW;
    const py = (ft) => h - bottom - ft / DECK_END_FT * laneH;
    ctx2.clearRect(0, 0, w, h);
    ctx2.save();
    ctx2.fillStyle = "rgba(255,214,150,.08)";
    ctx2.fillRect(px(0), py(DECK_END_FT), laneW, laneH);
    ctx2.lineWidth = 1;
    for (let i = 0; i <= LANE_BOARDS; i++) {
      const major = (LANE_BOARDS - i) % 5 === 0;
      ctx2.strokeStyle = i === 0 || i === LANE_BOARDS ? "rgba(120,200,255,.8)" : major ? "rgba(255,255,255,.22)" : "rgba(255,255,255,.07)";
      ctx2.beginPath();
      ctx2.moveTo(px(i), py(0));
      ctx2.lineTo(px(i), py(LANE_LENGTH_FT));
      ctx2.stroke();
    }
    ctx2.strokeStyle = "rgba(255,90,110,.95)";
    ctx2.lineWidth = 2.5;
    ctx2.beginPath();
    ctx2.moveTo(px(0), py(0));
    ctx2.lineTo(px(LANE_BOARDS), py(0));
    ctx2.stroke();
    ctx2.setLineDash([4, 6]);
    ctx2.strokeStyle = "rgba(255,255,255,.18)";
    ctx2.lineWidth = 1;
    for (const ft of [15, 30, 45, 60]) {
      ctx2.beginPath();
      ctx2.moveTo(px(0), py(ft));
      ctx2.lineTo(px(LANE_BOARDS), py(ft));
      ctx2.stroke();
    }
    ctx2.setLineDash([]);
    ctx2.fillStyle = "rgba(255,210,90,.85)";
    for (let b = 5; b <= 35; b += 5) {
      const tip = 12 + 4 * (1 - Math.abs(b - 20) / 15);
      const cx = px(boardToX(b));
      ctx2.beginPath();
      ctx2.moveTo(cx - 4, py(tip - 1.6));
      ctx2.lineTo(cx + 4, py(tip - 1.6));
      ctx2.lineTo(cx, py(tip));
      ctx2.closePath();
      ctx2.fill();
    }
    ctx2.fillStyle = "rgba(255,255,255,.55)";
    ctx2.font = "600 10px system-ui, sans-serif";
    ctx2.textAlign = "center";
    for (let b = 5; b <= 35; b += 5) ctx2.fillText(String(b), px(boardToX(b)), py(0) + 12);
    ctx2.fillStyle = "rgba(255,255,255,.88)";
    for (let r = 0; r < 4; r++)
      for (let i = 0; i <= r; i++) {
        ctx2.beginPath();
        ctx2.arc(px(LANE_BOARDS / 2 + (i - r / 2) * PIN_SPACING_BOARDS), py(LANE_LENGTH_FT + r * ROW_FT), 3.2, 0, 7);
        ctx2.fill();
      }
    if (pocket) {
      ctx2.strokeStyle = "rgba(90,255,176,.7)";
      ctx2.lineWidth = 1.5;
      ctx2.setLineDash([3, 3]);
      ctx2.beginPath();
      ctx2.moveTo(px(boardToX(pocket.board)), py(45));
      ctx2.lineTo(px(boardToX(pocket.board)), py(LANE_LENGTH_FT));
      ctx2.stroke();
      ctx2.setLineDash([]);
    }
    for (const m of paths) {
      if (m.path.length < 2) continue;
      ctx2.strokeStyle = m.color;
      ctx2.globalAlpha = m.alpha ?? 1;
      ctx2.lineWidth = m.width ?? 2;
      ctx2.lineJoin = "round";
      ctx2.beginPath();
      m.path.forEach((s, i) => i ? ctx2.lineTo(px(s.x), py(s.y)) : ctx2.moveTo(px(s.x), py(s.y)));
      ctx2.stroke();
    }
    ctx2.restore();
  }

  // core/src/lanereads.ts
  var MIN_SHOTS = 4;
  var mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;
  var sd = (v) => {
    const m = mean(v);
    return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, v.length - 1));
  };
  function trend(v) {
    const n = v.length;
    const xs = v.map((_, i) => i);
    const mx = mean(xs);
    const my = mean(v);
    let sxx = 0;
    let sxy = 0;
    for (let i = 0; i < n; i++) {
      sxx += (xs[i] - mx) ** 2;
      sxy += (xs[i] - mx) * (v[i] - my);
    }
    const slope = sxy / sxx;
    const resid = v.reduce((a, y, i) => a + (y - (my + slope * (xs[i] - mx))) ** 2, 0);
    const se = Math.sqrt(resid / Math.max(1, n - 2) / sxx);
    return { slope, t: se === 0 ? slope === 0 ? 0 : Infinity : slope / se };
  }
  var bpShape = (ft) => ft < 35 ? "early (reading the lane sooner)" : ft <= 45 ? "medium" : "late (skidding long)";
  function readLane(all) {
    const last = all[all.length - 1];
    const sameBall = last?.ballId ? all.filter((s) => s.ballId === last.ballId) : all;
    const shots = sameBall.slice(-12);
    const n = shots.length;
    if (n < MIN_SHOTS) {
      return {
        status: "insufficient",
        confidence: "low",
        headline: `Not enough shots yet (${n}/${MIN_SHOTS})`,
        points: ["I won't call lane transition from fewer than four tracked shots with the same ball."],
        next: "Keep bowling the same ball and line; I'll start reading the lane after a few more shots.",
        shotsUsed: n
      };
    }
    const bpFt = shots.map((s) => s.a.breakpointFt).filter((x) => x !== null);
    const bpBd = shots.map((s) => s.a.breakpointBoard).filter((x) => x !== null);
    const arrows = shots.map((s) => s.a.boardAtArrows).filter((x) => x !== null);
    const speeds = shots.map((s) => s.a.speedMph);
    const entry = shots.map((s) => s.a.impactAngleDeg).filter((x) => x !== null);
    const points = [];
    const arrowsSd = arrows.length >= 3 ? sd(arrows) : null;
    const speedSd = sd(speeds);
    const sloppy = arrowsSd !== null && arrowsSd > 2 || speedSd > 0.8;
    if (arrowsSd !== null) points.push(`Observed: arrows board varies \xB1${arrowsSd.toFixed(1)} boards and speed \xB1${speedSd.toFixed(1)} mph across these shots.`);
    if (sloppy) points.push("That's enough execution variation to blur any lane signal, so treat the lane read below as tentative.");
    if (bpFt.length >= 3) {
      const mft = mean(bpFt);
      const mbd = bpBd.length ? mean(bpBd) : null;
      points.push(`Observed: breakpoint averages ${mft.toFixed(0)} ft${mbd !== null ? ` near board ${mbd.toFixed(0)}` : ""}. That is an ${bpShape(mft)} shape.`);
    }
    if (entry.length >= 3) {
      const e = Math.abs(mean(entry));
      points.push(`Observed: entry angle averages ${e.toFixed(1)}\xB0. ${e < 3 ? "Shallow: the ball is arriving with little angle, so pocket carry will be touchy." : e > 6.5 ? "Steep: plenty of angle; watch for over-hooking on slight misses." : "In a workable range."}`);
    }
    let headline = "Lane looks stable so far";
    let next = "Keep the same ball and line; nothing here justifies a change.";
    let confidence = n >= 8 ? "good" : "moderate";
    if (bpFt.length >= MIN_SHOTS) {
      const tr = trend(bpFt);
      const total = tr.slope * (bpFt.length - 1);
      if (Math.abs(tr.t) >= 2 && Math.abs(total) >= 2) {
        if (total < 0) {
          headline = "Ball is reading the lane earlier: the track is drying out";
          points.push(`Inferred: breakpoint moved about ${Math.abs(total).toFixed(0)} ft closer to you over ${bpFt.length} shots (trend strength t=${tr.t.toFixed(1)}).`);
          next = "Test one change: move your feet 1\u20132 boards toward the oiled side (or a touch less rotation/speed up), keep the target, and judge the next two shots before changing anything else.";
        } else {
          headline = "Ball is skidding farther: oil is carrying down";
          points.push(`Inferred: breakpoint moved about ${total.toFixed(0)} ft farther down-lane over ${bpFt.length} shots (trend strength t=${tr.t.toFixed(1)}).`);
          next = "Test one change: a smoother or more surface-sensitive ball, or move 1\u20132 boards toward the outside, and judge the next two shots.";
        }
        if (sloppy) confidence = "low";
      } else {
        points.push("Inferred: no meaningful drift in breakpoint distance, so the lane isn't visibly changing under this ball yet.");
      }
    } else {
      confidence = "low";
      points.push("The breakpoint wasn't tracked on enough shots to judge transition.");
    }
    if (arrows.length >= MIN_SHOTS) {
      const ta = trend(arrows);
      const drift = ta.slope * (arrows.length - 1);
      if (Math.abs(ta.t) >= 2 && Math.abs(drift) >= 1.5) points.push(`Observed: your ball is crossing the arrows ${Math.abs(drift).toFixed(1)} boards ${drift > 0 ? "farther left (toward board 39)" : "farther right (toward board 1)"} than at the start, so you may be drifting, not the lane.`);
    }
    return { status: "ok", confidence, headline, points, next, shotsUsed: n };
  }

  // core/src/identify.ts
  var norm = (s) => s.toLowerCase().replace(/!q\b/g, "iq").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  var tokens = (s) => norm(s).split(" ").filter(Boolean);
  function lev(a, b) {
    const m = a.length;
    const n = b.length;
    const d = Array.from({ length: m + 1 }, (_, i) => [i, ...new Array(n).fill(0)]);
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }
  var unconfuse = (t) => t.replace(/0/g, "o").replace(/1/g, "i").replace(/5/g, "s").replace(/8/g, "b").replace(/\|/g, "i");
  function tokenSim(q, t) {
    if (q === t) return 1;
    const qq = unconfuse(q);
    const tt = unconfuse(t);
    if (qq === tt) return 0.95;
    if (q.length >= 3 && (t.startsWith(q) || q.startsWith(t))) return 0.8;
    const sim = 1 - lev(qq, tt) / Math.max(qq.length, tt.length);
    return sim >= 0.7 && Math.max(qq.length, tt.length) >= 4 ? sim * 0.9 : 0;
  }
  function fuzzyScore(query, target) {
    const q = tokens(query);
    const t = tokens(target);
    if (!q.length || !t.length) return 0;
    const best = (a, b) => a.map((x) => Math.max(...b.map((y) => tokenSim(x, y))));
    const qs = best(q, t);
    const ts = best(t, q);
    const w = (words, s) => words.reduce((acc, x, i) => acc + x.length * s[i], 0) / words.reduce((acc, x) => acc + x.length, 0);
    return 0.7 * w(q, qs) + 0.3 * w(t, ts);
  }
  function searchCatalog(catalog, query, limit = 8) {
    if (!norm(query)) return [];
    return catalog.map((ball) => ({ ball, score: fuzzyScore(query, `${ball.manufacturer} ${ball.name}`) })).filter((x) => x.score >= 0.45).sort((a, b) => b.score - a.score).slice(0, limit);
  }
  var COLOR_WORDS = {
    black: { kind: "dark" },
    coal: { kind: "dark" },
    onyx: { kind: "dark" },
    charcoal: { kind: "dark" },
    midnight: { kind: "dark" },
    jet: { kind: "dark" },
    smoke: { kind: "grey" },
    ash: { kind: "grey" },
    grey: { kind: "grey" },
    gray: { kind: "grey" },
    silver: { kind: "grey" },
    slate: { kind: "grey" },
    steel: { kind: "grey" },
    graphite: { kind: "grey" },
    pewter: { kind: "grey" },
    white: { kind: "white" },
    ivory: { kind: "white" },
    cream: { kind: "white" },
    bone: { kind: "white" },
    red: { h: 0 },
    crimson: { h: 350 },
    scarlet: { h: 5 },
    ruby: { h: 350 },
    burgundy: { h: 345 },
    maroon: { h: 350 },
    cherry: { h: 352 },
    fire: { h: 10 },
    flame: { h: 12 },
    orange: { h: 28 },
    copper: { h: 22 },
    bronze: { h: 28 },
    tangerine: { h: 30 },
    rust: { h: 18 },
    brown: { h: 25 },
    gold: { h: 45 },
    yellow: { h: 55 },
    amber: { h: 40 },
    lemon: { h: 58 },
    lime: { h: 90 },
    green: { h: 125 },
    emerald: { h: 145 },
    olive: { h: 80 },
    forest: { h: 135 },
    jade: { h: 150 },
    mint: { h: 150 },
    teal: { h: 178 },
    aqua: { h: 185 },
    cyan: { h: 188 },
    turquoise: { h: 175 },
    sky: { h: 200 },
    blue: { h: 220 },
    cobalt: { h: 222 },
    navy: { h: 232 },
    royal: { h: 228 },
    sapphire: { h: 225 },
    ocean: { h: 205 },
    denim: { h: 215 },
    indigo: { h: 255 },
    purple: { h: 280 },
    violet: { h: 275 },
    lavender: { h: 268 },
    plum: { h: 295 },
    grape: { h: 285 },
    orchid: { h: 300 },
    magenta: { h: 305 },
    pink: { h: 330 },
    rose: { h: 340 },
    fuchsia: { h: 315 },
    neon: {}
  };
  function expectedSignature(colorway) {
    const words = tokens(colorway).filter((w) => COLOR_WORDS[w] && w !== "neon");
    if (!words.length) return null;
    const sig = new Array(SIG_LEN).fill(0);
    for (const w of words) {
      const c = COLOR_WORDS[w];
      if ("h" in c) sig[Math.min(HUE_BINS - 1, Math.floor(c.h % 360 / 360 * HUE_BINS))] += 1;
      else sig[HUE_BINS + (c.kind === "dark" ? 0 : c.kind === "grey" ? 1 : 2)] += 1;
    }
    const t = sig.reduce((a, b) => a + b, 0);
    return sig.map((x) => x / t);
  }
  function colorScore(observed, colorway) {
    const exp = colorway ? expectedSignature(colorway) : null;
    if (!exp) return null;
    const present = (v) => v.map((x) => x > 0.04 ? 1 : 0);
    const o = present(observed);
    const e = present(exp);
    const smooth = (v) => v.map((x, i) => i < HUE_BINS ? Math.max(x, 0.6 * v[(i + 1) % HUE_BINS], 0.6 * v[(i + HUE_BINS - 1) % HUE_BINS]) : x);
    const os = smooth(o);
    const es = smooth(e);
    let inter = 0;
    let uni = 0;
    for (let i = 0; i < SIG_LEN; i++) {
      inter += Math.min(os[i], es[i]);
      uni += Math.max(os[i], es[i]);
    }
    const jaccard = uni ? inter / uni : 0;
    const prox = 1 - Math.min(1, distance(observed, exp) / 0.7);
    return Math.max(0, Math.min(1, 0.6 * jaccard + 0.4 * prox));
  }
  function identifyFromCatalog(input, limit = 6) {
    const hasText = !!input.text && tokens(input.text).some((t) => t.length >= 2);
    const out = [];
    for (const ball of input.catalog) {
      const text = hasText ? fuzzyScore(input.text, `${ball.manufacturer} ${ball.name}`) : null;
      const color = input.sig ? colorScore(input.sig, ball.colorway?.value) : null;
      if (text === null && color === null) continue;
      if (text !== null && text < 0.45 && (color === null || color < 0.7)) continue;
      const score = text !== null && color !== null ? 0.7 * text + 0.3 * color : text !== null ? 0.9 * text : 0.5 * (color ?? 0);
      const evidence = [];
      if (text !== null) evidence.push(`name match ${Math.round(text * 100)}%`);
      if (color !== null) evidence.push(`colors match ${Math.round(color * 100)}%${ball.colorway ? ` (${ball.colorway.value})` : ""}`);
      const confidence = text !== null && text >= 0.8 && (color === null || color >= 0.5) ? "strong" : text !== null && text >= 0.7 ? "likely" : "possible";
      out.push({ ball, score, text, color, confidence, evidence });
    }
    return out.sort((a, b) => b.score - a.score).slice(0, limit);
  }
  function identifyInArsenal(sig, arsenal) {
    const g = classifyBall(sig, arsenal);
    return g.ballId ? { ballId: g.ballId, confidence: g.confidence, auto: g.auto } : null;
  }

  // core/src/balls.ts
  var ballKey = (manufacturer, name) => `${manufacturer.trim()}|${name.trim()}`.toLowerCase();
  var SPEC_FIELDS = ["releaseYear", "line", "coverstock", "coverstockType", "core", "coreSymmetry", "rg", "differential", "intermediateDifferential", "factoryFinish", "specWeightLb", "colorway", "status", "availableOn", "imageUrl", "competition"];
  var todayIso = (now) => now.toISOString().slice(0, 10);
  var releaseYearOf = (b) => b.availableOn ? Number(b.availableOn.value.slice(0, 4)) : b.releaseYear?.value;
  function recommendable(b, now = /* @__PURE__ */ new Date()) {
    if (b.status?.value !== "current") return false;
    if (b.competition?.value !== "approved") return false;
    if (b.availableOn && b.availableOn.value > todayIso(now)) return false;
    const y = releaseYearOf(b);
    return y !== void 0 && y >= now.getFullYear() - 1;
  }
  function isUpcoming(b, now = /* @__PURE__ */ new Date()) {
    if (b.status?.value === "upcoming") return !b.availableOn || b.availableOn.value >= todayIso(now);
    return b.status?.value === "current" && !!b.availableOn && b.availableOn.value > todayIso(now);
  }
  var NUMERIC = /* @__PURE__ */ new Set(["releaseYear", "rg", "differential", "intermediateDifferential", "specWeightLb"]);
  function rowToBall(row, source) {
    const ball = { key: ballKey(row.manufacturer, row.name), manufacturer: row.manufacturer.trim(), name: row.name.trim() };
    for (const f of SPEC_FIELDS) {
      const raw = row[f];
      if (raw === void 0 || raw === "") continue;
      const value = NUMERIC.has(f) ? Number(raw) : String(raw).trim();
      if (typeof value === "number" && Number.isNaN(value)) continue;
      ball[f] = { value, source };
    }
    return ball;
  }

  // core/src/quiz.ts
  var STYLES = [
    { id: "one-hand-thumb", label: "One hand, thumb in the ball", blurb: "The classic grip: thumb plus two fingers." },
    { id: "one-hand-no-thumb", label: "One hand, no thumb", blurb: "Thumbless: fingers only, thumb out of the ball." },
    { id: "two-handed", label: "Two-handed", blurb: "A second hand supports the ball through the swing." }
  ];
  var LEVELS = [
    { id: "new", label: "New to bowling" },
    { id: "casual", label: "Casual, a few times a year" },
    { id: "league", label: "League bowler" },
    { id: "competitive", label: "Competitive or tournament bowler" },
    { id: "pro", label: "Professional or collegiate" }
  ];
  var FOCUS_OPTIONS = [
    { id: "pocket-accuracy", label: "I miss the pocket and leave corner pins" },
    { id: "speed-consistency", label: "My ball speed changes shot to shot" },
    { id: "target-consistency", label: "I can't hit my target consistently" },
    { id: "start-consistency", label: "My starting position drifts" },
    { id: "shallow-entry", label: "My ball doesn't hook enough" },
    { id: "speed-loss", label: "My ball hooks too early and runs out of energy" }
  ];
  var REV_TIER = { low: 280, medium: 350, high: 450, "very-high": 540 };
  var REV_STYLE_DEFAULT = { "one-hand-thumb": 330, "one-hand-no-thumb": 420, "two-handed": 480 };
  function estimateRev(a) {
    if (a.revRpm !== void 0 && Number.isFinite(a.revRpm) && a.revRpm >= 100 && a.revRpm <= 800) return { rpm: a.revRpm, source: "entered" };
    if (a.revTier !== "unsure") return { rpm: REV_TIER[a.revTier], source: "tier" };
    return { rpm: REV_STYLE_DEFAULT[a.style], source: "style-default" };
  }
  var revSourceText = (s) => s === "entered" ? "the number you entered" : s === "tier" ? "estimated from the rev band you picked" : "assumed typical for your style";
  var styleLabel = (s) => STYLES.find((x) => x.id === s).label;
  function styleNotes(s) {
    if (s === "two-handed")
      return [
        "Two-handed bowlers usually throw more revolutions, so the lineup builder assumes a higher rev rate unless you enter yours.",
        "The camera measures what the ball does, not your hands, so release and support-hand checks will come from replaying your video."
      ];
    if (s === "one-hand-no-thumb")
      return [
        "Thumbless releases tend to produce more revolutions than a thumb release, so the lineup builder assumes a medium-high rev rate unless you enter yours.",
        "Because there's no thumb exit, early timing and ball speed are the first things to keep repeatable."
      ];
    return ["The lineup builder assumes a typical rev rate for a thumb release unless you enter yours."];
  }
  function styleTip(s, issueId) {
    const tips = {
      "two-handed": {
        "speed-consistency": "For a two-handed delivery, check that your support hand lets go at the same point in the swing every time; that is a common source of speed swings.",
        "pocket-accuracy": "Two-handed bowlers often miss by changing their feet or shoulder alignment: film your slide and compare the shot with your best ones."
      },
      "one-hand-no-thumb": {
        "speed-consistency": "Without a thumb, ball speed depends heavily on swing timing: use the same pushaway every shot."
      }
    };
    return tips[s]?.[issueId] ?? "";
  }
  function summarize(a) {
    const rev = estimateRev(a);
    return [
      `${styleLabel(a.style)}, ${a.hand === "R" ? "right" : "left"}-handed`,
      `${LEVELS.find((l) => l.id === a.level).label}${a.avgBand ? `, averaging ${a.avgBand.replace("under-", "under ").replace("-", " to ")}` : ""}`,
      `Rev rate: about ${rev.rpm} RPM (${revSourceText(rev.source)})`,
      `Mostly bowls ${a.patterns === "unsure" ? "an unknown mix of patterns" : a.patterns === "both" ? "house and sport patterns" : a.patterns === "house" ? "house shots" : "sport patterns"}`,
      a.focus.length ? `Wants help with: ${a.focus.map((id) => FOCUS_OPTIONS.find((f) => f.id === id)?.label).filter(Boolean).join("; ")}` : "No specific problems flagged yet, so the app will find them from your shots"
    ];
  }
  function defaultAnswers(name = "") {
    return { name, style: "one-hand-thumb", hand: "R", level: "league", avgBand: "", revTier: "unsure", speedTier: "unsure", patterns: "unsure", goal: "strikes", focus: [], takenAt: (/* @__PURE__ */ new Date()).toISOString() };
  }

  // core/src/share.ts
  var toB64 = (bytes) => {
    let s = "";
    bytes.forEach((b) => s += String.fromCharCode(b));
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  var fromB64 = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  var b64urlEncode = (text) => toB64(new TextEncoder().encode(text));
  var b64urlDecode = (s) => new TextDecoder().decode(fromB64(s));
  var CODE_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  function newFriendCode(rand = Math.random) {
    return Array.from({ length: 8 }, () => CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)]).join("");
  }
  var isFriendCode = (s) => /^[2-9A-HJKMNP-Z]{8}$/.test(s);
  var cleanUsername = (s) => s.trim().replace(/^@/, "").toLowerCase();
  var isUsername = (s) => /^[a-z0-9_]{3,20}$/.test(s);
  var friendTag = (username, code) => `${username}#${code}`;
  function parseFriendTag(s) {
    const m = /^@?([A-Za-z0-9_]{3,20})\s*#\s*([A-Za-z0-9]{8})$/.exec(s.trim());
    if (!m) return null;
    const code = m[2].toUpperCase();
    return isFriendCode(code) ? { username: m[1].toLowerCase(), code } : null;
  }
  function encodeInvite(name, code, username) {
    return `${b64urlEncode(name.slice(0, 40))}.${code}${username && isUsername(username) ? "." + username : ""}`;
  }
  function decodeInvite(s) {
    const [n, code, u] = s.split(".");
    if (!n || !code || !isFriendCode(code)) return null;
    try {
      const name = b64urlDecode(n).trim();
      if (!name) return null;
      return u && isUsername(u) ? { name, code, username: u } : { name, code };
    } catch {
      return null;
    }
  }
  function downsamplePath(path2, n = 18) {
    if (path2.length === 0) return [];
    const out = [];
    for (let i = 0; i < n; i++) {
      const s = path2[Math.min(path2.length - 1, Math.round(i / (n - 1) * (path2.length - 1)))];
      out.push(Math.round(s.x * 10), Math.round(s.y * 10));
    }
    return out;
  }
  var pathFromShared = (p) => Array.from({ length: Math.floor(p.length / 2) }, (_, i) => ({ t: i, x: p[2 * i] / 10, y: p[2 * i + 1] / 10 }));
  var num = (v) => typeof v === "number" && Number.isFinite(v);
  var numOrNull = (v) => v === null || num(v);
  function decodeSession(text) {
    let s;
    try {
      s = JSON.parse(b64urlDecode(text));
    } catch {
      return null;
    }
    const o = s;
    if (!o || o.v !== 1 || typeof o.lane !== "string" || typeof o.date !== "string" || o.hand !== "R" && o.hand !== "L") return null;
    if (!o.from || typeof o.from.name !== "string" || !isFriendCode(String(o.from.code))) return null;
    if (!Array.isArray(o.shots) || o.shots.length === 0 || o.shots.length > 200) return null;
    for (const sh of o.shots) {
      if (!num(sh?.sp) || sh.sp < 3 || sh.sp > 40 || !numOrNull(sh.ar) || !numOrNull(sh.bb) || !numOrNull(sh.bf) || !numOrNull(sh.en) || !numOrNull(sh.an)) return null;
      if (!Array.isArray(sh.p) || sh.p.length > 80 || !sh.p.every((x) => num(x) && Math.abs(x) < 2e4)) return null;
    }
    return {
      v: 1,
      from: { name: o.from.name.slice(0, 40), code: o.from.code },
      lane: o.lane.slice(0, 60),
      pattern: typeof o.pattern === "string" ? o.pattern.slice(0, 60) : void 0,
      date: o.date.slice(0, 40),
      hand: o.hand,
      shots: o.shots.map((sh) => ({ sp: sh.sp, ar: sh.ar, bb: sh.bb, bf: sh.bf, en: sh.en, an: sh.an, ball: typeof sh.ball === "string" ? sh.ball.slice(0, 60) : void 0, pins: num(sh.pins) ? sh.pins : void 0, p: sh.p }))
    };
  }
  var sameLane = (a, b) => {
    const n = (x) => x.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    return n(a) !== "" && n(a) === n(b);
  };
  var avg = (v) => {
    const x = v.filter((n) => typeof n === "number");
    return x.length ? x.reduce((a, b) => a + b, 0) / x.length : null;
  };
  function compareSessions(mine, theirs) {
    const row = (label2, unit2, pick) => ({ label: label2, unit: unit2, mine: avg(mine.shots.map(pick)), theirs: avg(theirs.shots.map(pick)) });
    const rows = [
      row("Speed", "mph", (s) => s.sp),
      row("Arrows board", "", (s) => s.ar),
      row("Breakpoint board", "", (s) => s.bb),
      row("Breakpoint distance", "ft", (s) => s.bf),
      row("Entry board", "", (s) => s.en),
      row("Entry angle", "\xB0", (s) => s.an === null ? null : Math.abs(s.an))
    ];
    const same = sameLane(mine.lane, theirs.lane);
    const notes = [];
    notes.push(same ? `Both sessions were on "${mine.lane}", so differences reflect the bowlers and equipment, not just the lane.` : `These were on different lanes ("${mine.lane}" and "${theirs.lane}"), so treat the comparison loosely.`);
    const bp = rows[3];
    if (bp.mine !== null && bp.theirs !== null && Math.abs(bp.mine - bp.theirs) >= 3) notes.push(`${theirs.from.name}'s ball breaks ${bp.theirs > bp.mine ? "farther down-lane" : "earlier"} than yours by about ${Math.abs(bp.mine - bp.theirs).toFixed(0)} ft.`);
    const en = rows[4];
    if (en.mine !== null && en.theirs !== null && Math.abs(en.mine - en.theirs) >= 1.5) notes.push(`They enter the pocket about ${Math.abs(en.mine - en.theirs).toFixed(1)} boards ${en.theirs > en.mine ? "farther left" : "farther right"} of where you do.`);
    if (mine.hand !== theirs.hand) notes.push("One of you is left-handed and one is right-handed, so board numbers mirror: compare shapes rather than raw boards.");
    return { rows, notes, sameLane: same };
  }

  // core/src/stats.ts
  var MIN_SAMPLE = 20;
  function rate(made, attempts) {
    if (attempts === 0) {
      return { made, attempts, rate: null, interval: null, sufficient: false };
    }
    const p = made / attempts;
    const z = 1.96;
    const denom = 1 + z * z / attempts;
    const centre = p + z * z / (2 * attempts);
    const margin = z * Math.sqrt(p * (1 - p) / attempts + z * z / (4 * attempts * attempts));
    return {
      made,
      attempts,
      rate: p,
      interval: [(centre - margin) / denom, (centre + margin) / denom],
      sufficient: attempts >= MIN_SAMPLE
    };
  }

  // core/src/coach.ts
  var isStrike = (s) => s.result?.pinsDown === 10;
  var withResult = (shots) => shots.filter((s) => s.result !== void 0);
  var mean2 = (v) => v.reduce((a, b) => a + b, 0) / v.length;
  var sd2 = (v) => {
    if (v.length < 2) return 0;
    const m = mean2(v);
    return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1));
  };
  var FEATURES = [
    { key: "launchSpeed", label: "Launch speed", unit: "mph" },
    { key: "entrySpeed", label: "Entry speed", unit: "mph" },
    { key: "speedLossPct", label: "Speed loss", unit: "%" },
    { key: "startBoard", label: "Starting board", unit: "" },
    { key: "arrowsBoard", label: "Arrows board", unit: "" },
    { key: "breakpointBoard", label: "Breakpoint board", unit: "" },
    { key: "breakpointFt", label: "Breakpoint distance", unit: "ft" },
    { key: "hookBoards", label: "Hook (breakpoint to entry)", unit: "boards" },
    { key: "entryBoard", label: "Entry board", unit: "" },
    { key: "entryAngle", label: "Entry angle", unit: "\xB0" },
    { key: "launchAngle", label: "Launch angle", unit: "\xB0" },
    { key: "pocketMiss", label: "Pocket miss (+ high, - light)", unit: "boards" }
  ];
  function featureValues(shots, key) {
    return shots.map((s) => s.m[key]).filter((v) => typeof v === "number" && Number.isFinite(v));
  }
  function computeProfile(shots) {
    const stats = {};
    for (const f of FEATURES) {
      const v = featureValues(shots, f.key);
      if (v.length) stats[f.key] = { mean: mean2(v), sd: sd2(v), n: v.length };
    }
    const zones = {};
    for (const s of shots) if (s.m.zone) zones[s.m.zone] = (zones[s.m.zone] ?? 0) + 1;
    const r = withResult(shots);
    return { shots: shots.length, withResults: r.length, strike: rate(r.filter(isStrike).length, r.length), stats, zones };
  }
  function correlation(shots, a, b) {
    const rows = shots.map((s) => [s.m[a], s.m[b]]).filter((r) => typeof r[0] === "number" && typeof r[1] === "number");
    if (rows.length < 5) return 0;
    const ma = mean2(rows.map((r) => r[0]));
    const mb = mean2(rows.map((r) => r[1]));
    let sab = 0, saa = 0, sbb = 0;
    for (const [x, y] of rows) {
      sab += (x - ma) * (y - mb);
      saa += (x - ma) ** 2;
      sbb += (y - mb) ** 2;
    }
    return saa === 0 || sbb === 0 ? 0 : sab / Math.sqrt(saa * sbb);
  }
  var MIN_OUTCOMES = 20;
  var MIN_PER_BIN = 6;
  function bins(shots, key, n = 3) {
    const rows = withResult(shots).map((s) => ({ v: s.m[key], strike: isStrike(s) })).filter((r) => typeof r.v === "number" && Number.isFinite(r.v)).sort((a, b) => a.v - b.v);
    const out = [];
    const size = Math.floor(rows.length / n);
    if (size < MIN_PER_BIN) return out;
    for (let i = 0; i < n; i++) {
      const chunk = rows.slice(i * size, i === n - 1 ? rows.length : (i + 1) * size);
      out.push({ lo: chunk[0].v, hi: chunk[chunk.length - 1].v, rate: rate(chunk.filter((r) => r.strike).length, chunk.length) });
    }
    return out;
  }
  var pctText = (r) => `${Math.round((r.rate ?? 0) * 100)}% (${r.made}/${r.attempts})`;
  var fmt = (n, d = 1) => n.toFixed(d);
  function findIssues(shots, focus = []) {
    const issues = [];
    const r = withResult(shots);
    const missShots = r.filter((s) => s.m.pocketMiss !== null);
    if (missShots.length >= MIN_OUTCOMES) {
      const inP = missShots.filter((s) => Math.abs(s.m.pocketMiss) <= 1);
      const out = missShots.filter((s) => Math.abs(s.m.pocketMiss) > 1);
      const a = rate(inP.filter(isStrike).length, inP.length);
      const b = rate(out.filter(isStrike).length, out.length);
      const meanMiss = mean2(missShots.map((s) => s.m.pocketMiss));
      if (a.rate !== null && b.rate !== null && inP.length >= MIN_PER_BIN && out.length >= MIN_PER_BIN && a.rate - b.rate >= 0.15) {
        const highShare = out.filter((s) => s.m.pocketMiss > 0).length / out.length;
        const side = highShare > 0.65 ? "high (across the pocket)" : highShare < 0.35 ? "light (thin)" : "both sides";
        issues.push({
          id: "pocket-accuracy",
          title: `Missing the pocket ${side}`,
          detail: `Strikes: ${pctText(a)} when you hit within a board of the pocket versus ${pctText(b)} when you miss by more.`,
          impactPts: Math.round((a.rate - b.rate) * 100),
          confidence: a.interval && b.interval && a.interval[0] > b.interval[1] ? "solid" : "tentative",
          evidence: [Math.abs(meanMiss) < 0.5 ? "On average you are centered on the pocket, so the misses spread both ways: this is repeatability, not aim." : `Average entry sits ${fmt(Math.abs(meanMiss))} boards ${meanMiss > 0 ? "high" : "light"} of the pocket.`, `${Math.round(out.length / missShots.length * 100)}% of shots missed the pocket by more than 1 board.`]
        });
      }
    }
    const featureIssues = [];
    if (r.length >= MIN_OUTCOMES) {
      const covered = /* @__PURE__ */ new Set(["pocketMiss", "entryBoard", "hookBoards", "entrySpeed"]);
      for (const f of FEATURES) {
        if (covered.has(f.key)) continue;
        const b = bins(shots, f.key);
        if (b.length < 3) continue;
        const sorted = [...b].sort((x, y) => (y.rate.rate ?? 0) - (x.rate.rate ?? 0));
        const diff = (sorted[0].rate.rate ?? 0) - (sorted[2].rate.rate ?? 0);
        if (diff >= 0.25) featureIssues.push({ f, best: sorted[0], worst: sorted[2] });
      }
      featureIssues.sort((x, y) => y.best.rate.rate - y.worst.rate.rate - (x.best.rate.rate - x.worst.rate.rate));
      const kept = [];
      for (const c of featureIssues) if (kept.every((k2) => Math.abs(correlation(shots, c.f.key, k2.f.key)) < 0.85)) kept.push(c);
      for (const { f, best, worst } of kept.slice(0, 3)) {
        const diff = Math.round((best.rate.rate - worst.rate.rate) * 100);
        const u = f.unit === "" || f.unit === "\xB0" || f.unit === "%" ? f.unit : " " + f.unit;
        issues.push({
          id: `range-${f.key}`,
          title: `${f.label} outside your best range`,
          detail: `You strike ${pctText(best.rate)} when ${f.label.toLowerCase()} is ${fmt(best.lo)} to ${fmt(best.hi)}${u}, but only ${pctText(worst.rate)} at ${fmt(worst.lo)} to ${fmt(worst.hi)}${u}.`,
          impactPts: diff,
          confidence: best.rate.interval && worst.rate.interval && best.rate.interval[0] > worst.rate.interval[1] ? "solid" : "tentative",
          evidence: [`Based on ${best.rate.attempts + worst.rate.attempts} shots in the best and worst thirds.`]
        });
      }
    }
    const p = computeProfile(shots);
    const spd = p.stats.launchSpeed;
    if (spd && spd.n >= 8 && spd.sd > 0.8) issues.push({ id: "speed-consistency", title: "Ball speed isn't repeatable", detail: `Launch speed varies \xB1${fmt(spd.sd)} mph around ${fmt(spd.mean)} mph. Under about 0.6 is a good target.`, impactPts: null, confidence: spd.n >= 15 ? "solid" : "tentative", evidence: [`${spd.n} tracked shots.`] });
    const ar = p.stats.arrowsBoard;
    if (ar && ar.n >= 8 && ar.sd > 1.5) issues.push({ id: "target-consistency", title: "Your target at the arrows wanders", detail: `Arrows board varies \xB1${fmt(ar.sd)} boards around ${fmt(ar.mean)}. Aim for under 1.`, impactPts: null, confidence: ar.n >= 15 ? "solid" : "tentative", evidence: [`${ar.n} tracked shots.`] });
    const st2 = p.stats.startBoard;
    if (st2 && st2.n >= 8 && st2.sd > 1.5) issues.push({ id: "start-consistency", title: "Your starting position drifts", detail: `Starting board varies \xB1${fmt(st2.sd)} boards around ${fmt(st2.mean)}. Aim for under 1.`, impactPts: null, confidence: st2.n >= 15 ? "solid" : "tentative", evidence: [`${st2.n} tracked shots.`] });
    const ea = p.stats.entryAngle;
    if (ea && ea.n >= 8 && ea.mean < 3) issues.push({ id: "shallow-entry", title: "Entry angle is shallow", detail: `Your entry angle averages ${fmt(ea.mean)}\xB0. Below about 3\xB0 the ball has little room to carry the pocket.`, impactPts: null, confidence: "tentative", evidence: [`${ea.n} tracked shots.`] });
    const loss = p.stats.speedLossPct;
    if (loss && loss.n >= 8 && loss.mean > 30) issues.push({ id: "speed-loss", title: "Ball is losing a lot of speed", detail: `It loses ${fmt(loss.mean)}% of its speed before the pins, which can mean the ball is hooking early or the hand is too far under it.`, impactPts: null, confidence: "tentative", evidence: [`${loss.n} tracked shots.`] });
    for (const i of issues) i.flagged = focus.includes(i.id);
    const rank = (i) => (i.impactPts ?? 0) + (i.flagged ? 8 : 0);
    return issues.sort((a, b) => rank(b) - rank(a));
  }
  var DRILLS = {
    "pocket-accuracy": "Pick the arrow you want and throw 10 shots at it, same feet, same ball. Track how many hit the pocket; do not change anything between shots.",
    "speed-consistency": "Throw 10 shots focusing only on a smooth, same-length slide and pushaway. Stop when speed varies by more than 0.6 mph and reset your tempo.",
    "target-consistency": "Lay a towel or marker on your target arrow. Throw 10 shots looking only at it, same feet, and check the arrows board after each.",
    "start-consistency": "Mark your starting board with tape. Check your feet against it before every shot for a full session.",
    "shallow-entry": "Test one change: slightly less speed or a touch more rotation, and keep the line. Check whether entry angle rises past 4\xB0.",
    "speed-loss": "Try a lower-friction ball or move your feet slightly toward the oiled side, and watch whether speed loss drops."
  };
  var TARGETS = {
    "speed-consistency": { metric: "launchSpeed", stat: "sd", target: 0.6, direction: "down", unit: "mph \xB1" },
    "target-consistency": { metric: "arrowsBoard", stat: "sd", target: 1, direction: "down", unit: "boards \xB1" },
    "start-consistency": { metric: "startBoard", stat: "sd", target: 1, direction: "down", unit: "boards \xB1" },
    "shallow-entry": { metric: "entryAngle", stat: "mean", target: 4, direction: "up", unit: "\xB0" },
    "speed-loss": { metric: "speedLossPct", stat: "mean", target: 25, direction: "down", unit: "%" }
  };
  function buildPlan(shots, issues, now = /* @__PURE__ */ new Date(), style) {
    const drillFor = (id) => [DRILLS[id], style ? styleTip(style, id) : ""].filter(Boolean).join(" ");
    const p = computeProfile(shots);
    const items = [];
    for (const i of issues.slice(0, 3)) {
      if (i.id === "pocket-accuracy") {
        const miss = shots.filter((s2) => s2.m.pocketMiss !== null);
        const inPocket = miss.filter((s2) => Math.abs(s2.m.pocketMiss) <= 1).length;
        const base = miss.length ? Math.round(inPocket / miss.length * 100) : 0;
        items.push({ id: i.id, title: i.title, metric: "pocketMiss", baseline: base, target: Math.min(90, base + 15), direction: "up", unit: "% in pocket", drill: drillFor(i.id) });
        continue;
      }
      const t = TARGETS[i.id];
      const s = t && p.stats[t.metric];
      if (!t || !s) continue;
      items.push({ id: i.id, title: i.title, metric: t.metric, baseline: Number((t.stat === "sd" ? s.sd : s.mean).toFixed(2)), target: t.target, direction: t.direction, unit: t.unit, drill: drillFor(i.id) });
    }
    return { createdAt: now.toISOString(), basedOnShots: shots.length, items };
  }
  function planProgress(plan, recent) {
    return plan.items.map((item) => {
      let current2 = null;
      if (item.metric === "pocketMiss") {
        const miss = recent.filter((s) => s.m.pocketMiss !== null);
        current2 = miss.length >= 5 ? Math.round(miss.filter((s) => Math.abs(s.m.pocketMiss) <= 1).length / miss.length * 100) : null;
      } else {
        const v = featureValues(recent, item.metric);
        const useSd = item.unit.includes("\xB1");
        current2 = v.length >= 5 ? Number((useSd ? sd2(v) : mean2(v)).toFixed(2)) : null;
      }
      if (current2 === null) return { item, current: current2, progress: null, met: false };
      const span = item.target - item.baseline;
      const progress = span === 0 ? 1 : Math.max(0, Math.min(1, (current2 - item.baseline) / span));
      const met = item.direction === "down" ? current2 <= item.target : current2 >= item.target;
      return { item, current: current2, progress, met };
    });
  }

  // camera/db.ts
  var PROFILES_KEY = "laneiq.profiles";
  var CURRENT_KEY = "laneiq.currentProfile";
  function listProfiles() {
    try {
      return JSON.parse(localStorage.getItem(PROFILES_KEY) ?? "[]");
    } catch {
      return [];
    }
  }
  function saveProfiles(p) {
    try {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(p));
    } catch {
    }
  }
  function currentProfileId() {
    try {
      return localStorage.getItem(CURRENT_KEY);
    } catch {
      return null;
    }
  }
  function setCurrentProfile(id) {
    try {
      localStorage.setItem(CURRENT_KEY, id);
    } catch {
    }
  }
  var newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  var opened = /* @__PURE__ */ new Map();
  function open(profileId) {
    let p = opened.get(profileId);
    if (!p) {
      p = new Promise((resolve, reject) => {
        const req = indexedDB.open(`laneiq-p-${profileId}`, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          db.createObjectStore("shots", { keyPath: "id" });
          db.createObjectStore("clips");
          db.createObjectStore("meta");
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      opened.set(profileId, p);
    }
    return p;
  }
  var wrap = (req) => new Promise((res, rej) => (req.onsuccess = () => res(req.result), req.onerror = () => rej(req.error)));
  async function dbAll(profileId, store) {
    return wrap((await open(profileId)).transaction(store).objectStore(store).getAll());
  }
  async function dbGet(profileId, store, key) {
    return wrap((await open(profileId)).transaction(store).objectStore(store).get(key));
  }
  async function dbPut(profileId, store, value, key) {
    const s = (await open(profileId)).transaction(store, "readwrite").objectStore(store);
    await wrap(key === void 0 ? s.put(value) : s.put(value, key));
  }
  async function dbDelete(profileId, store, key) {
    await wrap((await open(profileId)).transaction(store, "readwrite").objectStore(store).delete(key));
  }
  async function deleteProfileData(profileId) {
    const db = await open(profileId).catch(() => null);
    db?.close();
    opened.delete(profileId);
    await new Promise((res) => {
      const r = indexedDB.deleteDatabase(`laneiq-p-${profileId}`);
      r.onsuccess = r.onerror = r.onblocked = () => res();
    });
  }

  // camera/state.ts
  var S = {
    profile: null,
    shots: [],
    arsenal: [],
    catalog: [],
    patterns: [],
    plan: null,
    friends: [],
    /** sessions friends have shared with this profile, kept so they can be compared later */
    shared: [],
    /** where each session was bowled, as typed by the bowler (used to tell if two sessions share a lane) */
    laneLabels: {},
    sessionId: newId(),
    /** demo mode never writes to storage */
    demo: false
  };
  var listeners = /* @__PURE__ */ new Set();
  var onChange = (fn) => (listeners.add(fn), () => listeners.delete(fn));
  var changed = () => listeners.forEach((fn) => fn());
  async function loadProfile(id) {
    const p = listProfiles().find((x) => x.id === id) ?? null;
    S.profile = p;
    if (!p) return;
    setCurrentProfile(id);
    S.shots = (await dbAll(id, "shots")).sort((a, b) => a.at.localeCompare(b.at));
    S.arsenal = await dbGet(id, "meta", "arsenal") ?? [];
    S.plan = await dbGet(id, "meta", "plan") ?? null;
    S.friends = await dbGet(id, "meta", "friends") ?? [];
    S.shared = await dbGet(id, "meta", "shared") ?? [];
    S.laneLabels = await dbGet(id, "meta", "laneLabels") ?? {};
    if (p && !p.friendCode) {
      S.profile = { ...p, friendCode: newFriendCode() };
      saveProfiles(listProfiles().map((x) => x.id === id ? S.profile : x));
    }
    S.sessionId = newId();
    changed();
  }
  async function bootProfile() {
    const id = currentProfileId();
    const list = listProfiles();
    const pick = list.find((p) => p.id === id) ?? list[0];
    if (!pick) return false;
    await loadProfile(pick.id);
    return true;
  }
  function createProfile(a) {
    const p = { id: newId(), name: a.name.trim() || "Bowler", username: a.username || void 0, hand: a.hand, revRpm: a.revRpm, quiz: a, created: (/* @__PURE__ */ new Date()).toISOString() };
    saveProfiles([...listProfiles(), p]);
    return p;
  }
  function updateProfile(patch) {
    if (!S.profile) return;
    S.profile = { ...S.profile, ...patch };
    saveProfiles(listProfiles().map((p) => p.id === S.profile.id ? S.profile : p));
    changed();
  }
  var shotListeners = [];
  function onShot(fn) {
    shotListeners.push(fn);
  }
  async function addShot(s) {
    S.shots.push(s);
    for (const fn of shotListeners) {
      try {
        fn(s);
      } catch {
      }
    }
    if (!S.demo && S.profile) await dbPut(S.profile.id, "shots", s).catch(() => {
    });
    changed();
  }
  async function updateShot(s) {
    if (!S.demo && S.profile) await dbPut(S.profile.id, "shots", s).catch(() => {
    });
    changed();
  }
  async function removeShot(id) {
    S.shots = S.shots.filter((s) => s.id !== id);
    if (!S.demo && S.profile) {
      await dbDelete(S.profile.id, "shots", id).catch(() => {
      });
      await dbDelete(S.profile.id, "clips", id).catch(() => {
      });
    }
    changed();
  }
  async function saveClip(id, blob) {
    if (!S.demo && S.profile) await dbPut(S.profile.id, "clips", blob, id);
  }
  async function loadClip(id) {
    return S.profile ? dbGet(S.profile.id, "clips", id) : void 0;
  }
  async function saveArsenal() {
    if (!S.demo && S.profile) await dbPut(S.profile.id, "meta", S.arsenal, "arsenal").catch(() => {
    });
    changed();
  }
  async function saveSocial() {
    if (!S.demo && S.profile) {
      await dbPut(S.profile.id, "meta", S.friends, "friends").catch(() => {
      });
      await dbPut(S.profile.id, "meta", S.shared, "shared").catch(() => {
      });
      await dbPut(S.profile.id, "meta", S.laneLabels, "laneLabels").catch(() => {
      });
    }
    changed();
  }
  async function savePlan() {
    if (!S.demo && S.profile) await dbPut(S.profile.id, "meta", S.plan, "plan").catch(() => {
    });
    changed();
  }
  async function loadReference() {
    const get = async (u) => {
      try {
        const r = await fetch(u);
        return r.ok ? await r.json() : [];
      } catch {
        return [];
      }
    };
    [S.catalog, S.patterns] = await Promise.all([get("balls.json"), get("patterns.json")]);
    changed();
  }
  var userSrc = () => ({ kind: "user", url: "entered by bowler", retrievedOn: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) });
  function ownedBalls() {
    return S.arsenal.map((b) => {
      const specs = b.catalogKey ? S.catalog.find((c) => c.key === b.catalogKey) : b.rg !== void 0 && b.diff !== void 0 ? rowToBall({ manufacturer: "(mine)", name: b.name, rg: b.rg, differential: b.diff, coverstockType: b.cover }, userSrc()) : void 0;
      const mine = S.shots.filter((s) => s.ballId === b.id);
      let observed;
      if (mine.length >= 8) {
        const avg2 = (v) => {
          const x = v.filter((n) => n !== null);
          return x.length ? x.reduce((a, c) => a + c, 0) / x.length : void 0;
        };
        const res = mine.filter((s) => s.result);
        const miss = mine.filter((s) => s.m.pocketMiss !== null);
        observed = {
          shots: mine.length,
          entryAngle: avg2(mine.map((s) => s.m.entryAngle)),
          breakpointFt: avg2(mine.map((s) => s.m.breakpointFt)),
          pocketPct: miss.length ? miss.filter((s) => Math.abs(s.m.pocketMiss) <= 1).length / miss.length * 100 : void 0,
          strikePct: res.length >= 8 ? res.filter(isStrike).length / res.length * 100 : void 0
        };
      }
      return { id: b.id, name: b.name, specs, observed };
    });
  }
  function bowlerProfile() {
    const p = computeProfile(S.shots);
    const speed = p.stats.launchSpeed;
    const angle = p.stats.entryAngle;
    const q = S.profile?.quiz;
    const sp = S.profile?.spin;
    const rev = sp?.rpm ? { rpm: sp.rpm, source: sp.source === "video" ? "measured" : "entered" } : q ? estimateRev({ style: q.style, revTier: q.revTier, revRpm: S.profile?.revRpm ?? q.revRpm }) : S.profile?.revRpm ? { rpm: S.profile.revRpm, source: "entered" } : void 0;
    return {
      hand: S.profile?.hand ?? "R",
      style: q?.style,
      launchSpeed: speed && speed.n >= 5 ? speed.mean : void 0,
      entryAngle: angle && angle.n >= 5 ? angle.mean : void 0,
      revRpm: rev?.rpm,
      revSource: rev?.source,
      axisRotation: sp?.axisRotation,
      axisTilt: sp?.axisTilt
    };
  }

  // camera/live.ts
  var $ = (id) => document.getElementById(id);
  var esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  var setText = (id, v) => $(id).textContent = v;
  var f1 = (n, d = 1) => n === null || n === void 0 ? "n/a" : n.toFixed(d);
  function setStep(n) {
    document.querySelectorAll(".dot").forEach((d, i) => d.classList.toggle("on", i < n));
  }
  function setReady(ready) {
    const el = $("ready");
    el.textContent = ready ? "READY" : "NOT READY";
    el.classList.toggle("go", ready);
  }
  var guesses = /* @__PURE__ */ new Map();
  var sessionShots = () => S.shots.filter((s) => s.sessionId === S.sessionId);
  var enrollHandler = null;
  var onEnroll = (fn) => enrollHandler = fn;
  var scanHandler = null;
  var onScan = (fn) => scanHandler = fn;
  function attachSuggest(input) {
    const box = document.createElement("div");
    box.className = "suggest";
    input.insertAdjacentElement("afterend", box);
    input.addEventListener("input", () => {
      const hits = input.value.trim().length >= 2 ? searchCatalog(S.catalog, input.value, 6) : [];
      box.innerHTML = hits.map((h) => `<button class="chip" data-v="${esc(h.ball.manufacturer + " " + h.ball.name)}">${esc(h.ball.manufacturer)} ${esc(h.ball.name)}</button>`).join("");
      box.querySelectorAll("button").forEach(
        (b) => b.onclick = () => {
          input.value = b.dataset.v;
          box.innerHTML = "";
        }
      );
    });
  }
  var ZONE_TEXT = { pocket: "In the pocket", high: "High", light: "Light", "very-high": "Way high", "very-light": "Way light" };
  function setCards(s) {
    const a = s.a;
    const m = s.m;
    setText("c-speed", a.speedMph.toFixed(1));
    setText("c-speed-u", `\xB1 ${a.speedUncertainty.toFixed(1)} mph`);
    setText("c-arrows", f1(a.boardAtArrows));
    setText("c-bp", f1(a.breakpointBoard));
    setText("c-bp-u", a.breakpointFt === null ? "" : `at ${a.breakpointFt.toFixed(0)} ft`);
    setText("c-entry", f1(a.entryBoard));
    setText("c-launch", a.launchAngleDeg === null ? "n/a" : `${a.launchAngleDeg.toFixed(1)}\xB0`);
    setText("c-impact", a.impactAngleDeg === null ? "n/a" : `${a.impactAngleDeg.toFixed(1)}\xB0`);
    setText("c-loss", m.speedLossPct === null ? "n/a" : `${m.speedLossPct.toFixed(0)}%`);
    setText("c-hook", f1(m.hookBoards));
    setText("c-miss", m.pocketMiss === null ? "n/a" : `${m.pocketMiss > 0 ? "+" : ""}${m.pocketMiss.toFixed(1)}`);
    setText("c-miss-u", m.zone ? ZONE_TEXT[m.zone] : "+ high, \u2212 light");
    $("c-conf").style.width = `${Math.round(a.confidence * 100)}%`;
    setText("c-conf-t", `${Math.round(a.confidence * 100)}% confidence \xB7 ${a.samples} pts`);
    document.querySelectorAll("#tab-live .card").forEach((el) => {
      el.classList.remove("pop");
      void el.offsetWidth;
      el.classList.add("pop");
    });
  }
  function addHistory(s, n) {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.textContent = `#${n} \xB7 ${s.a.speedMph.toFixed(1)} mph \xB7 entry ${f1(s.a.entryBoard)}`;
    $("history").prepend(chip);
  }
  function renderResult(s) {
    const el = $("result-card");
    if (!s) return void (el.innerHTML = `<div class="u">Waiting for your first shot</div>`);
    const cur = s.result?.pinsDown;
    el.innerHTML = `<div class="u">${s.result?.auto ? `Read from the camera: ${cur === 10 ? "a strike" : `${cur} down${s.result.leave?.length ? `, leaving the ${s.result.leave.join("-")}` : ""}`}. Tap a number if that is wrong.` : "How many pins did this shot knock down? This is how the app learns what costs you strikes."}</div><div class="chips">` + [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((n) => `<button class="chip ${cur === n ? "sel" : n === 10 ? "x" : ""}" data-n="${n}">${n === 10 ? "Strike" : n}</button>`).join("") + `</div>`;
    el.querySelectorAll("button[data-n]").forEach((b) => {
      b.onclick = async () => {
        s.result = { pinsDown: Number(b.dataset.n) };
        await updateShot(s);
        renderResult(s);
      };
    });
  }
  function renderBall(s) {
    const el = $("ball-row");
    el.innerHTML = "";
    const name = (id) => S.arsenal.find((b) => b.id === id)?.name;
    const guess = s ? guesses.get(s.id) : void 0;
    const msg = document.createElement("div");
    msg.className = "u";
    if (!s) msg.textContent = S.arsenal.length ? "Balls ready: " + S.arsenal.map((b) => b.name).join(", ") : "No balls yet. Add one below and show it to the camera so it recognizes it from your very first shot.";
    else if (s.ballId) msg.textContent = `Recognized: ${name(s.ballId)}${guess ? ` (${Math.round(guess.confidence * 100)}% match)` : ""}. Tap to correct.`;
    else if (guess?.ballId) msg.textContent = `Best guess: ${name(guess.ballId)} (${Math.round(guess.confidence * 100)}%). Not sure enough, so please confirm.`;
    else msg.textContent = S.arsenal.length ? "Which ball was that?" : "Add your first ball below.";
    el.append(msg);
    const mine = s?.ballId ? S.arsenal.find((b) => b.id === s.ballId) : void 0;
    const cat = mine?.catalogKey ? S.catalog.find((c) => c.key === mine.catalogKey) : void 0;
    if (mine && (cat || mine.rg !== void 0)) {
      const info = document.createElement("div");
      info.className = "note";
      info.textContent = cat ? [`${cat.manufacturer} ${cat.name}`, cat.rg && `RG ${cat.rg.value}`, cat.differential && `diff ${cat.differential.value}`, cat.coverstock?.value, cat.core?.value, cat.colorway?.value].filter(Boolean).join(" \xB7 ") : `RG ${mine.rg} \xB7 diff ${mine.diff ?? "?"} (your specs)`;
      el.append(info);
    }
    const row = document.createElement("div");
    row.className = "chips";
    for (const b of S.arsenal) {
      const chip = document.createElement("button");
      chip.className = "chip" + (s?.ballId === b.id ? " sel" : guess?.ballId === b.id ? " guess" : "");
      chip.textContent = b.name;
      chip.onclick = async () => {
        if (!s) return;
        s.ballId = b.id;
        if (s.sig) b.exemplars = [...b.exemplars, s.sig].slice(-12);
        await Promise.all([saveArsenal(), updateShot(s)]);
        renderBall(s);
        renderLane();
      };
      row.append(chip);
    }
    el.append(row);
    const form = document.createElement("div");
    form.className = "chips";
    const input = document.createElement("input");
    input.className = "ballinput";
    input.placeholder = S.catalog.length ? `Search ${S.catalog.length} catalog balls or type a name` : "Ball name";
    const add2 = document.createElement("button");
    add2.className = "chip add";
    add2.textContent = "+ Show me this ball";
    add2.onclick = () => {
      const n = input.value.trim();
      if (!n) return void input.focus();
      const hit = S.catalog.find((c) => `${c.manufacturer} ${c.name}`.toLowerCase() === n.toLowerCase());
      enrollHandler?.(n, hit?.key);
    };
    const addNo = document.createElement("button");
    addNo.className = "chip add";
    addNo.textContent = "+ Add without showing";
    addNo.onclick = async () => {
      const n = input.value.trim();
      if (!n) return void input.focus();
      const hit = S.catalog.find((c) => `${c.manufacturer} ${c.name}`.toLowerCase() === n.toLowerCase());
      const b = { id: Math.random().toString(36).slice(2, 9), name: n, exemplars: s?.sig ? [s.sig] : [], catalogKey: hit?.key };
      S.arsenal.push(b);
      if (s) s.ballId = b.id;
      await Promise.all([saveArsenal(), s ? updateShot(s) : Promise.resolve()]);
      renderBall(s);
      renderLane();
    };
    const scan = document.createElement("button");
    scan.className = "chip add";
    scan.textContent = "+ Scan a ball (photo)";
    scan.onclick = () => scanHandler?.();
    form.append(input, add2, addNo, scan);
    el.append(form);
    attachSuggest(input);
    const hint = document.createElement("div");
    hint.className = "note";
    hint.textContent = "\u201CShow me this ball\u201D learns it before you bowl: hold it up to the camera, rotate it slowly for a few seconds, and it can name it from shot 1.";
    el.append(hint);
  }
  function renderLane() {
    const tracked = sessionShots().map((x) => ({ a: x.a, ballId: x.ballId }));
    const r = readLane(tracked);
    const el = $("lane-read");
    el.innerHTML = `<div class="lr-head">${esc(r.headline)}</div><span class="badge ${r.confidence}">${r.confidence} confidence \xB7 ${r.shotsUsed} shots</span><ul>${r.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul><div class="lr-next">Next test: ${esc(r.next)}</div>`;
    const last = sessionShots().at(-1);
    const rec2 = recommendBall(r, last?.ballId, ownedBalls().map((b) => ({ id: b.id, name: b.name, catalog: b.specs })));
    const rc = document.createElement("div");
    rc.className = "lr-next rec";
    rc.innerHTML = `Equipment: ${esc(rec2.text)}${rec2.basis.map((l) => `<div class="u">${esc(l)}</div>`).join("")}`;
    el.append(rc);
  }
  async function registerShot(s) {
    const arsenal = S.arsenal;
    const guess = s.sig ? classifyBall(s.sig, arsenal) : classifyBall([], []);
    guesses.set(s.id, guess);
    if (guess.auto) s.ballId = guess.ballId;
    await addShot(s);
    setCards(s);
    addHistory(s, sessionShots().length);
    renderResult(s);
    renderBall(s);
    renderLane();
  }

  // core/src/patterns.ts
  function lengthClass(lengthFt) {
    return lengthFt <= 37 ? "short" : lengthFt <= 41 ? "medium" : "long";
  }
  var SPORT_RATIO_LIMIT = 3;
  var isSportRatio = (ratio) => ratio <= SPORT_RATIO_LIMIT;
  function customPattern(lengthFt, volumeMl, ratio, name = "Custom pattern") {
    return { key: name.toLowerCase(), name, series: "custom", lengthFt, volumeMl, ratio, source: { kind: "user", url: "entered by bowler", retrievedOn: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) } };
  }

  // core/src/arsenal.ts
  function patternDemand(p, b) {
    const reasons = [];
    let t = 0;
    const L = (p.lengthFt - 39) * 0.2;
    t += L;
    reasons.push(`${p.lengthFt} ft is a ${lengthClass(p.lengthFt)} pattern, which ${L > 0.05 ? "asks for a ball that reads sooner" : L < -0.05 ? "asks for a cleaner, later-reading ball" : "sits in the middle"}.`);
    if (p.volumeMl !== void 0) {
      const v = (p.volumeMl - 24) * 0.04;
      t += v;
      reasons.push(`${p.volumeMl} mL of oil is ${v > 0.05 ? "on the heavy side, so more traction helps" : v < -0.05 ? "on the light side, so a smoother ball holds its energy" : "about average"}.`);
    }
    if (p.ratio !== void 0 && p.ratio >= 6) {
      t += 0.15;
      reasons.push(`A ${p.ratio}:1 ratio is a forgiving house-style shape, so a stronger ball can still be controlled.`);
    } else if (p.ratio !== void 0 && p.ratio <= 2) {
      reasons.push(`A ${p.ratio}:1 ratio is flat and punishing, so choose control over raw hook.`);
    }
    if (b.launchSpeed !== void 0) {
      const s = (b.launchSpeed - 17) * 0.1;
      t += s;
      reasons.push(`Your measured speed of ${b.launchSpeed.toFixed(1)} mph ${s > 0.05 ? "is quick, so you need a ball that grabs sooner" : s < -0.05 ? "is moderate, so you hook easily and want a cleaner ball" : "is typical"}.`);
    }
    if (b.entryAngle !== void 0) {
      const a = b.entryAngle < 3 ? 0.25 : b.entryAngle > 6.5 ? -0.25 : 0;
      t += a;
      if (a) reasons.push(`Your entry angle averages ${b.entryAngle.toFixed(1)}\xB0, so ${a > 0 ? "more hook would help" : "you can afford less hook"}.`);
    }
    if (b.revRpm !== void 0) {
      const r = -((b.revRpm - 400) / 800) * 0.7;
      t += r;
      reasons.push(`${b.revRpm} RPM${b.revSource === "entered" ? "" : b.revSource === "measured" ? " (measured from your release video)" : b.revSource === "tier" ? " (estimated from the band you picked)" : " (assumed typical for your style)"} ${r < -0.03 ? "is high, so a cleaner ball keeps it from overreacting" : r > 0.03 ? "is low, so a stronger ball gives you the hook" : "is typical"}.`);
    }
    if (b.axisRotation !== void 0) {
      const a = -((b.axisRotation - 45) / 45) * 0.25;
      t += a;
      if (Math.abs(a) > 0.04) reasons.push(`Axis rotation of ${Math.round(b.axisRotation)}\xB0 means ${a < 0 ? "a lot of side roll, which tends to make a ball flare and read the lane sooner, so a cleaner ball keeps it from overreacting" : "mostly forward roll, which tends to read the lane later, so a stronger ball helps it get going"}.`);
    }
    if (b.axisTilt !== void 0) {
      const a = -((b.axisTilt - 12) / 12) * 0.1;
      t += a;
      if (Math.abs(a) > 0.04) reasons.push(`Axis tilt of ${Math.round(b.axisTilt)}\xB0 is ${a < 0 ? "high, adding to the side roll" : "low, so the ball stays closer to a forward roll"}.`);
    }
    return { target: t, reasons };
  }
  var BAND = 0.3;
  var isSpareBall = (b) => b.coverstockType?.value === "plastic" || /\bspare\b/i.test(b.name);
  function closest(balls, want, exclude) {
    const pool = balls.filter((x) => !exclude.has(x.b.id));
    return pool.sort((a, c) => Math.abs(a.m - want) - Math.abs(c.m - want))[0];
  }
  function observedLine(b) {
    const o = b.observed;
    if (!o || o.shots < 8) return "";
    const bits = [];
    if (o.entryAngle !== void 0) bits.push(`${o.entryAngle.toFixed(1)}\xB0 entry`);
    if (o.breakpointFt !== void 0) bits.push(`breakpoint at ${o.breakpointFt.toFixed(0)} ft`);
    if (o.pocketPct !== void 0) bits.push(`${Math.round(o.pocketPct)}% pocket`);
    if (o.strikePct !== void 0) bits.push(`${Math.round(o.strikePct)}% strikes`);
    return bits.length ? ` Measured over ${o.shots} of your shots: ${bits.join(", ")}.` : "";
  }
  function buildLineup(pattern, bowler, arsenal) {
    const { target, reasons } = patternDemand(pattern, bowler);
    const scored = arsenal.map((b) => ({ b, m: b.specs ? motionIndex(b.specs) : null })).filter((x) => x.m !== null);
    const caveats = [
      "Spec-based estimates from published RG, differential and cover type, not a measurement of how each ball reacts for you.",
      bowler.revRpm === void 0 ? "Rev rate isn't measured or entered, so the recommendation can't account for it." : bowler.revSource === "entered" || bowler.revSource === "measured" ? `Rev rate is the number you ${bowler.revSource === "measured" ? "measured" : "entered"}.` : "Rev rate is an estimate from your quiz answers, not a measurement. Enter your real number under Me for better picks."
    ];
    const gaps = [];
    const unmatched = arsenal.length - scored.length;
    if (unmatched > 0) caveats.push(`${unmatched} of your balls have no RG/differential on file, so they were left out. Add their specs to include them.`);
    if (scored.length === 0) return { target, reasons, slots: [], gaps: ["Add at least one ball with RG and differential to build a lineup."], caveats };
    const used = /* @__PURE__ */ new Set();
    const slots = [];
    const mk = (role, want) => {
      const pick = closest(scored, want, used);
      if (!pick) {
        slots.push({ role, ball: null, index: null, fit: "gap", why: "You don't own enough balls to fill this role." });
        return;
      }
      const off = Math.abs(pick.m - want);
      const fit = off <= BAND ? "good" : off <= BAND * 2 ? "stretch" : "gap";
      if (fit === "gap") {
        slots.push({ role, ball: null, closest: pick.b, index: pick.m, fit, why: `Nothing you own suits this role. The closest is ${pick.b.name} (motion index ${pick.m.toFixed(2)}), which is ${pick.m > want ? "stronger" : "cleaner"} than the ${want.toFixed(2)} this role wants.` });
        gaps.push(`For "${role}" you'd want a ball with a motion index near ${want.toFixed(2)} (${want > pick.m ? "stronger" : "cleaner"} than ${pick.b.name}).`);
        return;
      }
      used.add(pick.b.id);
      slots.push({
        role,
        ball: pick.b,
        index: pick.m,
        fit,
        why: `${pick.b.name} (motion index ${pick.m.toFixed(2)}) vs the ${want.toFixed(2)} this role wants: ${fit === "good" ? "a close match" : fit === "stretch" ? "workable but not ideal" : "a poor match"}.${observedLine(pick.b)}`
      });
    };
    mk("start", target);
    mk("when it hooks early", target - 0.35);
    mk("when it skids or carries down", target + 0.35);
    return { target, reasons, slots, gaps, caveats };
  }
  var canSuggest = (c, f) => f?.includeOlder || recommendable(c, f?.now);
  function gapFillers(catalog, ownedKeys, want, limit = 3, filter) {
    return catalog.filter((c) => !ownedKeys.has(c.key) && !isSpareBall(c) && canSuggest(c, filter)).map((ball) => ({ ball, index: motionIndex(ball) })).filter((x) => x.index !== null && Math.abs(x.index - want) <= BAND).sort((a, b) => Math.abs(a.index - want) - Math.abs(b.index - want)).slice(0, limit);
  }
  function rankCatalog(catalog, ownedKeys, want, limit = 8, perBrand = 2, filter) {
    const scored = catalog.filter((c) => !ownedKeys.has(c.key) && !isSpareBall(c) && canSuggest(c, filter)).map((ball) => ({ ball, index: motionIndex(ball) })).filter((x) => x.index !== null).map((x) => ({ ...x, off: Math.abs(x.index - want) })).sort((a, b) => a.off - b.off);
    const count = /* @__PURE__ */ new Map();
    const out = [];
    for (const c of scored) {
      const n = count.get(c.ball.manufacturer) ?? 0;
      if (n >= perBrand) continue;
      count.set(c.ball.manufacturer, n + 1);
      out.push(c);
      if (out.length >= limit) break;
    }
    return out;
  }
  function upcomingForBowler(catalog, ownedKeys, targets, limit = 5, now = /* @__PURE__ */ new Date()) {
    const fresh = catalog.filter((c) => !ownedKeys.has(c.key) && !isSpareBall(c) && isUpcoming(c, now) && (!c.competition || c.competition.value === "approved"));
    const withSpecs = [];
    const noSpecs = [];
    for (const ball of fresh) {
      const index = motionIndex(ball);
      if (index === null) {
        noSpecs.push({ ball, index: null, off: null, why: "Specs aren't published yet. Worth a look once they are." });
        continue;
      }
      const best = targets.map((t) => ({ t, off: Math.abs(index - t.target) })).sort((a, b) => a.off - b.off)[0];
      if (best && best.off <= 0.35) withSpecs.push({ ball, index, off: best.off, why: `Its published specs (motion index ${index.toFixed(2)}) land near what you need for ${best.t.label}.` });
    }
    withSpecs.sort((a, b) => (a.off ?? 9) - (b.off ?? 9));
    const date = (p) => p.ball.availableOn?.value ?? "9999";
    noSpecs.sort((a, b) => date(a).localeCompare(date(b)));
    return [...withSpecs, ...noSpecs].slice(0, limit);
  }

  // camera/health.ts
  var KEY = "laneiq.locklog";
  var MAX = 120;
  function read() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }
  function write(v) {
    try {
      localStorage.setItem(KEY, JSON.stringify(v.slice(-MAX)));
    } catch {
    }
  }
  function logLock(e) {
    write([...read(), { at: Date.now(), ...e }]);
  }
  function markRedone() {
    const v = read();
    const last = v[v.length - 1];
    if (last && Date.now() - last.at < 12e4 && !last.redone) {
      last.redone = true;
      write(v);
    }
  }
  function healthSummary() {
    const v = read().filter((e) => !/saved setup/.test(e.how));
    const auto = v.filter((e) => /automatic|picked/.test(e.how));
    const secs = auto.map((e) => e.secs).filter((x) => x !== null).sort((a, b) => a - b);
    const redone = v.filter((e) => e.redone).length;
    const taps = v.filter((e) => /one tap/.test(e.how)).length;
    const manual = v.filter((e) => e.how === "manual").length;
    const lines = [];
    if (!v.length) lines.push("No lane locks yet. Start the camera on the Live tab and this fills in.");
    else {
      lines.push(`${auto.length} of ${v.length} locks were automatic${taps ? `, ${taps} needed a tap` : ""}${manual ? `, ${manual} were placed by hand` : ""}.`);
      if (secs.length) lines.push(`Typical time to lock: ${secs[Math.floor(secs.length / 2)].toFixed(0)} s.`);
      if (redone) lines.push(`${redone} lock${redone === 1 ? " was" : "s were"} redone within two minutes, which usually means it was off.`);
      if (manual + taps > auto.length) lines.push("Automatic lock is struggling here. Try the setup tips (the ? on the Live tab), and use Save frame so the detector can be improved from real pictures.");
    }
    return { locks: v.length, automatic: auto.length, redone, medianSecs: secs.length ? secs[Math.floor(secs.length / 2)] : null, taps, manual, lines };
  }
  function diagnosticsText() {
    return JSON.stringify({ app: "LaneIQ", at: (/* @__PURE__ */ new Date()).toISOString(), summary: healthSummary(), locks: read() }, null, 1);
  }
  function runningVersion() {
    const s = Array.from(document.scripts).map((x) => x.src).find((x) => /camera\.js\?v=/.test(x));
    return s ? s.split("?v=")[1] ?? null : null;
  }
  function watchForUpdates(show, idle = () => false) {
    const mine = runningVersion();
    if (!mine) return;
    let shown = false;
    const check = async () => {
      if (shown || !navigator.onLine) return;
      try {
        const r = await fetch(`version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!r.ok) return;
        const v = await r.json();
        if (v.version && v.version !== mine) {
          let tried = "";
          try {
            tried = sessionStorage.getItem("laneiq.autoUpdated") ?? "";
          } catch {
          }
          if (idle() && tried !== v.version) {
            try {
              sessionStorage.setItem("laneiq.autoUpdated", v.version);
            } catch {
            }
            location.reload();
            return;
          }
          shown = true;
          show("A newer version of LaneIQ is ready.", () => location.reload());
        }
      } catch {
      }
    };
    setTimeout(check, 4e3);
    setInterval(check, 10 * 6e4);
    document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && check());
  }

  // core/src/optimizer.ts
  var typical = (name, lengthFt, volumeMl, ratio) => ({
    key: name.toLowerCase(),
    name,
    series: "typical condition",
    lengthFt,
    volumeMl,
    ratio,
    source: { kind: "user", url: "typical condition used by the optimizer", retrievedOn: "2026-10-19" }
  });
  var SCENARIOS = [
    { id: "heavy", blurb: "fresh, heavy oil", pattern: typical("Heavy oil, fresh house shot", 42, 28, 8) },
    { id: "house", blurb: "an ordinary league night", pattern: typical("Typical house shot", 40, 24, 6) },
    { id: "burned", blurb: "lanes that have dried up", pattern: typical("Dry, burned-up lanes", 38, 19, 4) },
    { id: "short", blurb: "short sport pattern", pattern: typical("Short sport pattern", 35, 22, 1.8) },
    { id: "long", blurb: "long sport pattern", pattern: typical("Long sport pattern", 46, 27, 2) }
  ];
  var COVERED = 0.3;
  var STRETCH = 0.6;
  function optimizeArsenal(input) {
    const { bowler, owned, catalog, ownedKeys, tonight } = input;
    const withIndex = owned.filter((b) => b.specs && !isSpareBall(b.specs)).map((b) => ({ ball: b, index: motionIndex(b.specs) })).filter((x) => x.index !== null);
    const notes = [
      "Spec-based: published RG, differential and cover type, adjusted for your speed, entry angle, rev rate and axis where known. It says which ball should read the lane the way you need; it can't promise how a ball will react on your hand."
    ];
    if (bowler.revSource !== "entered" && bowler.revSource !== "measured") notes.push("Rev rate is an estimate, not a measurement. Enter your real number on the Me tab to sharpen every pick.");
    const missing = owned.length - owned.filter((b) => b.specs).length;
    if (missing > 0) notes.push(`${missing} of your balls have no specs on file and were left out. Add their RG and differential to include them.`);
    const scenarioList = [...SCENARIOS.map((s) => ({ id: s.id, blurb: s.blurb, pattern: s.pattern })), ...tonight ? [{ id: "tonight", blurb: "the pattern chosen on this screen", pattern: tonight }] : []];
    const profile = patternDemand(SCENARIOS[1].pattern, bowler).reasons.filter((r) => !/^(\d+(\.\d+)?) ft is a/.test(r) && !/mL of oil/.test(r));
    const scenarios = scenarioList.map((s) => {
      const target = patternDemand(s.pattern, bowler).target;
      const best = withIndex.map((x) => ({ ball: x.ball, index: x.index, off: Math.abs(x.index - target) })).sort((a, b) => a.off - b.off)[0] ?? null;
      return { id: s.id, name: s.pattern.name, blurb: s.blurb, target, best, status: !best ? "gap" : best.off <= COVERED ? "covered" : best.off <= STRETCH ? "stretch" : "gap" };
    });
    const overlaps = [];
    for (let i = 0; i < withIndex.length; i++)
      for (let j = i + 1; j < withIndex.length; j++) {
        const a = withIndex[i], b = withIndex[j];
        if (Math.abs(a.index - b.index) < 0.1 && a.ball.specs.coverstockType?.value === b.ball.specs.coverstockType?.value)
          overlaps.push(`${a.ball.name} and ${b.ball.name} are nearly the same ball on paper (motion index ${a.index.toFixed(2)} and ${b.index.toFixed(2)}, both ${a.ball.specs.coverstockType?.value ?? "similar cover"}). A third ball that is different would add more than a repeat.`);
      }
    const hasSpare = owned.some((b) => b.specs && isSpareBall(b.specs));
    const spares = catalog.filter((c) => isSpareBall(c) && !ownedKeys.has(c.key) && c.rg && c.status?.value === "current").slice(0, 3);
    const bad = scenarios.filter((s) => s.status !== "covered").sort((a, b) => (b.best?.off ?? 9) - (a.best?.off ?? 9));
    const buys = [];
    for (const s of bad) {
      const near = buys.find((b) => Math.abs(b.target - s.target) < 0.25);
      if (near) {
        near.fixes.push(s.name);
        continue;
      }
      if (buys.length >= 3) break;
      const picks = rankCatalog(catalog, ownedKeys, s.target, 3, 1);
      if (!picks.length) continue;
      buys.push({ fixes: [s.name], target: s.target, direction: !s.best || s.target > s.best.index ? "stronger" : "cleaner", picks });
    }
    for (const x of withIndex) {
      const o = x.ball.observed;
      if (!o || o.shots < 8 || o.entryAngle === void 0) continue;
      if (o.entryAngle < 3) notes.push(`${x.ball.name}: measured entry angle is only ${o.entryAngle.toFixed(1)}\xB0 over ${o.shots} shots, so it may not be giving you enough angle for the pocket.`);
      else if (o.entryAngle > 7.5) notes.push(`${x.ball.name}: measured entry angle is ${o.entryAngle.toFixed(1)}\xB0 over ${o.shots} shots, which is a lot. It may be more ball than you need on those lanes.`);
    }
    const types = new Set(withIndex.map((x) => x.ball.specs.coverstockType?.value).filter(Boolean));
    if (withIndex.length >= 3 && types.size === 1) notes.push(`All your strike balls share one cover type (${[...types][0]}). Mixing a solid, a pearl and a hybrid gives you different shapes of motion, not just different strengths.`);
    let score = null;
    if (withIndex.length) {
      score = 100;
      for (const s of scenarios) score -= s.status === "gap" ? 14 : s.status === "stretch" ? 5 : 0;
      score -= Math.min(3, overlaps.length) * 4;
      if (!hasSpare) score -= 8;
      if (withIndex.length < 3) score -= 10;
      score = Math.max(0, Math.round(score));
    }
    if (withIndex.length < 3 && withIndex.length > 0) notes.push(`You have ${withIndex.length} strike ball${withIndex.length === 1 ? "" : "s"} with specs. Most league bowlers cover a season with three to five different ones.`);
    return { score, scenarios, overlaps, spare: { has: hasSpare, picks: spares }, buys, profile, notes };
  }

  // core/src/layoutgeo.ts
  var CIRC = 27;
  var R = CIRC / (2 * Math.PI);
  var QUARTER = CIRC / 4;
  var dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  var cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  var add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  var sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  var scale = (a, k2) => [a[0] * k2, a[1] * k2, a[2] * k2];
  var norm2 = (a) => Math.hypot(a[0], a[1], a[2]);
  var unit = (a) => {
    const n = norm2(a) || 1;
    return [a[0] / n, a[1] / n, a[2] / n];
  };
  var clamp = (x, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, x));
  var rad = (d) => d * Math.PI / 180;
  var deg = (r) => r * 180 / Math.PI;
  var surfDist = (a, b) => R * Math.acos(clamp(dot(unit(a), unit(b))));
  function tangentToward(p, q) {
    const t = sub(q, scale(p, dot(q, p)));
    return unit(norm2(t) < 1e-9 ? orthogonal(p) : t);
  }
  function orthogonal(p) {
    return unit(Math.abs(p[0]) < 0.9 ? cross(p, [1, 0, 0]) : cross(p, [0, 1, 0]));
  }
  function walk(p, dir, dist) {
    const a = dist / R;
    return unit(add(scale(p, Math.cos(a)), scale(dir, Math.sin(a))));
  }
  function rotate(v, axis, ang2) {
    const c = Math.cos(ang2), s = Math.sin(ang2);
    return add(add(scale(v, c), scale(cross(axis, v), s)), scale(axis, dot(axis, v) * (1 - c)));
  }
  var DEFAULT_GRIP = { span: 4.25, thumbDia: 1.05, fingerDia: 0.9, bridge: 0.25 };
  var N = [0, 0, 1];
  var UP = [0, 1, 0];
  function gripFrame(grip, hand) {
    const hs = hand === "R" ? 1 : -1;
    const thumbR = grip.thumbDia / 2, fingerR = grip.fingerDia / 2;
    const c2c = grip.noThumb ? 0 : grip.span + thumbR + fingerR;
    const half = c2c / 2;
    const fingers = walk(N, UP, half);
    const thumb = grip.noThumb ? null : walk(N, scale(UP, -1), half);
    const side = [hs, 0, 0];
    const lateral = (grip.bridge + grip.fingerDia) / 2;
    const sideAt = (p, sgn) => walk(p, unit(sub(side, scale(p, dot(side, p)))), sgn * lateral);
    return { hs, fingers, thumb, middle: sideAt(fingers, -1), ring: sideAt(fingers, 1) };
  }
  function papPoint(pap, hs) {
    const q = walk(N, UP, pap.up);
    const side = [hs, 0, 0];
    const p = walk(q, unit(sub(side, scale(q, dot(side, q)))), pap.over);
    const toQ = Math.abs(pap.over) < 1e-6 ? unit(sub([-hs, 0, 0], scale(p, dot([-hs, 0, 0], p)))) : tangentToward(p, q);
    let v = unit(cross(p, toQ));
    if (v[1] < 0) v = scale(v, -1);
    return { pap: p, q, valUp: v };
  }
  var ang = (inch2) => inch2 / R;
  function solveLayout(input, pap, hand, grip = DEFAULT_GRIP, flip = false) {
    const problems = [];
    const { hs, fingers, thumb, middle, ring } = gripFrame(grip, hand);
    const { pap: P, q, valUp } = papPoint(pap, hs);
    const toMid = Math.abs(pap.over) < 1e-6 ? unit(sub([-hs, 0, 0], scale(P, dot([-hs, 0, 0], P)))) : tangentToward(P, q);
    let a = 0;
    let drilling = 0;
    let pinDir = valUp;
    if (input.system === "dual") {
      a = input.pinToPap;
      drilling = input.drilling;
      const phi = rad(clamp(input.valAngle, -180, 180));
      pinDir = unit(add(scale(valUp, Math.cos(phi)), scale(toMid, Math.sin(phi))));
    } else {
      a = input.pinToPap;
      const b = input.psaToPap;
      const cosd = Math.cos(ang(b)) / Math.sin(ang(a));
      if (Math.abs(cosd) > 1 + 1e-9) problems.push(a + b < QUARTER ? `Pin to PAP plus PSA to PAP must be at least ${QUARTER} inches (they are ${(a + b).toFixed(2)}).` : `PSA to PAP can differ from pin to PAP by at most ${QUARTER} inches.`);
      drilling = deg(Math.acos(clamp(cosd)));
      if (input.system === "pinbuffer") {
        const s = Math.sin(ang(input.pinBuffer)) / Math.sin(ang(a));
        if (Math.abs(s) > 1 + 1e-9) problems.push(`The pin buffer (${input.pinBuffer}") can't be larger than the pin to PAP distance (${a}"). A negative pin buffer puts the pin on the far side of the VAL.`);
        const phi = Math.asin(clamp(s));
        pinDir = unit(add(scale(valUp, Math.cos(phi)), scale(toMid, Math.sin(phi))));
      } else {
        const dPG = surfDist(P, N);
        const g = input.pinToGrip;
        const cosg = (Math.cos(ang(g)) - Math.cos(ang(dPG)) * Math.cos(ang(a))) / (Math.sin(ang(dPG)) * Math.sin(ang(a)) || 1e-9);
        if (Math.abs(cosg) > 1 + 1e-9) problems.push("No pin position gives that pin-to-grip distance with this PAP and pin-to-PAP. Change one of them.");
        const gamma = Math.acos(clamp(cosg));
        const toG = tangentToward(P, N);
        const d1 = rotate(toG, P, gamma), d2 = rotate(toG, P, -gamma);
        pinDir = dot(d1, valUp) >= dot(d2, valUp) ? d1 : d2;
      }
    }
    if (a <= 0) problems.push("Pin to PAP must be more than zero.");
    const pin = walk(P, pinDir, a);
    const toPap = tangentToward(pin, P);
    const mag = Math.abs(drilling);
    const c1 = rotate(toPap, pin, rad(mag));
    const c2 = rotate(toPap, pin, -rad(mag));
    const outward = (d) => hs * walk(pin, d, QUARTER)[0];
    let psaDir = outward(c1) >= outward(c2) ? c1 : c2;
    const swapped = drilling < 0 !== flip;
    if (swapped) psaDir = psaDir === c1 ? c2 : c1;
    const drillSigned = swapped ? -mag : mag;
    const psa = walk(pin, psaDir, QUARTER);
    const inter = unit(cross(pin, psa));
    const toPin = tangentToward(P, pin);
    const phiDeg = deg(Math.atan2(dot(toPin, toMid), dot(toPin, valUp)));
    const phiUsed = input.system === "dual" ? input.valAngle : phiDeg;
    const bufferIn = R * Math.asin(clamp(Math.sin(ang(a)) * Math.sin(rad(phiUsed))));
    const bToPap = surfDist(psa, P);
    const toGrip = surfDist(pin, N);
    const eq = {
      dual: { drilling: drillSigned, pinToPap: a, valAngle: phiUsed },
      pinbuffer: { pinToPap: a, psaToPap: bToPap, pinBuffer: bufferIn },
      ls2: { pinToPap: a, psaToPap: bToPap, pinToGrip: toGrip }
    };
    const pinUp = R * Math.asin(clamp(dot(pin, UP)));
    const pinOver = R * Math.asin(clamp(dot(pin, [hs, 0, 0]) / Math.max(1e-9, Math.cos(Math.asin(clamp(dot(pin, UP)))))));
    const fingerY = grip.noThumb ? 0 : (grip.span + grip.thumbDia / 2 + grip.fingerDia / 2) / 2;
    const pinPlacement = { up: pinUp, over: pinOver, label: classifyPin(pinUp, pinOver, fingerY, grip) };
    const points = { grip: N, pap: P, pin, psa, inter, valUp, q, thumb, middle, ring, fingers };
    return { ok: problems.length === 0, problems, points, eq, angleSum: Math.abs(drillSigned) + Math.abs(eq.dual.valAngle), pinPlacement, papToGrip: surfDist(P, N) };
  }
  function classifyPin(up, over, fingerY, grip) {
    const rel = up - fingerY;
    const where = rel > 1.25 ? "pin up: above the finger holes" : rel > 0.25 ? "pin just above the fingers" : rel > -0.9 ? "pin near the finger holes" : up > 0 ? "pin below the fingers, above the grip center" : up > -1 ? "pin near the grip center (the bridge to the thumb)" : grip.noThumb ? "pin down: below the grip" : "pin down: toward the thumb";
    return `${where} (${up >= 0 ? "+" : ""}${up.toFixed(1)}" along the grip, ${Math.abs(over).toFixed(1)}" ${over >= 0 ? "toward the PAP side" : "to the far side"})`;
  }
  function fractionInches(v) {
    const sixteenths = Math.round(v * 16);
    const whole = Math.trunc(sixteenths / 16);
    const rem = Math.abs(sixteenths % 16);
    if (rem === 0) return `${whole}"`;
    let n = rem, d = 16;
    while (n % 2 === 0) {
      n /= 2;
      d /= 2;
    }
    return `${whole === 0 && sixteenths < 0 ? "-" : ""}${whole !== 0 ? whole + " " : ""}${n}/${d}"`;
  }
  function transitionRead(sum, drilling, val2) {
    const out = [];
    out.push(sum < 70 ? "Quick transition: it turns skid into hook and roll early, so it reads the lane sooner." : sum < 110 ? "Medium transition: a balanced move from skid to hook to roll." : "Slow transition: it holds its energy longer and the move to roll comes late.");
    if (drilling - val2 > 20) out.push("A larger drilling angle than VAL angle points to a later, sharper breakpoint (more backend).");
    else if (val2 - drilling > 20) out.push("A smaller drilling angle than VAL angle points to a sooner, heavier roll (more midlane).");
    return out;
  }
  function measureLayout(pin, baseline, pap, hand, grip = DEFAULT_GRIP) {
    const { hs } = gripFrame(grip, hand);
    const { pap: P, q, valUp } = papPoint(pap, hs);
    const toMid = Math.abs(pap.over) < 1e-6 ? unit(sub([-hs, 0, 0], scale(P, dot([-hs, 0, 0], P)))) : tangentToward(P, q);
    const a = surfDist(pin, P);
    const toPin = tangentToward(P, pin);
    const valAngle = deg(Math.atan2(dot(toPin, toMid), dot(toPin, valUp)));
    const pinBuffer = R * Math.asin(clamp(Math.sin(ang(a)) * Math.sin(rad(valAngle))));
    const pinUp = R * Math.asin(clamp(dot(pin, UP)));
    const pinOver = R * Math.asin(clamp(dot(pin, [hs, 0, 0]) / Math.max(1e-9, Math.cos(Math.asin(clamp(dot(pin, UP)))))));
    const fingerY = grip.noThumb ? 0 : (grip.span + grip.thumbDia / 2 + grip.fingerDia / 2) / 2;
    let drilling = null;
    let psaToPap = null;
    let psa = null;
    if (baseline) {
      const toBase = tangentToward(pin, baseline);
      const toPap = tangentToward(pin, P);
      const angle = deg(Math.acos(clamp(dot(toBase, toPap))));
      psa = walk(pin, toBase, QUARTER);
      const mirrored = unit(sub(scale(toPap, 2 * dot(toBase, toPap)), toBase));
      const outward = (d) => hs * walk(pin, d, QUARTER)[0];
      drilling = outward(toBase) >= outward(mirrored) ? angle : -angle;
      psaToPap = surfDist(psa, P);
    }
    return { pinToPap: a, valAngle, pinBuffer, pinToGrip: surfDist(pin, N), papToGrip: surfDist(P, N), pinPlacement: { up: pinUp, over: pinOver, label: classifyPin(pinUp, pinOver, fingerY, grip) }, drilling, psaToPap, points: { pap: P, pin, psa, q, valUp } };
  }
  function measureMark(pin, mark, pap, hand, grip = DEFAULT_GRIP) {
    const { hs } = gripFrame(grip, hand);
    const { pap: P } = papPoint(pap, hs);
    const toPap = tangentToward(pin, P);
    const toMark = tangentToward(pin, mark);
    const angle = deg(Math.acos(clamp(dot(toPap, toMark))));
    const mirrored = unit(sub(scale(toPap, 2 * dot(toMark, toPap)), toMark));
    const outward = (d) => hs * walk(pin, d, QUARTER)[0];
    const upIn = R * Math.asin(clamp(dot(mark, UP)));
    const overIn = R * Math.asin(clamp(dot(mark, [hs, 0, 0]) / Math.max(1e-9, Math.cos(Math.asin(clamp(dot(mark, UP)))))));
    return { fromPin: surfDist(pin, mark), toPap: surfDist(mark, P), angleAtPin: outward(toMark) >= outward(mirrored) ? angle : -angle, up: upIn, over: overIn };
  }

  // core/src/flare.ts
  function deriv(w, i) {
    return [(i[1] - i[2]) * w[1] * w[2] / i[0], (i[2] - i[0]) * w[2] * w[0] / i[1], (i[0] - i[1]) * w[0] * w[1] / i[2]];
  }
  function simulateFlare(inp) {
    const { points, core } = inp;
    const rg1 = core.rg, rg2 = core.rg + Math.max(0, core.intDiff), rg3 = core.rg + Math.max(core.totalDiff, core.intDiff);
    const I = [rg1 * rg1, rg2 * rg2, rg3 * rg3];
    const notes = [];
    const speedFtS = inp.speedMph * 1.46667;
    const laneFt = inp.laneFt ?? 60;
    const T = laneFt / Math.max(1, speedFtS);
    const revPerSec = Math.max(1, inp.revRpm) / 60;
    const revs = revPerSec * T;
    const omega0 = 2 * Math.PI * revPerSec;
    const pap = unit(points.pap);
    let w = [dot(pap, points.pin) * omega0, dot(pap, points.inter) * omega0, dot(pap, points.psa) * omega0];
    const stepsPerRev = 90;
    const n = Math.max(10, Math.ceil(revs * stepsPerRev));
    const dt = T / n;
    const toBall = (v) => unit(add(add(scale(points.pin, v[0]), scale(points.inter, v[1])), scale(points.psa, v[2])));
    const path2 = [toBall(w)];
    const start = path2[0];
    const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(a, b))));
    const marks = [0.25, 0.5, 0.75, 1].map((f) => Math.round(f * n));
    const checkpoints = [];
    let maxFromStart = 0;
    const samples = [start];
    for (let k2 = 1; k2 <= n; k2++) {
      const k1 = deriv(w, I);
      const k22 = deriv([w[0] + dt / 2 * k1[0], w[1] + dt / 2 * k1[1], w[2] + dt / 2 * k1[2]], I);
      const k3 = deriv([w[0] + dt / 2 * k22[0], w[1] + dt / 2 * k22[1], w[2] + dt / 2 * k22[2]], I);
      const k4 = deriv([w[0] + dt * k3[0], w[1] + dt * k3[1], w[2] + dt * k3[2]], I);
      w = [w[0] + dt / 6 * (k1[0] + 2 * k22[0] + 2 * k3[0] + k4[0]), w[1] + dt / 6 * (k1[1] + 2 * k22[1] + 2 * k3[1] + k4[1]), w[2] + dt / 6 * (k1[2] + 2 * k22[2] + 2 * k3[2] + k4[2])];
      const p = toBall(w);
      if (k2 % 3 === 0 || k2 === n) path2.push(p);
      samples.push(p);
      maxFromStart = Math.max(maxFromStart, angle(start, p));
      if (marks.includes(k2)) {
        let span2 = 0;
        for (let a = 0; a < samples.length; a += Math.max(1, Math.floor(samples.length / 60))) for (let b = a; b < samples.length; b += Math.max(1, Math.floor(samples.length / 60))) span2 = Math.max(span2, angle(samples[a], samples[b]));
        checkpoints.push({ ft: k2 / n * laneFt, revs: k2 / n * revs, axis: p, movedDeg: angle(start, p) * 180 / Math.PI, flareIn: R * span2 });
      }
    }
    const coarse = Math.max(1, Math.floor(samples.length / 160));
    let span = 0;
    for (let a = 0; a < samples.length; a += coarse) for (let b = a + coarse; b < samples.length; b += coarse) span = Math.max(span, angle(samples[a], samples[b]));
    const lowIdx = I[2] - I[0];
    const cycleRevs = lowIdx / I[0] < 4e-3 ? null : Math.round(I[0] / (I[2] - I[0]) / Math.max(0.2, Math.abs(dot(pap, points.psa))) * 10) / 10;
    if (core.totalDiff < 4e-3) notes.push("This core has almost no differential, so there is almost no wobble to make a track flare.");
    if (Math.abs(dot(pap, points.pin)) > 0.97 || Math.abs(dot(pap, points.psa)) > 0.97 || Math.abs(dot(pap, points.inter)) > 0.97) notes.push("The PAP sits almost on one of the ball's own axes, which is the most stable place to spin: very little flare.");
    notes.push("Friction and oil aren't included, so a real shot flares differently. Compare layouts with this, don't read it as a measurement.");
    const flare30In = checkpoints[1]?.flareIn ?? 0;
    const potential30In = inp.skipPotential ? flare30In : flarePotential(core, inp.revRpm, inp.speedMph);
    const usePct = potential30In > 0 ? Math.min(1, flare30In / potential30In) : 0;
    return { path: path2, checkpoints, revs, flareIn: R * span, spanDeg: span * 180 / Math.PI, cycleRevs, flare30In, potential30In, usePct, notes };
  }
  function trackRing(axis, samples = 72) {
    const a = unit(axis);
    const ref = Math.abs(a[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = unit([a[1] * ref[2] - a[2] * ref[1], a[2] * ref[0] - a[0] * ref[2], a[0] * ref[1] - a[1] * ref[0]]);
    const v = [a[1] * u[2] - a[2] * u[1], a[2] * u[0] - a[0] * u[2], a[0] * u[1] - a[1] * u[0]];
    return Array.from({ length: samples + 1 }, (_, i) => {
      const t = 2 * Math.PI * i / samples;
      return add(scale(u, Math.cos(t)), scale(v, Math.sin(t)));
    });
  }
  var potentialCache = /* @__PURE__ */ new Map();
  function flarePotential(core, revRpm, speedMph) {
    const key = [core.rg, core.totalDiff, core.intDiff, Math.round(revRpm / 10), Math.round(speedMph * 2)].join("|");
    const hit = potentialCache.get(key);
    if (hit !== void 0) return hit;
    const axes = { pin: [1, 0, 0], inter: [0, 1, 0], psa: [0, 0, 1] };
    let best = 0;
    const N2 = 90;
    for (let i = 0; i < N2; i++) {
      const z = (i + 0.5) / N2, r = Math.sqrt(1 - z * z), a = i * Math.PI * (3 - Math.sqrt(5));
      const dir = [r * Math.cos(a), r * Math.sin(a), z];
      const f = simulateFlare({ points: { ...axes, pap: dir }, core, revRpm, speedMph, laneFt: 30, skipPotential: true });
      best = Math.max(best, f.checkpoints[f.checkpoints.length - 1]?.flareIn ?? 0);
    }
    potentialCache.set(key, best);
    return best;
  }

  // core/src/proshop.ts
  function parseInches(text) {
    const t = text.trim().toLowerCase().replace(/["”]|in(ches)?\.?$/g, "").replace(/(\d)-(?=\d)/, "$1 ").trim();
    if (!t) return null;
    const m = /^(-?)(?:(\d+(?:\.\d+)?)\s+)?(?:(\d+)\s*\/\s*(\d+)|(\d+(?:\.\d+)?))$/.exec(t) ?? /^(-?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(t);
    if (!m) return null;
    const sign = m[1] === "-" ? -1 : 1;
    if (m[3] !== void 0 && m[4] !== void 0) {
      const d = Number(m[4]);
      if (!d) return null;
      return sign * ((m[2] ? Number(m[2]) : 0) + Number(m[3]) / d);
    }
    return m[5] !== void 0 ? sign * Number(m[5]) : null;
  }
  function parsePap(text) {
    const t = text.toLowerCase();
    const over = /([\d\s./-]+?)\s*(?:in(?:ches)?\s*)?over/.exec(t);
    const up = /([\d\s./-]+?)\s*(?:in(?:ches)?\s*)?(up|down)/.exec(t.replace(/.*over[,\s]*/, ""));
    if (!over) return null;
    const o = parseInches(over[1]);
    const u = up ? parseInches(up[1]) : 0;
    if (o === null || u === null) return null;
    return { over: o, up: up && up[2] === "down" ? -u : u };
  }
  function bowlerDominance(revRpm, speedMph) {
    if (!revRpm || !speedMph) return "balanced";
    const r = revRpm / speedMph;
    return r >= 26 ? "rev" : r <= 20 ? "speed" : "balanced";
  }
  function suggestDualAngle(b, pattern, ballTotalDiff) {
    const why = [];
    const dom = bowlerDominance(b.revRpm, b.launchSpeed);
    let sum = dom === "speed" ? 75 : dom === "rev" ? 130 : 100;
    why.push(dom === "speed" ? "You're speed-dominant, so a smaller angle sum turns your speed into rotation sooner." : dom === "rev" ? "You're rev-dominant, so a larger angle sum keeps the ball from reading too early." : "Your speed and revs are balanced, so a medium angle sum fits.");
    if (b.axisTilt !== void 0) {
      const d = b.axisTilt >= 16 ? -10 : b.axisTilt <= 8 ? 10 : 0;
      sum += d;
      if (d) why.push(b.axisTilt >= 16 ? "Your axis tilt is high, which points to a smaller sum." : "Your axis tilt is low, which points to a larger sum.");
    }
    let useFlare = 0.5;
    if (pattern) {
      if (pattern.lengthFt >= 42) {
        sum -= 15;
        useFlare += 0.15;
        why.push(`${pattern.lengthFt} ft is a long pattern: a smaller sum and more flare to get the ball reading.`);
      } else if (pattern.lengthFt <= 37) {
        sum += 15;
        useFlare -= 0.15;
        why.push(`${pattern.lengthFt} ft is short: a larger sum and less flare keep it from hooking early.`);
      }
      if (pattern.volumeMl !== void 0) {
        const vd = pattern.volumeMl >= 26 ? 1 : pattern.volumeMl <= 22 ? -1 : 0;
        sum -= 8 * vd;
        useFlare += 0.1 * vd;
        if (vd) why.push(vd > 0 ? "A lot of oil: friction is what you need, so more flare and a smaller sum." : "Not much oil: less flare and a larger sum.");
      }
    }
    if (dom === "rev") useFlare -= 0.1;
    if (dom === "speed") useFlare += 0.1;
    sum = Math.max(30, Math.min(160, Math.round(sum / 5) * 5));
    const valAngle = Math.max(20, Math.min(70, Math.round(sum * 0.45 / 5) * 5));
    const drilling = Math.max(10, Math.min(90, sum - valAngle));
    useFlare = Math.max(0.1, Math.min(0.95, useFlare));
    const pinToPap = Math.round((2.5 + useFlare * 3.25) * 8) / 8;
    if (ballTotalDiff !== void 0 && ballTotalDiff >= 0.055) why.push("This ball has a high differential already, so there is room to use less of its flare potential if it reads too early.");
    return { drilling, pinToPap, valAngle, sumRange: [Math.max(30, sum - 15), Math.min(160, sum + 15)], why };
  }
  function buildPlaybook(p) {
    const dom = bowlerDominance(p.revRpm, p.speedMph);
    const sections = [];
    const styleName = p.style === "two-handed" ? "two-handed" : p.style === "one-hand-no-thumb" ? "one-handed, no thumb" : "one-handed with a thumb";
    const know = [];
    know.push(`Tell them you're ${styleName} and bowl ${p.hand === "R" ? "right" : "left"}-handed. It changes how the grip is cut${p.style === "two-handed" ? " (no thumb hole, and the fingers and the grip are set for a two-handed release)" : p.style === "one-hand-no-thumb" ? " (no thumb hole: the bridge sets the span instead)" : ""}.`);
    know.push(p.revRpm ? `Your rev rate: ${p.revRpm} RPM${p.revSource === "measured" || p.revSource === "entered" ? "" : " (an estimate from your quiz answers, not a measurement)"}.${p.revSource === "measured" || p.revSource === "entered" ? "" : " Ask for it to be measured, or enter your real number in the app."}` : "Your rev rate isn't known. Ask them to measure it: it drives almost every choice.");
    know.push(p.speedMph ? `Your ball speed: about ${p.speedMph.toFixed(1)} mph, measured by the camera.` : "Your ball speed isn't known yet. Use the camera for a few shots first.");
    know.push(p.axisRotation !== void 0 && p.axisTilt !== void 0 ? `Your axis: ${Math.round(p.axisRotation)}\xB0 rotation and ${Math.round(p.axisTilt)}\xB0 tilt.` : "Axis rotation and tilt aren't known. A good shop can measure them (or at least find your PAP) before drilling a ball for you.");
    know.push(p.pap ? `Your PAP: ${p.pap}.` : "Your PAP isn't on file. Ask for a PAP measurement (the positive axis point), which is where your ball's spin axis sits. Layouts are built around it.");
    sections.push({ title: "Know these before you walk in", items: know });
    const ask = [];
    ask.push('"What layout are you drilling, and why that one for me?" You should get three numbers (such as drilling angle, pin to PAP, and angle to the VAL), and a reason in terms of your speed, revs, tilt and the lanes you bowl.');
    ask.push(`"How much of this ball's flare potential will this layout use?" The pin-to-PAP distance controls it. A good driller can answer.`);
    ask.push(dom === "rev" ? `"I'm rev-dominant. Will this layout keep the ball from reading the lane too early?" Rev-dominant bowlers usually want a larger sum of drilling angle and angle to the VAL.` : dom === "speed" ? `"I'm speed-dominant. Will this layout get the ball rolling soon enough?" Speed-dominant bowlers usually want a smaller angle sum so the ball turns speed into rotation sooner.` : '"My speed and revs are balanced. Is a medium layout the right starting point?"');
    if (p.pattern) ask.push(`"I bowl on ${p.pattern.name} (${p.pattern.lengthFt} ft${p.pattern.volumeMl ? `, ${p.pattern.volumeMl} mL` : ""}). Does this ball and layout fit those lanes?" Patterns that are longer or have more oil call for earlier-reading layouts.`);
    ask.push('"What surface is it coming with, and what would you change for dry or oily lanes?" The surface (a polish or a sanded finish) matters as much as the layout.');
    if (p.coverageScore !== null && p.coverageScore < 80) ask.push(`"My arsenal doesn't cover everything. What's the biggest gap?" (The app scored your arsenal ${p.coverageScore} out of 100. See the Arsenal optimizer for what it found.)`);
    if (!p.hasSpare) ask.push('"Can you drill me a plastic spare ball?" Your strike balls will hook too much on spares.');
    if ((p.issues ?? []).some((i) => /speed/i.test(i))) ask.push(`"My speed is inconsistent. Does that change what you'd recommend?" Ball choice is only as good as the speed you can repeat.`);
    ask.push('"Can you show me the layout on the ball before you drill?" A good driller will mark it and explain it. You can use the Layout Lab to see it first.');
    sections.push({ title: "Questions to ask the pro shop", items: ask });
    const fit = [
      "Your hand is measured, not guessed: span, the fit of each hole, and pitch. A bad fit makes every ball worse.",
      p.style === "two-handed" ? "For two-handed bowling, the fingers and the grip are matched to your release. The hand you keep under the ball matters." : p.style === "one-hand-no-thumb" ? "With no thumb hole the grip is set from the bridge and finger holes, so the shop should watch how you hold and release the ball." : "The thumb should come out clean and the fingers should hold without squeezing. If you grip hard, tell them.",
      "Your PAP is found by watching you roll the ball, by a tool, or from your tracks. Do it before drilling your first custom ball.",
      p.hasFit ? "You've saved your hand measurements in the app, so you can show them to any shop." : "Write your span and hole sizes down after the fitting (the app can store them in the Layout Lab)."
    ];
    sections.push({ title: "What a good fitting includes", items: fit });
    const look = [];
    if (p.revRpm !== void 0) look.push(p.revRpm >= 450 ? "High revs: you create a lot of hook on your own. Look for a cleaner ball (lower differential, higher RG) or a layout with less flare, so you can keep it under control." : p.revRpm <= 300 ? "Lower revs: look for balls that help you read the lane, with a lower RG, a higher differential, or a stronger layout." : "Medium revs: you can use most balls, and layout is how you tune them.");
    if (p.speedMph !== void 0) look.push(p.speedMph >= 18 ? "Faster than most: you need balls that grab sooner. Higher-friction covers help a lot." : p.speedMph <= 14.5 ? "Slower than most: you'll hook easily. A cleaner ball keeps it from going too early." : "Typical speed: nothing unusual to correct for.");
    look.push(p.strikeBalls === 0 ? "You don't have a strike ball yet. Start with one that suits the lanes you bowl most." : p.strikeBalls < 3 ? "You have a small arsenal. Add balls that cover conditions you don't yet (a stronger one for heavy oil, a cleaner one for dry lanes)." : "You have a working arsenal. Add balls to fill gaps, not to repeat what you have.");
    look.push("Ask the shop for balls released recently and still sold. Older and retired balls can be fine used, but check the price against a new one.");
    sections.push({ title: "What to look for in your next ball", items: look });
    const warn = [
      "A big flare does not mean a better ball. It means more friction, which helps on heavy oil and hurts on dry lanes.",
      "A ball that reads strong on paper can still feel weak or strong depending on your layout and surface.",
      "Don't let anyone drill a ball without asking about your PAP, your speed and your revs.",
      "If a ball doesn't match what you were told after a few games, tell the shop. Surface changes are quick and cheap."
    ];
    sections.push({ title: "Things to watch for", items: warn });
    return sections;
  }

  // core/src/ballscan.ts
  function fitCircle(pts) {
    if (pts.length < 3) return null;
    let sx = 0, sy = 0;
    for (const p of pts) sx += p.x, sy += p.y;
    const mx = sx / pts.length, my = sy / pts.length;
    let suu = 0, svv = 0, suv = 0, suuu = 0, svvv = 0, suvv = 0, svuu = 0;
    for (const p of pts) {
      const u = p.x - mx, v = p.y - my;
      suu += u * u;
      svv += v * v;
      suv += u * v;
      suuu += u * u * u;
      svvv += v * v * v;
      suvv += u * v * v;
      svuu += v * u * u;
    }
    const det = suu * svv - suv * suv;
    if (Math.abs(det) < 1e-9) return null;
    const uc = (0.5 * (suuu + suvv) * svv - 0.5 * (svvv + svuu) * suv) / det;
    const vc = (0.5 * (svvv + svuu) * suu - 0.5 * (suuu + suvv) * suv) / det;
    const r = Math.sqrt(uc * uc + vc * vc + (suu + svv) / pts.length);
    return { x: uc + mx, y: vc + my, r };
  }
  function rng(seed) {
    let s = seed || 1;
    return () => (s = s * 16807 % 2147483647) / 2147483647;
  }
  function shrink(gray, w, h, maxW) {
    const k2 = Math.max(1, Math.floor(w / maxW));
    const nw = Math.floor(w / k2), nh = Math.floor(h / k2);
    const out = new Float32Array(nw * nh);
    for (let y = 0; y < nh; y++)
      for (let x = 0; x < nw; x++) {
        let s = 0;
        for (let j = 0; j < k2; j++) for (let i = 0; i < k2; i++) s += gray[(y * k2 + j) * w + x * k2 + i];
        out[y * nw + x] = s / (k2 * k2);
      }
    return { g: out, w: nw, h: nh, k: k2 };
  }
  function detectBall(gray, w, h, hint = {}) {
    const { g, w: sw, h: sh, k: k2 } = shrink(gray, w, h, 360);
    const gx = new Float32Array(sw * sh), gy = new Float32Array(sw * sh), mag = new Float32Array(sw * sh);
    for (let y = 1; y < sh - 1; y++)
      for (let x = 1; x < sw - 1; x++) {
        const i = y * sw + x;
        gx[i] = g[i + 1] - g[i - 1];
        gy[i] = g[i + sw] - g[i - sw];
        mag[i] = Math.hypot(gx[i], gy[i]);
      }
    const sorted = Float32Array.from(mag).sort();
    const thr = Math.max(12, sorted[Math.floor(sorted.length * 0.94)]);
    const edges = [];
    for (let i = 0; i < mag.length; i++) if (mag[i] >= thr) edges.push(i);
    if (edges.length < 60) return null;
    const rand = rng(12345);
    const minR = hint.minR !== void 0 ? hint.minR / k2 : Math.min(sw, sh) * 0.15;
    const maxR = hint.maxR !== void 0 ? hint.maxR / k2 : Math.min(sw, sh) * 0.52;
    const inside = (hint.contain ?? []).map((p) => ({ x: p.x / k2, y: p.y / k2 }));
    const tol = Math.max(1.8, Math.min(sw, sh) * 0.012);
    let best = null;
    const pt = (i) => ({ x: i % sw, y: Math.floor(i / sw) });
    for (let it = 0; it < (inside.length ? 4e3 : 900); it++) {
      const a = pt(edges[Math.floor(rand() * edges.length)]), b = pt(edges[Math.floor(rand() * edges.length)]), c = pt(edges[Math.floor(rand() * edges.length)]);
      const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
      if (Math.abs(d) < 1e-6) continue;
      const ux = ((a.x * a.x + a.y * a.y) * (b.y - c.y) + (b.x * b.x + b.y * b.y) * (c.y - a.y) + (c.x * c.x + c.y * c.y) * (a.y - b.y)) / d;
      const uy = ((a.x * a.x + a.y * a.y) * (c.x - b.x) + (b.x * b.x + b.y * b.y) * (a.x - c.x) + (c.x * c.x + c.y * c.y) * (b.x - a.x)) / d;
      const r = Math.hypot(a.x - ux, a.y - uy);
      if (r < minR || r > maxR) continue;
      if (inside.some((q) => Math.hypot(q.x - ux, q.y - uy) > r * 0.85)) continue;
      if (inside.length && Math.hypot(inside.reduce((a2, q) => a2 + q.x, 0) / inside.length - ux, inside.reduce((a2, q) => a2 + q.y, 0) / inside.length - uy) > r * 0.5) continue;
      let n = 0;
      const bins2 = new Uint8Array(24);
      for (let q = 0; q < edges.length; q += 2) {
        const p = pt(edges[q]);
        const dist = Math.hypot(p.x - ux, p.y - uy);
        if (Math.abs(dist - r) > tol) continue;
        const rx = (p.x - ux) / (dist || 1), ry = (p.y - uy) / (dist || 1);
        const m = mag[edges[q]] || 1;
        if (Math.abs((gx[edges[q]] * rx + gy[edges[q]] * ry) / m) > 0.8) {
          n++;
          bins2[Math.min(23, Math.floor((Math.atan2(ry, rx) + Math.PI) / (2 * Math.PI) * 24))] = 1;
        }
      }
      const coverage = bins2.reduce((a2, b2) => a2 + b2, 0) / 24;
      const score = n * (0.4 + coverage);
      if (!best || score > best.n) best = { c: { x: ux, y: uy, r }, n: score };
    }
    if (!best || best.n < Math.max(25, 0.6 * 2 * Math.PI * best.c.r / 4)) return null;
    const inl = [];
    for (const e of edges) {
      const p = pt(e);
      if (Math.abs(Math.hypot(p.x - best.c.x, p.y - best.c.y) - best.c.r) <= tol) inl.push(p);
    }
    const f = fitCircle(inl) ?? best.c;
    return { x: (f.x + 0.5) * k2, y: (f.y + 0.5) * k2, r: f.r * k2 };
  }
  function detectHoles(gray, w, h, ball) {
    const { g, w: sw, h: sh, k: k2 } = shrink(gray, w, h, 420);
    const c = { x: ball.x / k2, y: ball.y / k2, r: ball.r / k2 };
    const rad2 = Math.max(3, Math.round(c.r / 5));
    const integral = new Float64Array((sw + 1) * (sh + 1));
    for (let y = 0; y < sh; y++) {
      let row = 0;
      for (let x = 0; x < sw; x++) {
        row += g[y * sw + x];
        integral[(y + 1) * (sw + 1) + x + 1] = integral[y * (sw + 1) + x + 1] + row;
      }
    }
    const box = (x, y) => {
      const x0 = Math.max(0, x - rad2), x1 = Math.min(sw, x + rad2 + 1), y0 = Math.max(0, y - rad2), y1 = Math.min(sh, y + rad2 + 1);
      return (integral[y1 * (sw + 1) + x1] - integral[y0 * (sw + 1) + x1] - integral[y1 * (sw + 1) + x0] + integral[y0 * (sw + 1) + x0]) / ((x1 - x0) * (y1 - y0));
    };
    const dark = new Float32Array(sw * sh);
    const vals = [];
    for (let y = 0; y < sh; y++)
      for (let x = 0; x < sw; x++) {
        if (Math.hypot(x - c.x, y - c.y) > c.r * 0.9) continue;
        const d = box(x, y) - g[y * sw + x];
        dark[y * sw + x] = d;
        vals.push(d);
      }
    if (vals.length < 50) return [];
    vals.sort((a, b) => a - b);
    const t = Math.max(14, vals[Math.floor(vals.length * 0.97)] * 0.55);
    const seen = new Uint8Array(sw * sh);
    const blobs = [];
    for (let s = 0; s < sw * sh; s++) {
      if (seen[s] || dark[s] < t) continue;
      const stack = [s];
      seen[s] = 1;
      let n = 0, sx = 0, sy = 0, x0 = sw, x1 = 0, y0 = sh, y1 = 0, dsum = 0;
      while (stack.length) {
        const i = stack.pop();
        const x = i % sw, y = Math.floor(i / sw);
        n++;
        sx += x;
        sy += y;
        dsum += dark[i];
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        for (const j of [i - 1, i + 1, i - sw, i + sw]) if (j >= 0 && j < sw * sh && !seen[j] && dark[j] >= t) seen[j] = 1, stack.push(j);
      }
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      const rEq = Math.sqrt(n / Math.PI);
      const fill = n / (bw * bh);
      const aspect = bw / bh;
      if (rEq < c.r * 0.045 || rEq > c.r * 0.22) continue;
      if (fill < 0.55 || aspect < 0.45 || aspect > 2.2) continue;
      blobs.push({ x: (sx / n + 0.5) * k2, y: (sy / n + 0.5) * k2, r: rEq * k2, contrast: dsum / n });
    }
    return blobs.sort((a, b) => b.contrast * b.r - a.contrast * a.r).slice(0, 8);
  }
  var traceCache = null;
  function traceBall(gray, w, h, c0, r0, spread = 0.2, rgb, scoreOut) {
    const cacheHit = traceCache && traceCache.gray === gray && traceCache.rgb === rgb && traceCache.w === w && traceCache.h === h ? traceCache : null;
    const { g, w: sw, h: sh, k: k2 } = cacheHit ? cacheHit.shrunk : shrink(gray, w, h, 300);
    const cx = c0.x / k2, cy = c0.y / k2, R0 = r0 / k2;
    let fgScore = cacheHit ? cacheHit.fgScore : null;
    if (rgb && !cacheHit) {
      const px = (x, y) => {
        const i = (Math.min(h - 1, Math.round(y * k2)) * w + Math.min(w - 1, Math.round(x * k2))) * 3;
        return [rgb[i], rgb[i + 1], rgb[i + 2]];
      };
      const sample2 = (pred) => {
        const out = [];
        for (let y = 0; y < sh; y += 2) for (let x = 0; x < sw; x += 2) if (pred(Math.hypot(x - cx, y - cy))) out.push(px(x, y));
        return out;
      };
      const kmeans = (pts2, kc) => {
        if (pts2.length < kc) return pts2;
        let cs = Array.from({ length: kc }, (_, i) => pts2[Math.floor((i + 0.5) * (pts2.length / kc))]);
        for (let it = 0; it < 6; it++) {
          const sum = cs.map(() => [0, 0, 0, 0]);
          for (const p of pts2) {
            let bi = 0, bd = 1e9;
            cs.forEach((c, i) => {
              const d = (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2 + (c[2] - p[2]) ** 2;
              if (d < bd) bd = d, bi = i;
            });
            sum[bi][0] += p[0];
            sum[bi][1] += p[1];
            sum[bi][2] += p[2];
            sum[bi][3]++;
          }
          cs = cs.map((c, i) => sum[i][3] ? [sum[i][0] / sum[i][3], sum[i][1] / sum[i][3], sum[i][2] / sum[i][3]] : c);
        }
        return cs;
      };
      const fg = kmeans(sample2((d) => d < R0 * 0.45), 4);
      const bg2 = kmeans(sample2((d) => d > R0 * 1.55), 5);
      if (fg.length && bg2.length) {
        fgScore = new Float32Array(sw * sh);
        const near = (cs, p) => Math.sqrt(Math.min(...cs.map((c) => (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2 + (c[2] - p[2]) ** 2)));
        for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
          const p = px(x, y);
          fgScore[y * sw + x] = near(bg2, p) - near(fg, p);
        }
      }
      traceCache = { gray, rgb, w, h, shrunk: { g, w: sw, h: sh, k: k2 }, fgScore };
    }
    const sm = new Float32Array(sw * sh);
    for (let y = 1; y < sh - 1; y++) for (let x = 1; x < sw - 1; x++) sm[y * sw + x] = (4 * g[y * sw + x] + g[y * sw + x - 1] + g[y * sw + x + 1] + g[(y - 1) * sw + x] + g[(y + 1) * sw + x]) / 8;
    const at = (x, y) => {
      const xi = Math.max(1, Math.min(sw - 2, Math.round(x))), yi = Math.max(1, Math.min(sh - 2, Math.round(y)));
      return sm[yi * sw + xi];
    };
    const fgAt = (x, y) => fgScore ? fgScore[Math.max(0, Math.min(sh - 1, Math.round(y))) * sw + Math.max(0, Math.min(sw - 1, Math.round(x)))] : 0;
    const NA = 120;
    const rMin = Math.max(6, Math.floor(R0 * (1 - spread))), rMax = Math.ceil(R0 * (1 + spread));
    const NR = rMax - rMin + 1;
    const edge = [];
    for (let a = 0; a < NA; a++) {
      const th = a / NA * 2 * Math.PI, ux = Math.cos(th), uy = Math.sin(th);
      const row = new Float32Array(NR);
      for (let ri = 0; ri < NR; ri++) {
        const r = rMin + ri;
        const x = cx + ux * r, y = cy + uy * r;
        if (x < 2 || y < 2 || x > sw - 3 || y > sh - 3) {
          row[ri] = 0;
          continue;
        }
        const inner = (at(x - ux * 2, y - uy * 2) + at(x - ux * 3, y - uy * 3)) / 2, outer = (at(x + ux * 2, y + uy * 2) + at(x + ux * 3, y + uy * 3)) / 2;
        row[ri] = Math.abs(outer - inner);
        if (fgScore) {
          const fin = (fgAt(x - ux * 3, y - uy * 3) + fgAt(x - ux * 5, y - uy * 5)) / 2, fout = (fgAt(x + ux * 3, y + uy * 3) + fgAt(x + ux * 5, y + uy * 5)) / 2;
          row[ri] = 0.35 * row[ri] + 0.65 * Math.max(0, fin - fout);
        }
      }
      edge.push(row);
    }
    const lambda = 1.2;
    const best = (startRi) => {
      let prev = new Float32Array(NR).fill(-1e9);
      prev[startRi] = edge[0][startRi];
      const back = [];
      for (let a = 1; a <= NA; a++) {
        const cur = new Float32Array(NR).fill(-1e9);
        const bp = new Int16Array(NR);
        const row = edge[a % NA];
        for (let ri2 = 0; ri2 < NR; ri2++) {
          let bv = -1e9, bi = ri2;
          for (let d = -3; d <= 3; d++) {
            const j = ri2 + d;
            if (j < 0 || j >= NR) continue;
            const v = prev[j] - lambda * Math.abs(d) * 2;
            if (v > bv) bv = v, bi = j;
          }
          cur[ri2] = bv + row[ri2];
          bp[ri2] = bi;
        }
        back.push(bp);
        prev = cur;
      }
      let ri = startRi;
      const path2 = new Array(NA);
      let score = prev[startRi];
      for (let a = NA; a >= 1; a--) {
        path2[a % NA] = ri;
        ri = back[a - 1][ri];
      }
      return { path: path2, score };
    };
    const starts = [...edge[0].keys()].sort((p, q) => edge[0][q] - edge[0][p]).filter((v, i, arr) => arr.slice(0, i).every((u) => Math.abs(u - v) > 6)).slice(0, 4);
    let top = null;
    for (const s of starts) {
      const b = best(s);
      if (!top || b.score > top.score) top = b;
    }
    if (!top) return null;
    if (scoreOut) scoreOut.score = top.score / NA;
    const pts = top.path.map((ri, a) => ({ x: cx + Math.cos(a / NA * 2 * Math.PI) * (rMin + ri), y: cy + Math.sin(a / NA * 2 * Math.PI) * (rMin + ri) }));
    let fit = fitCircle(pts);
    for (let round = 0; round < 4 && fit; round++) {
      const f = fit;
      const keep = pts.filter((p) => Math.abs(Math.hypot(p.x - f.x, p.y - f.y) - f.r) < f.r * 0.04);
      if (keep.length < 25) break;
      fit = fitCircle(keep) ?? fit;
    }
    if (!fit || fit.r < R0 * (1 - spread * 1.3) || fit.r > R0 * (1 + spread * 1.3)) return null;
    return { x: (fit.x + 0.5) * k2, y: (fit.y + 0.5) * k2, r: fit.r * k2 };
  }
  function findBalls(gray, w, h, holesMid, rGuess, rgb, count = 3) {
    const found = [];
    for (const sizeK of [0.88, 1, 1.12])
      for (let iy = -2; iy <= 2; iy++)
        for (let ix = -2; ix <= 2; ix++) {
          const out = { score: 0 };
          const c = traceBall(gray, w, h, { x: holesMid.x + ix * rGuess * 0.14, y: holesMid.y + iy * rGuess * 0.14 }, rGuess * sizeK, 0.12, rgb, out);
          if (c) found.push({ c, score: out.score });
        }
    found.sort((a, b) => b.score - a.score);
    const picks = [];
    for (const f of found) {
      if (picks.every((p) => Math.hypot(p.x - f.c.x, p.y - f.c.y) > f.c.r * 0.22 || Math.abs(p.r - f.c.r) > f.c.r * 0.18)) {
        const again = traceBall(gray, w, h, f.c, f.c.r, 0.08, rgb);
        picks.push(again ?? f.c);
      }
      if (picks.length >= count) break;
    }
    return picks;
  }
  function detectDots(rgb, w, h, ball, avoid = [], avoidR = 0) {
    const k2 = Math.max(1, Math.floor(w / 640));
    const sw = Math.floor(w / k2), sh = Math.floor(h / k2);
    const c = { x: ball.x / k2, y: ball.y / k2, r: ball.r / k2 };
    const ch = [new Float32Array(sw * sh), new Float32Array(sw * sh), new Float32Array(sw * sh)];
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) for (let j = 0; j < 3; j++) ch[j][y * sw + x] = rgb[(y * k2 * w + x * k2) * 3 + j];
    const rad2 = Math.max(4, Math.round(c.r / 9));
    const integ = ch.map((a) => {
      const I = new Float64Array((sw + 1) * (sh + 1));
      for (let y = 0; y < sh; y++) {
        let row = 0;
        for (let x = 0; x < sw; x++) {
          row += a[y * sw + x];
          I[(y + 1) * (sw + 1) + x + 1] = I[y * (sw + 1) + x + 1] + row;
        }
      }
      return I;
    });
    const mean3 = (j, x, y) => {
      const x0 = Math.max(0, x - rad2), x1 = Math.min(sw, x + rad2 + 1), y0 = Math.max(0, y - rad2), y1 = Math.min(sh, y + rad2 + 1);
      const I = integ[j];
      return (I[y1 * (sw + 1) + x1] - I[y0 * (sw + 1) + x1] - I[y1 * (sw + 1) + x0] + I[y0 * (sw + 1) + x0]) / ((x1 - x0) * (y1 - y0));
    };
    const clear = (avoidR || ball.r * 0.2) * 1 / k2;
    const nearAvoid = (x, y) => avoid.some((q) => Math.hypot(q.x / k2 - x, q.y / k2 - y) < clear);
    const dist = new Float32Array(sw * sh);
    const sat = new Float32Array(sw * sh);
    const vals = [];
    for (let y = 0; y < sh; y++)
      for (let x = 0; x < sw; x++) {
        if (Math.hypot(x - c.x, y - c.y) > c.r * 0.9 || nearAvoid(x, y)) continue;
        const i = y * sw + x;
        const d = Math.hypot(ch[0][i] - mean3(0, x, y), ch[1][i] - mean3(1, x, y), ch[2][i] - mean3(2, x, y));
        dist[i] = d;
        const mx = Math.max(ch[0][i], ch[1][i], ch[2][i]), mn = Math.min(ch[0][i], ch[1][i], ch[2][i]);
        sat[i] = mx ? (mx - mn) / mx : 0;
        vals.push(d);
      }
    if (vals.length < 50) return [];
    vals.sort((a, b) => a - b);
    const t = Math.min(70, Math.max(40, vals[Math.floor(vals.length * 0.995)] * 0.5));
    const seen = new Uint8Array(sw * sh);
    const out = [];
    for (let s = 0; s < sw * sh; s++) {
      if (seen[s] || dist[s] < t) continue;
      const stack = [s];
      seen[s] = 1;
      let n = 0, sx = 0, sy = 0, x0 = sw, x1 = 0, y0 = sh, y1 = 0, dsum = 0, ssum = 0;
      while (stack.length) {
        const i = stack.pop();
        const x = i % sw, y = Math.floor(i / sw);
        n++;
        sx += x;
        sy += y;
        dsum += dist[i];
        ssum += sat[i];
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        for (const j of [i - 1, i + 1, i - sw, i + sw]) if (j >= 0 && j < sw * sh && !seen[j] && dist[j] >= t) seen[j] = 1, stack.push(j);
      }
      const coreContrast = dsum / n;
      {
        const mc = [0, 1, 2].map((j) => ch[j][Math.round(sy / n) * sw + Math.round(sx / n)]);
        const cap = Math.PI * (c.r * 0.13) ** 2;
        const grown = new Uint8Array(sw * sh);
        const q = [];
        for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
          const i = yy * sw + xx;
          if (seen[i] && dist[i] >= t) grown[i] = 1, q.push(i);
        }
        let gn = 0, gx = 0, gy = 0, gx0 = sw, gx1 = 0, gy0 = sh, gy1 = 0, gs = 0;
        while (q.length && gn < cap * 1.2) {
          const i = q.pop();
          const x = i % sw, y = Math.floor(i / sw);
          gn++;
          gx += x;
          gy += y;
          gs += sat[i] || 0;
          if (x < gx0) gx0 = x;
          if (x > gx1) gx1 = x;
          if (y < gy0) gy0 = y;
          if (y > gy1) gy1 = y;
          for (const j of [i - 1, i + 1, i - sw, i + sw]) {
            if (j < 0 || j >= sw * sh || grown[j]) continue;
            if (Math.hypot(ch[0][j] - mc[0], ch[1][j] - mc[1], ch[2][j] - mc[2]) < 60) grown[j] = 1, q.push(j);
          }
        }
        if (gn > n && gn < cap * 1.2) {
          for (let yy = gy0; yy <= gy1; yy++) for (let xx = gx0; xx <= gx1; xx++) if (grown[yy * sw + xx]) seen[yy * sw + xx] = 1;
          n = gn;
          sx = gx;
          sy = gy;
          x0 = gx0;
          x1 = gx1;
          y0 = gy0;
          y1 = gy1;
          ssum = Math.max(ssum, gs);
        }
      }
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      const rEq = Math.sqrt(n / Math.PI);
      if (rEq < c.r * 0.02 || rEq > c.r * 0.11) continue;
      if (n / (bw * bh) < 0.55 || bw / bh < 0.5 || bw / bh > 2) continue;
      if (ssum / n < 0.25) continue;
      out.push({ x: (sx / n + 0.5) * k2, y: (sy / n + 0.5) * k2, r: rEq * k2, contrast: coreContrast });
    }
    return out.sort((a, b) => b.contrast * Math.sqrt(b.r) - a.contrast * Math.sqrt(a.r)).slice(0, 6);
  }
  function pickGrip(blobs, ball, noThumb) {
    let best = null;
    for (let i = 0; i < blobs.length; i++)
      for (let j = i + 1; j < blobs.length; j++) {
        const a = blobs[i], b = blobs[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y) / ball.r;
        if (d < 0.12 || d > 0.5) continue;
        const same = 1 - Math.abs(a.r - b.r) / Math.max(a.r, b.r);
        if (same < 0.6) continue;
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (noThumb) {
          const s = same + (a.contrast + b.contrast) / 400;
          if (!best || s > best.score) best = { thumb: null, fingers: [a, b], score: s };
          continue;
        }
        for (const t of blobs) {
          if (t === a || t === b) continue;
          const dt = Math.hypot(t.x - mid.x, t.y - mid.y) / ball.r;
          if (dt < 0.7 || dt > 1.35) continue;
          const ax = mid.x - ball.x, ay = mid.y - ball.y, tx = t.x - ball.x, ty = t.y - ball.y;
          const opposite = -(ax * tx + ay * ty) / (Math.hypot(ax, ay) * Math.hypot(tx, ty) || 1);
          const s = same + (a.contrast + b.contrast + t.contrast) / 600 + 0.3 * opposite - Math.abs(dt - 1.05);
          if (!best || s > best.score) best = { thumb: t, fingers: [a, b], score: s };
        }
      }
    return best ? { thumb: best.thumb, fingers: best.fingers } : null;
  }
  function toSphere(p, c) {
    const x = (p.x - c.x) / c.r, y = (c.y - p.y) / c.r;
    const rr = x * x + y * y;
    if (rr >= 0.9999) {
      const n = Math.sqrt(rr);
      return [x / n, y / n, 0];
    }
    return [x, y, Math.sqrt(1 - rr)];
  }
  function scanFrame(inp) {
    const S2 = (p) => toSphere(p, inp.circle);
    const fa = S2(inp.fingerA), fb = S2(inp.fingerB);
    const F = unit([fa[0] + fb[0], fa[1] + fb[1], fa[2] + fb[2]]);
    const T = inp.thumb ? S2(inp.thumb) : null;
    const G = T ? unit([F[0] + T[0], F[1] + T[1], F[2] + T[2]]) : F;
    const up = T ? tangentToward(G, F) : tangentToward(G, [0, 1, 0]);
    return { ex: cross(up, G), up, g: G };
  }
  function layoutFromScan(inp) {
    const warnings = [];
    const S2 = (p) => toSphere(p, inp.circle);
    const T = inp.thumb ? S2(inp.thumb) : null;
    const F = unit([S2(inp.fingerA)[0] + S2(inp.fingerB)[0], S2(inp.fingerA)[1] + S2(inp.fingerB)[1], S2(inp.fingerA)[2] + S2(inp.fingerB)[2]]);
    const { ex: e_x, up, g: G } = scanFrame(inp);
    const map = (v) => [dot(v, e_x), dot(v, up), dot(v, G)];
    const pinCam = S2(inp.pin);
    const refPt = inp.asymmetric ? inp.mb ?? inp.cg ?? inp.baseline ?? null : inp.cg ?? inp.baseline ?? null;
    const reference = !refPt ? null : inp.asymmetric && inp.mb && refPt === inp.mb ? "mb" : "cg";
    const baseCam = refPt ? S2(refPt) : null;
    const measured = measureLayout(map(pinCam), baseCam ? map(baseCam) : null, inp.pap, inp.hand, inp.grip ?? DEFAULT_GRIP);
    if (inp.asymmetric && !inp.mb && refPt) warnings.push("This ball has a mass bias, but it isn't placed, so I measured from the CG instead. Place the mass bias dot for the right drilling angle.");
    const pinToCg = inp.cg ? surfDist(map(pinCam), map(S2(inp.cg))) : null;
    const pinToMb = inp.asymmetric && inp.mb ? surfDist(map(pinCam), map(S2(inp.mb))) : null;
    const near = (p) => Math.hypot(p.x - inp.circle.x, p.y - inp.circle.y) / inp.circle.r > 0.82;
    if (near(inp.pin) || refPt && near(refPt)) warnings.push("The pin or the CG / mass bias is near the edge of the ball in the picture, where distances are squeezed. Turn the ball so it is closer to the middle and scan again.");
    if (near(inp.fingerA) || near(inp.fingerB) || inp.thumb && near(inp.thumb)) warnings.push("A grip hole is near the edge of the ball in the picture. Turn the ball so the grip faces the camera.");
    if (measured.drilling !== null && Math.abs(measured.drilling) > 95) warnings.push(`The drilling angle reads ${Math.round(Math.abs(measured.drilling))}\xB0, which is past the usual 10-90\xB0. The CG or mass bias dot may be on the other side of the pin, or the pin may be in the wrong spot. Check where you tapped.`);
    if (Math.abs(measured.valAngle) > 90) warnings.push("The pin is below the PAP, which is unusual. Check the PAP (over and up) and where the pin is.");
    if (measured.pinToPap < 0.5 || measured.pinToPap > 7) warnings.push("The pin to PAP distance looks off. Check the PAP numbers and where you placed the pin.");
    const sphereDist = (a, b) => surfDist(a, b);
    let spanIn = null;
    if (T) {
      const px = (r) => r === void 0 ? null : r / inp.circle.r * R;
      const thumbR = px(inp.holeRadii?.thumb) ?? 0.5, fingerR = px(inp.holeRadii?.finger) ?? 0.45;
      spanIn = Math.max(0, sphereDist(T, F) - thumbR - fingerR);
    }
    void scale;
    void sub;
    const grp = inp.grip ?? DEFAULT_GRIP;
    const cg = inp.cg ? measureMark(map(pinCam), map(S2(inp.cg)), inp.pap, inp.hand, grp) : null;
    const mb = inp.asymmetric && inp.mb ? measureMark(map(pinCam), map(S2(inp.mb)), inp.pap, inp.hand, grp) : null;
    return { measured, spanIn, reference, pinToCg, pinToMb, cg, mb, warnings };
  }

  // camera/ballscan.ts
  var KINDS = [
    { id: "thumb", label: "One hand, with a thumb", blurb: "a thumb hole and two finger holes" },
    { id: "nothumb", label: "One hand, no thumb", blurb: "two finger holes, no thumb hole" },
    { id: "two", label: "Two-handed", blurb: "two finger holes, no thumb hole" }
  ];
  var LABEL = { thumb: "Thumb hole", fingerA: "Finger hole 1", fingerB: "Finger hole 2", pin: "Pin", cg: "CG", mb: "Mass bias" };
  var COLOR = { thumb: "#ffffff", fingerA: "#ff4fd8", fingerB: "#ff4fd8", pin: "#46e6ff", cg: "#ffd25a", mb: "#ff8a3d" };
  var st = null;
  var kindPicked = null;
  var drag = null;
  var sheet = () => $("layoutscan");
  var close = () => (sheet().classList.remove("on"), sheet().innerHTML = "", st = null);
  var MAX_W = 960;
  function openBallScan() {
    const el = sheet();
    el.classList.add("on");
    const bp = bowlerProfile();
    const mine = bp.style === "two-handed" ? "two" : bp.style === "one-hand-no-thumb" ? "nothumb" : "thumb";
    kindPicked = null;
    el.innerHTML = `
    <div class="row"><h2>Scan my ball</h2><button class="btn ghost" id="bs-close">Close</button></div>
    <div class="note">First, what kind of grip is drilled in this ball? It tells me which holes to look for.</div>
    <div class="card">${KINDS.map((k2) => `<button class="opt" data-kind="${k2.id}"><b>${k2.label}</b><span>${k2.blurb}${k2.id === mine ? " \xB7 matches your profile" : ""}</span></button>`).join("")}</div>`;
    $("bs-close").onclick = close;
    el.querySelectorAll("[data-kind]").forEach((b) => b.onclick = () => (kindPicked = b.dataset.kind, openPhoto()));
  }
  function openPhoto() {
    const el = sheet();
    const bp = bowlerProfile();
    const kind = kindPicked ?? "thumb";
    el.innerHTML = `
    <div class="row"><h2>Scan my ball</h2><button class="btn ghost" id="bs-close">Close</button></div>
    <div class="note">${esc(KINDS.find((k2) => k2.id === kind).label)}. Take a photo and I'll scan it on my own: the ball, the grip holes and the pin. Then you can drag anything I got wrong.</div>
    <div class="card"><div class="k">For the best reading</div><ul>
      <li>Set the ball on a stand or a towel, grip facing the camera, <b>fingers up</b>. A plain background (no hand holding it) makes the outline much easier.</li>
      <li>Turn it so the <b>grip holes and the pin are both in view</b> and not right at the edge of the ball.</li>
      <li>Stand a few feet back and zoom in a little, rather than holding the phone close: it keeps distances true.</li>
      <li>Good light, no glare, the whole ball in the picture. A black ball needs light from the side.</li>
      <li>Know your <b>PAP</b>. Without it there's no layout to read.</li></ul></div>
    <div class="card"><div class="k">What the marks look like</div><ul>
      <li><b>Pin:</b> a small solid dot of a vivid color (often green, red or orange) near the logo. It marks the top of the weight block. I look for it by color.</li>
      <li><b>CG:</b> a symmetric ball is often unmarked, or has a small dot or ring. Many makers fine-tune the CG and mark it.</li>
      <li><b>Mass bias (MB):</b> only on asymmetric balls, a small dot, often a different color from the pin's. The line from the pin through it points toward the PSA.</li>
      <li>Marks vary from maker to maker. I can't promise I'll tell the pin from the CG or the MB, so check what I picked, and drag it if it's wrong.</li></ul></div>
    <div class="card"><label class="btn" style="display:inline-block;cursor:pointer">Take or choose a photo<input id="bs-file" type="file" accept="image/*" capture="environment" style="display:none"></label>
      <div class="note" id="bs-msg">Nothing is uploaded: the picture stays on this phone.</div></div>`;
    $("bs-close").onclick = close;
    $("bs-file").onchange = async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      $("bs-msg").textContent = "Scanning the picture\u2026";
      try {
        const img = await loadImage(f);
        await new Promise((r) => setTimeout(r, 30));
        begin(img, bp.hand, kind);
      } catch {
        $("bs-msg").textContent = "That file didn't open as a picture.";
      }
    };
  }
  function loadImage(f) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(f);
      const im = new Image();
      im.onload = () => {
        const k2 = Math.min(1, MAX_W / im.naturalWidth);
        const c = document.createElement("canvas");
        c.width = Math.round(im.naturalWidth * k2);
        c.height = Math.round(im.naturalHeight * k2);
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        res(c);
      };
      im.onerror = () => rej(new Error("bad image"));
      im.src = url;
    });
  }
  function pixels(c) {
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    const g = new Uint8ClampedArray(c.width * c.height);
    const rgb = new Uint8ClampedArray(c.width * c.height * 3);
    for (let i = 0; i < g.length; i++) {
      rgb[i * 3] = d[i * 4];
      rgb[i * 3 + 1] = d[i * 4 + 1];
      rgb[i * 3 + 2] = d[i * 4 + 2];
      g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    }
    return { g, rgb };
  }
  function begin(img, hand, kind) {
    const pap = S.profile?.spin?.pap ? parsePap(S.profile.spin.pap) : null;
    st = {
      img,
      circle: { x: img.width / 2, y: img.height / 2, r: Math.min(img.width, img.height) * 0.4 },
      outlines: [],
      outlineIx: 0,
      thumb: null,
      fingerA: null,
      fingerB: null,
      pin: null,
      cg: null,
      mb: null,
      asym: false,
      marks: [],
      guessed: { pin: false, cg: false, mb: false, holes: false },
      mode: "pin",
      kind,
      noThumb: kind !== "thumb",
      hand,
      holeR: 0,
      showHoles: true,
      papText: { over: pap ? fractionInches(pap.over).replace(/"/g, "") : "", up: pap ? fractionInches(pap.up).replace(/"/g, "") : "" },
      found: ""
    };
    analyze();
    draw();
  }
  function analyze() {
    if (!st) return;
    const s = st;
    const { g, rgb } = pixels(s.img);
    const W = s.img.width, H2 = s.img.height;
    const notes = [];
    const rough = { x: W / 2, y: H2 / 2, r: Math.min(W, H2) * 0.48 };
    const blobs = detectHoles(g, W, H2, rough);
    const grip = pickGrip(blobs, rough, s.noThumb);
    s.thumb = s.fingerA = s.fingerB = null;
    s.guessed.holes = false;
    if (grip) {
      s.thumb = grip.thumb ? { x: grip.thumb.x, y: grip.thumb.y } : null;
      s.fingerA = { x: grip.fingers[0].x, y: grip.fingers[0].y };
      s.fingerB = { x: grip.fingers[1].x, y: grip.fingers[1].y };
      if (s.fingerA.x > s.fingerB.x) [s.fingerA, s.fingerB] = [s.fingerB, s.fingerA];
      s.holeR = (grip.fingers[0].r + grip.fingers[1].r) / 2;
      s.guessed.holes = true;
    }
    s.outlines = [];
    if (grip) {
      const pts = [s.fingerA, s.fingerB, ...s.thumb ? [s.thumb] : []];
      const mid = { x: pts.reduce((a, p) => a + p.x, 0) / pts.length, y: pts.reduce((a, p) => a + p.y, 0) / pts.length };
      const rGuess = Math.max(Math.min(W, H2) * 0.2, Math.min(Math.min(W, H2) * 0.5, s.holeR * 9.2));
      s.outlines = findBalls(g, W, H2, mid, rGuess, rgb, 3);
    }
    if (!s.outlines.length) {
      const edge = detectBall(g, W, H2);
      if (edge) s.outlines = [edge];
    }
    s.outlineIx = 0;
    if (s.outlines.length) s.circle = s.outlines[0];
    notes.push(s.outlines.length ? `I found the ball's outline${s.outlines.length > 1 ? ` (and ${s.outlines.length - 1} other possible one${s.outlines.length > 2 ? "s" : ""}: try them if it's wrong)` : ""}.` : "I couldn't find the ball's outline on my own: drag the circle to fit the ball.");
    notes.push(grip ? `I found the grip holes (${s.noThumb ? "two finger holes" : "thumb and two finger holes"}).` : "I couldn't pick out the grip holes on my own: tap them.");
    if (grip && s.outlines.length) {
      const again = pickGrip(detectHoles(g, W, H2, s.circle), s.circle, s.noThumb);
      if (again) {
        s.thumb = again.thumb ? { x: again.thumb.x, y: again.thumb.y } : null;
        s.fingerA = { x: again.fingers[0].x, y: again.fingers[0].y };
        s.fingerB = { x: again.fingers[1].x, y: again.fingers[1].y };
        if (s.fingerA.x > s.fingerB.x) [s.fingerA, s.fingerB] = [s.fingerB, s.fingerA];
        s.holeR = (again.fingers[0].r + again.fingers[1].r) / 2;
      }
    }
    const holes = [s.thumb, s.fingerA, s.fingerB].filter((p) => !!p);
    const dots = detectDots(rgb, W, H2, s.circle, holes, s.holeR ? s.holeR * 2.2 : 0);
    s.marks = dots.map((d) => ({ x: d.x, y: d.y }));
    notes.push(s.marks.length ? `I found ${s.marks.length} small colored dot${s.marks.length === 1 ? "" : "s"}. I took the most vivid as the pin${s.marks.length > 1 ? s.asym ? ", the next as the mass bias" : ", the next as the CG" : ""}. Check ${s.marks.length === 1 ? "it" : "them"}.` : "I didn't see a pin dot: tap where the pin is.");
    assignDots();
    s.found = notes.join(" ");
  }
  function assignDots() {
    if (!st) return;
    const s = st;
    s.pin = s.cg = s.mb = null;
    s.guessed.pin = s.guessed.cg = s.guessed.mb = false;
    if (s.marks[0]) s.pin = s.marks[0], s.guessed.pin = true;
    if (s.marks[1]) {
      if (s.asym) s.mb = s.marks[1], s.guessed.mb = true;
      else s.cg = s.marks[1], s.guessed.cg = true;
    }
    if (s.asym && s.marks[2]) s.cg = s.marks[2], s.guessed.cg = true;
    if (s.marks[1] && s.fingerA && s.fingerB && (s.noThumb || s.thumb)) {
      const over = parseInches(s.papText.over), up = parseInches(s.papText.up);
      if (over !== null) {
        const drill = (pin, cg) => {
          try {
            const grp = { ...DEFAULT_GRIP, ...S.profile?.fit ?? {}, noThumb: s.noThumb };
            return layoutFromScan({ circle: s.circle, thumb: s.noThumb ? null : s.thumb, fingerA: s.fingerA, fingerB: s.fingerB, pin, baseline: cg, pap: { over, up: up ?? 0 }, hand: s.hand, grip: grp }).measured.drilling;
          } catch {
            return null;
          }
        };
        const ok = (d) => d !== null && Math.abs(d) >= 5 && Math.abs(d) <= 95;
        if (!ok(drill(s.marks[0], s.marks[1])) && ok(drill(s.marks[1], s.marks[0]))) {
          s.pin = s.marks[1];
          if (s.asym) s.mb = s.marks[0];
          else s.cg = s.marks[0];
        }
      }
    }
  }
  var itemsOf = (s) => [{ id: "thumb", p: s.noThumb ? null : s.thumb }, { id: "fingerA", p: s.fingerA }, { id: "fingerB", p: s.fingerB }, { id: "pin", p: s.pin }, { id: "cg", p: s.cg }, { id: "mb", p: s.asym ? s.mb : null }];
  function draw() {
    if (!st) return;
    const s = st;
    const el = sheet();
    el.innerHTML = `
    <div class="row"><h2>Scan my ball</h2><button class="btn ghost" id="bs-close">Close</button></div>
    <div class="note">${esc(s.found)}</div>
    <div class="card"><div class="stagebox" style="position:relative"><canvas id="bs-canvas" style="width:100%;height:auto;touch-action:none;cursor:grab"></canvas><canvas id="bs-loupe" width="150" height="150" style="position:absolute;right:8px;top:8px;width:96px;height:96px;border-radius:50%;border:2px solid #46e6ff;display:none;background:#000;pointer-events:none"></canvas></div>
      <div class="note"><b>Drag any marker to move it.</b> Drag the circle's middle cross to move the outline and its edge handle to resize it. To place a marker that is missing, pick it below and tap the ball.</div>
      <div class="chips">${KINDS.map((k2) => `<button class="chip ${s.kind === k2.id ? "sel" : ""}" data-kind="${k2.id}">${k2.label}</button>`).join("")}</div>
      <div class="chips"><button class="chip ${s.showHoles ? "sel" : ""}" id="bs-holes">Hole markers: ${s.showHoles ? "on" : "off"}</button><button class="chip ${s.asym ? "sel" : ""}" id="bs-asym">Mass bias: ${s.asym ? "on (asymmetric ball)" : "off (symmetric ball)"}</button></div>
      <div class="note">Only an asymmetric ball has a mass bias dot. A symmetric ball has just the pin and, often, a CG mark. Turn this on if your ball has a mass bias.</div>
      <div class="chips">${Object.keys(LABEL).filter((i) => !(s.noThumb && i === "thumb") && !(i === "mb" && !s.asym)).map((i) => `<button class="chip ${s.mode === i ? "sel" : ""}" data-mode="${i}">${i === "pin" ? "Place the pin" : i === "cg" ? "Place the CG dot" : i === "mb" ? "Place the mass bias dot" : "Place " + LABEL[i].toLowerCase()}</button>`).join("")}</div>
      <div class="chips">${s.outlines.length > 1 ? `<button class="chip" id="bs-next">Try another outline (${s.outlineIx + 1} of ${s.outlines.length})</button>` : ""}${s.marks.length > 1 ? `<button class="chip" id="bs-swap">Swap pin and ${s.asym ? "mass bias" : "CG"}</button>` : ""}${s.asym && s.marks.length > 2 ? `<button class="chip" id="bs-swap2">Swap CG and mass bias</button>` : ""}<button class="chip" id="bs-auto">Scan again</button></div></div>
    <div class="card"><div class="k">Your PAP and hand</div>
      <div class="two"><div class="field"><label>PAP over (in)</label><input id="bs-over" value="${esc(s.papText.over)}" placeholder="4 1/4"></div><div class="field"><label>PAP up (in, negative for down)</label><input id="bs-up" value="${esc(s.papText.up)}" placeholder="1/2"></div></div>
      <div class="field"><label>Hand</label><select id="bs-hand"><option value="R" ${s.hand === "R" ? "selected" : ""}>Right</option><option value="L" ${s.hand === "L" ? "selected" : ""}>Left</option></select></div>
      <div class="note">Over is across the grip's midline (to the right for a right-hander), up is toward the fingers, both measured from the center of the grip. This is the layout's whole reference, so make sure it's your real PAP.</div></div>
    <div id="bs-out"></div>
    <div class="card"><div class="u">If a scan gets it wrong, you can save it so detection can be improved: it saves the photo and your corrected points to this phone's downloads. Send them to me and I'll tune the scanner on them.</div><div class="chips"><button class="chip" id="bs-save">Save this scan for improving detection</button></div></div>`;
    $("bs-close").onclick = close;
    el.querySelectorAll("[data-mode]").forEach((b) => b.onclick = () => (s.mode = b.dataset.mode, el.querySelectorAll("[data-mode]").forEach((x) => x.classList.toggle("sel", x === b))));
    el.querySelectorAll("[data-kind]").forEach((b) => b.onclick = () => {
      s.kind = b.dataset.kind;
      s.noThumb = s.kind !== "thumb";
      analyze();
      draw();
    });
    $("bs-auto").onclick = () => (analyze(), draw());
    $("bs-next")?.addEventListener("click", () => {
      s.outlineIx = (s.outlineIx + 1) % s.outlines.length;
      s.circle = s.outlines[s.outlineIx];
      draw();
    });
    $("bs-holes").onclick = () => {
      s.showHoles = !s.showHoles;
      $("bs-holes").textContent = `Hole markers: ${s.showHoles ? "on" : "off"}`;
      $("bs-holes").classList.toggle("sel", s.showHoles);
      draw();
    };
    $("bs-asym").onclick = () => {
      s.asym = !s.asym;
      if (!s.asym) s.mb = null;
      if (s.mode === "mb" && !s.asym) s.mode = "cg";
      assignDots();
      draw();
    };
    $("bs-swap")?.addEventListener("click", () => {
      if (s.asym) [s.pin, s.mb] = [s.mb, s.pin];
      else [s.pin, s.cg] = [s.cg, s.pin];
      s.guessed.pin = s.guessed.cg = s.guessed.mb = false;
      redraw();
    });
    $("bs-swap2")?.addEventListener("click", () => {
      [s.cg, s.mb] = [s.mb, s.cg];
      s.guessed.cg = s.guessed.mb = false;
      redraw();
    });
    $("bs-save").onclick = saveExample;
    for (const id of ["bs-over", "bs-up", "bs-hand"]) $(id).addEventListener("change", () => redraw());
    wireCanvas();
    redraw();
  }
  function wireCanvas() {
    const s = st;
    const canvas = $("bs-canvas");
    canvas.width = s.img.width;
    canvas.height = s.img.height;
    const loupe = $("bs-loupe");
    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * canvas.width, y: (e.clientY - r.top) / r.height * canvas.height };
    };
    const reach = () => 26 * (canvas.width / 900);
    const pick = (p) => {
      let best = null;
      for (const it of itemsOf(s)) if (it.p) {
        const d = Math.hypot(it.p.x - p.x, it.p.y - p.y);
        if (d < reach() && (!best || d < best.d)) best = { what: it.id, d };
      }
      const dc = Math.hypot(s.circle.x - p.x, s.circle.y - p.y);
      if (dc < reach() * 1.2 && (!best || dc < best.d)) best = { what: "center", d: dc };
      const de = Math.hypot(s.circle.x + s.circle.r - p.x, s.circle.y - p.y);
      if (de < reach() * 1.2 && (!best || de < best.d)) best = { what: "edge", d: de };
      return best?.what ?? null;
    };
    const set = (what, p) => {
      if (what === "center") s.circle = { ...s.circle, x: p.x, y: p.y };
      else if (what === "edge") s.circle = { ...s.circle, r: Math.max(20, Math.hypot(p.x - s.circle.x, p.y - s.circle.y)) };
      else {
        const snap = what === "pin" || what === "cg" ? s.marks.find((m) => Math.hypot(m.x - p.x, m.y - p.y) < 14 * (canvas.width / 900)) : void 0;
        const q = snap ? { x: snap.x, y: snap.y } : p;
        if (what === "thumb") s.thumb = q;
        else if (what === "fingerA") s.fingerA = q;
        else if (what === "fingerB") s.fingerB = q;
        else if (what === "pin") s.pin = q, s.guessed.pin = false;
        else if (what === "mb") s.mb = q, s.guessed.mb = false;
        else s.cg = q, s.guessed.cg = false;
      }
    };
    canvas.onpointerdown = (e) => {
      const p = pos(e);
      const what = pick(p);
      if (what) {
        drag = { what, moved: false };
        canvas.setPointerCapture(e.pointerId);
        canvas.style.cursor = "grabbing";
      } else {
        set(s.mode, p);
        redraw();
      }
    };
    canvas.onpointermove = (e) => {
      if (!drag) return;
      drag.moved = true;
      const p = pos(e);
      set(drag.what, p);
      redraw();
      const lc = loupe.getContext("2d");
      loupe.style.display = "block";
      const half = 38 * (canvas.width / 900);
      lc.drawImage(canvas, p.x - half, p.y - half, half * 2, half * 2, 0, 0, loupe.width, loupe.height);
      lc.strokeStyle = "#ff4fd8";
      lc.lineWidth = 1.5;
      lc.beginPath();
      lc.moveTo(loupe.width / 2, 0);
      lc.lineTo(loupe.width / 2, loupe.height);
      lc.moveTo(0, loupe.height / 2);
      lc.lineTo(loupe.width, loupe.height / 2);
      lc.stroke();
    };
    const end = () => {
      drag = null;
      canvas.style.cursor = "grab";
      loupe.style.display = "none";
    };
    canvas.onpointerup = end;
    canvas.onpointercancel = end;
  }
  function redraw() {
    if (!st) return;
    const s = st;
    s.papText = { over: $("bs-over").value, up: $("bs-up").value };
    s.hand = $("bs-hand").value;
    const canvas = $("bs-canvas");
    const ctx2 = canvas.getContext("2d");
    ctx2.drawImage(s.img, 0, 0);
    const k2 = canvas.width / 900;
    ctx2.lineWidth = 3 * k2;
    ctx2.strokeStyle = "#46e6ff";
    ctx2.beginPath();
    ctx2.arc(s.circle.x, s.circle.y, s.circle.r, 0, 7);
    ctx2.stroke();
    ctx2.lineWidth = 2 * k2;
    ctx2.beginPath();
    ctx2.moveTo(s.circle.x - 9 * k2, s.circle.y);
    ctx2.lineTo(s.circle.x + 9 * k2, s.circle.y);
    ctx2.moveTo(s.circle.x, s.circle.y - 9 * k2);
    ctx2.lineTo(s.circle.x, s.circle.y + 9 * k2);
    ctx2.stroke();
    ctx2.fillStyle = "#46e6ff";
    ctx2.beginPath();
    ctx2.arc(s.circle.x + s.circle.r, s.circle.y, 8 * k2, 0, 7);
    ctx2.fill();
    s.marks.forEach((m2) => {
      ctx2.strokeStyle = "rgba(255,210,90,.9)";
      ctx2.lineWidth = 2 * k2;
      ctx2.setLineDash([4 * k2, 3 * k2]);
      ctx2.beginPath();
      ctx2.arc(m2.x, m2.y, 16 * k2, 0, 7);
      ctx2.stroke();
      ctx2.setLineDash([]);
    });
    const mark = (p, color, label2) => {
      if (!p) return;
      ctx2.strokeStyle = color;
      ctx2.fillStyle = color;
      ctx2.lineWidth = 3 * k2;
      ctx2.beginPath();
      ctx2.arc(p.x, p.y, 10 * k2, 0, 7);
      ctx2.stroke();
      ctx2.beginPath();
      ctx2.arc(p.x, p.y, 2.5 * k2, 0, 7);
      ctx2.fill();
      ctx2.font = `700 ${18 * k2}px system-ui`;
      ctx2.lineWidth = 4 * k2;
      ctx2.strokeStyle = "rgba(0,0,0,.8)";
      ctx2.strokeText(label2, p.x + 14 * k2, p.y - 10 * k2);
      ctx2.fillText(label2, p.x + 14 * k2, p.y - 10 * k2);
    };
    if (s.showHoles) {
      mark(s.noThumb ? null : s.thumb, COLOR.thumb, "thumb");
      mark(s.fingerA, COLOR.fingerA, "finger 1");
      mark(s.fingerB, COLOR.fingerB, "finger 2");
    }
    mark(s.pin, COLOR.pin, s.guessed.pin ? "PIN (my guess)" : "PIN");
    mark(s.cg, COLOR.cg, s.guessed.cg ? "CG (my guess)" : "CG");
    mark(s.asym ? s.mb : null, COLOR.mb, s.guessed.mb ? "MB (my guess)" : "MB");
    const over = parseInches(s.papText.over), up = parseInches(s.papText.up);
    const out = $("bs-out");
    const need = [];
    if (!s.fingerA || !s.fingerB) need.push("both finger holes");
    if (!s.noThumb && !s.thumb) need.push("the thumb hole");
    if (!s.pin) need.push("the pin");
    if (over === null) need.push("your PAP (over)");
    if (up === null && s.papText.up.trim() !== "") need.push("your PAP (up)");
    if (need.length) {
      out.innerHTML = `<div class="card"><div class="u">Still needed: ${esc(need.join(", "))}. Pick it above and tap the ball.</div></div>`;
      return;
    }
    const grip = { ...DEFAULT_GRIP, ...S.profile?.fit ?? {}, noThumb: s.noThumb };
    const pap = { over, up: up ?? 0 };
    const res = layoutFromScan({ circle: s.circle, thumb: s.noThumb ? null : s.thumb, fingerA: s.fingerA, fingerB: s.fingerB, pin: s.pin, cg: s.cg, mb: s.asym ? s.mb : null, asymmetric: s.asym, pap, hand: s.hand, grip, holeRadii: s.holeR ? { finger: s.holeR, thumb: s.holeR } : void 0 });
    const m = res.measured;
    const neg = (v, f) => (v < 0 ? "\u2212" : "") + f(Math.abs(v));
    const deg2 = (v) => `${Math.round(v * 10) / 10}\xB0`;
    out.innerHTML = `
    <div class="card"><div class="k">Your layout, read from the photo</div>
      <table>
        <tr><td>Pin to PAP</td><td class="n"><b>${fractionInches(m.pinToPap)}</b></td></tr>
        <tr><td>Angle to the VAL</td><td class="n"><b>${neg(m.valAngle, deg2)}</b></td></tr>
        <tr><td>Pin buffer</td><td class="n"><b>${neg(m.pinBuffer, fractionInches)}</b></td></tr>
        <tr><td>Pin to center of grip</td><td class="n"><b>${fractionInches(m.pinToGrip)}</b></td></tr>
        <tr><td>Drilling angle</td><td class="n"><b>${m.drilling === null ? s.asym ? "place the mass bias dot" : "place the CG dot" : neg(m.drilling, deg2)}</b></td></tr>
        <tr><td>PSA to PAP</td><td class="n"><b>${m.psaToPap === null ? s.asym ? "place the mass bias dot" : "place the CG dot" : fractionInches(m.psaToPap)}</b></td></tr>
        ${res.cg ? `<tr><td colspan="2"><b>CG</b> (every ball has one)</td></tr><tr><td>Pin to CG</td><td class="n">${fractionInches(res.cg.fromPin)}</td></tr><tr><td>CG to PAP</td><td class="n">${fractionInches(res.cg.toPap)}</td></tr><tr><td>CG angle from the pin</td><td class="n">${neg(res.cg.angleAtPin, deg2)}</td></tr>` : `<tr><td colspan="2"><b>CG</b>: place the CG dot</td></tr>`}
        ${s.asym ? res.mb ? `<tr><td colspan="2"><b>Mass bias</b> (a separate mark)</td></tr><tr><td>Pin to mass bias</td><td class="n">${fractionInches(res.mb.fromPin)}</td></tr><tr><td>Mass bias to PAP</td><td class="n">${fractionInches(res.mb.toPap)}</td></tr><tr><td>Mass bias angle from the pin</td><td class="n">${neg(res.mb.angleAtPin, deg2)}</td></tr>` : `<tr><td colspan="2"><b>Mass bias</b>: place the mass bias dot</td></tr>` : ""}
        <tr><td>Where the pin sits</td><td class="n">${esc(m.pinPlacement.label)}</td></tr>
        ${res.spanIn !== null ? `<tr><td>Span (rough, from the holes)</td><td class="n">${fractionInches(res.spanIn)}</td></tr>` : ""}</table>
      ${m.drilling !== null && m.psaToPap !== null ? `<div class="u" style="margin-top:8px"><b>Dual Angle:</b> ${neg(m.drilling, (x) => Math.round(x) + "\xB0")} \xD7 ${fractionInches(m.pinToPap)} \xD7 ${neg(m.valAngle, (x) => Math.round(x) + "\xB0")} &nbsp; <b>Pin Buffer:</b> ${fractionInches(m.pinToPap)} \xD7 ${fractionInches(m.psaToPap)} \xD7 ${neg(m.pinBuffer, fractionInches)} &nbsp; <b>2LS:</b> ${fractionInches(m.pinToPap)} \xD7 ${fractionInches(m.psaToPap)} \xD7 ${fractionInches(m.pinToGrip)}</div>` : `<div class="u" style="margin-top:8px">The drilling angle and PSA to PAP need a line from the pin through ${s.asym ? "the mass bias" : "the CG"}. Place that dot if your ball has one.</div>`}
      ${res.warnings.map((w) => `<div class="note" style="color:var(--gold)">${esc(w)}</div>`).join("")}
      <div class="note">A careful photo reads distances to about an eighth to a quarter inch and angles to a few degrees, if the outline fits the ball and the points are on the right spots. Check against the ball's drill sheet before relying on it. Negative angles and distances mean the other side of the line.</div>
      <div class="chips">${m.drilling !== null ? `<button class="btn" id="bs-open">Open in the Layout Lab</button>` : ""}</div></div>`;
    const open2 = document.getElementById("bs-open");
    if (open2)
      open2.onclick = () => {
        close();
        const frame = scanFrame({ circle: s.circle, thumb: s.noThumb ? null : s.thumb, fingerA: s.fingerA, fingerB: s.fingerB });
        const keepImg = document.createElement("canvas");
        keepImg.width = s.img.width;
        keepImg.height = s.img.height;
        keepImg.getContext("2d").drawImage(s.img, 0, 0);
        openLayoutLab({ marks: { symmetric: !s.asym, pinToCg: res.pinToCg ?? void 0, mb: res.pinToMb !== null ? { dist: res.pinToMb, angle: 0 } : void 0 }, photo: { img: keepImg, circle: s.circle, ...frame }, layout: { dualAngle: { drilling: m.drilling, pinToPap: m.pinToPap, valAngle: m.valAngle }, pap, hand: s.hand } });
      };
  }
  function saveExample() {
    if (!st) return;
    const s = st;
    const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const dl = (blob, name) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4e3);
    };
    const body = { app: "LaneIQ ball scan", at: (/* @__PURE__ */ new Date()).toISOString(), kind: s.kind, hand: s.hand, size: { w: s.img.width, h: s.img.height }, circle: s.circle, otherOutlines: s.outlines, holes: { thumb: s.noThumb ? null : s.thumb, fingerA: s.fingerA, fingerB: s.fingerB }, pin: s.pin, cg: s.cg, massBias: s.asym ? s.mb : null, asymmetric: s.asym, dotsFound: s.marks, guessedByApp: s.guessed, pap: s.papText };
    dl(new Blob([JSON.stringify(body, null, 1)], { type: "application/json" }), `laneiq-scan-${stamp}.json`);
    setTimeout(() => s.img.toBlob((b) => b && dl(b, `laneiq-scan-${stamp}.jpg`), "image/jpeg", 0.92), 500);
    $("bs-save").textContent = "Saved to your downloads";
  }

  // camera/layoutlab.ts
  var IDENT = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  var view = IDENT;
  var lab = null;
  var solved = null;
  var flare = null;
  var sheet2 = () => $("lab");
  var close2 = () => (sheet2().classList.remove("on"), sheet2().innerHTML = "");
  var fmt2 = (v, d = 2) => (Math.round(v * 10 ** d) / 10 ** d).toString();
  var mul = (a, b) => a.map((row) => [0, 1, 2].map((j) => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j]));
  var apply = (m, v) => [m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2], m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2], m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]];
  var rotX = (a) => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
  var rotY = (a) => [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]];
  function facing(p) {
    const f = unit(p);
    const ref = Math.abs(f[1]) > 0.97 ? [0, 0, 1] : [0, 1, 0];
    const right = unit(cross(ref, f));
    const up = cross(f, right);
    return [right, up, f];
  }
  function fromCatalog(b) {
    const sym = b.coreSymmetry?.value !== "asymmetric";
    return { name: b.name, manufacturer: b.manufacturer, rg: b.rg?.value ?? 2.52, totalDiff: b.differential?.value ?? 0.04, intDiff: sym ? 0 : b.intermediateDifferential?.value ?? 0, symmetric: sym, colorway: b.colorway?.value };
  }
  function startingLab(ball, layout) {
    const bp = bowlerProfile();
    const p = S.profile;
    const pap = (p?.spin?.pap ? parsePap(p.spin.pap) : null) ?? { over: 4.25, up: 0.5 };
    const noThumb = bp.style === "two-handed" || bp.style === "one-hand-no-thumb";
    const grip = { ...DEFAULT_GRIP, ...p?.fit ?? {}, noThumb };
    const sug = suggestDualAngle(bp, null, ball.totalDiff);
    return {
      ball,
      system: "dual",
      dual: { drilling: sug.drilling, pinToPap: sug.pinToPap, valAngle: sug.valAngle },
      pb: { pinToPap: 4.5, psaToPap: 4, pinBuffer: 2 },
      ls2: { pinToPap: 4.5, psaToPap: 4, pinToGrip: 3.375 },
      pap,
      grip,
      hand: bp.hand,
      rev: bp.revRpm ?? 380,
      speed: bp.launchSpeed ?? 16,
      flip: false,
      show: { val: true, buffer: true, track: true, flare: true, labels: true, photo: true },
      photo: null,
      notes: "",
      compare: null,
      ...layout
    };
  }
  var layoutOf = (l) => l.system === "dual" ? { system: "dual", ...l.dual } : l.system === "pinbuffer" ? { system: "pinbuffer", ...l.pb } : { system: "2ls", ...l.ls2 };
  function recompute() {
    if (!lab) return;
    solved = solveLayout(layoutOf(lab), lab.pap, lab.hand, lab.grip, lab.flip);
    flare = solved.ok ? simulateFlare({ points: solved.points, core: { rg: lab.ball.rg, totalDiff: lab.ball.totalDiff, intDiff: lab.ball.intDiff }, revRpm: lab.rev, speedMph: lab.speed }) : null;
  }
  var BASE_COLORS = [[/black|onyx|coal|jet/, 230, 8], [/purple|violet|plum/, 275, 45], [/blue|navy|cobalt|sapphire|ocean/, 215, 55], [/teal|aqua|cyan|turquoise/, 180, 50], [/green|emerald|lime|jade/, 140, 45], [/red|crimson|ruby|cherry|maroon/, 355, 55], [/orange|copper|bronze/, 25, 60], [/gold|yellow|amber/, 45, 60], [/pink|magenta|orchid/, 320, 50], [/silver|grey|gray|steel|graphite|smoke|white|ivory/, 220, 8]];
  function ballColor(l) {
    const c = (l.colorway ?? "").toLowerCase();
    for (const [re, h, s] of BASE_COLORS) if (re.test(c)) return { h, s };
    return { h: 215, s: 35 };
  }
  function circlePts(p, dir, n = 120) {
    return Array.from({ length: n + 1 }, (_, i) => rotate(p, unit(cross(p, dir)), 2 * Math.PI * i / n));
  }
  function arcPts(from, to, n = 40) {
    const a = Math.acos(Math.max(-1, Math.min(1, from[0] * to[0] + from[1] * to[1] + from[2] * to[2])));
    const axis = unit(cross(from, to));
    return Array.from({ length: n + 1 }, (_, i) => rotate(from, axis, a * i / n));
  }
  function drawBall(canvas, l, s, f, m, opts = {}) {
    const ctx2 = canvas.getContext("2d");
    const W = canvas.width, H2 = canvas.height;
    const cx = W / 2, cy = H2 / 2, r = Math.min(W, H2) * 0.44;
    ctx2.clearRect(0, 0, W, H2);
    const proj = (v) => {
      const p = apply(m, v);
      return { x: cx + p[0] * r, y: cy - p[1] * r, z: p[2] };
    };
    const col = ballColor(l.ball);
    const g = ctx2.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
    g.addColorStop(0, `hsl(${col.h},${col.s}%,${col.s < 15 ? 38 : 46}%)`);
    g.addColorStop(1, `hsl(${col.h},${col.s}%,${col.s < 15 ? 8 : 14}%)`);
    ctx2.fillStyle = g;
    ctx2.beginPath();
    ctx2.arc(cx, cy, r, 0, 7);
    ctx2.fill();
    if (l.photo && l.show.photo) drawPhotoSphere(ctx2, cx, cy, r, l.photo, m);
    ctx2.strokeStyle = "rgba(255,255,255,.22)";
    ctx2.lineWidth = 1.5;
    ctx2.stroke();
    const strokePath = (pts2, color, width, dash = [], alpha = 1) => {
      ctx2.save();
      ctx2.strokeStyle = color;
      ctx2.lineWidth = width;
      ctx2.setLineDash(dash);
      ctx2.globalAlpha = alpha;
      ctx2.lineCap = "round";
      ctx2.beginPath();
      let pen = false;
      for (const v of pts2) {
        const p = proj(v);
        if (p.z <= 0.02) {
          pen = false;
          continue;
        }
        if (pen) ctx2.lineTo(p.x, p.y);
        else ctx2.moveTo(p.x, p.y);
        pen = true;
      }
      ctx2.stroke();
      ctx2.restore();
    };
    const dot3 = (v, color, label2, size = 6, dy = -10) => {
      const p = proj(v);
      if (p.z <= 0.02) return;
      ctx2.save();
      ctx2.fillStyle = color;
      ctx2.strokeStyle = "#05070d";
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.arc(p.x, p.y, size, 0, 7);
      ctx2.fill();
      ctx2.stroke();
      if ((opts.labels ?? l.show.labels) && label2) {
        ctx2.font = `700 ${Math.round(r * 0.075)}px system-ui`;
        ctx2.lineWidth = 3;
        ctx2.strokeStyle = "rgba(5,7,13,.85)";
        ctx2.strokeText(label2, p.x + size + 3, p.y + dy + 12);
        ctx2.fillStyle = color;
        ctx2.fillText(label2, p.x + size + 3, p.y + dy + 12);
      }
      ctx2.restore();
    };
    const pts = s.points;
    const hole = (center, dia) => {
      const north = unit(cross(cross(center, [0, 1, 0]), center));
      const poly = Array.from({ length: 28 }, (_, i) => walk(center, rotate(Math.abs(center[1]) > 0.98 ? [1, 0, 0] : north, center, 2 * Math.PI * i / 28), dia / 2));
      const ps = poly.map(proj);
      if (ps.every((p) => p.z <= 0.02)) return;
      ctx2.save();
      ctx2.beginPath();
      ps.forEach((p, i) => i ? ctx2.lineTo(p.x, p.y) : ctx2.moveTo(p.x, p.y));
      ctx2.closePath();
      ctx2.fillStyle = "#05070d";
      ctx2.fill();
      ctx2.strokeStyle = "rgba(255,255,255,.35)";
      ctx2.lineWidth = 1.5;
      ctx2.stroke();
      ctx2.restore();
    };
    if (l.show.track) {
      strokePath(trackRing(pts.pap), "rgba(90,255,176,.9)", 2.2, [6, 4]);
      if (f && l.show.flare) {
        f.checkpoints.forEach((c, i) => strokePath(trackRing(c.axis), `hsl(${190 + i * 40},90%,65%)`, 1.6, [], 0.35 + 0.15 * i));
        strokePath(f.path, "#ffd25a", 3);
      }
    }
    if (l.show.val) {
      strokePath(circlePts(pts.pap, pts.valUp), "rgba(255,255,255,.55)", 1.6, [10, 6]);
      if (l.show.buffer && s.eq.pinbuffer.pinBuffer > 0.05) {
        const ring = Array.from({ length: 73 }, (_, i) => walk(pts.pin, rotate(unit(cross(cross(pts.pin, [0, 1, 0]), pts.pin)), pts.pin, 2 * Math.PI * i / 72), s.eq.pinbuffer.pinBuffer));
        strokePath(ring, "rgba(255,210,90,.8)", 1.4, [3, 3]);
      }
    }
    strokePath(circlePts(pts.grip, [0, 1, 0]), "rgba(255,255,255,.28)", 1.2, [3, 5]);
    strokePath(arcPts(pts.pap, pts.pin), "#46e6ff", 2.4);
    strokePath(arcPts(pts.pin, pts.psa), "#ff4fd8", 2.4);
    strokePath(arcPts(pts.psa, pts.pap), "rgba(255,79,216,.45)", 1.4, [4, 4]);
    if (!(l.photo && l.show.photo)) {
      if (pts.thumb) hole(pts.thumb, l.grip.thumbDia);
      hole(pts.middle, l.grip.fingerDia);
      hole(pts.ring, l.grip.fingerDia);
    }
    dot3(pts.grip, "#ffffff", "grip center", 4, -4);
    dot3(pts.pap, "#5affb0", "PAP", 7);
    dot3(pts.pin, "#46e6ff", "PIN (low RG)", 7);
    dot3(pts.psa, "#ff4fd8", l.ball.symmetric ? "PSA (CG line)" : "PSA (high RG)", 7);
    dot3(pts.inter, "rgba(255,255,255,.7)", "intermediate", 4, -4);
    if (l.ball.pinToCg !== void 0 && l.ball.pinToCg > 0) {
      const cg = walk(pts.pin, unit(cross(cross(pts.pin, pts.psa), pts.pin)), Math.min(QUARTER, l.ball.pinToCg));
      dot3(cg, "#ffd25a", "CG", 6);
    }
    if (l.ball.mb && !l.ball.symmetric) {
      const base = unit(cross(cross(pts.pin, pts.psa), pts.pin));
      const d = rotate(base, pts.pin, l.ball.mb.angle * Math.PI / 180);
      dot3(walk(pts.pin, d, Math.min(QUARTER, l.ball.mb.dist)), "#ff8a3d", "MB", 6);
    }
    ctx2.fillStyle = "rgba(255,255,255,.35)";
    ctx2.font = `${Math.round(r * 0.06)}px system-ui`;
    ctx2.fillText("drag to turn the ball", 10, H2 - 10);
  }
  function drawPhotoSphere(ctx2, cx, cy, r, ph, m) {
    if (!ph.pixels) ph.pixels = ph.img.getContext("2d").getImageData(0, 0, ph.img.width, ph.img.height);
    const src = ph.pixels;
    const size = Math.max(2, Math.round(r * 2));
    const out = ctx2.createImageData(size, size);
    for (let py = 0; py < size; py++)
      for (let px = 0; px < size; px++) {
        const nx = (px + 0.5 - size / 2) / (size / 2), ny = (size / 2 - py - 0.5) / (size / 2);
        const rr = nx * nx + ny * ny;
        if (rr >= 1) continue;
        const nz = Math.sqrt(1 - rr);
        const bx = m[0][0] * nx + m[1][0] * ny + m[2][0] * nz, by = m[0][1] * nx + m[1][1] * ny + m[2][1] * nz, bz = m[0][2] * nx + m[1][2] * ny + m[2][2] * nz;
        const cxv = ph.ex[0] * bx + ph.up[0] * by + ph.g[0] * bz, cyv = ph.ex[1] * bx + ph.up[1] * by + ph.g[1] * bz, czv = ph.ex[2] * bx + ph.up[2] * by + ph.g[2] * bz;
        const o = (py * size + px) * 4;
        if (czv > 0.03) {
          const sx = Math.min(src.width - 1, Math.max(0, Math.round(ph.circle.x + cxv * ph.circle.r))), sy = Math.min(src.height - 1, Math.max(0, Math.round(ph.circle.y - cyv * ph.circle.r)));
          const s = (sy * src.width + sx) * 4;
          out.data[o] = src.data[s];
          out.data[o + 1] = src.data[s + 1];
          out.data[o + 2] = src.data[s + 2];
          out.data[o + 3] = 255;
        } else {
          out.data[o] = 16;
          out.data[o + 1] = 20;
          out.data[o + 2] = 30;
          out.data[o + 3] = 255;
        }
      }
    ctx2.putImageData(out, Math.round(cx - size / 2), Math.round(cy - size / 2));
  }
  var numInput = (id, v, label2, hint = "") => `<div class="field"><label>${label2}</label><input id="${id}" value="${esc(fractionInches(v).replace(/"/g, ""))}" inputmode="decimal" autocomplete="off">${hint ? `<div class="note">${hint}</div>` : ""}</div>`;
  var degInput = (id, v, label2) => `<div class="field"><label>${label2}</label><input id="${id}" value="${Math.round(v)}" inputmode="decimal" autocomplete="off"></div>`;
  function openLayoutLab(opts = {}) {
    const { dualAngle, ...rest } = opts.layout ?? {};
    const found = opts.catalogKey ? S.catalog.find((c) => c.key === opts.catalogKey) : void 0;
    const first = found ? fromCatalog(found) : (() => {
      const mine = S.arsenal.map((b) => b.catalogKey ? S.catalog.find((c) => c.key === b.catalogKey) : void 0).find((c) => c && c.rg && c.differential);
      return mine ? fromCatalog(mine) : { name: "Sample ball", rg: 2.52, totalDiff: 0.045, intDiff: 0, symmetric: true };
    })();
    lab = startingLab(first, { ...rest, ...dualAngle ? { dual: dualAngle, system: "dual" } : {} });
    if (opts.photo) lab.photo = opts.photo;
    if (opts.marks) {
      lab.ball = { ...lab.ball, symmetric: opts.marks.symmetric, pinToCg: opts.marks.pinToCg, mb: opts.marks.symmetric ? void 0 : opts.marks.mb };
      if (opts.marks.symmetric) lab.ball.intDiff = 0;
    }
    view = facing([0, 0, 1]);
    if (opts.sheetId) return loadSheet(opts.sheetId);
    draw2();
  }
  function draw2() {
    if (!lab) return;
    const el = sheet2();
    el.classList.add("on");
    const l = lab;
    const mine = S.arsenal.map((b) => ({ b, c: b.catalogKey ? S.catalog.find((c) => c.key === b.catalogKey) : void 0 })).filter((x) => !!x.c && !!x.c.rg && !!x.c.differential);
    const sheets = S.profile?.sheets ?? [];
    el.innerHTML = `
    <div class="row"><h2>Layout Lab</h2><button class="btn ghost" id="lb-close">Close</button></div>
    <div class="note">See where a layout puts the pin, the PSA and the grip on the ball, and how the spin axis would wander across it. For planning and for showing a customer. The drilling sheet from the ball's maker and your driller's checks come first.</div>

    <div class="card">
      <div class="k">Ball</div>
      <div class="chips"><button class="btn ghost" id="lb-scan">Scan my drilled ball to read its layout</button></div>
      ${mine.length ? `<div class="field"><label>From my arsenal</label><select id="lb-mine"><option value="">choose\u2026</option>${mine.map((x) => `<option value="${esc(x.c.key)}">${esc(x.b.name)}</option>`).join("")}</select></div>` : ""}
      <div class="field"><label>Or search the catalog</label><input id="lb-search" placeholder="Type a ball name" autocomplete="off"><div class="suggest" id="lb-hits"></div></div>
      <div class="u"><b>${esc(l.ball.manufacturer ? l.ball.manufacturer + " " : "")}${esc(l.ball.name)}</b>: RG ${fmt2(l.ball.rg, 3)}, differential ${fmt2(l.ball.totalDiff, 3)}${l.ball.symmetric ? ", symmetric core" : `, asymmetric core (intermediate ${fmt2(l.ball.intDiff, 3)})`}</div>
      <div class="chips"><button class="chip ${l.ball.symmetric ? "" : "sel"}" id="lb-asym">Mass bias: ${l.ball.symmetric ? "off (symmetric ball)" : "on (asymmetric ball)"}</button></div>
      <div class="two"><div class="field"><label>Pin to CG (in)</label><input id="lb-cg" value="${l.ball.pinToCg ?? ""}" placeholder="from the layout sheet" inputmode="decimal"></div>${l.ball.symmetric ? "" : `<div class="field"><label>Mass bias: in from pin, \xB0 from pin-to-PSA</label><div class="two"><input id="lb-mbd" value="${l.ball.mb?.dist ?? ""}" placeholder="in" inputmode="decimal"><input id="lb-mba" value="${l.ball.mb?.angle ?? ""}" placeholder="\xB0" inputmode="decimal"></div></div>`}</div>
      ${l.ball.symmetric ? "" : `<div class="field"><label>Intermediate differential</label><input id="lb-int" value="${fmt2(l.ball.intDiff, 3)}" inputmode="decimal"></div>`}
      <div class="note">CG and mass bias positions are on the manufacturer's layout sheet for the ball. They aren't in the catalog, so enter them to see them on the ball.</div>
    </div>

    <div class="card">
      <div class="k">The ball, with your layout</div>
      <div class="stagebox"><canvas id="lb-canvas" width="720" height="720" style="width:100%;height:auto;aspect-ratio:1;touch-action:none;cursor:grab"></canvas></div>
      <div class="chips"><button class="chip" data-view="grip">Grip view</button><button class="chip" data-view="pap">PAP view</button><button class="chip" data-view="pin">Pin view</button><button class="chip" data-view="psa">PSA view</button><button class="chip" data-view="back">Back</button></div>
      <div class="chips">${["val", "buffer", "track", "flare", "labels", ...l.photo ? ["photo"] : []].map((k2) => `<button class="chip ${l.show[k2] ? "sel" : ""}" data-show="${k2}">${{ val: "VAL", buffer: "Pin buffer", track: "Track", flare: "Flare", labels: "Labels", photo: "My photo" }[k2]}</button>`).join("")}</div>
      <div class="note"><span style="color:#46e6ff">Cyan: pin to PAP</span> \xB7 <span style="color:#ff4fd8">Magenta: pin to PSA</span> \xB7 <span style="color:#5affb0">Green: PAP and the first track</span> \xB7 <span style="color:#ffd25a">Gold: where the spin axis wanders</span></div>
    </div>

    <div class="card">
      <div class="k">Layout system</div>
      <div class="chips">${["dual", "pinbuffer", "2ls"].map((k2) => `<button class="chip ${l.system === k2 ? "sel" : ""}" data-sys="${k2}">${{ dual: "Dual Angle", pinbuffer: "Pin Buffer (VLS)", "2ls": "2LS" }[k2]}</button>`).join("")}</div>
      <div id="lb-fields">${fields(l)}</div>
      <div class="chips"><button class="chip ${l.flip ? "sel" : ""}" id="lb-flip">Flip PSA to the other side</button><button class="chip" id="lb-suggest">Suggest a layout for me</button></div>
      <div class="note" id="lb-problems"></div>
    </div>

    <div class="card">
      <div class="k">Hand and grip</div>
      <div class="two"><div class="field"><label>Hand</label><select id="lb-hand"><option value="R" ${l.hand === "R" ? "selected" : ""}>Right</option><option value="L" ${l.hand === "L" ? "selected" : ""}>Left</option></select></div><div class="field"><label>Rev rate (RPM)</label><input id="lb-rev" value="${Math.round(l.rev)}" inputmode="numeric"></div></div>
      <div class="two"><div class="field"><label>Ball speed (mph)</label><input id="lb-speed" value="${fmt2(l.speed, 1)}" inputmode="decimal"></div><div class="field"><label>PAP over / up (in, negative: other side / down)</label><div class="two"><input id="lb-pover" value="${esc(fractionInches(l.pap.over).replace(/"/g, ""))}"><input id="lb-pup" value="${esc(fractionInches(l.pap.up).replace(/"/g, ""))}"></div></div></div>
      <div class="two"><div class="field"><label>Span (in)</label><input id="lb-span" value="${esc(fractionInches(l.grip.span).replace(/"/g, ""))}" ${l.grip.noThumb ? "disabled" : ""}></div><div class="field"><label>Bridge (in)</label><input id="lb-bridge" value="${esc(fractionInches(l.grip.bridge).replace(/"/g, ""))}"></div></div>
      <div class="two"><div class="field"><label>Thumb hole (in)</label><input id="lb-thumb" value="${esc(fractionInches(l.grip.thumbDia).replace(/"/g, ""))}" ${l.grip.noThumb ? "disabled" : ""}></div><div class="field"><label>Finger holes (in)</label><input id="lb-finger" value="${esc(fractionInches(l.grip.fingerDia).replace(/"/g, ""))}"></div></div>
      <div class="note">You can type fractions: 4 1/4, 3-3/8, 0.5. The PAP is over (across the grip) and up (toward the fingers), measured from the center of the grip. ${l.grip.noThumb ? "Your profile says no thumb hole, so only finger holes are drawn." : ""}</div>
      <div class="chips"><button class="chip" id="lb-savefit">Save my hand and PAP to my profile</button></div>
    </div>

    <div id="lb-out"></div>

    <div class="card"><div class="k">Pro shop tools</div>
      <div class="field"><label>Notes for the drill sheet</label><textarea id="lb-notes" rows="2" style="width:100%">${esc(l.notes)}</textarea></div>
      <div class="chips"><button class="btn" id="lb-sheet">Drill sheet (print or save PDF)</button><button class="btn ghost" id="lb-save">Save this layout</button><button class="btn ghost" id="lb-a">Hold this as A to compare</button></div>
      ${sheets.length ? `<div class="k" style="margin-top:10px">Saved layouts for ${esc(S.profile?.name ?? "this profile")}</div>${sheets.map((x) => `<div class="row" style="padding:6px 0;border-top:1px solid var(--line)"><div><b>${esc(x.ball.name)}</b> <span class="note">${esc(x.layoutText)} \xB7 ${esc(new Date(x.at).toLocaleDateString())}</span></div><div><button class="chip" data-load="${x.id}">Open</button><button class="chip danger" data-del="${x.id}">Delete</button></div></div>`).join("")}` : ""}
    </div>`;
    wire();
    recompute();
    update();
  }
  function fields(l) {
    if (l.system === "dual") return `<div class="two">${degInput("lb-drill", l.dual.drilling, "Drilling angle (negative: PSA on the other side)")}${degInput("lb-val", l.dual.valAngle, "Angle to the VAL (negative: pin past the VAL)")}</div>${numInput("lb-pin", l.dual.pinToPap, "Pin to PAP (in)", "Controls how much of the ball's flare potential the layout uses.")}`;
    if (l.system === "pinbuffer") return `${numInput("lb-pin", l.pb.pinToPap, "Pin to PAP (in)")}${numInput("lb-psa", l.pb.psaToPap, "PSA to PAP (in)", "Pin to PAP plus PSA to PAP must be at least 6 3/4.")}${numInput("lb-buf", l.pb.pinBuffer, "Pin buffer (in)", "The distance from the pin to the VAL. It can't be more than pin to PAP. Negative puts the pin on the far side of the VAL.")}`;
    return `${numInput("lb-pin", l.ls2.pinToPap, "Pin to PAP (in)")}${numInput("lb-psa", l.ls2.psaToPap, "PSA to PAP (in)")}${numInput("lb-grip", l.ls2.pinToGrip, "Pin to center of grip (in)", "Measured from the center of the grip (the bridge for a no-thumb bowler).")}`;
  }
  var inch = (id) => parseInches($(id).value);
  var val = (id) => {
    const v = Number($(id).value);
    return Number.isFinite(v) && $(id).value.trim() !== "" ? v : null;
  };
  function readFields() {
    if (!lab) return;
    const l = lab;
    const set = (o, k2, v) => {
      if (v !== null) o[k2] = v;
    };
    if (l.system === "dual") {
      set(l.dual, "drilling", val("lb-drill"));
      set(l.dual, "valAngle", val("lb-val"));
      set(l.dual, "pinToPap", inch("lb-pin"));
    } else if (l.system === "pinbuffer") {
      set(l.pb, "pinToPap", inch("lb-pin"));
      set(l.pb, "psaToPap", inch("lb-psa"));
      set(l.pb, "pinBuffer", inch("lb-buf"));
    } else {
      set(l.ls2, "pinToPap", inch("lb-pin"));
      set(l.ls2, "psaToPap", inch("lb-psa"));
      set(l.ls2, "pinToGrip", inch("lb-grip"));
    }
  }
  function readHand() {
    if (!lab) return;
    const l = lab;
    l.hand = $("lb-hand").value;
    const rev = val("lb-rev"), sp = val("lb-speed");
    if (rev && rev >= 100 && rev <= 700) l.rev = rev;
    if (sp && sp >= 8 && sp <= 25) l.speed = sp;
    const over = inch("lb-pover"), up = inch("lb-pup");
    if (over !== null) l.pap.over = over;
    if (up !== null) l.pap.up = up;
    const span = inch("lb-span"), br = inch("lb-bridge"), th = inch("lb-thumb"), fi = inch("lb-finger");
    if (span !== null && span > 0) l.grip.span = span;
    if (br !== null && br >= 0) l.grip.bridge = br;
    if (th !== null && th > 0) l.grip.thumbDia = th;
    if (fi !== null && fi > 0) l.grip.fingerDia = fi;
    l.notes = $("lb-notes").value;
    const cg = val("lb-cg");
    l.ball.pinToCg = cg !== null && cg > 0 ? cg : void 0;
    const mbd = document.getElementById("lb-mbd") ? val("lb-mbd") : null, mba = document.getElementById("lb-mba") ? val("lb-mba") : null;
    l.ball.mb = !l.ball.symmetric && mbd !== null && mba !== null && mbd > 0 ? { dist: mbd, angle: mba } : void 0;
    const inter = document.getElementById("lb-int");
    if (inter && Number.isFinite(Number(inter.value))) l.ball.intDiff = Math.max(0, Number(inter.value));
  }
  function wire() {
    const l = lab;
    $("lb-close").onclick = () => (lab = null, close2());
    $("lb-scan").onclick = () => (lab = null, close2(), openBallScan());
    const refresh = () => {
      readFields();
      readHand();
      recompute();
      update();
    };
    sheet2().querySelectorAll("input, select, textarea").forEach((e) => {
      if (e.id === "lb-search" || e.id === "lb-mine") return;
      e.addEventListener("change", refresh);
    });
    $("lb-mine")?.addEventListener("change", (e) => {
      const key = e.target.value;
      const c = S.catalog.find((x) => x.key === key);
      if (c) swapBall(fromCatalog(c));
    });
    const search = $("lb-search");
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      const hits = q.length < 2 ? [] : S.catalog.filter((c) => c.rg && c.differential && `${c.manufacturer} ${c.name}`.toLowerCase().includes(q)).slice(0, 6);
      $("lb-hits").innerHTML = hits.map((c) => `<button class="chip" data-k="${esc(c.key)}">${esc(c.manufacturer)} ${esc(c.name)}</button>`).join("");
      $("lb-hits").querySelectorAll("[data-k]").forEach((b) => b.onclick = () => swapBall(fromCatalog(S.catalog.find((c) => c.key === b.dataset.k))));
    });
    sheet2().querySelectorAll("[data-sys]").forEach((b) => b.onclick = () => switchSystem(b.dataset.sys));
    sheet2().querySelectorAll("[data-show]").forEach((b) => b.onclick = () => (l.show[b.dataset.show] = !l.show[b.dataset.show], b.classList.toggle("sel"), update(true)));
    sheet2().querySelectorAll("[data-view]").forEach((b) => b.onclick = () => faceView(b.dataset.view));
    $("lb-asym")?.addEventListener("click", () => {
      readFields();
      readHand();
      l.ball.symmetric = !l.ball.symmetric;
      if (l.ball.symmetric) l.ball.intDiff = 0, l.ball.mb = void 0;
      draw2();
    });
    $("lb-flip").onclick = () => (l.flip = !l.flip, $("lb-flip").classList.toggle("sel"), recompute(), update());
    $("lb-suggest").onclick = () => {
      const bp = bowlerProfile();
      const sug = suggestDualAngle({ ...bp, revRpm: l.rev, launchSpeed: l.speed }, null, l.ball.totalDiff);
      l.system = "dual";
      l.dual = { drilling: sug.drilling, pinToPap: sug.pinToPap, valAngle: sug.valAngle };
      draw2();
      $("lb-problems").innerHTML = `<b>Suggested starting layout:</b> ${esc(sug.why.join(" "))}`;
    };
    $("lb-savefit").onclick = () => {
      readHand();
      updateProfile({ fit: { span: l.grip.span, thumbDia: l.grip.thumbDia, fingerDia: l.grip.fingerDia, bridge: l.grip.bridge }, spin: { ...S.profile?.spin ?? { source: "entered", at: (/* @__PURE__ */ new Date()).toISOString() }, pap: `${fractionInches(l.pap.over).replace(/"/g, "")} over, ${fractionInches(Math.abs(l.pap.up)).replace(/"/g, "")} ${l.pap.up < 0 ? "down" : "up"}`, source: "entered", at: (/* @__PURE__ */ new Date()).toISOString() } });
      $("lb-savefit").textContent = "Saved to your profile";
    };
    $("lb-sheet").onclick = () => (readHand(), openDrillSheet());
    $("lb-save").onclick = () => {
      readFields();
      readHand();
      const sh = { id: newId(), at: (/* @__PURE__ */ new Date()).toISOString(), ball: { name: l.ball.name, manufacturer: l.ball.manufacturer, rg: l.ball.rg, totalDiff: l.ball.totalDiff, intDiff: l.ball.intDiff, symmetric: l.ball.symmetric }, layoutText: layoutLine(solved), system: l.system, dual: l.dual, pb: l.pb, ls2: l.ls2, pap: l.pap, grip: { span: l.grip.span, thumbDia: l.grip.thumbDia, fingerDia: l.grip.fingerDia, bridge: l.grip.bridge }, hand: l.hand, rev: l.rev, speed: l.speed, notes: l.notes };
      updateProfile({ sheets: [sh, ...S.profile?.sheets ?? []].slice(0, 40) });
      draw2();
    };
    $("lb-a").onclick = () => {
      if (!solved || !flare) return;
      l.compare = { label: `${l.ball.name}: ${layoutLine(solved)}`, solved, flare };
      $("lb-a").textContent = "Held as A";
      update();
    };
    sheet2().querySelectorAll("[data-load]").forEach((b) => b.onclick = () => loadSheet(b.dataset.load));
    sheet2().querySelectorAll("[data-del]").forEach((b) => b.onclick = () => (updateProfile({ sheets: (S.profile?.sheets ?? []).filter((x) => x.id !== b.dataset.del) }), draw2()));
    const canvas = $("lb-canvas");
    let last = null;
    canvas.addEventListener("pointerdown", (e) => (last = { x: e.clientX, y: e.clientY }, canvas.setPointerCapture(e.pointerId)));
    canvas.addEventListener("pointermove", (e) => {
      if (!last) return;
      view = mul(mul(rotX((e.clientY - last.y) / 160), rotY((e.clientX - last.x) / 160)), view);
      last = { x: e.clientX, y: e.clientY };
      update(true);
    });
    const end = () => last = null;
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
  }
  function swapBall(b) {
    if (!lab) return;
    const keep = lab;
    lab = { ...startingLab(b), photo: keep.photo, system: keep.system, pap: keep.pap, grip: keep.grip, hand: keep.hand, rev: keep.rev, speed: keep.speed, dual: keep.dual, pb: keep.pb, ls2: keep.ls2, compare: keep.compare };
    draw2();
  }
  function switchSystem(sys) {
    if (!lab || !solved) return;
    readFields();
    const e = solved.eq;
    lab.pb = { pinToPap: e.pinbuffer.pinToPap, psaToPap: e.pinbuffer.psaToPap, pinBuffer: e.pinbuffer.pinBuffer };
    lab.ls2 = { pinToPap: e.ls2.pinToPap, psaToPap: e.ls2.psaToPap, pinToGrip: e.ls2.pinToGrip };
    lab.dual = { drilling: e.dual.drilling, pinToPap: e.dual.pinToPap, valAngle: e.dual.valAngle };
    lab.system = sys;
    draw2();
  }
  function faceView(which) {
    if (!solved) return;
    const p = solved.points;
    view = which === "grip" ? facing([0, 0, 1]) : which === "pap" ? facing(p.pap) : which === "pin" ? facing(p.pin) : which === "psa" ? facing(p.psa) : facing([0, 0, -1]);
    update(true);
  }
  function loadSheet(id) {
    const x = S.profile?.sheets?.find((s) => s.id === id);
    if (!x || !lab) return;
    lab = { ...lab, ball: { ...x.ball }, system: x.system, dual: x.dual, pb: x.pb, ls2: x.ls2, pap: { ...x.pap }, grip: { ...lab.grip, ...x.grip }, hand: x.hand, rev: x.rev, speed: x.speed, notes: x.notes };
    draw2();
  }
  var layoutLine = (s) => `${Math.round(s.eq.dual.drilling)}\xB0 \xD7 ${fractionInches(s.eq.dual.pinToPap)} \xD7 ${Math.round(s.eq.dual.valAngle)}\xB0`;
  function update(canvasOnly = false) {
    if (!lab || !solved) return;
    const l = lab;
    const canvas = document.getElementById("lb-canvas");
    if (canvas) drawBall(canvas, l, solved, flare, view);
    const problems = document.getElementById("lb-problems");
    if (problems && !canvasOnly) problems.textContent = solved.ok ? "" : solved.problems.join(" ");
    if (canvasOnly) return;
    const out = document.getElementById("lb-out");
    if (!out) return;
    const s = solved, e = s.eq, f = flare;
    const bp = bowlerProfile();
    const sug = suggestDualAngle({ ...bp, revRpm: l.rev, launchSpeed: l.speed }, null, l.ball.totalDiff);
    const sum = s.angleSum;
    const inRange = sum >= sug.sumRange[0] && sum <= sug.sumRange[1];
    const dom = bowlerDominance(l.rev, l.speed);
    const bar = (v, max) => `<div style="height:8px;border-radius:4px;background:rgba(255,255,255,.1)"><div style="height:8px;border-radius:4px;width:${Math.min(100, v / Math.max(0.01, max) * 100)}%;background:linear-gradient(90deg,#46e6ff,#ff4fd8)"></div></div>`;
    out.innerHTML = s.ok ? `<div class="card"><div class="k">The same layout in every system</div><table>
        <tr><td>Dual Angle</td><td class="n"><b>${Math.round(e.dual.drilling)}\xB0 \xD7 ${fractionInches(e.dual.pinToPap)} \xD7 ${Math.round(e.dual.valAngle)}\xB0</b></td></tr>
        <tr><td>Pin Buffer (VLS)</td><td class="n"><b>${fractionInches(e.pinbuffer.pinToPap)} \xD7 ${fractionInches(e.pinbuffer.psaToPap)} \xD7 ${fractionInches(e.pinbuffer.pinBuffer)}</b></td></tr>
        <tr><td>2LS</td><td class="n"><b>${fractionInches(e.ls2.pinToPap)} \xD7 ${fractionInches(e.ls2.psaToPap)} \xD7 ${fractionInches(e.ls2.pinToGrip)}</b></td></tr>
        <tr><td>Where the pin sits</td><td class="n">${esc(s.pinPlacement.label)}</td></tr>
        <tr><td>PAP to grip center</td><td class="n">${fractionInches(s.papToGrip)}</td></tr></table>
        <div class="note">All distances are along the surface of a 27 inch ball. Dual Angle is drilling angle \xD7 pin to PAP \xD7 angle to the VAL; Pin Buffer is pin to PAP \xD7 PSA to PAP \xD7 pin buffer; 2LS is pin to PAP \xD7 PSA to PAP \xD7 pin to center of grip.</div></div>
      <div class="card"><div class="k">What this ball might do (${Math.round(l.rev)} RPM, ${fmt2(l.speed, 1)} mph)</div>
        ${f ? `<div class="u"><b>Track flare after 30 ft: about ${fmt2(f.flare30In, 1)} in</b> \u2014 ${Math.round(f.usePct * 100)}% of this ball's ${fmt2(f.potential30In, 1)} in potential.</div>
          ${f.checkpoints.map((c) => `<div class="row" style="padding:4px 0"><span class="note" style="width:70px">${Math.round(c.ft)} ft</span><div style="flex:1;margin:0 8px">${bar(c.flareIn, Math.max(f.potential30In * 1.6, 0.5))}</div><span class="n">${fmt2(c.flareIn, 1)} in</span></div>`).join("")}
          <div class="u">${f.cycleRevs === null ? "This ball barely wobbles, so there's no track flare to speak of." : `The spin axis takes about ${Math.round(f.cycleRevs)} revolutions to finish one wobble (${fmt2(f.cycleRevs / (l.rev / 60), 1)} s at your rev rate): ${f.cycleRevs < 35 ? "it settles quickly, so the ball rolls earlier" : f.cycleRevs > 70 ? "it settles slowly, so the ball holds its skid longer" : "a medium settle"}.`}</div>
          <ul>${f.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}</div>
      <div class="card"><div class="k">How it fits you</div>
        <div class="u">You're ${dom === "rev" ? "rev-dominant" : dom === "speed" ? "speed-dominant" : "balanced between speed and revs"}. For you the angle sum (drilling angle plus angle to the VAL) is best around ${sug.sumRange[0]}-${sug.sumRange[1]}\xB0. This layout's is <b>${Math.round(sum)}\xB0</b>: ${inRange ? "in that range." : sum < sug.sumRange[0] ? "smaller, so the ball will turn speed into rotation sooner than your numbers suggest." : "larger, so the ball will hold its energy longer than your numbers suggest."}</div>
        <ul>${transitionRead(sum, e.dual.drilling, e.dual.valAngle).map((t) => `<li>${esc(t)}</li>`).join("")}${sug.why.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
        <div class="u">Rule-of-thumb start for you: <b>${sug.drilling}\xB0 \xD7 ${fractionInches(sug.pinToPap)} \xD7 ${sug.valAngle}\xB0</b>. Rules come from the Dual Angle paper by MoRich; your driller adjusts them for your PAP, your hand and your lanes.</div></div>
      ${l.compare ? `<div class="card"><div class="k">Compared with A</div><table><tr><th></th><th class="n">A</th><th class="n">Now</th></tr>
        <tr><td>Layout</td><td class="n">${esc(layoutLine(l.compare.solved))}</td><td class="n">${esc(layoutLine(s))}</td></tr>
        <tr><td>Angle sum</td><td class="n">${Math.round(l.compare.solved.angleSum)}\xB0</td><td class="n">${Math.round(sum)}\xB0</td></tr>
        <tr><td>Flare at 30 ft</td><td class="n">${fmt2(l.compare.flare.flare30In, 1)} in</td><td class="n">${f ? fmt2(f.flare30In, 1) : "-"} in</td></tr>
        <tr><td>Settle (revs)</td><td class="n">${l.compare.flare.cycleRevs === null ? "-" : Math.round(l.compare.flare.cycleRevs)}</td><td class="n">${f?.cycleRevs == null ? "-" : Math.round(f.cycleRevs)}</td></tr></table><div class="note">A: ${esc(l.compare.label)}</div></div>` : ""}` : `<div class="card"><div class="u">That layout can't be drawn: ${esc(s.problems.join(" "))}</div></div>`;
    void R;
  }
  function openDrillSheet() {
    if (!lab || !solved || !solved.ok) return;
    const l = lab, s = solved, e = s.eq;
    const el = $("report");
    el.classList.add("on");
    const shots = [];
    for (const [name, m] of [["Grip view", facing([0, 0, 1])], ["PAP view", facing(s.points.pap)], ["Pin view", facing(s.points.pin)]]) {
      const c = document.createElement("canvas");
      c.width = 420;
      c.height = 420;
      drawBall(c, l, s, flare, m, { labels: true });
      shots.push(`<div style="text-align:center"><img src="${c.toDataURL("image/png")}" style="width:100%;max-width:230px;background:#0b1220;border-radius:12px"><div class="note">${name}</div></div>`);
    }
    const p = S.profile;
    el.innerHTML = `
    <div class="row noprint"><button class="btn" onclick="window.print()">Print or save PDF</button><button class="btn ghost" id="ds-close">Close</button></div>
    <h2>Drill sheet</h2>
    <div class="note">${esc((/* @__PURE__ */ new Date()).toLocaleDateString([], { dateStyle: "long" }))} \xB7 ${esc(p?.name ?? "")}${p?.username ? ` (@${esc(p.username)})` : ""} \xB7 ${l.hand === "R" ? "right" : "left"}-handed${l.grip.noThumb ? ", no thumb hole" : ""}</div>
    <div class="card"><div class="k">Ball</div><b>${esc(l.ball.manufacturer ? l.ball.manufacturer + " " : "")}${esc(l.ball.name)}</b><div class="u">RG ${fmt2(l.ball.rg, 3)} \xB7 differential ${fmt2(l.ball.totalDiff, 3)} \xB7 ${l.ball.symmetric ? "symmetric core" : `asymmetric core, intermediate ${fmt2(l.ball.intDiff, 3)}`}${l.ball.pinToCg ? ` \xB7 pin to CG ${fractionInches(l.ball.pinToCg)}` : ""}${l.ball.mb ? ` \xB7 mass bias ${fractionInches(l.ball.mb.dist)} from the pin at ${Math.round(l.ball.mb.angle)}\xB0 from the pin-to-PSA line` : ""}</div></div>
    <div class="card"><div class="k">Layout, in every system</div><table>
      <tr><td>Dual Angle</td><td class="n"><b>${Math.round(e.dual.drilling)}\xB0 \xD7 ${fractionInches(e.dual.pinToPap)} \xD7 ${Math.round(e.dual.valAngle)}\xB0</b></td></tr>
      <tr><td>Pin Buffer</td><td class="n"><b>${fractionInches(e.pinbuffer.pinToPap)} \xD7 ${fractionInches(e.pinbuffer.psaToPap)} \xD7 ${fractionInches(e.pinbuffer.pinBuffer)}</b></td></tr>
      <tr><td>2LS</td><td class="n"><b>${fractionInches(e.ls2.pinToPap)} \xD7 ${fractionInches(e.ls2.psaToPap)} \xD7 ${fractionInches(e.ls2.pinToGrip)}</b></td></tr>
      <tr><td>Pin placement</td><td class="n">${esc(s.pinPlacement.label)}</td></tr></table></div>
    <div class="card"><div class="k">Bowler and grip</div><table>
      <tr><td>PAP (over, up)</td><td class="n">${fractionInches(l.pap.over)} over, ${fractionInches(Math.abs(l.pap.up))} ${l.pap.up < 0 ? "down" : "up"}</td></tr>
      <tr><td>Rev rate \xB7 speed</td><td class="n">${Math.round(l.rev)} RPM \xB7 ${fmt2(l.speed, 1)} mph</td></tr>
      ${l.grip.noThumb ? "" : `<tr><td>Span</td><td class="n">${fractionInches(l.grip.span)}</td></tr><tr><td>Thumb hole</td><td class="n">${fractionInches(l.grip.thumbDia)}</td></tr>`}
      <tr><td>Finger holes</td><td class="n">${fractionInches(l.grip.fingerDia)}</td></tr><tr><td>Bridge</td><td class="n">${fractionInches(l.grip.bridge)}</td></tr></table></div>
    <div class="card"><div class="k">The ball</div><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:space-around">${shots.join("")}</div></div>
    ${flare ? `<div class="card"><div class="k">Flare preview</div><div class="u">About ${fmt2(flare.flare30In, 1)} in of track flare after 30 ft (${Math.round(flare.usePct * 100)}% of this ball's ${fmt2(flare.potential30In, 1)} in potential). Angle sum ${Math.round(s.angleSum)}\xB0. Model estimate without the lane: compare layouts, don't read it as a measurement.</div></div>` : ""}
    ${l.notes ? `<div class="card"><div class="k">Notes</div><div class="u">${esc(l.notes)}</div></div>` : ""}
    <div class="note">Distances are along the surface of a 27 inch ball. Check the ball maker's own drilling sheet and your own measurements before drilling.</div>`;
    $("ds-close").onclick = () => (el.classList.remove("on"), el.innerHTML = "");
  }

  // camera/ballimg.ts
  var COLORS = [[/black|onyx|coal|jet/, 230, 8], [/purple|violet|plum/, 275, 45], [/blue|navy|cobalt|sapphire|ocean/, 215, 55], [/teal|aqua|cyan|turquoise/, 180, 50], [/green|emerald|lime|jade/, 140, 45], [/red|crimson|ruby|cherry|maroon/, 355, 55], [/orange|copper|bronze/, 25, 60], [/gold|yellow|amber/, 45, 60], [/pink|magenta|orchid/, 320, 50], [/silver|grey|gray|steel|graphite|smoke|white|ivory/, 220, 8]];
  function ballThumb(b, size = 72) {
    const c = (b.colorway?.value ?? "").toLowerCase();
    const [h, s] = COLORS.find(([re]) => re.test(c))?.slice(1) ?? [215, 30];
    const ball = `<div style="position:absolute;inset:14%;border-radius:50%;background:radial-gradient(circle at 35% 30%,hsl(${h},${s}%,55%),hsl(${h},${s}%,14%))"></div>`;
    const img = b.imageUrl ? `<img src="${esc(b.imageUrl.value)}" alt="${esc(b.manufacturer + " " + b.name)}" loading="lazy" referrerpolicy="no-referrer" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#fff" onerror="this.remove()">` : "";
    return `<div style="position:relative;flex:none;width:${size}px;height:${size}px;border-radius:14px;overflow:hidden;background:rgba(255,255,255,.06);border:1px solid var(--line)">${ball}${img}</div>`;
  }

  // camera/playbook.ts
  function playbookSections(pattern) {
    const bp = bowlerProfile();
    const owned = ownedBalls();
    const strike = owned.filter((b) => b.specs && !isSpareBall(b.specs));
    const ownedKeys = new Set(S.arsenal.map((b) => b.catalogKey).filter(Boolean));
    const opt = optimizeArsenal({ bowler: bp, owned, catalog: S.catalog, ownedKeys, tonight: pattern ?? null });
    return buildPlaybook({
      name: S.profile?.name,
      style: bp.style,
      hand: bp.hand,
      level: S.profile?.quiz?.level,
      revRpm: bp.revRpm,
      revSource: bp.revSource,
      speedMph: bp.launchSpeed,
      axisRotation: bp.axisRotation,
      axisTilt: bp.axisTilt,
      pap: S.profile?.spin?.pap,
      hasFit: !!S.profile?.fit,
      ownedBalls: owned.length,
      strikeBalls: strike.length,
      hasSpare: owned.some((b) => b.specs && isSpareBall(b.specs)),
      coverageScore: opt.score,
      pattern: pattern ?? null
    });
  }
  function playbookHtml(pattern) {
    return playbookSections(pattern).map((s) => `<div class="card"><div class="k">${esc(s.title)}</div><ul>${s.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>`).join("");
  }
  function openPlaybook(pattern) {
    const sections = playbookSections(pattern);
    const el = $("playbook");
    el.classList.add("on");
    el.innerHTML = `
    <div class="row noprint"><h2>Your pro shop playbook</h2><div><button class="btn ghost" onclick="window.print()">Print</button> <button class="btn ghost" id="pb-close">Close</button></div></div>
    <div class="note">Built from your profile${S.profile?.name ? `, ${esc(S.profile.name)}` : ""}. It changes as the app learns more about you: speed from the camera, revs, axis, your PAP and your arsenal.</div>
    ${sections.map((s) => `<div class="card"><div class="k">${esc(s.title)}</div><ul>${s.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>`).join("")}
    <div class="note">General guidance, not a substitute for a fitting by a qualified pro shop operator.</div>`;
    $("pb-close").onclick = () => (el.classList.remove("on"), el.innerHTML = "");
  }

  // core/src/layout.ts
  function releaseStrength(b) {
    let v = 0;
    const known = [];
    if (b.revRpm !== void 0) {
      v += Math.max(-1, Math.min(1, (b.revRpm - 350) / 150)) * 0.5;
      known.push("rev rate");
    }
    if (b.axisTilt !== void 0) {
      v += Math.max(-1, Math.min(1, (b.axisTilt - 10) / 12)) * 0.25;
      known.push("axis tilt");
    }
    if (b.axisRotation !== void 0) {
      v += Math.max(-1, Math.min(1, (b.axisRotation - 55) / 35)) * 0.15;
      known.push("axis rotation");
    }
    if (b.launchSpeed !== void 0) {
      v -= Math.max(-1, Math.min(1, (b.launchSpeed - 17) / 4)) * 0.1;
      known.push("ball speed");
    }
    return { value: Math.max(-1, Math.min(1, v)), known };
  }
  var ROLE_NUDGE = { start: 0, early: -0.5, carry: 0.5 };
  var SYM_STRONG = {
    name: "Pin up, close to the PAP: earlier, stronger",
    notation: "3 to 4 in x pin up x 1/2 to 1 in",
    pinToPapIn: [3, 4],
    pinBufferIn: [0.5, 1],
    effect: "Rolls sooner and builds more continuous motion through the mid-lane. Good when the ball needs help reading."
  };
  var SYM_MID = {
    name: "Standard: pin about 4.5 in from the PAP",
    notation: "4 1/2 in x pin up or level x 3/4 in",
    pinToPapIn: [4, 5],
    pinBufferIn: [0.5, 1],
    effect: "The balanced starting layout: the ball's published reaction, nothing exaggerated."
  };
  var SYM_WEAK = {
    name: "Pin down, farther from the PAP: cleaner, later",
    notation: "5 to 6 in x pin down x 3/4 to 1 1/4 in",
    pinToPapIn: [5, 6],
    pinBufferIn: [0.75, 1.25],
    effect: "Holds energy longer for more length and a sharper backend, and calms an overreactive ball."
  };
  var ASYM_STRONG = {
    name: "Short VAL, stronger",
    notation: "4 1/2 in x 30 to 40\xB0 x 1/2 to 1 in",
    pinToPapIn: [4, 5],
    valDeg: [30, 40],
    pinBufferIn: [0.5, 1],
    effect: "Brings the mass bias into play sooner for an earlier, stronger arc. A good fit when you need more motion."
  };
  var ASYM_MID = {
    name: "Medium VAL, balanced",
    notation: "4 1/2 in x 45 to 55\xB0 x 3/4 in",
    pinToPapIn: [4, 5],
    valDeg: [45, 55],
    pinBufferIn: [0.5, 1],
    effect: "The middle-of-the-road starting point for an asymmetric ball."
  };
  var ASYM_WEAK = {
    name: "Long VAL, smoother",
    notation: "5 to 6 in x 60 to 75\xB0 x 3/4 to 1 1/4 in",
    pinToPapIn: [5, 6],
    valDeg: [60, 75],
    pinBufferIn: [0.75, 1.25],
    effect: "Mutes the asymmetry for a smoother, more predictable, later reaction on a ball that already reads strongly."
  };
  function suggestLayouts(ball, bowler, role) {
    const rs = releaseStrength(bowler);
    const asym = ball?.coreSymmetry?.value === "asymmetric";
    const nudge = Math.max(-1, Math.min(1, -rs.value * 1.2 + ROLE_NUDGE[role]));
    const set = asym ? [ASYM_STRONG, ASYM_MID, ASYM_WEAK] : [SYM_STRONG, SYM_MID, SYM_WEAK];
    const pick = nudge > 0.3 ? 0 : nudge < -0.3 ? 2 : 1;
    const order = pick === 1 ? [1, 0, 2] : pick === 0 ? [0, 1, 2] : [2, 1, 0];
    const layouts = order.slice(0, 2).map((i) => set[i]);
    const grip = [];
    const style = bowler.style;
    if (style === "two-handed") grip.push("Two-handed bowlers are usually drilled with no thumb hole (two finger holes, sometimes a small thumb slug position). The driller sets the grip for you; the layout above is about core position, not the holes.");
    else if (style === "one-hand-no-thumb") grip.push("No-thumb bowlers are drilled with two finger holes and no thumb hole, so span and pitch come from your hand, not a thumb. The layout above is about core position only.");
    else grip.push("Span and pitch (thumb and finger fit) come from measuring your hand and are separate from the core layout.");
    const notes = [
      rs.known.length ? `This release looks ${rs.value > 0.25 ? "like it makes a lot of hook" : rs.value < -0.25 ? "like it makes little hook" : "average for hook"} based on your ${rs.known.join(", ")}.` : "Rev rate, axis tilt and rotation aren't known, so this assumes an average release. Get them measured (the Me tab, or a pro shop) for a better pick.",
      nudge > 0.3 ? "That points to a layout that adds motion." : nudge < -0.3 ? "That points to a layout that calms the ball down." : "That points to a balanced layout.",
      "Layouts are starting points. A driller should check your PAP, your span and how the ball reacted before drilling anything."
    ];
    if (role === "early") notes.push('For the "hooks early" role the layout is shifted toward length and control.');
    if (role === "carry") notes.push('For the "skids or carries down" role the layout is shifted toward earlier motion.');
    return { releaseStrength: rs.value, nudge, layouts, grip, notes };
  }

  // camera/scanlab.ts
  var tess = null;
  function loadTesseract() {
    tess ??= new Promise((res, rej) => {
      if (window.Tesseract) return res(window.Tesseract);
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
      s.onload = () => window.Tesseract ? res(window.Tesseract) : rej(new Error("failed"));
      s.onerror = () => {
        tess = null;
        rej(new Error("offline"));
      };
      document.head.append(s);
    });
    return tess;
  }
  function prepare(src, c, channel, invert) {
    const out = document.createElement("canvas");
    const size = 720;
    out.width = out.height = size;
    const o = out.getContext("2d", { willReadFrequently: true });
    o.drawImage(src, c.cx - c.r, c.cy - c.r, c.r * 2, c.r * 2, 0, 0, size, size);
    const img = o.getImageData(0, 0, size, size);
    const g = new Uint8ClampedArray(size * size);
    for (let i = 0; i < g.length; i++) g[i] = channel === "r" ? img.data[i * 4] : channel === "g" ? img.data[i * 4 + 1] : channel === "b" ? img.data[i * 4 + 2] : 0.299 * img.data[i * 4] + 0.587 * img.data[i * 4 + 1] + 0.114 * img.data[i * 4 + 2];
    const sorted = Uint8ClampedArray.from(g).sort();
    const lo = sorted[Math.floor(sorted.length * 0.02)];
    const hi = sorted[Math.floor(sorted.length * 0.98)] || 255;
    for (let i = 0; i < g.length; i++) {
      let v = Math.max(0, Math.min(255, (g[i] - lo) / Math.max(1, hi - lo) * 255));
      if (invert) v = 255 - v;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    }
    o.putImageData(img, 0, 0);
    return out;
  }
  async function readText(src, c, progress) {
    const T = await loadTesseract();
    const words = /* @__PURE__ */ new Map();
    const runs = [["lum", false], ["lum", true], ["r", false], ["r", true], ["b", false], ["b", true], ["g", false], ["g", true]];
    let done = 0;
    for (const [ch, inv] of runs) {
      progress(done++, runs.length);
      const { data } = await T.recognize(prepare(src, c, ch, inv), "eng");
      for (const w of data.words) {
        const clean = w.text.replace(/[^A-Za-z0-9]/g, "");
        if (w.confidence > 40 && clean.length >= 2 && /[A-Za-z]/.test(clean)) words.set(clean.toUpperCase(), Math.max(words.get(clean.toUpperCase()) ?? 0, w.confidence));
      }
    }
    return [...words.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w).join(" ");
  }
  var specLine = (b) => [b.rg && `RG ${b.rg.value}`, b.differential && `diff ${b.differential.value}`, b.coverstock?.value, b.core?.value, b.coreSymmetry?.value, b.colorway?.value].filter(Boolean).join(" \xB7 ");
  function openScanLab(onAdded) {
    const el = $("scanlab");
    el.classList.add("on");
    const stream2 = document.getElementById("v");
    const live2 = stream2.videoWidth > 0 && !stream2.paused;
    let circle = null;
    let tap = 0;
    const work2 = document.createElement("canvas");
    let sig = null;
    el.innerHTML = `
    <div class="row"><h2>Scan a ball</h2><button class="btn ghost" id="sc-close">Close</button></div>
    <div class="note">Take a clear photo of the ball with its logo facing the camera, in even light. The app compares what it sees with the balls you've taught it and with ${S.catalog.length} catalog balls. Reading the name needs a one-time download; you can always type the name instead.</div>
    <div class="card">
      <div class="chips"><label class="chip add" style="cursor:pointer">Take or choose a photo<input id="sc-file" type="file" accept="image/*" capture="environment" style="display:none"></label>${live2 ? `<button class="chip add" id="sc-live">Use the live camera</button>` : ""}</div>
    </div>
    <div id="sc-work" class="hide">
      <div class="card"><div class="stagebox" style="position:relative"><canvas id="sc-cv" style="width:100%;height:auto;display:block"></canvas></div>
        <div class="note" id="sc-hint">Tap the center of the ball, then tap its edge. Skip this to use the middle of the photo.</div>
        <div class="field"><label>Name on the ball (read it, or type what you see)</label><input id="sc-text" placeholder="e.g. Ion Max" autocomplete="off"></div>
        <div class="chips"><button class="btn ghost" id="sc-ocr">Read the name from the photo</button><button class="btn" id="sc-go">Identify</button></div>
        <div class="note" id="sc-ocr-note"></div></div>
      <div id="sc-out"></div>
    </div>`;
    const cv = $("sc-cv");
    const cx = cv.getContext("2d", { willReadFrequently: true });
    const base = () => circle ?? { cx: work2.width / 2, cy: work2.height / 2, r: Math.min(work2.width, work2.height) * 0.38 };
    const redraw2 = () => {
      cv.width = work2.width;
      cv.height = work2.height;
      cx.drawImage(work2, 0, 0);
      const c = base();
      cx.strokeStyle = "#46e6ff";
      cx.lineWidth = Math.max(2, work2.width / 250);
      cx.setLineDash([10, 8]);
      cx.beginPath();
      cx.arc(c.cx, c.cy, Math.max(c.r, 4), 0, 7);
      cx.stroke();
      cx.setLineDash([]);
    };
    const show = (img, w, h) => {
      const s = Math.min(1, 1200 / Math.max(w, h));
      work2.width = Math.round(w * s);
      work2.height = Math.round(h * s);
      work2.getContext("2d").drawImage(img, 0, 0, work2.width, work2.height);
      circle = null;
      tap = 0;
      $("sc-work").classList.remove("hide");
      $("sc-out").innerHTML = "";
      redraw2();
    };
    $("sc-close").onclick = () => (el.classList.remove("on"), el.innerHTML = "");
    $("sc-file").onchange = (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const img = new Image();
      img.onload = () => (show(img, img.naturalWidth, img.naturalHeight), URL.revokeObjectURL(img.src));
      img.src = URL.createObjectURL(f);
    };
    $("sc-live")?.addEventListener("click", () => show(stream2, stream2.videoWidth, stream2.videoHeight));
    cv.addEventListener("pointerdown", (e) => {
      const r = cv.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width * cv.width;
      const y = (e.clientY - r.top) / r.height * cv.height;
      if (tap % 2 === 0) {
        circle = { cx: x, cy: y, r: 0 };
        $("sc-hint").textContent = "Now tap the edge of the ball.";
      } else {
        circle.r = Math.max(20, Math.hypot(x - circle.cx, y - circle.cy));
        $("sc-hint").textContent = "Ball marked. Read the name, type it, or tap Identify.";
      }
      tap++;
      redraw2();
    });
    const signature = () => {
      const c = base();
      const k2 = 32;
      const t = document.createElement("canvas");
      t.width = t.height = k2;
      const tc = t.getContext("2d", { willReadFrequently: true });
      tc.drawImage(work2, c.cx - c.r * 0.8, c.cy - c.r * 0.8, c.r * 1.6, c.r * 1.6, 0, 0, k2, k2);
      return normalize(signatureCounts(tc.getImageData(0, 0, k2, k2).data, k2));
    };
    $("sc-ocr").onclick = async () => {
      const note = $("sc-ocr-note");
      note.textContent = "Reading the name\u2026 (the first time this downloads a small text reader)";
      try {
        const text = await readText(work2, base(), (d, n) => note.textContent = `Reading the name\u2026 (${d + 1}/${n})`);
        $("sc-text").value = text;
        note.textContent = text ? "Read these words. Correct them if they're wrong, then tap Identify." : "Couldn't read any text. Try a closer photo with the logo facing you, or type the name.";
      } catch {
        note.textContent = "The text reader needs an internet connection the first time. Type the name instead, or connect and try again.";
      }
    };
    $("sc-go").onclick = () => {
      sig = signature();
      const text = $("sc-text").value.trim();
      const out = $("sc-out");
      const mine = identifyInArsenal(sig, S.arsenal);
      const myBall = mine && mine.confidence >= 0.45 ? S.arsenal.find((b) => b.id === mine.ballId) : void 0;
      const found = identifyFromCatalog({ text: text || void 0, sig, catalog: S.catalog }, 6);
      out.innerHTML = `
      ${myBall ? `<div class="card"><div class="k">Looks like a ball you already have</div><div class="lr-head">${esc(myBall.name)}</div><div class="u">${Math.round(mine.confidence * 100)}% match to the looks you've taught it.</div></div>` : ""}
      <div class="card"><div class="k">${text ? "Best matches in the catalog" : "Possible matches from colors alone"}</div>
        ${found.length ? found.map((f, i) => card(f, i)).join("") : `<div class="u">No confident match. Type the name printed on the ball and tap Identify again.</div>`}
        ${text ? "" : `<div class="note">Colors alone are weak evidence. Add the name on the ball for a real answer.</div>`}</div>`;
      out.querySelectorAll("[data-add]").forEach(
        (b) => b.onclick = async () => {
          const ball = found[Number(b.dataset.add)].ball;
          const mineAlready = S.arsenal.find((x) => x.catalogKey === ball.key);
          if (mineAlready) mineAlready.exemplars = [...mineAlready.exemplars, sig].slice(-12);
          else {
            const nb = { id: Math.random().toString(36).slice(2, 9), name: `${ball.manufacturer} ${ball.name}`, exemplars: [sig], catalogKey: ball.key };
            S.arsenal.push(nb);
          }
          await saveArsenal();
          onAdded();
          $("sc-close").click();
        }
      );
    };
    function card(f, i) {
      const b = f.ball;
      const inArsenal = S.arsenal.some((x) => x.catalogKey === b.key);
      return `<div style="padding:10px 0;border-top:1px solid var(--line)"><div class="row"><b>${esc(b.manufacturer)} ${esc(b.name)}</b><span class="badge ${f.confidence === "strong" ? "good" : f.confidence === "likely" ? "moderate" : "tentative"}">${f.confidence}</span></div>
      <div class="u">${esc(specLine(b))}</div><div class="note">${esc(f.evidence.join(" \xB7 "))}</div>
      <div class="chips"><button class="chip" data-add="${i}">${inArsenal ? "Teach it this look" : "This is my ball: add it"}</button></div></div>`;
    }
  }

  // camera/sync.ts
  var ICE = [{ urls: "stun:stun.l.google.com:19302" }];
  var sheet3 = () => $("friends");
  var close3 = () => (sheet3().classList.remove("on"), sheet3().innerHTML = "");
  var live = null;
  var myLane = "";
  var listening = false;
  var me = () => ({ name: S.profile?.name ?? "A bowler", username: S.profile?.username, code: S.profile?.friendCode ?? "" });
  async function gathered(pc) {
    if (pc.iceGatheringState !== "complete")
      await new Promise((res) => {
        const done = () => pc.iceGatheringState === "complete" && (pc.removeEventListener("icegatheringstatechange", done), res());
        pc.addEventListener("icegatheringstatechange", done);
        setTimeout(res, 5e3);
      });
    return pc.localDescription.sdp;
  }
  function wire2(l, dc) {
    l.dc = dc;
    dc.onopen = () => {
      l.state = "connected";
      send({ t: "hi", who: me(), lane: myLane });
      const mine = S.shots.filter((s) => s.sessionId === S.sessionId).slice(-40).map(sharedShotOf);
      l.mine = mine;
      if (mine.length) send({ t: "shots", shots: mine });
      render();
    };
    dc.onclose = () => {
      if (l.state !== "ended") l.state = "ended";
      render();
    };
    dc.onmessage = (e) => {
      try {
        const m = JSON.parse(String(e.data));
        if (m.t === "hi" && m.who?.code) {
          l.peer = { name: String(m.who.name ?? "Friend").slice(0, 40), username: isUsername(m.who.username ?? "") ? m.who.username : void 0, code: String(m.who.code).slice(0, 8) };
          l.peerLane = String(m.lane ?? "").slice(0, 60);
        } else if (m.t === "lane") l.peerLane = String(m.lane ?? "").slice(0, 60);
        else if (m.t === "shots" && Array.isArray(m.shots)) l.theirs = m.shots.slice(-60).filter(validShot);
        else if (m.t === "shot" && validShot(m.shot)) l.theirs = [...l.theirs, m.shot].slice(-60);
        render();
      } catch {
      }
    };
  }
  var validShot = (s) => !!s && typeof s.sp === "number" && Array.isArray(s.p) && s.p.length <= 80 && s.p.every((x) => typeof x === "number");
  function send(m) {
    if (live?.dc?.readyState === "open") live.dc.send(JSON.stringify(m));
  }
  function listen() {
    if (listening) return;
    listening = true;
    onShot((s) => {
      if (!live || live.state !== "connected") return;
      const sh = sharedShotOf(s);
      live.mine = [...live.mine, sh].slice(-60);
      send({ t: "shot", shot: sh });
      render();
    });
  }
  function newLive() {
    live?.pc.close();
    const pc = new RTCPeerConnection({ iceServers: ICE });
    const l = { pc, dc: null, peer: null, peerLane: "", mine: [], theirs: [], state: "waiting" };
    pc.onconnectionstatechange = () => {
      if (["failed", "disconnected", "closed"].includes(pc.connectionState) && l.state === "connected") {
        l.state = "ended";
        render();
      }
    };
    live = l;
    listen();
    return l;
  }
  function openLive() {
    if (live && live.state !== "ended") return render();
    const el = sheet3();
    el.classList.add("on");
    el.innerHTML = `
    <div class="row"><h2>Bowl together, live</h2><button class="btn ghost" id="lv-close">Close</button></div>
    <div class="note">Connect two phones, even on different lanes, and see each other's shots as they happen. The phones talk directly to each other: nothing is stored on a server, and nothing is sent until you connect.</div>
    <div class="card"><div class="k">You start it</div><div class="u">Make a link, send it to your friend, then paste the reply code they send back.</div><div class="chips"><button class="btn" id="lv-host">Start a live session</button></div></div>
    <div class="card"><div class="k">Your friend started it</div><div class="u">Open the link they sent (it opens this app), or paste it here.</div><div class="field"><input id="lv-link" placeholder="Paste their link or code"></div><div class="chips"><button class="btn ghost" id="lv-join">Join</button></div><div class="note" id="lv-msg"></div></div>
    <div class="note">How it connects: a public STUN server (Google's) is used only so each phone can learn its own network address. Some work or school networks block direct connections; if yours does, share a session link instead.</div>`;
    $("lv-close").onclick = close3;
    $("lv-host").onclick = host;
    $("lv-join").onclick = async () => {
      const raw = $("lv-link").value.trim();
      const code = /#live=(.+)$/.exec(raw)?.[1] ?? raw;
      if (!code) return void ($("lv-msg").textContent = "Paste the link your friend sent.");
      await joinFrom(code);
    };
  }
  async function host() {
    const el = sheet3();
    el.innerHTML = `<div class="row"><h2>Starting\u2026</h2></div><div class="note">Getting your connection ready. Keep the app open.</div>`;
    const l = newLive();
    wire2(l, l.pc.createDataChannel("laneiq"));
    await l.pc.setLocalDescription(await l.pc.createOffer());
    const offer = await packText(JSON.stringify({ v: 1, sdp: await gathered(l.pc), who: me() }));
    const link = `${appLink()}/#live=${offer}`;
    if (location.search.includes("livetest")) globalThis.__live = { link, offer };
    el.innerHTML = `
    <div class="row"><h2>Send this to your friend</h2><button class="btn ghost" id="lv-close">Cancel</button></div>
    <div class="card"><div class="k">1. Send the link</div><div class="u" style="word-break:break-all;max-height:5.5em;overflow:hidden">${esc(link.slice(0, 160))}\u2026</div><div class="chips"><button class="btn" id="lv-send">Send link</button></div><div class="note" id="lv-sent"></div></div>
    <div class="card"><div class="k">2. Paste their reply</div><div class="u">When they open the link they get a short reply code. Paste it here. Keep this screen open until then.</div><div class="field"><input id="lv-reply" placeholder="Paste the reply code"></div><div class="chips"><button class="btn" id="lv-connect">Connect</button></div><div class="note" id="lv-msg"></div></div>`;
    $("lv-close").onclick = () => (live?.pc.close(), live = null, close3());
    $("lv-send").onclick = async () => ($("lv-sent").textContent = await shareLink("Bowl with me on LaneIQ", `${me().name} wants to sync shots live on LaneIQ. Open this to join.`, link), void 0);
    $("lv-connect").onclick = async () => {
      const code = $("lv-reply").value.trim().replace(/^LIVE-/, "");
      const json = code ? await unpackText(code) : null;
      let ans = null;
      try {
        ans = json ? JSON.parse(json) : null;
      } catch {
      }
      if (!ans?.sdp || !ans.who?.code) return void ($("lv-msg").textContent = "That reply code isn't right. Ask your friend to send it again.");
      try {
        await l.pc.setRemoteDescription({ type: "answer", sdp: ans.sdp });
        $("lv-msg").textContent = "Connecting\u2026";
      } catch {
        $("lv-msg").textContent = "Couldn't use that reply. Start a new session and try again.";
      }
    };
  }
  async function joinFrom(code) {
    const json = await unpackText(code);
    let offer = null;
    try {
      offer = json ? JSON.parse(json) : null;
    } catch {
    }
    const el = sheet3();
    el.classList.add("on");
    if (!offer?.sdp || !offer.who?.code) {
      el.innerHTML = `<div class="row"><h2>Live session</h2><button class="btn ghost" id="lv-close">Close</button></div><div class="card"><div class="u">That link is damaged or isn't a LaneIQ live session.</div></div>`;
      $("lv-close").onclick = close3;
      return;
    }
    const from = offer.who;
    el.innerHTML = `<div class="row"><h2>Join ${esc(from.name)}?</h2><button class="btn ghost" id="lv-close">Not now</button></div><div class="card"><div class="lr-head">${esc(from.name)}${from.username ? ` <span class="note">@${esc(from.username)}</span>` : ""}</div><div class="u">wants to sync shots live while you bowl. Your shots go straight to their phone while you're connected.</div><div class="chips"><button class="btn" id="lv-yes">Join</button></div></div>`;
    $("lv-close").onclick = close3;
    $("lv-yes").onclick = async () => {
      el.innerHTML = `<div class="row"><h2>Connecting\u2026</h2></div><div class="note">Getting your reply ready. Keep the app open.</div>`;
      const l = newLive();
      l.pc.ondatachannel = (e) => wire2(l, e.channel);
      await l.pc.setRemoteDescription({ type: "offer", sdp: offer.sdp });
      await l.pc.setLocalDescription(await l.pc.createAnswer());
      const reply = await packText(JSON.stringify({ v: 1, sdp: await gathered(l.pc), who: me() }));
      if (location.search.includes("livetest")) globalThis.__live = { reply };
      el.innerHTML = `
      <div class="row"><h2>Send this reply back</h2><button class="btn ghost" id="lv-close">Cancel</button></div>
      <div class="card"><div class="u">Send this code to ${esc(from.name)}. They paste it in their app and you're connected. Keep this screen open until then.</div><div class="u" style="word-break:break-all;user-select:all;max-height:6em;overflow:auto">${esc(reply)}</div><div class="chips"><button class="btn" id="lv-sendreply">Send reply</button></div><div class="note" id="lv-sent"></div></div>`;
      $("lv-close").onclick = () => (live?.pc.close(), live = null, close3());
      $("lv-sendreply").onclick = async () => {
        try {
          await navigator.clipboard.writeText(reply);
        } catch {
        }
        const nav = navigator;
        try {
          if (nav.share) await nav.share({ title: "LaneIQ reply", text: reply });
          $("lv-sent").textContent = "Reply copied. Paste it into a message to them.";
        } catch {
          $("lv-sent").textContent = "Reply copied. Paste it into a message to them.";
        }
      };
    };
  }
  function render() {
    if (!live) return;
    const l = live;
    if (!sheet3().classList.contains("on") || !$("friends").dataset.live) {
      if (l.state === "waiting") return;
    }
    const el = sheet3();
    el.classList.add("on");
    el.dataset.live = "1";
    const peerName = l.peer ? `${esc(l.peer.name)}${l.peer.username ? ` <span class="note">@${esc(l.peer.username)}</span>` : ""}` : "your friend";
    const last = (a) => a[a.length - 1];
    const fmt3 = (v, d = 1) => v === null || v === void 0 ? "-" : v.toFixed(d);
    const row = (label2, a, b, d = 1) => `<tr><td>${label2}</td><td class="n">${fmt3(a, d)}</td><td class="n">${fmt3(b, d)}</td></tr>`;
    const same = !!myLane && !!l.peerLane && myLane.toLowerCase() === l.peerLane.toLowerCase();
    el.innerHTML = `
    <div class="row"><h2>Live with ${peerName}</h2><button class="btn ghost" id="lv-close">${l.state === "connected" ? "Hide" : "Close"}</button></div>
    <div class="card"><span class="badge ${l.state === "connected" ? "good" : "tentative"}">${l.state === "connected" ? "connected" : l.state === "ended" ? "disconnected" : "connecting\u2026"}</span>
      <div class="field" style="margin-top:8px"><label>Where are you bowling? (center and lane)</label><input id="lv-lane" value="${esc(myLane)}" placeholder="e.g. AMF 14"></div>
      <div class="u">${l.peerLane ? `${peerName} is on ${esc(l.peerLane)}${same ? " (the same lane)" : ""}.` : "Waiting for their lane."}</div></div>
    <div class="card"><div class="stagebox"><canvas id="lv-map" width="360" height="560" style="width:100%;height:auto;aspect-ratio:360/560"></canvas></div>
      <div class="note"><span style="color:#46e6ff">Cyan: you (${l.mine.length})</span> \xB7 <span style="color:#ffd25a">Gold: ${peerName} (${l.theirs.length})</span></div></div>
    <div class="card"><table><tr><th>Latest shot</th><th class="n">You</th><th class="n">${l.peer ? esc(l.peer.name) : "Them"}</th></tr>
      ${row("Speed (mph)", last(l.mine)?.sp, last(l.theirs)?.sp)}${row("Board at arrows", last(l.mine)?.ar, last(l.theirs)?.ar)}${row("Breakpoint board", last(l.mine)?.bb, last(l.theirs)?.bb)}${row("Breakpoint (ft)", last(l.mine)?.bf, last(l.theirs)?.bf, 0)}${row("Entry board", last(l.mine)?.en, last(l.theirs)?.en)}${row("Entry angle (\xB0)", last(l.mine)?.an, last(l.theirs)?.an)}</table></div>
    <div class="chips"><button class="btn ghost" id="lv-save">Save their shots to compare later</button><button class="btn ghost" id="lv-end">End session</button></div><div class="note" id="lv-msg">${l.state === "ended" ? "The connection closed. Your shots are saved on this phone as usual." : ""}</div>`;
    $("lv-close").onclick = () => (el.dataset.live = "", close3());
    $("lv-lane").onchange = (e) => {
      myLane = e.target.value.trim();
      send({ t: "lane", lane: myLane });
      render();
    };
    $("lv-end").onclick = () => {
      l.state = "ended";
      send({ t: "bye" });
      l.pc.close();
      live = null;
      el.dataset.live = "";
      close3();
    };
    $("lv-save").onclick = async () => {
      if (!l.peer || !l.theirs.length) return void ($("lv-msg").textContent = "No shots from them yet.");
      const sess = { v: 1, from: { name: l.peer.name, code: l.peer.code }, lane: l.peerLane || "unknown lane", date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), hand: "R", shots: l.theirs };
      S.shared = [...S.shared.filter((x) => !(x.from.code === sess.from.code && x.date === sess.date && x.lane === sess.lane)), sess];
      await saveSocial();
      $("lv-msg").textContent = "Saved. You'll find it under Compare shots.";
    };
    const paths = [
      ...l.theirs.map((s) => ({ path: pathFromShared(s.p), color: "rgba(255,210,90,.75)", width: 1.6, alpha: 0.8 })),
      ...l.mine.map((s) => ({ path: pathFromShared(s.p), color: "rgba(70,230,255,.8)", width: 1.6, alpha: 0.85 }))
    ];
    drawTopDown($("lv-map").getContext("2d"), 360, 560, paths, { board: S.profile?.hand === "L" ? 22.5 : 17.5 });
  }

  // camera/friends.ts
  var LINK_KEY = "laneiq.appLink";
  var PENDING_KEY = "laneiq.pendingHash";
  var baseUrl = () => new URL(".", location.href).href.replace(/\/+$/, "");
  var PUBLIC_APP = "https://flanxe.github.io/laneiq";
  function appLink() {
    try {
      const stored = localStorage.getItem(LINK_KEY);
      if (stored) return stored.replace(/\/+$/, "");
    } catch {
    }
    return isPrivateHost(baseUrl()) ? PUBLIC_APP : baseUrl();
  }
  function setAppLink(v) {
    try {
      const t = v.trim();
      if (t) localStorage.setItem(LINK_KEY, t);
      else localStorage.removeItem(LINK_KEY);
    } catch {
    }
  }
  function isPrivateHost(link) {
    return /tailscale|\.ts\.net|localhost|127\.0\.0\.1|^https?:\/\/(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(link);
  }
  async function shareLink(title, text, url) {
    const nav = navigator;
    try {
      if (nav.share) {
        await nav.share({ title, text, url });
        return "Opened the share sheet.";
      }
    } catch (e) {
      if (e.name === "AbortError") return "Cancelled.";
    }
    try {
      await navigator.clipboard.writeText(`${text}
${url}`);
      return "Link copied. Paste it into a message.";
    } catch {
      return "Couldn't copy automatically. Select and copy the link below.";
    }
  }
  var bytesToB64 = (b) => {
    let s = "";
    b.forEach((x) => s += String.fromCharCode(x));
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  var b64ToBytes = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  var packSession = (sess) => packText(JSON.stringify(sess));
  async function packText(json) {
    try {
      if ("CompressionStream" in window) {
        const cs = new CompressionStream("gzip");
        const w = cs.writable.getWriter();
        void w.write(new TextEncoder().encode(json));
        void w.close();
        return "z." + bytesToB64(new Uint8Array(await new Response(cs.readable).arrayBuffer()));
      }
    } catch {
    }
    return b64urlEncode(json);
  }
  async function unpackText(payload) {
    try {
      if (payload.startsWith("z.")) {
        const ds = new DecompressionStream("gzip");
        const w = ds.writable.getWriter();
        void w.write(b64ToBytes(payload.slice(2)));
        void w.close();
        const json = await new Response(ds.readable).text();
        return json.length > 4e5 ? null : json;
      }
      return b64urlDecode(payload);
    } catch {
      return null;
    }
  }
  async function unpackSession(payload) {
    const json = await unpackText(payload);
    return json === null ? null : decodeSession(b64urlEncode(json));
  }
  var sheet4 = () => $("friends");
  var close4 = () => (sheet4().classList.remove("on"), sheet4().innerHTML = "");
  var myName = () => S.profile?.name ?? "A bowler";
  var myUser = () => S.profile?.username ?? "";
  var myCode = () => {
    if (S.profile && !S.profile.friendCode) updateProfile({ friendCode: newFriendCode() });
    return S.profile?.friendCode ?? "";
  };
  function askForUsername(then) {
    const el = sheet4();
    el.classList.add("on");
    el.innerHTML = `<div class="row"><h2>Choose an account name</h2><button class="btn ghost" id="fr-close">Close</button></div>
    <div class="note">Friends add you by account name plus your friend code. Pick one (3 to 20 letters, numbers or underscores).</div>
    <div class="card"><div class="field"><label>Account name</label><input id="fr-user" placeholder="e.g. strikeking22" autocomplete="off" autocapitalize="none" spellcheck="false"></div><div class="chips"><button class="btn" id="fr-usersave">Save</button></div><div class="note" id="fr-usermsg"></div></div>`;
    $("fr-close").onclick = close4;
    $("fr-usersave").onclick = () => {
      const u = cleanUsername($("fr-user").value);
      if (!isUsername(u)) return void ($("fr-usermsg").textContent = "Use 3 to 20 letters, numbers or underscores, no spaces.");
      updateProfile({ username: u });
      then();
    };
  }
  function openInvite() {
    if (!myUser()) return askForUsername(openInvite);
    const link = `${appLink()}/#invite=${encodeInvite(myName(), myCode(), myUser())}`;
    const warn = isPrivateHost(appLink());
    const el = sheet4();
    el.classList.add("on");
    el.innerHTML = `
    <div class="row"><h2>Invite a player</h2><button class="btn ghost" id="fr-close">Close</button></div>
    <div class="note">This link brings someone to the app and sends them a friend request from you. When they accept, they can send theirs back so you're both friends. Nothing is uploaded: the link itself carries your name and friend code.</div>
    ${warn ? `<div class="card"><div class="lr-head" style="font-size:16px">This address only works on your own network</div><div class="u">The link points at ${esc(appLink())}, which friends can't open. Set the public address of the app in <b>Me \u2192 Friends</b> before inviting people.</div></div>` : ""}
    <div class="card"><div class="k">Your invite link</div><div class="u" style="word-break:break-all;user-select:all">${esc(link)}</div>
      <div class="chips"><button class="btn" id="fr-send">Send invite / friend request</button></div><div class="note" id="fr-msg"></div></div>`;
    $("fr-close").onclick = close4;
    $("fr-send").onclick = async () => ($("fr-msg").textContent = await shareLink("Join me on LaneIQ", `${myName()} invited you to LaneIQ and wants to be friends so you can compare shots on the same lane.`, link), void 0);
  }
  function openFriendRequest(from, kind) {
    const el = sheet4();
    el.classList.add("on");
    const already = S.friends.some((f) => f.code === from.code);
    const self = from.code === myCode();
    el.innerHTML = `
    <div class="row"><h2>${kind === "invite" ? "Friend request" : "Friend request accepted"}</h2><button class="btn ghost" id="fr-close">Close</button></div>
    ${self ? `<div class="card"><div class="u">That's your own link.</div></div>` : `<div class="card"><div class="lr-head">${esc(from.name)}${from.username ? ` <span class="note">@${esc(from.username)}</span>` : ""}</div><div class="u">${kind === "invite" ? "wants to be friends so you can compare shots on the same lane." : "added you. Add them back to finish connecting."}</div><div class="u">Friend code ${esc(from.code)}</div>
    <div class="chips">${already ? `<span class="tag">Already friends</span>` : `<button class="btn" id="fr-accept">Add ${esc(from.name)} as a friend</button>`}<button class="chip" id="fr-no">Not now</button></div><div class="note" id="fr-msg"></div></div>`}`;
    $("fr-close").onclick = close4;
    $("fr-no")?.addEventListener("click", close4);
    $("fr-accept")?.addEventListener("click", async () => {
      S.friends.push({ code: from.code, name: from.name, username: from.username, addedAt: (/* @__PURE__ */ new Date()).toISOString() });
      await saveSocial();
      if (kind === "reply") return close4();
      $("fr-msg").innerHTML = `Added. Send your code back so ${esc(from.name)} can add you too.`;
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = "Send confirmation";
      btn.onclick = async () => ($("fr-msg").textContent = await shareLink("Friend request accepted", `${myName()} accepted your friend request on LaneIQ. Tap to add them back.`, `${appLink()}/#reply=${encodeInvite(myName(), myCode(), myUser())}`), void 0);
      $("fr-msg").append(document.createElement("br"), btn);
    });
  }
  function buildSession(sessionId, lane) {
    const shots = S.shots.filter((s) => s.sessionId === sessionId).slice(-40);
    if (!shots.length) return null;
    return {
      v: 1,
      from: { name: myName(), code: myCode() },
      lane,
      date: new Date(shots[0].at).toISOString().slice(0, 10),
      hand: S.profile?.hand ?? "R",
      shots: shots.map(sharedShotOf)
    };
  }
  var sharedShotOf = (s) => ({
    sp: Number(s.a.speedMph.toFixed(1)),
    ar: s.m.arrowsBoard === null ? null : Number(s.m.arrowsBoard.toFixed(1)),
    bb: s.m.breakpointBoard === null ? null : Number(s.m.breakpointBoard.toFixed(1)),
    bf: s.m.breakpointFt === null ? null : Number(s.m.breakpointFt.toFixed(0)),
    en: s.m.entryBoard === null ? null : Number(s.m.entryBoard.toFixed(1)),
    an: s.a.impactAngleDeg === null ? null : Number(s.a.impactAngleDeg.toFixed(1)),
    ball: S.arsenal.find((b) => b.id === s.ballId)?.name,
    pins: s.result?.pinsDown,
    p: downsamplePath(s.path)
  });
  var sessionsOf = () => {
    const ids = [...new Set(S.shots.map((s) => s.sessionId))];
    return ids.map((id) => {
      const g = S.shots.filter((s) => s.sessionId === id);
      return { id, n: g.length, date: new Date(g[0].at).toLocaleDateString([], { month: "short", day: "numeric" }) };
    });
  };
  function openShareSession() {
    const el = sheet4();
    el.classList.add("on");
    const list = sessionsOf().reverse();
    const warn = isPrivateHost(appLink());
    el.innerHTML = `
    <div class="row"><h2>Share a session</h2><button class="btn ghost" id="fr-close">Close</button></div>
    <div class="note">Sends a compact copy of your shots from one session (paths, speed, boards, ball and pin counts, no video) so a friend can compare them with theirs on the same lane.</div>
    ${warn ? `<div class="card"><div class="u">The app address ${esc(appLink())} only works on your own network, so friends won't be able to open this link. Set the public address under Me \u2192 Friends first.</div></div>` : ""}
    ${list.length ? "" : `<div class="card"><div class="u">No sessions yet. Bowl some shots first.</div></div>`}
    <div class="field"><label>Where was it? (center and lane, e.g. AMF 14)</label><input id="fr-lane" placeholder="Center and lane"></div>
    ${list.map((s) => `<div class="card"><div class="row"><div><b>${esc(s.date)}</b> <span class="note">${s.n} shots</span></div><button class="chip" data-id="${s.id}">Share</button></div></div>`).join("")}
    <div class="note" id="fr-msg"></div>`;
    $("fr-close").onclick = close4;
    el.querySelectorAll("[data-id]").forEach(
      (b) => b.onclick = async () => {
        const lane = $("fr-lane").value.trim();
        if (!lane) return $("fr-msg").textContent = "Add where it was bowled first, so your friend can tell if it's the same lane.";
        S.laneLabels[b.dataset.id] = lane;
        await saveSocial();
        const sess = buildSession(b.dataset.id, lane);
        if (!sess) return;
        $("fr-msg").textContent = await shareLink("My shots on LaneIQ", `${myName()} shared a session from ${lane}. Open it in LaneIQ to compare with yours.`, `${appLink()}/#session=${await packSession(sess)}`);
      }
    );
  }
  function openReceivedSession(sess) {
    const el = sheet4();
    el.classList.add("on");
    const known = S.friends.some((f) => f.code === sess.from.code);
    el.innerHTML = `
    <div class="row"><h2>Shared session</h2><button class="btn ghost" id="fr-close">Close</button></div>
    <div class="card"><div class="lr-head">${esc(sess.from.name)}</div><div class="u">${esc(sess.lane)} \xB7 ${esc(sess.date)} \xB7 ${sess.shots.length} shots${sess.pattern ? ` \xB7 ${esc(sess.pattern)}` : ""}</div>
      <div class="note">${known ? "A friend of yours." : "Not in your friends yet. Saving this does not add them."}</div>
      <div class="chips"><button class="btn" id="fr-save">Save to compare</button><button class="chip" id="fr-no">Not now</button></div></div>`;
    $("fr-close").onclick = close4;
    $("fr-no").onclick = close4;
    $("fr-save").onclick = async () => {
      S.shared = [...S.shared.filter((x) => !(x.from.code === sess.from.code && x.date === sess.date && x.lane === sess.lane)), sess];
      await saveSocial();
      close4();
      openCompare(sess);
    };
  }
  function openCompare(theirs) {
    const el = sheet4();
    el.classList.add("on");
    const mine = sessionsOf().reverse();
    if (!S.shared.length || !mine.length) {
      el.innerHTML = `<div class="row"><h2>Compare</h2><button class="btn ghost" id="fr-close">Close</button></div><div class="card"><div class="u">${!S.shared.length ? "No friend sessions yet. When a friend shares a session with you and you save it, it shows up here." : "Bowl some shots first so there is something to compare."}</div></div>`;
      $("fr-close").onclick = close4;
      return;
    }
    let pickTheirs = theirs ?? S.shared[S.shared.length - 1];
    let pickMine = mine.find((m) => S.laneLabels[m.id] && pickTheirs.lane && S.laneLabels[m.id].toLowerCase() === pickTheirs.lane.toLowerCase())?.id ?? mine[0].id;
    const draw3 = () => {
      const mySess = buildSession(pickMine, S.laneLabels[pickMine] ?? "");
      const cmp = compareSessions(mySess, pickTheirs);
      const fmt3 = (v, u) => v === null ? "-" : `${v.toFixed(1)}${u === "\xB0" ? "\xB0" : u ? " " + u : ""}`;
      el.innerHTML = `
      <div class="row"><h2>Compare shots</h2><button class="btn ghost" id="fr-close">Close</button></div>
      <div class="field"><label>Their session</label><select id="cp-theirs">${S.shared.map((x, i) => `<option value="${i}" ${x === pickTheirs ? "selected" : ""}>${esc(x.from.name)} \xB7 ${esc(x.lane)} \xB7 ${esc(x.date)}</option>`).join("")}</select></div>
      <div class="field"><label>Your session</label><select id="cp-mine">${mine.map((m) => `<option value="${m.id}" ${m.id === pickMine ? "selected" : ""}>${esc(m.date)} \xB7 ${m.n} shots${S.laneLabels[m.id] ? " \xB7 " + esc(S.laneLabels[m.id]) : ""}</option>`).join("")}</select></div>
      <div class="field"><label>Where was your session? (so it can be matched to their lane)</label><input id="cp-lane" value="${esc(S.laneLabels[pickMine] ?? "")}" placeholder="Center and lane"></div>
      <div class="card"><span class="badge ${cmp.sameLane ? "good" : "tentative"}">${cmp.sameLane ? "same lane" : "different lanes"}</span><div class="stagebox" style="margin-top:10px"><canvas id="cp-map" width="360" height="600" style="width:100%;height:auto;aspect-ratio:360/600"></canvas></div>
        <div class="note"><span style="color:#46e6ff">Cyan: you</span> \xB7 <span style="color:#ffd25a">Gold: ${esc(pickTheirs.from.name)}</span></div></div>
      <div class="card"><table><tr><th></th><th class="n">You</th><th class="n">${esc(pickTheirs.from.name)}</th></tr>${cmp.rows.map((r) => `<tr><td>${esc(r.label)}</td><td class="n">${fmt3(r.mine, r.unit)}</td><td class="n">${fmt3(r.theirs, r.unit)}</td></tr>`).join("")}</table></div>
      <div class="card"><ul>${cmp.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div>`;
      $("fr-close").onclick = close4;
      $("cp-theirs").onchange = (e) => (pickTheirs = S.shared[Number(e.target.value)], draw3());
      $("cp-mine").onchange = (e) => (pickMine = e.target.value, draw3());
      $("cp-lane").onchange = async (e) => {
        S.laneLabels[pickMine] = e.target.value.trim();
        await saveSocial();
        draw3();
      };
      const paths = [
        ...pickTheirs.shots.map((s) => ({ path: pathFromShared(s.p), color: "rgba(255,210,90,.75)", width: 1.6, alpha: 0.8 })),
        ...mySess.shots.map((s) => ({ path: pathFromShared(s.p), color: "rgba(70,230,255,.8)", width: 1.6, alpha: 0.85 }))
      ];
      drawTopDown($("cp-map").getContext("2d"), 360, 600, paths, { board: S.profile?.hand === "L" ? 22.5 : 17.5 });
    };
    draw3();
  }
  function captureIncomingHash() {
    if (/^#(invite|reply|session|live)=/.test(location.hash)) {
      try {
        sessionStorage.setItem(PENDING_KEY, location.hash);
      } catch {
      }
      history.replaceState(null, "", location.pathname + location.search);
    }
  }
  async function handleIncoming() {
    let h = "";
    try {
      h = sessionStorage.getItem(PENDING_KEY) ?? "";
      sessionStorage.removeItem(PENDING_KEY);
    } catch {
    }
    if (!h || !S.profile) return;
    const [, kind, value] = /^#(invite|reply|session|live)=(.+)$/.exec(h) ?? [];
    if (!kind) return;
    if (kind === "live") return void joinFrom(value);
    if (kind === "session") {
      const s = await unpackSession(value);
      return s ? openReceivedSession(s) : void alert("That session link is damaged or isn't a LaneIQ session.");
    }
    const inv = decodeInvite(value);
    if (!inv) return void alert("That friend link is damaged.");
    openFriendRequest(inv, kind);
  }
  function friendsCardHtml() {
    const link = appLink();
    return `<div class="card"><div class="k">Friends</div>
    ${myUser() ? `<div class="note">Your account name: <b>@${esc(myUser())}</b> \xB7 your friend tag: <b>${esc(friendTag(myUser(), myCode()))}</b></div><div class="chips"><button class="chip" id="fr-copytag">Copy my tag</button></div>` : `<div class="note">Choose an account name so friends can add you.</div><div class="chips"><button class="btn" id="fr-setuser">Choose account name</button></div>`}
    <div class="field"><label>Add a friend by their tag</label><div class="chips"><input id="fr-addtag" placeholder="name#CODE, e.g. strikeking22#K7QP2MXA" autocomplete="off" autocapitalize="none" spellcheck="false" style="flex:1"><button class="chip add" id="fr-addbtn">Add</button></div><div class="note" id="fr-addmsg">Ask your friend for their tag (it is on their Me tab), or send them an invite link. There is no server to search, so a name alone cannot be looked up.</div></div>
    <div class="chips"><button class="btn" id="fr-invite">Invite a player</button><button class="btn ghost" id="fr-sharesess">Share a session</button><button class="btn ghost" id="fr-compare">Compare shots</button><button class="btn" id="fr-live">Bowl together, live</button></div>
    ${S.friends.length ? `<table>${S.friends.map((f) => `<tr><td>${esc(f.name)}${f.username ? ` <span class="note">@${esc(f.username)}</span>` : ""}</td><td class="note">${esc(f.code)}</td><td class="n"><button class="chip" data-rmf="${f.code}">Remove</button></td></tr>`).join("")}</table>` : `<div class="u" style="margin-top:8px">No friends yet.</div>`}
    ${S.shared.length ? `<div class="note" style="margin-top:8px">${S.shared.length} saved session${S.shared.length === 1 ? "" : "s"} from friends.</div>` : ""}
    <div class="field"><label>App address friends will open</label><input id="fr-link" value="${esc(link)}" placeholder="https://\u2026"></div>
    ${isPrivateHost(link) ? `<div class="note" style="color:var(--gold)">That address only works on your own network or Tailscale. Friends need a public address; set it here once the app is hosted for everyone.</div>` : ""}</div>`;
  }
  function wireFriendsCard(rerender) {
    $("fr-setuser")?.addEventListener("click", () => askForUsername(() => (close4(), rerender())));
    $("fr-copytag")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(friendTag(myUser(), myCode()));
        $("fr-copytag").textContent = "Copied";
      } catch {
        prompt("Your friend tag:", friendTag(myUser(), myCode()));
      }
    });
    $("fr-addbtn")?.addEventListener("click", async () => {
      const t = parseFriendTag($("fr-addtag").value);
      const msg = $("fr-addmsg");
      if (!t) return void (msg.textContent = "That doesn't look like a tag. It should be a name, a #, then 8 letters and numbers: strikeking22#K7QP2MXA.");
      if (t.code === myCode()) return void (msg.textContent = "That's your own tag.");
      if (S.friends.some((f) => f.code === t.code)) return void (msg.textContent = "Already in your friends.");
      S.friends.push({ code: t.code, name: t.username, username: t.username, addedAt: (/* @__PURE__ */ new Date()).toISOString() });
      await saveSocial();
      rerender();
    });
    $("fr-invite")?.addEventListener("click", openInvite);
    $("fr-sharesess")?.addEventListener("click", openShareSession);
    $("fr-compare")?.addEventListener("click", () => openCompare());
    $("fr-live")?.addEventListener("click", openLive);
    $("fr-link")?.addEventListener("change", (e) => (setAppLink(e.target.value), rerender()));
    document.querySelectorAll("[data-rmf]").forEach(
      (b) => b.onclick = async () => {
        S.friends = S.friends.filter((f) => f.code !== b.dataset.rmf);
        await saveSocial();
        rerender();
      }
    );
  }

  // camera/quizui.ts
  var REV_OPTS = [
    { id: "unsure", label: "Not sure" },
    { id: "low", label: "Low (under 300)" },
    { id: "medium", label: "Medium (300 to 400)" },
    { id: "high", label: "High (400 to 500)" },
    { id: "very-high", label: "Very high (500+)" }
  ];
  var SPEED_OPTS = [
    { id: "unsure", label: "Not sure" },
    { id: "slow", label: "Slower (under 15 mph)" },
    { id: "medium", label: "Medium (15 to 18)" },
    { id: "fast", label: "Fast (over 18)" }
  ];
  var AVG_OPTS = [
    { id: "", label: "Skip" },
    { id: "under-150", label: "Under 150" },
    { id: "150-179", label: "150 to 179" },
    { id: "180-199", label: "180 to 199" },
    { id: "200-219", label: "200 to 219" },
    { id: "220+", label: "220+" }
  ];
  var PATTERN_OPTS = [
    { id: "unsure", label: "Not sure" },
    { id: "house", label: "House shots" },
    { id: "sport", label: "Sport patterns" },
    { id: "both", label: "Both" }
  ];
  var GOAL_OPTS = [
    { id: "strikes", label: "More strikes" },
    { id: "spares", label: "Better spare shooting" },
    { id: "consistency", label: "More consistency" },
    { id: "compete", label: "Compete" },
    { id: "fun", label: "Just for fun" }
  ];
  function inviteBanner() {
    let h = "";
    try {
      h = sessionStorage.getItem("laneiq.pendingHash") ?? "";
    } catch {
    }
    const m = /^#(invite|reply|session)=(.+)$/.exec(h);
    if (!m) return "";
    if (m[1] === "session") return `<div class="invitebox"><b>A friend shared a session with you</b><div class="note">Set up your profile first. Then you can compare their shots with yours on the same lane.</div></div>`;
    const inv = decodeInvite(m[2]);
    if (!inv) return "";
    return `<div class="invitebox"><b>${esc(inv.name)} invited you</b><div class="note">${m[1] === "invite" ? "Set up your profile first, then you'll see their friend request and can compare shots on the same lane." : "Set up your profile first, then you can add them back."}</div></div>`;
  }
  function showQuiz(mode2, onDone) {
    const el = $("onboard");
    const base = mode2 === "retake" && S.profile?.quiz ? { ...S.profile.quiz } : defaultAnswers(mode2 === "retake" ? S.profile?.name : "");
    const a = base;
    let step = 0;
    const STEPS = 8;
    el.classList.add("on");
    const chips = (opts, cur, key) => `<div class="chips">${opts.map((o) => `<button class="chip ${o.id === cur ? "sel" : ""}" data-k="${key}" data-v="${esc(o.id)}">${esc(o.label)}</button>`).join("")}</div>`;
    const body = () => {
      switch (step) {
        case 0:
          return `<div class="welcome"><div class="logo">Lane<b style="background:linear-gradient(90deg,#46e6ff,#ff4fd8);-webkit-background-clip:text;background-clip:text;color:transparent">IQ</b></div><div class="note">Your bowling coach, using your phone's camera</div></div>${inviteBanner()}<h2>What should I call you?</h2><div class="note">A few quick questions so the app understands how you bowl before your first shot. Everything stays on this phone.</div>
          <div class="field"><label>Your name</label><input id="q-name" value="${esc(a.name)}" placeholder="Name" autocomplete="off"></div>
          <div class="field"><label>Account name (how friends find you)</label><input id="q-user" value="${esc(a.username ?? "")}" placeholder="e.g. strikeking22" autocomplete="off" autocapitalize="none" spellcheck="false"><div class="note" id="q-usernote">3 to 20 letters, numbers or underscores. Friends add you with this name plus your friend code, so nobody can pretend to be you. It stays on this phone and in links you send.</div></div>`;
        case 1:
          return `<h2>How do you bowl?</h2><div class="note">This changes what the app expects from your ball and what it suggests.</div>` + STYLES.map((s) => `<button class="opt ${a.style === s.id ? "sel" : ""}" data-k="style" data-v="${s.id}"><b>${esc(s.label)}</b><span>${esc(s.blurb)}</span></button>`).join("");
        case 2:
          return `<h2>Which is your main hand?</h2><div class="note">${a.style === "two-handed" ? "For two-handed bowlers, pick the hand that stays under the ball at release." : "The hand you throw the ball with."} This sets which pocket you aim for (the 1-3 for right-handed, the 1-2 for left-handed).</div><button class="opt ${a.hand === "R" ? "sel" : ""}" data-k="hand" data-v="R"><b>Right</b></button><button class="opt ${a.hand === "L" ? "sel" : ""}" data-k="hand" data-v="L"><b>Left</b></button>`;
        case 3:
          return `<h2>How experienced are you?</h2>` + LEVELS.map((l) => `<button class="opt ${a.level === l.id ? "sel" : ""}" data-k="level" data-v="${l.id}"><b>${esc(l.label)}</b></button>`).join("") + `<div class="field"><label>Typical average (optional)</label>${chips(AVG_OPTS, a.avgBand, "avgBand")}</div>`;
        case 4:
          return `<h2>Your ball</h2><div class="note">Skip anything you don't know. The camera will measure your speed itself, and you can enter rev rate later.</div>
          <div class="field"><label>Rev rate (revolutions per minute)</label>${chips(REV_OPTS, a.revTier, "revTier")}<input id="q-rev" inputmode="numeric" placeholder="Or type your exact RPM" value="${a.revRpm ?? ""}"></div>
          <div class="field"><label>How fast do you throw?</label>${chips(SPEED_OPTS, a.speedTier, "speedTier")}</div>
          <div class="field"><label>Usual ball weight (lb)</label><select id="q-wt"><option value="">not sure</option>${[10, 11, 12, 13, 14, 15, 16].map((w) => `<option ${a.ballWeight === w ? "selected" : ""}>${w}</option>`).join("")}</select></div>`;
        case 5:
          return `<h2>What do you bowl on?</h2><div class="field"><label>Mostly</label>${chips(PATTERN_OPTS, a.patterns, "patterns")}</div><div class="field"><label>Your main goal</label>${chips(GOAL_OPTS, a.goal, "goal")}</div>`;
        case 6:
          return `<h2>What gives you trouble?</h2><div class="note">Tick anything that sounds like you. The app will look for it first, and still find problems you didn't think of.</div>` + FOCUS_OPTIONS.map((f) => `<button class="opt ${a.focus.includes(f.id) ? "sel" : ""}" data-focus="${f.id}"><b>${esc(f.label)}</b></button>`).join("");
        default: {
          const rev = estimateRev(a);
          return `<h2>Here's what I learned</h2><div class="card"><ul>${summarize(a).map((l) => `<li>${esc(l)}</li>`).join("")}</ul></div>
          <div class="card"><div class="k">What this changes</div><ul>${styleNotes(a.style).map((l) => `<li>${esc(l)}</li>`).join("")}<li>Starting assumption: about ${rev.rpm} RPM. I'll use it for ball recommendations until you enter your own number.</li></ul></div>
          <div class="note">Next: start the camera on the Live tab, let it lock onto the lane, and show it each of your balls so it can recognize them from your first shot.</div>`;
        }
      }
    };
    const draw3 = () => {
      el.innerHTML = `<div style="margin-top:14px" class="prog"><i style="width:${(step + 1) / STEPS * 100}%"></i></div><div class="note">Step ${step + 1} of ${STEPS}</div>${body()}
      <div class="chips" style="margin-top:18px">${step > 0 ? `<button class="btn ghost" id="q-back">Back</button>` : mode2 !== "first" ? `<button class="btn ghost" id="q-cancel">Cancel</button>` : ""}<button class="btn" id="q-next">${step === STEPS - 1 ? "Start" : "Continue"}</button></div>`;
      el.querySelectorAll("[data-k]").forEach((b) => {
        b.onclick = () => {
          a[b.dataset.k] = b.dataset.v;
          draw3();
        };
      });
      el.querySelectorAll("[data-focus]").forEach((b) => {
        b.onclick = () => {
          const id = b.dataset.focus;
          a.focus = a.focus.includes(id) ? a.focus.filter((x) => x !== id) : [...a.focus, id];
          draw3();
        };
      });
      $("q-back")?.addEventListener("click", () => (readInputs(), step--, draw3()));
      $("q-cancel")?.addEventListener("click", () => (el.classList.remove("on"), el.innerHTML = ""));
      $("q-next").onclick = async () => {
        readInputs();
        if (step === 0 && !a.name.trim()) return $("q-name").focus();
        if (step === 0 && !isUsername(a.username ?? "")) {
          $("q-usernote").textContent = "Choose an account name: 3 to 20 letters, numbers or underscores (no spaces).";
          $("q-usernote").setAttribute("style", "color:var(--gold)");
          return $("q-user").focus();
        }
        if (step < STEPS - 1) return step++, draw3();
        a.takenAt = (/* @__PURE__ */ new Date()).toISOString();
        if (mode2 === "retake") {
          updateProfile({ name: a.name.trim() || S.profile.name, username: isUsername(a.username ?? "") ? a.username : S.profile.username, hand: a.hand, revRpm: a.revRpm, quiz: a });
          el.classList.remove("on");
          el.innerHTML = "";
          return onDone();
        }
        const p = createProfile(a);
        if (mode2 === "add") {
          setCurrentProfile(p.id);
          location.reload();
          return;
        }
        await loadProfile(p.id);
        el.classList.remove("on");
        el.innerHTML = "";
        onDone();
      };
    };
    const readInputs = () => {
      const name = document.getElementById("q-name");
      if (name) a.name = name.value;
      const user = document.getElementById("q-user");
      if (user) a.username = cleanUsername(user.value);
      const rev = document.getElementById("q-rev");
      if (rev) {
        const v = parseInt(rev.value, 10);
        a.revRpm = Number.isFinite(v) ? v : void 0;
      }
      const wt = document.getElementById("q-wt");
      if (wt) a.ballWeight = wt.value ? Number(wt.value) : void 0;
    };
    draw3();
  }

  // core/src/spin.ts
  function solveOmega(samples, R2) {
    if (samples.length < 12) return null;
    const rows = samples.map((s) => {
      const Pz = -Math.sqrt(Math.max(1e-6, R2 * R2 - s.x * s.x - s.y * s.y));
      return { Px: s.x, Py: s.y, Pz, vx: s.vx, vy: s.vy };
    });
    let w = rows.map(() => 1);
    let om = { x: 0, y: 0, z: 0 };
    for (let iter = 0; iter < 8; iter++) {
      const A = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
      ];
      const b = [0, 0, 0];
      rows.forEach((r, i) => {
        const ax = [0, r.Pz, -r.Py];
        const ay = [-r.Pz, 0, r.Px];
        for (let p = 0; p < 3; p++) {
          b[p] += w[i] * (ax[p] * r.vx + ay[p] * r.vy);
          for (let q = 0; q < 3; q++) A[p][q] += w[i] * (ax[p] * ax[q] + ay[p] * ay[q]);
        }
      });
      const sol = solve3(A, b);
      if (!sol) return null;
      om = { x: sol[0], y: sol[1], z: sol[2] };
      const res2 = rows.map((r) => Math.hypot(om.y * r.Pz - om.z * r.Py - r.vx, om.z * r.Px - om.x * r.Pz - r.vy));
      const mad2 = [...res2].sort((a, b2) => a - b2)[Math.floor(res2.length / 2)] || 1e-6;
      const thr2 = Math.max(0.15, 2.5 * 1.4826 * mad2);
      w = res2.map((e) => e <= thr2 ? 1 : 0.02);
    }
    const res = rows.map((r) => Math.hypot(om.y * r.Pz - om.z * r.Py - r.vx, om.z * r.Px - om.x * r.Pz - r.vy));
    const mad = [...res].sort((a, b) => a - b)[Math.floor(res.length / 2)] || 1e-6;
    const thr = Math.max(0.15, 2.5 * 1.4826 * mad);
    const keep = res.filter((e) => e <= thr);
    return { omega: om, inliers: keep.length, rmse: Math.sqrt(keep.reduce((a, e) => a + e * e, 0) / Math.max(1, keep.length)) };
  }
  function solve3(A, b) {
    const M = A.map((row, i) => [...row, b[i]]);
    for (let c = 0; c < 3; c++) {
      let p = c;
      for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (Math.abs(M[p][c]) < 1e-9) return null;
      [M[c], M[p]] = [M[p], M[c]];
      for (let r = 0; r < 3; r++) {
        if (r === c) continue;
        const f = M[r][c] / M[c][c];
        for (let k2 = c; k2 < 4; k2++) M[r][k2] -= f * M[c][k2];
      }
    }
    return [M[0][3] / M[0][0], M[1][3] / M[1][1], M[2][3] / M[2][2]];
  }
  function downscale(g) {
    const w = g.w >> 1;
    const h = g.h >> 1;
    const d = new Float32Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) d[y * w + x] = (g.data[2 * y * g.w + 2 * x] + g.data[2 * y * g.w + 2 * x + 1] + g.data[(2 * y + 1) * g.w + 2 * x] + g.data[(2 * y + 1) * g.w + 2 * x + 1]) / 4;
    return { data: d, w, h };
  }
  var sample = (g, x, y) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    if (x0 < 0 || y0 < 0 || x0 >= g.w - 1 || y0 >= g.h - 1) return NaN;
    const fx = x - x0;
    const fy = y - y0;
    const i = y0 * g.w + x0;
    return g.data[i] * (1 - fx) * (1 - fy) + g.data[i + 1] * fx * (1 - fy) + g.data[i + g.w] * (1 - fx) * fy + g.data[i + g.w + 1] * fx * fy;
  };
  function lkLevel(a, b, px, py, gx, gy, win) {
    let u = gx;
    let v = gy;
    let ok = false;
    for (let it = 0; it < 6; it++) {
      let sxx = 0, sxy = 0, syy = 0, sxt = 0, syt = 0, n = 0;
      for (let j = -win; j <= win; j++)
        for (let i = -win; i <= win; i++) {
          const x = px + i;
          const y = py + j;
          const ix = (sample(a, x + 1, y) - sample(a, x - 1, y)) / 2;
          const iy = (sample(a, x, y + 1) - sample(a, x, y - 1)) / 2;
          const it_ = sample(b, x + u, y + v) - sample(a, x, y);
          if (!Number.isFinite(ix + iy + it_)) continue;
          sxx += ix * ix;
          sxy += ix * iy;
          syy += iy * iy;
          sxt += ix * it_;
          syt += iy * it_;
          n++;
        }
      if (n < win * win) return { u, v, ok: false };
      const det = sxx * syy - sxy * sxy;
      const tr = sxx + syy;
      const minEig = tr / 2 - Math.sqrt(Math.max(0, tr * tr / 4 - det));
      if (minEig / n < 0.5) return { u, v, ok: false };
      const du = (-syy * sxt + sxy * syt) / det;
      const dv = (sxy * sxt - sxx * syt) / det;
      u += du;
      v += dv;
      ok = true;
      if (Math.hypot(du, dv) < 0.02) break;
    }
    return { u, v, ok };
  }
  function flowAt(pyrA, pyrB, x, y, win = 5) {
    let u = 0;
    let v = 0;
    for (let l = pyrA.length - 1; l >= 0; l--) {
      const s = 2 ** l;
      const r = lkLevel(pyrA[l], pyrB[l], x / s, y / s, u / s, v / s, win);
      if (!r.ok && l === 0) return null;
      u = r.u * s;
      v = r.v * s;
    }
    return Number.isFinite(u + v) ? { u, v } : null;
  }
  var pyramid = (g, levels = 4) => {
    const out = [g];
    for (let i = 1; i < levels && out[i - 1].w >= 32; i++) out.push(downscale(out[i - 1]));
    return out;
  };
  function spinFromOmega(om, fps, view3, hand) {
    const mag = Math.hypot(om.x, om.y, om.z);
    if (mag < 1e-6) return null;
    let f, l, u;
    if (view3 === "behind") [f, l, u] = [om.z, -om.x, -om.y];
    else if (view3 === "side-right") [f, l, u] = [om.x, om.z, -om.y];
    else [f, l, u] = [-om.x, -om.z, -om.y];
    const a = { f: f / mag, l: l / mag, u: u / mag };
    const notes = [];
    if (a.l < 0.2) notes.push("The measured spin doesn't look like a forward-rolling ball: check the camera position you chose.");
    const side = hand === "R" ? -a.f : a.f;
    return {
      rpm: mag * fps * 60 / (2 * Math.PI),
      axisRotation: Math.atan2(side, Math.abs(a.l)) * 180 / Math.PI,
      axisTilt: Math.abs(Math.asin(Math.max(-1, Math.min(1, a.u))) * 180 / Math.PI),
      quality: a.l < 0.2 ? 0.1 : 1,
      notes
    };
  }
  function estimateSpin(frames, circles, fps, view3, hand, step = 4) {
    const omegas = [];
    let pts = 0;
    const pyr = frames.map((f) => pyramid(f));
    for (let i = 0; i + 1 < frames.length; i++) {
      const c0 = circles[i];
      const c1 = circles[i + 1];
      const vc = { x: c1.cx - c0.cx, y: c1.cy - c0.cy };
      const samples = [];
      for (let y = -c0.r * 0.8; y <= c0.r * 0.8; y += step)
        for (let x = -c0.r * 0.8; x <= c0.r * 0.8; x += step) {
          if (x * x + y * y > (c0.r * 0.8) ** 2) continue;
          const fl = flowAt(pyr[i], pyr[i + 1], c0.cx + x, c0.cy + y);
          if (fl) samples.push({ x, y, vx: fl.u - vc.x, vy: fl.v - vc.y });
        }
      const sol = solveOmega(samples, c0.r);
      if (sol && sol.inliers >= 20) {
        omegas.push(sol.omega);
        pts += sol.inliers;
      }
    }
    if (omegas.length < 1) return null;
    const med = (v) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
    const om = { x: med(omegas.map((o) => o.x)), y: med(omegas.map((o) => o.y)), z: med(omegas.map((o) => o.z)) };
    const res = spinFromOmega(om, fps, view3, hand);
    if (!res) return null;
    const mags = omegas.map((o) => Math.hypot(o.x, o.y, o.z));
    const spread = omegas.length > 1 ? Math.sqrt(mags.reduce((a, m) => a + (m - mags.reduce((s, x) => s + x, 0) / mags.length) ** 2, 0) / (mags.length - 1)) / (mags.reduce((s, x) => s + x, 0) / mags.length) : 0.5;
    const agree = Math.max(0, 1 - spread * 4);
    const coverage = Math.min(1, pts / omegas.length / 150);
    const quality = Math.max(0, Math.min(1, res.quality * agree * (0.4 + 0.6 * coverage)));
    const notes = [...res.notes];
    if (omegas.length < 3) notes.push("Few frame pairs were usable, so treat this as rough.");
    if (spread > 0.15) notes.push("The frame pairs disagree with each other: the footage may be too fast or too blurry for this method.");
    return { ...res, quality, notes, pairs: omegas.length, pointsPerPair: Math.round(pts / omegas.length) };
  }
  function trackCircle(prev, next, c, search = 24) {
    const half = Math.max(8, Math.floor(c.r * 0.45));
    let best = { dx: 0, dy: 0, cost: Infinity };
    for (let dy = -search; dy <= search; dy++)
      for (let dx = -search; dx <= search; dx++) {
        let cost = 0;
        let n = 0;
        for (let y = -half; y <= half; y += 3)
          for (let x = -half; x <= half; x += 3) {
            const a = prev.data[Math.round(c.cy + y) * prev.w + Math.round(c.cx + x)];
            const bx = Math.round(c.cx + x + dx);
            const by = Math.round(c.cy + y + dy);
            if (bx < 0 || by < 0 || bx >= next.w || by >= next.h) {
              cost = Infinity;
              break;
            }
            const d = a - next.data[by * next.w + bx];
            cost += d * d;
            n++;
          }
        if (n && cost / n < best.cost) best = { dx, dy, cost: cost / n };
      }
    return { cx: c.cx + best.dx, cy: c.cy + best.dy, r: c.r };
  }

  // camera/spinlab.ts
  function openSpinLab(onSaved) {
    const el = $("spinlab");
    el.classList.add("on");
    let view3 = "behind";
    let fps = 240;
    let circle = null;
    let tapStage = 0;
    let result = null;
    el.innerHTML = `
    <div class="row"><h2>Spin lab</h2><button class="btn ghost" id="sl-close">Close</button></div>
    <div class="note">Measures rev rate, axis rotation and axis tilt from a <b>slow-motion video of the release</b>. Film the ball as large as you can, in good light, with the camera behind the bowler or to one side, steady on a tripod. 240 fps works best. This method is validated on simulated footage only, so check a few results against a measurement you trust before relying on it.</div>
    <div class="card">
      <div class="field"><label>1. Choose the video</label><input type="file" id="sl-file" accept="video/*"></div>
      <div class="two">
        <div class="field"><label>Camera position</label><select id="sl-view"><option value="behind">Behind the bowler</option><option value="side-right">Side, on the bowler's right</option><option value="side-left">Side, on the bowler's left</option></select></div>
        <div class="field"><label>Frames per second</label><input id="sl-fps" inputmode="numeric" value="240"></div>
      </div>
    </div>
    <div id="sl-work" class="hide">
      <div class="card">
        <div class="field"><label>2. Find a frame just after release, with the ball large</label><input type="range" id="sl-scrub" min="0" max="1" step="0.001" value="0" style="width:100%"></div>
        <div class="stagebox" style="position:relative"><video id="sl-v" playsinline muted style="width:100%;display:block"></video><canvas id="sl-ov" class="ov" style="position:absolute;inset:0;width:100%;height:100%"></canvas></div>
        <div class="note" id="sl-hint">3. Tap the center of the ball, then tap its edge.</div>
        <div class="chips"><button class="btn" id="sl-go">Analyze spin</button><button class="chip" id="sl-reset">Re-mark ball</button></div>
      </div>
      <div id="sl-result"></div>
    </div>`;
    const v = $("sl-v");
    const ov = $("sl-ov");
    const octx = ov.getContext("2d");
    const drawMark = () => {
      octx.clearRect(0, 0, ov.width, ov.height);
      if (!circle) return;
      octx.strokeStyle = "#46e6ff";
      octx.lineWidth = Math.max(2, ov.width / 300);
      octx.beginPath();
      octx.arc(circle.cx, circle.cy, Math.max(circle.r, 3), 0, 7);
      octx.stroke();
      octx.fillStyle = "#ff4fd8";
      octx.beginPath();
      octx.arc(circle.cx, circle.cy, Math.max(3, ov.width / 250), 0, 7);
      octx.fill();
    };
    const seek = (t) => new Promise((res) => {
      const done = () => (v.removeEventListener("seeked", done), res());
      v.addEventListener("seeked", done);
      v.currentTime = Math.max(0, Math.min(v.duration || 0, t));
    });
    $("sl-view").onchange = (e) => view3 = e.target.value;
    $("sl-fps").onchange = (e) => fps = Math.max(30, Number(e.target.value) || 240);
    $("sl-close").onclick = () => {
      if (v.src) URL.revokeObjectURL(v.src);
      el.classList.remove("on");
      el.innerHTML = "";
    };
    $("sl-file").onchange = (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      v.src = URL.createObjectURL(f);
      v.onloadedmetadata = () => {
        ov.width = v.videoWidth;
        ov.height = v.videoHeight;
        $("sl-scrub").max = String(v.duration);
        $("sl-scrub").step = String(1 / fps);
        $("sl-work").classList.remove("hide");
        circle = null;
        tapStage = 0;
        drawMark();
      };
    };
    $("sl-scrub").oninput = (e) => seek(Number(e.target.value)).then(drawMark);
    $("sl-reset").onclick = () => (circle = null, tapStage = 0, drawMark(), $("sl-hint").textContent = "Tap the center of the ball, then tap its edge.");
    ov.addEventListener("pointerdown", (e) => {
      const r = ov.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width * ov.width;
      const y = (e.clientY - r.top) / r.height * ov.height;
      if (tapStage === 0 || tapStage === 2) {
        circle = { cx: x, cy: y, r: 0 };
        tapStage = 1;
        $("sl-hint").textContent = "Now tap the edge of the ball.";
      } else {
        circle.r = Math.hypot(x - circle.cx, y - circle.cy);
        tapStage = 2;
        $("sl-hint").textContent = `Ball marked (${Math.round(circle.r * 2)} px across). ${circle.r < 40 ? "That's small: results will be rough unless the ball is bigger in frame." : "Good size."} Tap Analyze spin.`;
      }
      drawMark();
    });
    $("sl-go").onclick = async () => {
      const out = $("sl-result");
      if (!circle || circle.r < 15) return void (out.innerHTML = `<div class="card"><div class="u">Mark the ball first: tap its center, then its edge.</div></div>`);
      out.innerHTML = `<div class="card"><div class="u">Reading frames\u2026</div></div>`;
      await new Promise((r) => setTimeout(r, 40));
      const scale2 = Math.min(1, 100 / circle.r);
      const cw = Math.round(v.videoWidth * scale2);
      const ch = Math.round(v.videoHeight * scale2);
      const cv = document.createElement("canvas");
      cv.width = cw;
      cv.height = ch;
      const cx = cv.getContext("2d", { willReadFrequently: true });
      const t02 = v.currentTime;
      const N2 = 6;
      const frames = [];
      for (let k2 = 0; k2 < N2; k2++) {
        await seek(t02 + k2 / fps);
        cx.drawImage(v, 0, 0, cw, ch);
        const px = cx.getImageData(0, 0, cw, ch).data;
        const g = new Float32Array(cw * ch);
        for (let i = 0; i < g.length; i++) g[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
        frames.push({ data: g, w: cw, h: ch });
      }
      let c = { cx: circle.cx * scale2, cy: circle.cy * scale2, r: circle.r * scale2 };
      const circles = [c];
      for (let k2 = 1; k2 < N2; k2++) {
        c = trackCircle(frames[k2 - 1], frames[k2], c, Math.round(Math.min(24, c.r * 0.4)));
        circles.push(c);
      }
      let still = 0;
      for (let k2 = 1; k2 < N2; k2++) {
        let d = 0;
        let n = 0;
        for (let y = -c.r * 0.5; y <= c.r * 0.5; y += 4)
          for (let x = -c.r * 0.5; x <= c.r * 0.5; x += 4) {
            const a = frames[k2 - 1].data[Math.round(circles[k2 - 1].cy + y) * cw + Math.round(circles[k2 - 1].cx + x)];
            const b = frames[k2].data[Math.round(circles[k2].cy + y) * cw + Math.round(circles[k2].cx + x)];
            d += Math.abs(a - b);
            n++;
          }
        if (d / n < 0.4) still++;
      }
      await new Promise((r) => setTimeout(r, 40));
      result = estimateSpin(frames, circles, fps, view3, S.profile?.hand ?? "R", 5);
      const warn = still >= N2 - 2 ? `<li>Consecutive frames look identical. The video may not be a true ${fps} fps recording, or the seek landed on the same frame, so the result isn't meaningful.</li>` : "";
      if (!result) {
        out.innerHTML = `<div class="card"><div class="lr-head">Couldn't measure the spin</div><ul><li>The ball surface didn't have enough visible markings to track. A logo, finger holes or a two-tone ball work best, and a plain glossy ball often can't be measured this way.</li>${warn}</ul></div>`;
        return;
      }
      const q = result.quality;
      const label2 = q >= 0.7 ? "good" : q >= 0.4 ? "rough" : "unreliable";
      out.innerHTML = `<div class="card"><div class="k">Result</div>
      <div class="grid" style="margin-top:8px">
        <div class="card"><div class="k">Rev rate</div><div class="v">${Math.round(result.rpm)}</div><div class="u">RPM</div></div>
        <div class="card"><div class="k">Axis rotation</div><div class="v">${result.axisRotation.toFixed(0)}\xB0</div><div class="u">0\xB0 = forward roll</div></div>
        <div class="card"><div class="k">Axis tilt</div><div class="v">${result.axisTilt.toFixed(0)}\xB0</div><div class="u">above horizontal</div></div>
      </div>
      <span class="badge ${q >= 0.7 ? "good" : q >= 0.4 ? "moderate" : "tentative"}">${label2} \xB7 quality ${Math.round(q * 100)}%</span>
      <ul>${[...result.notes.map((n) => `<li>${esc(n)}</li>`), warn, `<li>Used ${result.pairs} frame pairs and about ${result.pointsPerPair} tracked points per pair.</li>`].join("")}</ul>
      <div class="chips"><button class="btn" id="sl-save" ${q < 0.3 ? "disabled" : ""}>Use these numbers</button></div>
      ${q < 0.3 ? `<div class="note">Not reliable enough to save. Try a closer, brighter, higher-frame-rate clip.</div>` : ""}</div>`;
      $("sl-save")?.addEventListener("click", () => {
        const r = result;
        updateProfile({ spin: { ...S.profile?.spin ?? {}, rpm: Math.round(r.rpm), axisRotation: Math.round(r.axisRotation), axisTilt: Math.round(r.axisTilt), source: "video", at: (/* @__PURE__ */ new Date()).toISOString() } });
        onSaved();
        $("sl-close").click();
      });
    };
  }

  // camera/view3d.ts
  var LANE_W = 41.5;
  var GUTTER = 9.25;
  var FT = 12;
  var DECK_END = 63 * FT;
  var PIN_H = 15;
  var PIN_R = 2.4;
  var BALL_R = 4.25;
  var ROW = 10.39;
  var PIN_SP = 12;
  var toX = (xBoards) => (xBoards / LANE_BOARDS - 0.5) * LANE_W;
  var toIn = (p) => [toX(p.x), p.y * FT, BALL_R];
  var sub2 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  var dot2 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  var cross2 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  var norm3 = (a) => {
    const l = Math.hypot(...a) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  };
  var PRESETS = {
    Behind: { yaw: 0, pitch: 16, dist: 330, target: [0, 18 * FT, 0] },
    Top: { yaw: 90, pitch: 89, dist: 440, target: [0, 31 * FT, 0] },
    Side: { yaw: 90, pitch: 28, dist: 430, target: [0, 31 * FT, 0] },
    Pins: { yaw: 180, pitch: 16, dist: 330, target: [0, 46 * FT, 0] }
  };
  function mount3D(host2) {
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;touch-action:none;background:radial-gradient(circle at 50% 30%,#1b2233,#05080f)";
    const bar = document.createElement("div");
    bar.style.cssText = "position:absolute;left:8px;right:8px;bottom:8px;display:flex;gap:6px;flex-wrap:wrap;justify-content:center";
    const hint = document.createElement("div");
    hint.style.cssText = "position:absolute;top:8px;left:10px;font:600 11px system-ui;color:rgba(255,255,255,.55);pointer-events:none";
    hint.textContent = "Drag to orbit \xB7 pinch to zoom \xB7 two fingers to pan";
    host2.append(canvas, bar, hint);
    const ctx2 = canvas.getContext("2d");
    let paths = [];
    let yaw = PRESETS.Behind.yaw;
    let pitch = PRESETS.Behind.pitch;
    let dist = PRESETS.Behind.dist;
    let target = [...PRESETS.Behind.target];
    let raf = 0;
    const markDirty = () => {
      if (!raf) raf = requestAnimationFrame(draw3);
    };
    for (const name of Object.keys(PRESETS)) {
      const b = document.createElement("button");
      b.textContent = name;
      b.style.cssText = "appearance:none;border:1px solid rgba(255,255,255,.18);background:rgba(10,14,22,.7);color:#fff;border-radius:99px;padding:6px 12px;font:600 12px system-ui;cursor:pointer";
      b.onclick = () => setPreset(name);
      bar.append(b);
    }
    function setPreset(name) {
      const p = PRESETS[name];
      if (!p) return;
      yaw = p.yaw;
      pitch = p.pitch;
      dist = p.dist;
      target = [...p.target];
      markDirty();
    }
    function basis(w, h) {
      const th = yaw * Math.PI / 180;
      const ph = Math.min(89.5, Math.max(4, pitch)) * Math.PI / 180;
      const C = [target[0] + dist * Math.sin(th) * Math.cos(ph), target[1] - dist * Math.cos(th) * Math.cos(ph), target[2] + dist * Math.sin(ph)];
      const F = norm3(sub2(target, C));
      const R2 = norm3(cross2(F, [0, 0, 1]));
      const U = cross2(R2, F);
      const f = h / 2 / Math.tan(50 * Math.PI / 360);
      return { C, F, R: R2, U, f, w, h };
    }
    const NEAR = 4;
    const proj = (cam, P) => {
      const v = sub2(P, cam.C);
      const z = dot2(v, cam.F);
      if (z < NEAR) return null;
      return [cam.w / 2 + cam.f * dot2(v, cam.R) / z, cam.h / 2 - cam.f * dot2(v, cam.U) / z, z];
    };
    function seg(cam, a, b) {
      const za = dot2(sub2(a, cam.C), cam.F);
      const zb = dot2(sub2(b, cam.C), cam.F);
      if (za < NEAR && zb < NEAR) return null;
      let A = a;
      let B = b;
      if (za < NEAR) {
        const t = (NEAR - za) / (zb - za);
        A = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      } else if (zb < NEAR) {
        const t = (NEAR - zb) / (za - zb);
        B = [b[0] + (a[0] - b[0]) * t, b[1] + (a[1] - b[1]) * t, b[2] + (a[2] - b[2]) * t];
      }
      const pa = proj(cam, A);
      const pb = proj(cam, B);
      return pa && pb ? [[pa[0], pa[1]], [pb[0], pb[1]]] : null;
    }
    function resize() {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(2, Math.round(r.width * dpr));
      const h = Math.max(2, Math.round(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }
    function draw3() {
      raf = 0;
      resize();
      const w = canvas.width;
      const h = canvas.height;
      const s = w / 720;
      const cam = basis(w, h);
      ctx2.clearRect(0, 0, w, h);
      ctx2.lineJoin = "round";
      ctx2.lineCap = "round";
      const poly = (pts, fill, stroke, lw = 1) => {
        const q = pts.map((p) => proj(cam, p));
        if (q.some((x) => !x)) return;
        ctx2.beginPath();
        q.forEach((p, i) => i ? ctx2.lineTo(p[0], p[1]) : ctx2.moveTo(p[0], p[1]));
        ctx2.closePath();
        ctx2.fillStyle = fill;
        ctx2.fill();
        if (stroke) {
          ctx2.strokeStyle = stroke;
          ctx2.lineWidth = lw * s;
          ctx2.stroke();
        }
      };
      const line2 = (a, b, color, lw = 1) => {
        const sg = seg(cam, a, b);
        if (!sg) return;
        ctx2.strokeStyle = color;
        ctx2.lineWidth = lw * s;
        ctx2.beginPath();
        ctx2.moveTo(sg[0][0], sg[0][1]);
        ctx2.lineTo(sg[1][0], sg[1][1]);
        ctx2.stroke();
      };
      const hw = LANE_W / 2;
      poly([[-hw - GUTTER - 14, -15 * FT, -0.2], [hw + GUTTER + 14, -15 * FT, -0.2], [hw + GUTTER + 14, 0, -0.2], [-hw - GUTTER - 14, 0, -0.2]], "rgba(140,105,70,.55)");
      poly([[-hw - GUTTER, 0, -0.2], [-hw, 0, -0.2], [-hw, DECK_END, -0.2], [-hw - GUTTER, DECK_END, -0.2]], "rgba(8,10,16,.95)");
      poly([[hw, 0, -0.2], [hw + GUTTER, 0, -0.2], [hw + GUTTER, DECK_END, -0.2], [hw, DECK_END, -0.2]], "rgba(8,10,16,.95)");
      poly([[-hw, 0, 0], [hw, 0, 0], [hw, DECK_END, 0], [-hw, DECK_END, 0]], "rgba(214,170,110,.78)");
      poly([[-hw - GUTTER, DECK_END, -0.2], [hw + GUTTER, DECK_END, -0.2], [hw + GUTTER, DECK_END + 40, -0.2], [-hw - GUTTER, DECK_END + 40, -0.2]], "rgba(5,6,10,.97)");
      for (let i = 0; i <= LANE_BOARDS; i++) {
        const x = toX(i);
        const major = (LANE_BOARDS - i) % 5 === 0;
        line2([x, 0, 0.05], [x, 60 * FT, 0.05], i === 0 || i === LANE_BOARDS ? "rgba(120,200,255,.9)" : major ? "rgba(255,255,255,.4)" : "rgba(255,255,255,.14)", i === 0 || i === LANE_BOARDS ? 2 : major ? 1.2 : 0.7);
      }
      line2([-hw, 0, 0.1], [hw, 0, 0.1], "rgba(255,90,110,1)", 3);
      for (const ft of [15, 30, 45, 60]) line2([-hw, ft * FT, 0.1], [hw, ft * FT, 0.1], ft === 60 ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.2)", 1);
      for (let b = 5; b <= 35; b += 5) {
        const x = toX(LANE_BOARDS + 0.5 - b);
        const tip = (12 + 4 * (1 - Math.abs(b - 20) / 15)) * FT;
        poly([[x - 1.1, tip - 20, 0.15], [x + 1.1, tip - 20, 0.15], [x, tip, 0.15]], "rgba(255,210,90,.95)");
      }
      const pins = [];
      for (let r = 0; r < 4; r++) for (let i = 0; i <= r; i++) pins.push([(i - r / 2) * PIN_SP, 60 * FT + r * ROW, 0]);
      pins.map((p) => ({ p, z: proj(cam, p)?.[2] ?? 0 })).sort((a, b) => b.z - a.z).forEach(({ p }) => {
        const base = proj(cam, p);
        const top = proj(cam, [p[0], p[1], PIN_H]);
        if (!base || !top) return;
        const rr = Math.max(1.5, cam.f * PIN_R / base[2]);
        ctx2.strokeStyle = "rgba(255,255,255,.92)";
        ctx2.lineWidth = rr * 2;
        ctx2.beginPath();
        ctx2.moveTo(base[0], base[1]);
        ctx2.lineTo(top[0], top[1]);
        ctx2.stroke();
        ctx2.fillStyle = "rgba(255,90,110,.9)";
        ctx2.fillRect(top[0] - rr, top[1] + rr * 0.9, rr * 2, Math.max(1, rr * 0.4));
      });
      for (const sp of paths) {
        const pts = sp.path.map(toIn);
        for (let i = 1; i < pts.length; i++) {
          const t = i / (pts.length - 1);
          ctx2.globalAlpha = sp.alpha ?? 1;
          line2(pts[i - 1], pts[i], sp.color.startsWith("ramp") ? `hsl(${190 + 130 * t},100%,62%)` : sp.color, sp.width ?? 3);
        }
        ctx2.globalAlpha = 1;
        const at = sp.ballAt;
        const idx = at === void 0 || at === null ? -1 : Math.max(0, sp.path.findIndex((p) => p.t >= at));
        const b = idx >= 0 ? pts[Math.min(idx, pts.length - 1)] : sp.ballAt === void 0 ? null : pts[pts.length - 1];
        if (b) {
          const c = proj(cam, b);
          if (c) {
            const r = Math.max(3, cam.f * BALL_R / c[2]);
            const g = ctx2.createRadialGradient(c[0] - r * 0.3, c[1] - r * 0.3, r * 0.1, c[0], c[1], r);
            g.addColorStop(0, "#fff");
            g.addColorStop(0.4, "#7ae6ff");
            g.addColorStop(1, "#2a7bd6");
            ctx2.fillStyle = g;
            ctx2.beginPath();
            ctx2.arc(c[0], c[1], r, 0, 7);
            ctx2.fill();
          }
        }
      }
      ctx2.font = `600 ${11 * s}px system-ui`;
      ctx2.fillStyle = "rgba(255,255,255,.6)";
      ctx2.textAlign = "right";
      for (const ft of [0, 15, 30, 45, 60]) {
        const p = proj(cam, [-hw - 3, ft * FT, 0]);
        if (p) ctx2.fillText(`${ft} ft`, p[0], p[1] - 3 * s);
      }
    }
    const pointers = /* @__PURE__ */ new Map();
    let lastPinch = 0;
    let lastMid = { x: 0, y: 0 };
    const mid = () => {
      const v = [...pointers.values()];
      return { x: (v[0].x + v[1].x) / 2, y: (v[0].y + v[1].y) / 2 };
    };
    const spread = () => {
      const v = [...pointers.values()];
      return Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y);
    };
    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        lastPinch = spread();
        lastMid = mid();
      }
    });
    canvas.addEventListener("pointermove", (e) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (pointers.size === 1) {
        yaw -= dx * 0.4;
        pitch = Math.min(89.5, Math.max(4, pitch + dy * 0.4));
      } else if (pointers.size === 2) {
        const sp = spread();
        if (lastPinch > 0) dist = Math.min(1800, Math.max(60, dist * (lastPinch / sp)));
        lastPinch = sp;
        const m = mid();
        const k2 = dist / 700;
        const th = yaw * Math.PI / 180;
        const right = [Math.cos(th), Math.sin(th), 0];
        const fwd = [-Math.sin(th), Math.cos(th), 0];
        target = [target[0] - (m.x - lastMid.x) * k2 * right[0] + (m.y - lastMid.y) * k2 * fwd[0], target[1] - (m.x - lastMid.x) * k2 * right[1] + (m.y - lastMid.y) * k2 * fwd[1], 0];
        lastMid = m;
      }
      markDirty();
    });
    const up = (e) => {
      pointers.delete(e.pointerId);
      lastPinch = 0;
    };
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        dist = Math.min(1800, Math.max(60, dist * (1 + e.deltaY * 1e-3)));
        markDirty();
      },
      { passive: false }
    );
    const ro = new ResizeObserver(markDirty);
    ro.observe(canvas);
    markDirty();
    return {
      setPaths(p) {
        paths = p;
        markDirty();
      },
      setPreset,
      redraw: markDirty,
      destroy() {
        ro.disconnect();
        cancelAnimationFrame(raf);
        canvas.remove();
        bar.remove();
        hint.remove();
      }
    };
  }

  // camera/tabs.ts
  var current = "live";
  function showTab(t) {
    current = t;
    document.querySelectorAll(".tab").forEach((el) => el.classList.toggle("on", el.id === `tab-${t}`));
    document.querySelectorAll(".tb").forEach((el) => el.classList.toggle("on", el.dataset.tab === t));
    window.scrollTo(0, 0);
    render2();
  }
  function initTabs() {
    document.querySelectorAll(".tb").forEach((b) => b.onclick = () => showTab(b.dataset.tab));
    $("avatar").onclick = () => showTab("me");
    onChange(() => {
      const p = S.profile;
      $("avatar").textContent = (p?.name?.[0] ?? "?").toUpperCase();
      render2();
    });
  }
  function render2() {
    if (current === "shots") renderShots();
    else if (current === "insights") renderInsights();
    else if (current === "arsenal") renderArsenal();
    else if (current === "proshop") renderProshop();
    else if (current === "me") renderMe();
  }
  var ballName = (id) => S.arsenal.find((b) => b.id === id)?.name ?? "Unknown ball";
  var when = (iso) => new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  var ZONE = { pocket: "Pocket", high: "High", light: "Light", "very-high": "Way high", "very-light": "Way light" };
  var pct = (n) => `${Math.round(n)}%`;
  function renderShots() {
    const el = $("shots-page");
    const list = [...S.shots].reverse().slice(0, 200);
    el.innerHTML = `<h2>Shots</h2><div class="chips"><button class="btn ghost" id="sh-share">Share a session</button><button class="btn ghost" id="sh-compare">Compare with a friend</button></div><div class="note">Every tracked shot is saved on this phone with its raw footage. Tap one to replay it, flip between the lane view and the raw video, and fix its ball or result.</div>` + (list.length ? "" : `<div class="card"><div class="u">No shots yet. Start the camera on the Live tab and bowl.</div></div>`) + list.map(
      (s) => `<div class="card shot" data-id="${s.id}"><div class="big">${s.a.speedMph.toFixed(1)}<small style="font-size:12px;color:var(--dim)"> mph</small></div><div style="flex:1"><div>${esc(when(s.at))} \xB7 ${esc(ballName(s.ballId))}</div><div>${s.m.zone ? `<span class="tag ${s.m.zone}">${ZONE[s.m.zone]}</span>` : ""}${s.result ? `<span class="tag ${s.result.pinsDown === 10 ? "strike" : ""}">${s.result.pinsDown === 10 ? "Strike" : s.result.pinsDown + " pins"}</span>` : `<span class="tag">no result</span>`}${s.hasClip ? `<span class="tag">video</span>` : ""}<span class="tag">entry ${f1(s.a.entryBoard)}</span></div></div></div>`
    ).join("");
    $("sh-share").onclick = openShareSession;
    $("sh-compare").onclick = () => openCompare();
    el.querySelectorAll(".shot").forEach((c) => c.onclick = () => openReview(S.shots.find((s) => s.id === c.dataset.id)));
  }
  var reviewUrl = null;
  var reviewRaf = 0;
  var review3d = null;
  var play3dRaf = 0;
  function closeReview() {
    cancelAnimationFrame(reviewRaf);
    cancelAnimationFrame(play3dRaf);
    review3d?.destroy();
    review3d = null;
    if (reviewUrl) URL.revokeObjectURL(reviewUrl);
    reviewUrl = null;
    $("review").classList.remove("on");
    $("review").innerHTML = "";
  }
  async function openReview(s) {
    const el = $("review");
    el.classList.add("on");
    const clip = s.hasClip ? await loadClip(s.id) : void 0;
    reviewUrl = clip ? URL.createObjectURL(clip) : null;
    const canOverlay = s.cal.length === 4;
    let modeSel = clip && canOverlay ? "lane" : "top";
    el.innerHTML = `
    <div class="row"><h2>${esc(when(s.at))}</h2><button class="btn ghost" id="rv-close">Close</button></div>
    <div class="note">${esc(ballName(s.ballId))} \xB7 ${s.a.speedMph.toFixed(1)} mph \xB7 entry board ${f1(s.a.entryBoard)} \xB7 ${s.m.zone ? ZONE[s.m.zone] : ""}</div>
    <div class="chips" id="rv-modes">
      ${clip && canOverlay ? `<button class="chip ${modeSel === "lane" ? "sel" : ""}" data-m="lane">Lane view</button>` : ""}
      ${clip ? `<button class="chip ${modeSel === "raw" ? "sel" : ""}" data-m="raw">Raw footage</button>` : ""}
      <button class="chip ${modeSel === "top" ? "sel" : ""}" data-m="top">Top-down</button>
      <button class="chip" data-m="3d">3D</button>
    </div>
    ${clip ? `<div class="stagebox" id="rv-video"><video id="rv-v" src="${reviewUrl}" playsinline controls muted></video><canvas class="ov" id="rv-ov" width="${s.vw}" height="${s.vh}"></canvas></div>` : `<div class="note">${s.hasClip ? "The video clip couldn't be loaded." : "No video was saved for this shot (the browser may not support recording)."}</div>`}
    <div class="stagebox" id="rv-top" style="display:none"><canvas id="rv-topc" width="360" height="600" style="width:100%;height:auto;aspect-ratio:360/600"></canvas></div>
    <div id="rv-3d" style="display:none"><div class="stagebox"><div id="rv-3d-host" style="position:relative;width:100%;aspect-ratio:4/3"></div></div><div class="chips"><button class="chip" id="rv-replay">Replay shot in 3D</button></div></div>
    <h3>Metrics</h3>
    <div class="card"><table>${FEATURES.map((f) => ({ f, v: s.m[f.key] })).filter((x) => typeof x.v === "number").map(({ f, v }) => `<tr><td>${esc(f.label)}</td><td class="n">${v.toFixed(f.unit === "\xB0" || f.unit === "mph" || f.unit === "ft" ? 1 : 1)} ${esc(f.unit)}</td></tr>`).join("")}</table></div>
    <h3>Result</h3>
    <div class="chips">${[10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((n) => `<button class="chip ${s.result?.pinsDown === n ? "sel" : n === 10 ? "x" : ""}" data-n="${n}">${n === 10 ? "Strike" : n}</button>`).join("")}</div>
    <h3>Ball</h3>
    <div class="chips">${S.arsenal.map((b) => `<button class="chip ${s.ballId === b.id ? "sel" : ""}" data-b="${b.id}">${esc(b.name)}</button>`).join("") || `<span class="note">Add balls in the Arsenal tab.</span>`}</div>
    <div class="chips"><button class="btn ghost danger" id="rv-del">Delete this shot</button></div>`;
    const topc = $("rv-topc");
    const drawTop = () => {
      const others = S.shots.filter((x) => x.id !== s.id && x.ballId === s.ballId).slice(-25).map((x) => ({ path: x.path, color: "rgba(255,255,255,.35)", width: 1.2, alpha: 0.5 }));
      drawTopDown(topc.getContext("2d"), 360, 600, [...others, { path: s.path, color: ramp(0.7), width: 3.5 }], { board: S.profile?.hand === "L" ? 22.5 : 17.5 });
    };
    const endT = s.path[s.path.length - 1]?.t ?? 0;
    const paths3D = (ballAt) => [
      ...S.shots.filter((x) => x.id !== s.id && x.ballId === s.ballId).slice(-15).map((x) => ({ path: x.path, color: "rgba(255,255,255,.35)", width: 1.5, alpha: 0.5 })),
      { path: s.path, color: "ramp", width: 4, ballAt }
    ];
    const show3D = () => {
      if (!review3d) review3d = mount3D($("rv-3d-host"));
      review3d.setPaths(paths3D(endT));
    };
    const replay3D = () => {
      cancelAnimationFrame(play3dRaf);
      const t02 = performance.now();
      const tick = () => {
        const t = (performance.now() - t02) / 1e3;
        review3d?.setPaths(paths3D(Math.min(t, endT)));
        if (t < endT) play3dRaf = requestAnimationFrame(tick);
      };
      tick();
    };
    const apply2 = () => {
      $("rv-top").style.display = modeSel === "top" ? "block" : "none";
      $("rv-3d").style.display = modeSel === "3d" ? "block" : "none";
      if (clip) $("rv-video").style.display = modeSel === "top" || modeSel === "3d" ? "none" : "block";
      $("rv-ov")?.classList.toggle("hide", modeSel !== "lane");
      el.querySelectorAll("#rv-modes .chip").forEach((c) => c.classList.toggle("sel", c.dataset.m === modeSel));
      if (modeSel === "top") drawTop();
      if (modeSel === "3d") show3D();
    };
    el.querySelectorAll("#rv-modes .chip").forEach((c) => c.onclick = () => (modeSel = c.dataset.m, apply2()));
    apply2();
    if (clip && canOverlay) {
      const v = $("rv-v");
      const cv = $("rv-ov");
      const cx = cv.getContext("2d");
      const Hinv2 = solveHomography([{ x: 0, y: 0 }, { x: LANE_BOARDS, y: 0 }, { x: LANE_BOARDS, y: LANE_LENGTH_FT }, { x: 0, y: LANE_LENGTH_FT }], s.cal);
      const P = (x, y) => applyHomography(Hinv2, { x, y });
      const view3 = { ctx: cx, width: s.vw, P };
      const last = s.path[s.path.length - 1]?.t ?? 0;
      const loop = () => {
        cx.clearRect(0, 0, s.vw, s.vh);
        if (modeSel === "lane") {
          drawLaneGrid(view3);
          const t = v.currentTime + s.recStartT;
          const upto = s.path.filter((p) => p.t <= t).map((p) => P(p.x, p.y));
          strokeTrail(view3, upto, 1, t < last);
          if (t >= last) drawShotMarkers(view3, s.a);
        }
        reviewRaf = requestAnimationFrame(loop);
      };
      loop();
    }
    $("rv-replay").onclick = replay3D;
    $("rv-close").onclick = closeReview;
    $("rv-del").onclick = async () => {
      if (confirm("Delete this shot and its video?")) {
        await removeShot(s.id);
        closeReview();
      }
    };
    el.querySelectorAll("button[data-n]").forEach((b) => b.onclick = async () => (s.result = { pinsDown: Number(b.dataset.n) }, await updateShot(s), openReview(s)));
    el.querySelectorAll("button[data-b]").forEach(
      (b) => b.onclick = async () => {
        s.ballId = b.dataset.b;
        const ball = S.arsenal.find((x) => x.id === b.dataset.b);
        if (ball && s.sig) ball.exemplars = [...ball.exemplars, s.sig].slice(-12);
        await Promise.all([saveArsenal(), updateShot(s)]);
        openReview(s);
      }
    );
  }
  var STATE_PLAN_RECENT = 15;
  function renderInsights() {
    const el = $("insights-page");
    const shots = S.shots;
    if (!shots.length) {
      el.innerHTML = `<h2>Insights</h2><div class="card"><div class="u">Bowl a few shots first. Your averages, common errors and improvement plan build up here, and everything stays on this phone.</div></div>`;
      return;
    }
    const p = computeProfile(shots);
    const issues = findIssues(shots, S.profile?.quiz?.focus ?? []);
    const sessions = [...new Set(S.shots.map((s) => s.sessionId))];
    const zoneTotal = Object.values(p.zones).reduce((a, b) => a + b, 0) || 1;
    const zoneColor = { pocket: "#5affb0", high: "#ffd25a", light: "#ffd25a", "very-high": "#ff5a6e", "very-light": "#ff5a6e" };
    const sessionRows = sessions.map((id) => {
      const g = S.shots.filter((s) => s.sessionId === id);
      const pp = computeProfile(g);
      const inPocket = g.filter((s) => s.m.pocketMiss !== null && Math.abs(s.m.pocketMiss) <= 1).length / (g.filter((s) => s.m.pocketMiss !== null).length || 1);
      return `<tr><td>${esc(when(g[0].at))}</td><td class="n">${g.length}</td><td class="n">${pp.stats.launchSpeed ? pp.stats.launchSpeed.mean.toFixed(1) : "-"}</td><td class="n">${pct(inPocket * 100)}</td><td class="n">${pp.strike.rate === null ? "-" : pct(pp.strike.rate * 100)}</td></tr>`;
    }).reverse().join("");
    const ballIds = [...new Set(S.shots.map((s) => s.ballId).filter(Boolean))];
    const ballRows = ballIds.map((id) => {
      const g = S.shots.filter((s) => s.ballId === id);
      const pp = computeProfile(g);
      return `<tr><td>${esc(ballName(id))}</td><td class="n">${g.length}</td><td class="n">${pp.stats.launchSpeed ? pp.stats.launchSpeed.mean.toFixed(1) : "-"}</td><td class="n">${pp.stats.entryAngle ? pp.stats.entryAngle.mean.toFixed(1) + "\xB0" : "-"}</td><td class="n">${pp.strike.rate === null ? "-" : pct(pp.strike.rate * 100)}</td></tr>`;
    }).join("");
    const needMore = Math.max(0, MIN_OUTCOMES - p.withResults);
    el.innerHTML = `
    <h2>Insights</h2>
    <div class="grid">
      <div class="card"><div class="k">Shots tracked</div><div class="v">${p.shots}</div><div class="u">${sessions.length} session${sessions.length === 1 ? "" : "s"}</div></div>
      <div class="card"><div class="k">Strike rate</div><div class="v">${p.strike.rate === null ? "--" : pct(p.strike.rate * 100)}</div><div class="u">${p.strike.attempts} shots with results${p.strike.attempts && !p.strike.sufficient ? ", low sample" : ""}</div></div>
      <div class="card"><div class="k">In the pocket</div><div class="v">${(() => {
      const m = S.shots.filter((s) => s.m.pocketMiss !== null);
      return m.length ? pct(m.filter((s) => Math.abs(s.m.pocketMiss) <= 1).length / m.length * 100) : "--";
    })()}</div><div class="u">within 1 board</div></div>
    </div>

    <h3>Common errors</h3>
    ${issues.length ? issues.map((i) => `<div class="card"><div class="row"><div class="lr-head" style="font-size:16px">${esc(i.title)}</div><span class="badge ${i.confidence}">${i.confidence}${i.impactPts !== null ? ` \xB7 ${i.impactPts} pts` : ""}${i.flagged ? " \xB7 you flagged this" : ""}</span></div><div class="u" style="margin-top:6px">${esc(i.detail)}</div><ul>${i.evidence.map((e) => `<li>${esc(e)}</li>`).join("")}</ul></div>`).join("") : `<div class="card"><div class="u">${needMore > 0 ? `Enter the pin count after ${needMore} more shots so I can connect your habits to strikes. Until then I can still flag consistency problems once there are 8 or more tracked shots.` : "No clear problems found yet. Keep bowling and I'll keep checking."}</div></div>`}

    <h3>Improvement plan</h3>
    <div id="plan-box"></div>

    <h3>Where you enter the pocket</h3>
    <div class="card"><div class="bar">${Object.entries(p.zones).map(([z, n]) => `<i style="width:${n / zoneTotal * 100}%;background:${zoneColor[z]}" title="${z}"></i>`).join("")}</div><div class="chips">${Object.entries(p.zones).map(([z, n]) => `<span class="tag ${z}">${ZONE[z]} ${pct(n / zoneTotal * 100)}</span>`).join("")}</div></div>

    <h3>Shot map</h3>
    <div class="card"><canvas id="ins-map" width="360" height="600" style="width:100%;height:auto;aspect-ratio:360/600"></canvas><div class="note">Green lines are strikes, red lines are shots that left pins, white lines have no result yet. The dashed green line is the pocket.</div></div>

    <h3>My averages (saved baseline)</h3>
    <div class="card"><table><tr><th>Metric</th><th class="n">Average</th><th class="n">\xB1 Spread</th><th class="n">Shots</th></tr>${FEATURES.filter((f) => p.stats[f.key]).map((f) => `<tr><td>${esc(f.label)}</td><td class="n">${p.stats[f.key].mean.toFixed(1)} ${esc(f.unit)}</td><td class="n">${p.stats[f.key].sd.toFixed(1)}</td><td class="n">${p.stats[f.key].n}</td></tr>`).join("")}</table></div>

    ${ballRows ? `<h3>By ball</h3><div class="card"><table><tr><th>Ball</th><th class="n">Shots</th><th class="n">Speed</th><th class="n">Entry</th><th class="n">Strikes</th></tr>${ballRows}</table></div>` : ""}
    <h3>Sessions</h3>
    <div class="card"><table><tr><th>Date</th><th class="n">Shots</th><th class="n">mph</th><th class="n">Pocket</th><th class="n">Strikes</th></tr>${sessionRows}</table></div>`;
    const map = $("ins-map");
    const paths = S.shots.slice(-80).map((s) => ({ path: s.path, color: !s.result ? "rgba(255,255,255,.4)" : s.result.pinsDown === 10 ? "rgba(90,255,176,.7)" : "rgba(255,90,110,.6)", width: 1.4, alpha: 0.75 }));
    drawTopDown(map.getContext("2d"), 360, 600, paths, { board: S.profile?.hand === "L" ? 22.5 : 17.5 });
    const box = $("plan-box");
    const plan = S.plan;
    if (!plan) {
      box.innerHTML = `<div class="card"><div class="u">${issues.length ? "Build a plan from the problems above: specific targets, a drill for each, and progress tracked against your saved baseline." : "Nothing to build a plan from yet. I need a few more tracked shots or results."}</div>${issues.length ? `<div class="chips"><button class="btn" id="plan-make">Create my plan</button></div>` : ""}</div>`;
      $("plan-make")?.addEventListener("click", async () => {
        S.plan = buildPlan(shots, issues, /* @__PURE__ */ new Date(), S.profile?.quiz?.style);
        await savePlan();
      });
      return;
    }
    const after = S.shots.filter((s) => s.at > plan.createdAt).slice(-STATE_PLAN_RECENT);
    const prog = planProgress(plan, after);
    box.innerHTML = `<div class="note">Plan made ${esc(when(plan.createdAt))} from ${plan.basedOnShots} shots. Progress uses your shots since then (needs 5 or more).</div>` + prog.map(
      ({ item, current: current2, progress, met }) => `<div class="card"><div class="row"><div class="lr-head" style="font-size:16px">${esc(item.title)}</div><span class="badge ${met ? "good" : "moderate"}">${met ? "target met" : "in progress"}</span></div>
      <div class="u">Baseline ${item.baseline} \u2192 target ${item.target} ${esc(item.unit)} \xB7 now ${current2 === null ? "need 5+ new shots" : current2}</div>
      <div class="prog"><i style="width:${Math.round((progress ?? 0) * 100)}%"></i></div>
      <div class="lr-next">Drill: ${esc(item.drill)}</div></div>`
    ).join("") + `<div class="chips"><button class="btn ghost" id="plan-redo">Rebuild plan from all shots</button></div>`;
    $("plan-redo").onclick = async () => {
      S.plan = buildPlan(shots, findIssues(shots, S.profile?.quiz?.focus ?? []), /* @__PURE__ */ new Date(), S.profile?.quiz?.style);
      await savePlan();
    };
  }
  var selPattern = "";
  var custom = { len: 39, vol: 24, ratio: 3, name: "" };
  try {
    custom = { ...custom, ...JSON.parse(localStorage.getItem("laneiq.customPattern") ?? "{}") };
  } catch {
  }
  var showOlder = false;
  var srcWord = (kind) => kind === "manufacturer" ? "manufacturer page" : kind === "retailer" ? "retailer's announcement" : kind === "reviewer" ? "review site" : kind;
  var selSeries = "";
  var patFind = "";
  function patOptions() {
    const q = patFind.trim().toLowerCase();
    const shown = S.patterns.filter((p) => p.key === selPattern || (!selSeries || p.series === selSeries) && (!q || `${p.name} ${p.series ?? ""} ${p.lengthFt}`.toLowerCase().includes(q)));
    const label2 = (p) => `${p.name}${p.series && !p.name.toLowerCase().includes(p.series.toLowerCase()) ? " \xB7 " + p.series : ""} \xB7 ${p.lengthFt} ft`;
    return `<option value="">Custom (enter from the center's sheet)</option>` + shown.sort((a, b) => a.name.localeCompare(b.name)).map((p) => `<option value="${esc(p.key)}" ${p.key === selPattern ? "selected" : ""}>${esc(label2(p))}</option>`).join("") + (shown.length === 0 ? `<option disabled>No patterns match</option>` : "");
  }
  function currentPattern() {
    const found = S.patterns.find((p) => p.key === selPattern);
    return found ?? customPattern(custom.len, custom.vol || void 0, custom.ratio || void 0, custom.name || "Custom pattern");
  }
  function renderArsenal() {
    const el = $("arsenal-page");
    const owned = ownedBalls();
    const pat = currentPattern();
    const bowler = bowlerProfile();
    const lineup = buildLineup(pat, bowler, owned);
    const ownedKeys = new Set(S.arsenal.map((b) => b.catalogKey).filter(Boolean));
    el.innerHTML = `
    <h2>Arsenal</h2>
    <h3>My balls</h3>
    <div class="note">${S.demo ? "Demo mode: balls here are not saved." : S.profile ? `Saved automatically to ${esc(S.profile.name)}'s profile on this phone (${S.arsenal.length} ball${S.arsenal.length === 1 ? "" : "s"}). Lineups and next-ball picks use these.` : ""}</div>
    ${S.arsenal.length ? "" : `<div class="card"><div class="u">No balls yet. Add them here or from the Live tab (where you can also show each ball to the camera so it recognizes it).</div></div>`}
    ${S.arsenal.map((b) => {
      const o = owned.find((x) => x.id === b.id);
      const spec = o.specs;
      const idx = spec ? motionIndex(spec) : null;
      return `<div class="card" data-ball="${b.id}"><div class="row"><div class="lr-head" style="font-size:16px">${esc(b.name)}</div><span class="badge ${spec ? "good" : "tentative"}">${spec ? b.catalogKey ? "catalog specs" : "your specs" : "no specs"}</span></div>
          <div class="u">${b.exemplars.length} look${b.exemplars.length === 1 ? "" : "s"} learned${idx !== null ? ` \xB7 motion index ${idx.toFixed(2)}` : ""}${o.observed ? ` \xB7 ${o.observed.shots} shots, ${f1(o.observed.entryAngle)}\xB0 entry, breakpoint ${f1(o.observed.breakpointFt, 0)} ft` : ""}</div>
          ${b.catalogKey ? "" : `<div class="two"><div class="field"><label>RG</label><input data-f="rg" inputmode="decimal" value="${b.rg ?? ""}" placeholder="2.50"></div><div class="field"><label>Differential</label><input data-f="diff" inputmode="decimal" value="${b.diff ?? ""}" placeholder="0.045"></div></div>
          <div class="field"><label>Cover</label><select data-f="cover"><option value="">choose\u2026</option>${["solid", "hybrid", "pearl", "urethane", "plastic"].map((c) => `<option ${b.cover === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>`}
          <div class="chips">${b.catalogKey ? "" : `<button class="chip" data-act="save">Save specs</button>`}<button class="chip danger" data-act="del">Remove</button></div></div>`;
    }).join("")}
    <div class="card"><div class="k">Add a ball</div><div class="chips"><input id="ab-name" class="ballinput" placeholder="${S.catalog.length ? `Search ${S.catalog.length} catalog balls or type a name` : "Ball name"}"><button class="chip add" id="ab-add">+ Add</button><button class="chip add" id="ab-scan">+ Scan a ball (photo)</button></div></div>

    <h3>Build my arsenal for a pattern</h3>
    <div class="card">
      <div class="field"><label>Oil pattern (${S.patterns.length} in the library)</label>
        ${S.patterns.length > 12 ? `<div class="two"><select id="pat-series"><option value="">All groups</option>${[...new Set(S.patterns.map((p) => p.series).filter(Boolean))].sort().map((s) => `<option ${s === selSeries ? "selected" : ""}>${esc(s)}</option>`).join("")}</select><input id="pat-find" placeholder="Search (name, length)" value="${esc(patFind)}" autocomplete="off"></div>` : ""}
        <select id="pat-sel">${patOptions()}</select></div>
      ${selPattern ? "" : `<div class="two"><div class="field"><label>Length (ft)</label><input id="cp-len" inputmode="decimal" value="${custom.len}"></div><div class="field"><label>Volume (mL)</label><input id="cp-vol" inputmode="decimal" value="${custom.vol}"></div></div><div class="field"><label>Ratio (the first number of N:1)</label><input id="cp-ratio" inputmode="decimal" value="${custom.ratio}"></div>`}
      <div class="u">${lengthClass(pat.lengthFt)} pattern${pat.ratio !== void 0 ? ` \xB7 ${pat.ratio}:1 ratio, ${isSportRatio(pat.ratio) ? `within the ${SPORT_RATIO_LIMIT}:1 sport limit` : `above the ${SPORT_RATIO_LIMIT}:1 sport limit`}` : ""}${pat.volumeMl !== void 0 ? ` \xB7 ${pat.volumeMl} mL` : ""}</div>
      ${pat.source.kind === "user" ? "" : `<div class="note">Source: <a style="color:var(--cy)" href="${esc(pat.source.url)}" target="_blank" rel="noopener">${esc(pat.source.kind)}</a>, retrieved ${esc(pat.source.retrievedOn)}.${pat.note ? " " + esc(pat.note) : ""}</div>`}
      ${S.patterns.length ? "" : `<div class="note">The pattern library is empty. Enter any pattern from the center's sheet above, or import more with tools/import-patterns.ts.</div>`}
    </div>
    <div id="lineup"></div>`;
    el.querySelectorAll("[data-ball]").forEach((card) => {
      const b = S.arsenal.find((x) => x.id === card.dataset.ball);
      card.querySelector("[data-act=save]")?.addEventListener("click", async () => {
        const num2 = (f) => parseFloat(card.querySelector(`[data-f=${f}]`).value);
        const rg = num2("rg");
        const diff = num2("diff");
        b.rg = Number.isFinite(rg) ? rg : void 0;
        b.diff = Number.isFinite(diff) ? diff : void 0;
        b.cover = card.querySelector("[data-f=cover]").value || void 0;
        await saveArsenal();
      });
      card.querySelector("[data-act=del]")?.addEventListener("click", async () => {
        if (confirm(`Remove ${b.name} from your arsenal?`)) {
          S.arsenal = S.arsenal.filter((x) => x.id !== b.id);
          await saveArsenal();
        }
      });
    });
    attachSuggest($("ab-name"));
    $("ab-scan").onclick = () => openScanLab(() => renderArsenal());
    $("ab-add").onclick = async () => {
      const n = $("ab-name").value.trim();
      if (!n) return;
      const hit = S.catalog.find((c) => `${c.manufacturer} ${c.name}`.toLowerCase() === n.toLowerCase());
      S.arsenal.push({ id: Math.random().toString(36).slice(2, 9), name: n, exemplars: [], catalogKey: hit?.key });
      await saveArsenal();
    };
    $("pat-series")?.addEventListener("change", (e) => {
      selSeries = e.target.value;
      $("pat-sel").innerHTML = patOptions();
    });
    $("pat-find")?.addEventListener("input", (e) => {
      patFind = e.target.value;
      $("pat-sel").innerHTML = patOptions();
    });
    $("pat-sel").onchange = (e) => {
      selPattern = e.target.value;
      renderArsenal();
    };
    const bindCustom = (id, key) => {
      const i = document.getElementById(id);
      if (!i) return;
      i.onchange = () => {
        const v = parseFloat(i.value);
        if (Number.isFinite(v)) custom[key] = v;
        try {
          localStorage.setItem("laneiq.customPattern", JSON.stringify(custom));
        } catch {
        }
        renderArsenal();
      };
    };
    bindCustom("cp-len", "len");
    bindCustom("cp-vol", "vol");
    bindCustom("cp-ratio", "ratio");
    renderLineup($("lineup"), lineup, pat, bowler, ownedKeys);
    renderOptimizer($("lineup"), pat, bowler, owned, ownedKeys);
    renderNext($("lineup"), pat, bowler, ownedKeys, lineup);
    renderUpcoming($("lineup"), pat, bowler, owned, ownedKeys, lineup);
  }
  function renderOptimizer(el, pat, bowler, owned, ownedKeys) {
    const r = optimizeArsenal({ bowler, owned, catalog: S.catalog, ownedKeys, tonight: pat.source.url === "typical condition used by the optimizer" ? null : pat });
    const box = document.createElement("div");
    const col = r.score === null ? "var(--dim)" : r.score >= 80 ? "var(--mint)" : r.score >= 55 ? "var(--gold)" : "var(--red)";
    const mark = (s) => s === "covered" ? `<span class="badge good">covered</span>` : s === "stretch" ? `<span class="badge moderate">stretch</span>` : `<span class="badge tentative">gap</span>`;
    box.innerHTML = `<h3>Arsenal optimizer</h3>
    <div class="card"><div class="row"><div><div class="k">Coverage score</div><div style="font-size:40px;font-weight:800;color:${col}">${r.score === null ? "\u2013" : r.score}<span class="note" style="font-size:16px"> / 100</span></div></div>
      <div class="u" style="max-width:60%">${r.score === null ? "Add balls with RG and differential (or pick them from the catalog) and I'll score how well they cover the conditions you meet." : "How well your balls cover heavy oil, a typical house shot, dry lanes and short and long sport patterns, for how you bowl."}</div></div>
      ${r.profile.length ? `<div class="k" style="margin-top:10px">What your numbers say</div><ul>${r.profile.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}</div>
    <div class="card"><div class="k">Conditions and the ball that covers each</div><table>${r.scenarios.map((s) => `<tr><td>${esc(s.name)}<div class="note">${esc(s.blurb)}</div></td><td>${s.best ? esc(s.best.ball.name) : "nothing yet"}</td><td class="n">${mark(s.status)}</td></tr>`).join("")}</table></div>
    ${r.overlaps.length ? `<div class="card"><div class="k">Overlap</div><ul>${r.overlaps.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
    ${r.buys.length ? `<div class="card"><div class="k">Best next balls</div>${r.buys.map((b) => `<div style="padding:8px 0;border-top:1px solid var(--line)"><b>Fills: ${esc(b.fixes.join(", "))}</b><div class="u">You're missing a ${b.direction} ball (motion index near ${b.target.toFixed(2)}).</div>${b.picks.map((c) => `<div style="margin-top:8px;display:flex;gap:12px">${ballThumb(c.ball, 64)}<div style="flex:1;min-width:0"><b>${esc(c.ball.manufacturer)} ${esc(c.ball.name)}</b> <span class="note">${esc(specLine2(c.ball))}</span>${layoutHtml(c.ball, bowler, b.direction === "stronger" ? "carry" : "early")}</div></div>`).join("")}</div>`).join("")}</div>` : r.score !== null ? `<div class="card"><div class="u">Your arsenal covers every condition I check. Nothing to add right now.</div></div>` : ""}
    ${r.spare.has ? "" : `<div class="card"><div class="k">No spare ball</div><div class="u">A plastic spare ball keeps your strike balls from hooking on spares.${r.spare.picks.length ? ` From the catalog: ${r.spare.picks.map((c) => esc(`${c.manufacturer} ${c.name}`)).join(", ")}.` : ""}</div></div>`}
    <div class="card"><div class="k">Read this first</div><ul>${r.notes.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`;
    el.append(box);
  }
  function renderUpcoming(el, pat, bowler, owned, ownedKeys, lineup) {
    const opt = optimizeArsenal({ bowler, owned, catalog: S.catalog, ownedKeys, tonight: pat.source.url === "typical condition used by the optimizer" ? null : pat });
    const targets = [{ target: lineup.target, label: `tonight's pattern (${pat.name})` }, ...opt.scenarios.filter((s) => s.status !== "covered").map((s) => ({ target: s.target, label: `a gap in your arsenal: ${s.name.toLowerCase()}` }))];
    const picks = upcomingForBowler(S.catalog, ownedKeys, targets, 6);
    const box = document.createElement("div");
    const when2 = (d) => d ? (/* @__PURE__ */ new Date(d + "T12:00:00")).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" }) : "date not announced";
    box.innerHTML = `<h3>New balls coming out you might be interested in</h3>
    <div class="card">${picks.length ? picks.map((p) => `<div style="padding:8px 0;border-top:1px solid var(--line);display:flex;gap:12px">${ballThumb(p.ball)}<div style="flex:1;min-width:0"><div class="row"><b>${esc(p.ball.manufacturer)} ${esc(p.ball.name)}</b><span class="badge ${p.index !== null ? "good" : "tentative"}">${esc(p.ball.availableOn ? "out " + when2(p.ball.availableOn.value) : "date not announced")}</span></div>
        <div class="u">${p.index !== null ? esc(specLine2(p.ball)) : "Specs not published yet"}</div><div class="u">${esc(p.why)}</div>
        <div class="note">Source: <a style="color:var(--cy)" href="${esc((p.ball.rg ?? p.ball.status).source.url)}" target="_blank" rel="noopener">${esc(srcWord((p.ball.rg ?? p.ball.status).source.kind))}</a>, ${esc((p.ball.rg ?? p.ball.status).source.retrievedOn)}${p.ball.imageUrl ? " \xB7 photo: manufacturer" : ""}</div></div></div>`).join("") : `<div class="u">Nothing announced that fits yet. This list fills in when manufacturers announce new balls and the catalog is refreshed.</div>`}
      <div class="note">Release dates and specs come from the manufacturers' announcements and can change before a ball ships.</div></div>`;
    el.append(box);
  }
  function renderProshop() {
    const el = $("proshop-page");
    const p = S.profile;
    const bp = bowlerProfile();
    const pat = currentPattern();
    const lineup = buildLineup(pat, bp, ownedBalls());
    const ownedKeys = new Set(S.arsenal.map((b) => b.catalogKey).filter(Boolean));
    const inch2 = (v) => v === void 0 ? "not entered" : fractionInches(v);
    const fit = p?.fit;
    const sheets = p?.sheets ?? [];
    const realPat = pat.source.url === "typical condition used by the optimizer" ? null : pat;
    el.innerHTML = `
    <h2>Pro shop</h2>
    <div class="note">Tools for fitting, layout and drilling, for bowlers and for pro shop operators, plus what to look for at a pro shop.</div>
    <div class="card"><div class="k">Layout and drilling</div>
      <div class="chips"><button class="btn" id="ps-lab">Layout Lab: see a layout on the ball</button><button class="btn" id="ps-scan">Scan a drilled ball</button><button class="btn ghost" id="ps-report">Fitting report (print or save PDF)</button></div>
      <div class="note">The Layout Lab draws the ball with its holes, pin, PSA, PAP and VAL in Dual Angle, Pin Buffer and 2LS, previews the flare, and prints a drill sheet. Scan reads the layout off a photo of a drilled ball.</div></div>
    <div class="card"><div class="k">${p ? esc(p.name) + "'s" : "This"} fit</div>
      <table><tr><td>Hand</td><td class="n">${bp.hand === "R" ? "Right" : "Left"}${bp.style === "two-handed" ? ", two-handed" : bp.style === "one-hand-no-thumb" ? ", no thumb" : ""}</td></tr>
      <tr><td>PAP</td><td class="n">${esc(p?.spin?.pap ?? "not entered")}</td></tr>
      <tr><td>Rev rate \xB7 speed</td><td class="n">${bp.revRpm ? Math.round(bp.revRpm) + " RPM" : "unknown"} \xB7 ${bp.launchSpeed ? bp.launchSpeed.toFixed(1) + " mph" : "unknown"}</td></tr>
      <tr><td>Axis rotation \xB7 tilt</td><td class="n">${bp.axisRotation !== void 0 ? Math.round(bp.axisRotation) + "\xB0" : "-"} \xB7 ${bp.axisTilt !== void 0 ? Math.round(bp.axisTilt) + "\xB0" : "-"}</td></tr>
      <tr><td>Span</td><td class="n">${inch2(fit?.span)}</td></tr><tr><td>Thumb \xB7 finger holes \xB7 bridge</td><td class="n">${inch2(fit?.thumbDia)} \xB7 ${inch2(fit?.fingerDia)} \xB7 ${inch2(fit?.bridge)}</td></tr></table>
      <div class="note">Enter or change these in the Layout Lab (Hand and grip), and the ball-motion numbers under Me.</div></div>
    <div class="card"><div class="k">Saved layouts${p ? " for " + esc(p.name) : ""}</div>
      ${sheets.length ? sheets.map((x) => `<div class="row" style="padding:6px 0;border-top:1px solid var(--line)"><div><b>${esc(x.ball.name)}</b> <span class="note">${esc(x.layoutText)} \xB7 ${esc(new Date(x.at).toLocaleDateString())}</span></div><div><button class="chip" data-open="${x.id}">Open</button><button class="chip danger" data-rm="${x.id}">Delete</button></div></div>`).join("") : `<div class="u">None yet. Save a layout from the Layout Lab and it appears here, with the bowler's profile.</div>`}</div>
    <h3>What to look for at a pro shop</h3>
    <div class="chips"><button class="chip" id="ps-print">Open as a printable sheet</button></div>
    ${playbookHtml(realPat)}`;
    $("ps-lab").onclick = () => openLayoutLab();
    $("ps-scan").onclick = () => openBallScan();
    $("ps-report").onclick = () => openReport(pat, bp, lineup, ownedKeys);
    $("ps-print").onclick = () => openPlaybook(realPat);
    el.querySelectorAll("[data-open]").forEach((b) => b.onclick = () => openLayoutLab({ sheetId: b.dataset.open }));
    el.querySelectorAll("[data-rm]").forEach((b) => b.onclick = () => (updateProfile({ sheets: (S.profile?.sheets ?? []).filter((x) => x.id !== b.dataset.rm) }), renderProshop()));
  }
  function renderLineup(el, l, pat, bowler, ownedKeys) {
    const dem2 = patternDemand(pat, bowler);
    const data = [
      `${bowler.style ? styleLabel(bowler.style) + ", " : ""}${bowler.hand === "R" ? "right" : "left"}-handed`,
      bowler.launchSpeed !== void 0 ? `speed ${bowler.launchSpeed.toFixed(1)} mph (measured)` : "speed not measured yet",
      bowler.entryAngle !== void 0 ? `entry angle ${bowler.entryAngle.toFixed(1)}\xB0 (measured)` : "entry angle not measured yet",
      bowler.revRpm !== void 0 ? `rev rate ${bowler.revRpm} RPM (${bowler.revSource === "entered" ? "entered" : "estimated, not measured"})` : "rev rate not entered"
    ];
    el.innerHTML = `
    <h3>Your lineup for ${esc(pat.name)}</h3>
    ${l.slots.length ? l.slots.map((s) => `<div class="card"><div class="k">${esc(s.role)}</div><div class="row"><div class="lr-head">${s.ball ? esc(s.ball.name) : "No suitable ball"}</div><span class="badge ${s.fit === "good" ? "good" : s.fit === "stretch" ? "moderate" : "tentative"}">${s.fit === "gap" ? "gap" : s.fit}</span></div><div class="u">${esc(s.why)}</div></div>`).join("") : `<div class="card"><div class="u">${esc(l.gaps[0] ?? "Add balls with specs to build a lineup.")}</div></div>`}
    <div class="card"><div class="k">Why these picks</div><ul>${dem2.reasons.map((r) => `<li>${esc(r)}</li>`).join("")}</ul><div class="note">Based on: ${esc(data.join(" \xB7 "))}.</div></div>
    ${l.gaps.length && l.slots.length ? `<div class="card"><div class="k">Gaps in your arsenal</div><ul>${l.gaps.map((g) => `<li>${esc(g)}</li>`).join("")}</ul>${l.slots.filter((s) => s.fit === "gap" && s.index !== null).map((s) => {
      const want = Number(/near (-?[\d.]+)/.exec(l.gaps.find((g) => g.includes(s.role)) ?? "")?.[1]);
      const fill = Number.isFinite(want) ? gapFillers(S.catalog, ownedKeys, want) : [];
      return fill.length ? `<div class="u">Catalog balls that would fill "${esc(s.role)}": ${fill.map((f) => esc(`${f.ball.manufacturer} ${f.ball.name} (${f.index.toFixed(2)})`)).join(", ")}</div>` : "";
    }).join("")}</div>` : ""}
    <div class="card"><div class="k">Read this first</div><ul>${l.caveats.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div>`;
  }
  var nextRole = "start";
  var ROLE_OFFSET = { start: 0, early: -0.35, carry: 0.35 };
  var ROLE_LABEL = { start: "Start ball", early: "When it hooks early", carry: "When it skids or carries down" };
  var specLine2 = (b) => [b.rg && `RG ${b.rg.value}`, b.differential && `diff ${b.differential.value}`, b.coverstock?.value, b.core?.value, b.coreSymmetry?.value, b.specWeightLb && `${b.specWeightLb.value} lb specs`].filter(Boolean).join(" \xB7 ");
  function layoutHtml(ball, bowler, role) {
    const adv = suggestLayouts(ball, bowler, role);
    return `<details style="margin-top:6px"><summary class="u" style="cursor:pointer;color:var(--cy)">Suggested layout</summary>
    ${adv.layouts.map((l, i) => `<div style="padding:6px 0"><b>${i === 0 ? "Best fit: " : "Alternative: "}${esc(l.name)}</b><div class="u">${esc(l.notation)} (pin to PAP x ${l.valDeg ? "VAL angle x " : ""}pin buffer)</div><div class="note">${esc(l.effect)}</div></div>`).join("")}
    <ul>${[...adv.notes, ...adv.grip].map((n) => `<li>${esc(n)}</li>`).join("")}</ul></details>`;
  }
  function renderNext(el, pat, bowler, ownedKeys, lineup) {
    const want = lineup.target + ROLE_OFFSET[nextRole];
    const cands = rankCatalog(S.catalog, ownedKeys, want, 8, 2, { includeOlder: showOlder });
    const box = document.createElement("div");
    box.innerHTML = `<h3>Find my next ball</h3>
    <div class="card"><div class="u">Catalog balls whose published specs best match what this role wants for ${esc(pat.name)}, excluding balls you already own and at most two per brand. ${showOlder ? "Older and retired balls are included (for shopping used)." : "Only balls the manufacturer still sells that came out last year or this year are suggested."} ${S.catalog.length} balls in the catalog.</div>
      <div class="chips"><button class="chip ${showOlder ? "sel" : ""}" id="older-toggle">${showOlder ? "Showing older balls too" : "Include older or retired balls"}</button></div>
      <div class="chips">${Object.keys(ROLE_LABEL).map((r) => `<button class="chip ${r === nextRole ? "sel" : ""}" data-role="${r}">${ROLE_LABEL[r]}</button>`).join("")}</div>
      ${cands.length ? cands.map((c, i) => `<div style="padding:10px 0;border-top:1px solid var(--line);display:flex;gap:12px">${ballThumb(c.ball)}<div style="flex:1;min-width:0"><div class="row"><b>${i + 1}. ${esc(c.ball.manufacturer)} ${esc(c.ball.name)}</b><span class="badge ${c.off <= 0.15 ? "good" : "moderate"}">motion ${c.index.toFixed(2)}</span></div><div class="u">${esc(specLine2(c.ball))}${c.ball.releaseYear ? ` \xB7 ${c.ball.releaseYear.value}` : ""}</div><div class="note">Source: <a style="color:var(--cy)" href="${esc(c.ball.rg.source.url)}" target="_blank" rel="noopener">${esc(srcWord(c.ball.rg.source.kind))}</a>, ${esc(c.ball.rg.source.retrievedOn)}${c.ball.releaseYear ? ` \xB7 ${esc(String(c.ball.availableOn ? c.ball.availableOn.value : c.ball.releaseYear.value))}` : ""}</div>${layoutHtml(c.ball, bowler, nextRole)}<div class="chips"><button class="chip" data-lab="${esc(c.ball.key)}">Preview a layout on this ball</button></div></div></div>`).join("") : `<div class="u">No catalog balls with RG and differential to rank.</div>`}
      <div class="note">Spec-based ranking. Confirm on the lanes: drill and test before buying.</div></div>
    <div class="chips"><button class="btn ghost" id="to-proshop">Pro shop tools: layouts, fitting report, playbook</button></div>`;
    el.append(box);
    box.querySelector("#older-toggle").onclick = () => (showOlder = !showOlder, renderArsenal());
    box.querySelectorAll("[data-role]").forEach((b) => b.onclick = () => (nextRole = b.dataset.role, renderArsenal()));
    $("to-proshop").onclick = () => showTab("proshop");
    box.querySelectorAll("[data-lab]").forEach((b) => b.onclick = () => openLayoutLab({ catalogKey: b.dataset.lab }));
  }
  function openReport(pat, bowler, lineup, ownedKeys) {
    const el = $("report");
    const p = S.profile;
    const prof = computeProfile(S.shots);
    const st2 = (k2, d = 1, u = "") => prof.stats[k2] ? `${prof.stats[k2].mean.toFixed(d)}${u} (\xB1${prof.stats[k2].sd.toFixed(d)}, ${prof.stats[k2].n} shots)` : "not measured";
    const sp = p?.spin;
    const picks = ["start", "early", "carry"].map((r) => ({ r, c: rankCatalog(S.catalog, ownedKeys, lineup.target + ROLE_OFFSET[r], 3, 1) }));
    el.classList.add("on");
    el.innerHTML = `
    <div class="row noprint"><button class="btn" onclick="window.print()">Print or save PDF</button><button class="btn ghost" id="rp-close">Close</button></div>
    <h2>LaneIQ fitting report</h2>
    <div class="note">${esc((/* @__PURE__ */ new Date()).toLocaleDateString([], { dateStyle: "long" }))}</div>
    <div class="card"><div class="k">Bowler</div><b>${esc(p?.name ?? "")}</b>
      <ul><li>${p?.quiz ? esc(summarize(p.quiz)[0]) : `${bowler.hand === "R" ? "Right" : "Left"}-handed`}</li>
      <li>Rev rate: ${bowler.revRpm ? `${bowler.revRpm} RPM (${bowler.revSource === "entered" ? "entered" : bowler.revSource === "measured" ? "measured from release video" : "estimated, not measured"})` : "not known"}</li>
      <li>Axis rotation: ${sp?.axisRotation !== void 0 ? sp.axisRotation + "\xB0" : "not measured"} \xB7 axis tilt: ${sp?.axisTilt !== void 0 ? sp.axisTilt + "\xB0" : "not measured"}${sp?.pap ? ` \xB7 PAP: ${esc(sp.pap)}` : ""}</li></ul></div>
    <div class="card"><div class="k">Measured on the lane by the camera</div><table>
      <tr><td>Launch speed</td><td class="n">${st2("launchSpeed", 1, " mph")}</td></tr>
      <tr><td>Entry angle</td><td class="n">${st2("entryAngle", 1, "\xB0")}</td></tr>
      <tr><td>Breakpoint distance</td><td class="n">${st2("breakpointFt", 0, " ft")}</td></tr>
      <tr><td>Breakpoint board</td><td class="n">${st2("breakpointBoard", 1)}</td></tr>
      <tr><td>Entry board</td><td class="n">${st2("entryBoard", 1)}</td></tr>
      <tr><td>Hook (breakpoint to entry)</td><td class="n">${st2("hookBoards", 1, " boards")}</td></tr></table>
      <div class="note">${prof.shots} tracked shots.${prof.strike.attempts ? ` Strike rate ${Math.round((prof.strike.rate ?? 0) * 100)}% over ${prof.strike.attempts} shots with results.` : ""}</div></div>
    <div class="card"><div class="k">Pattern</div><b>${esc(pat.name)}</b><div class="u">${pat.lengthFt} ft${pat.volumeMl !== void 0 ? ` \xB7 ${pat.volumeMl} mL` : ""}${pat.ratio !== void 0 ? ` \xB7 ${pat.ratio}:1` : ""} (${pat.source.kind === "user" ? "entered by the bowler" : "source: " + esc(pat.source.url)})</div></div>
    <div class="card"><div class="k">Recommended lineup from the arsenal</div>${lineup.slots.length ? `<ul>${lineup.slots.map((s) => `<li><b>${esc(s.role)}:</b> ${s.ball ? esc(s.ball.name) : "no suitable ball"}. ${esc(s.why)}</li>`).join("")}</ul>` : `<div class="u">No arsenal specs on file.</div>`}
      <ul>${dem(pat, bowler)}</ul></div>
    <div class="card"><div class="k">Suggested additions from the catalog</div>${picks.map(({ r, c }) => `<div style="margin:8px 0"><b>${ROLE_LABEL[r]}</b><ul>${c.map((x) => `<li>${esc(x.ball.manufacturer)} ${esc(x.ball.name)} (${esc(specLine2(x.ball))})<br><span class="u">Layout: ${esc(suggestLayouts(x.ball, bowler, r).layouts[0].name)}, ${esc(suggestLayouts(x.ball, bowler, r).layouts[0].notation)}</span></li>`).join("") || "<li>none found</li>"}</ul></div>`).join("")}</div>
    <div class="card"><div class="k">Read this first</div><ul>${lineup.caveats.map((c) => `<li>${esc(c)}</li>`).join("")}<li>Camera measurements carry uncertainty. Specs are the manufacturers' published numbers, not a measure of how a ball behaves for this bowler. Confirm with test shots before drilling.</li></ul></div>`;
    $("rp-close").onclick = () => (el.classList.remove("on"), el.innerHTML = "");
  }
  var dem = (pat, bowler) => patternDemand(pat, bowler).reasons.map((r) => `<li>${esc(r)}</li>`).join("");
  function renderMe() {
    const el = $("me-page");
    const p = S.profile;
    const profs = listProfiles();
    el.innerHTML = `
    <h2>Me</h2>
    ${p?.quiz ? `<div class="card"><div class="k">Your bowler profile</div><ul>${summarize(p.quiz).map((l) => `<li>${esc(l)}</li>`).join("")}</ul><div class="note">${esc(styleNotes(p.quiz.style).join(" "))}</div><div class="chips"><button class="btn ghost" id="me-quiz">Retake the quiz</button></div></div>` : p ? `<div class="card"><div class="u">Take the short bowler quiz so the app knows how you bowl.</div><div class="chips"><button class="btn" id="me-quiz">Take the quiz</button></div></div>` : ""}
    ${p ? `<div class="card"><div class="k">Ball motion (pro shop)</div>
      <div class="note">The live camera can't measure these. Enter numbers from a pro-shop tool, or measure them from a slow-motion release video.${p.spin ? ` Last set ${esc(when(p.spin.at))} (${p.spin.source === "video" ? "from video" : "entered"}).` : ""}</div>
      <div class="two"><div class="field"><label>Rev rate (RPM)</label><input id="sp-rpm" inputmode="numeric" value="${p.spin?.rpm ?? ""}"></div><div class="field"><label>Axis rotation (\xB0)</label><input id="sp-rot" inputmode="decimal" value="${p.spin?.axisRotation ?? ""}"></div></div>
      <div class="two"><div class="field"><label>Axis tilt (\xB0)</label><input id="sp-tilt" inputmode="decimal" value="${p.spin?.axisTilt ?? ""}"></div><div class="field"><label>PAP (e.g. 4 1/4 over, 1/2 up)</label><input id="sp-pap" value="${esc(p.spin?.pap ?? "")}"></div></div>
      <div class="chips"><button class="btn ghost" id="sp-save">Save</button><button class="btn ghost" id="sp-lab">Measure from a release video</button></div></div>` : ""}
    ${p ? `<div class="card"><div class="k">Profile</div>
      <div class="field"><label>Name</label><input id="me-name" value="${esc(p.name)}"></div>
      <div class="two"><div class="field"><label>Throws</label><select id="me-hand"><option value="R" ${p.hand === "R" ? "selected" : ""}>Right-handed</option><option value="L" ${p.hand === "L" ? "selected" : ""}>Left-handed</option></select></div>
      <div class="field"><label>Rev rate (RPM, optional)</label><input id="me-rev" inputmode="numeric" value="${p.revRpm ?? ""}" placeholder="not measured"></div></div>
      <div class="chips"><button class="btn ghost" id="me-save">Save</button></div></div>` : ""}
    ${p ? friendsCardHtml() : ""}
    <h3>Profiles on this phone</h3>
    <div class="card">${profs.map((x) => `<div class="row" style="padding:6px 0"><div><b>${esc(x.name)}</b> <span class="note">${x.hand === "R" ? "right" : "left"}-handed${x.id === p?.id ? " \xB7 current" : ""}</span></div><div>${x.id === p?.id ? "" : `<button class="chip" data-sw="${x.id}">Switch</button>`}<button class="chip danger" data-rm="${x.id}">Delete</button></div></div>`).join("") || `<div class="u">No profiles yet.</div>`}<div class="chips"><button class="btn ghost" id="me-new">+ Add a profile</button></div>
      <div class="note">Each profile keeps its own balls, shots, videos, averages and plan, and they never mix. Use one per person if you share a phone.</div></div>
    <h3>How LaneIQ is doing</h3>
    <div class="card"><ul>${healthSummary().lines.map((l) => `<li>${esc(l)}</li>`).join("")}<li>Ball catalog: ${S.catalog.length} balls, each spec with its source.</li></ul>
      <div class="note">The app keeps these numbers on this phone only. If lane lock keeps struggling, copy them and send them with a Save frame picture so detection can be improved from real examples.</div>
      <div class="chips"><button class="btn ghost" id="me-diag">Copy diagnostics</button></div></div>
    <h3>Your data</h3>
    <div class="card"><div class="note">Everything is stored only on this phone. Nothing is uploaded, and there is no account to sign in to. If you delete the app's website data or switch phones, your history doesn't come along unless you export it.</div><div id="me-storage" class="u" style="margin-top:6px"></div><div class="chips"><button class="btn ghost" id="me-export">Export my data</button></div></div>
    <h3>About</h3>
    <div class="card"><div class="note">Measurements come from one phone camera, so they carry uncertainty. The coaching only links your habits to strikes once there are at least ${MIN_OUTCOMES} shots with a pin count entered, and calls small samples "tentative". Ball and pattern numbers are published specs, not measurements of how a ball behaves for you. Minimum sample for a reliable percentage is ${MIN_SAMPLE}.</div></div>`;
    $("me-save")?.addEventListener("click", () => {
      const rev = parseInt($("me-rev").value, 10);
      const name = $("me-name").value.trim() || p.name;
      const hand = $("me-hand").value;
      const revRpm = Number.isFinite(rev) ? rev : void 0;
      updateProfile({ name, hand, revRpm, quiz: p.quiz ? { ...p.quiz, name, hand, revRpm } : void 0 });
    });
    el.querySelectorAll("[data-sw]").forEach((b) => b.onclick = () => (setCurrentProfile(b.dataset.sw), location.reload()));
    el.querySelectorAll("[data-rm]").forEach(
      (b) => b.onclick = async () => {
        const x = profs.find((q) => q.id === b.dataset.rm);
        if (!confirm(`Delete ${x.name} and all their shots, videos and plan from this phone? This can't be undone.`)) return;
        saveProfiles(profs.filter((q) => q.id !== x.id));
        await deleteProfileData(x.id);
        location.reload();
      }
    );
    wireFriendsCard(renderMe);
    $("me-new").onclick = () => showQuiz("add", () => {
    });
    $("sp-save")?.addEventListener("click", () => {
      const num2 = (id) => {
        const v = parseFloat($(id).value);
        return Number.isFinite(v) ? v : void 0;
      };
      updateProfile({ spin: { rpm: num2("sp-rpm"), axisRotation: num2("sp-rot"), axisTilt: num2("sp-tilt"), pap: $("sp-pap").value.trim() || void 0, source: "entered", at: (/* @__PURE__ */ new Date()).toISOString() } });
    });
    $("sp-lab")?.addEventListener("click", () => openSpinLab(() => renderMe()));
    $("me-quiz")?.addEventListener("click", () => showQuiz("retake", () => renderMe()));
    $("me-diag").onclick = async () => {
      const txt = diagnosticsText();
      try {
        await navigator.clipboard.writeText(txt);
        $("me-diag").textContent = "Copied";
      } catch {
        prompt("Copy these diagnostics:", txt);
      }
    };
    $("me-export").onclick = () => {
      const blob = new Blob([JSON.stringify({ exportedAt: (/* @__PURE__ */ new Date()).toISOString(), profile: S.profile, arsenal: S.arsenal.map(({ exemplars, ...b }) => b), plan: S.plan, shots: S.shots.map(({ sig, ...s }) => s) }, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `laneiq-${(S.profile?.name ?? "me").replace(/\W+/g, "-")}-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    };
    navigator.storage?.estimate?.().then((e) => {
      const mb = (n = 0) => (n / 1048576).toFixed(0);
      $("me-storage").textContent = e.quota ? `Storage used: ${mb(e.usage)} MB of about ${mb(e.quota)} MB available.` : "";
    });
  }

  // camera/guide.ts
  function openGuide() {
    const el = $("guide");
    el.classList.add("on");
    el.innerHTML = `
    <div class="row"><h2>Getting a good lock</h2><button class="btn ghost" id="gd-close">Close</button></div>
    <div class="note">The app finds the lane by itself. These steps give it the best chance, and they're also what makes the speed and board readings accurate.</div>

    <div class="card">
      <div class="k">What the camera should see</div>
      <svg viewBox="0 0 360 230" style="width:100%;height:auto;display:block;margin-top:8px" role="img" aria-label="Phone view: the lane narrows from the foul line at the bottom to the pins at the top, centered, with both gutters visible">
        <rect x="6" y="6" width="348" height="218" rx="14" fill="#0b1220" stroke="rgba(255,255,255,.25)"/>
        <polygon points="120,200 240,200 196,52 164,52" fill="rgba(214,170,110,.35)" stroke="#46e6ff" stroke-width="2"/>
        <polygon points="104,200 120,200 164,52 160,52" fill="rgba(120,160,255,.35)"/>
        <polygon points="240,200 256,200 200,52 196,52" fill="rgba(120,160,255,.35)"/>
        <line x1="110" y1="196" x2="250" y2="196" stroke="#ff5a6e" stroke-width="3"/>
        <line x1="160" y1="52" x2="200" y2="52" stroke="#fff" stroke-width="3"/>
        <circle cx="170" cy="44" r="3" fill="#fff"/><circle cx="180" cy="44" r="3" fill="#fff"/><circle cx="190" cy="44" r="3" fill="#fff"/><circle cx="175" cy="38" r="3" fill="#fff"/><circle cx="185" cy="38" r="3" fill="#fff"/><circle cx="180" cy="32" r="3" fill="#fff"/>
        <g font-family="system-ui" font-size="11" font-weight="700">
          <text x="262" y="199" fill="#ff5a6e">foul line: keep it in view</text>
          <text x="214" y="56" fill="#fff">end of the lane and the pins</text>
          <text x="14" y="120" fill="#9db2ff">both gutters</text><line x1="62" y1="116" x2="108" y2="116" stroke="#9db2ff"/>
          <text x="14" y="214" fill="#8a97b2">leave a little room below the foul line</text>
          <text x="86" y="22" fill="#8a97b2">best view: straight behind. Off to one side works too</text>
        </g>
      </svg>
    </div>

    <div class="card"><div class="k">Set up, in order</div><ol style="padding-left:20px;line-height:1.5;margin:8px 0">
      <li><b>Behind the approach, or off to one side.</b> Dead center is easiest, but it does not have to be. A spot beside the approach or behind the next lane works as long as the whole lane, foul line to pins, is in view. Use a tripod or a steady spot, about chest to head height, with the phone turned sideways (landscape).</li>
      <li><b>Frame the whole lane.</b> The foul line near the bottom, the pins at the top, both gutters in view. Leave a little room below the foul line so it isn't cut off.</li>
      <li><b>Aim slightly down</b> so the lane fills the middle of the picture, not just a thin strip.</li>
      <li><b>Keep it level.</b> The foul line should look flat across the screen, not tilted.</li>
      <li><b>Distance:</b> about 10 to 20 feet behind the foul line works best. If the lane looks thin, move closer or lower. Don't zoom in; the normal 1&times; camera is what the app expects.</li>
      <li><b>Light:</b> even lighting is best. Avoid pointing into bright lights or the shiny reflections on the lane, and wipe the lens.</li>
      <li><b>Clear the view.</b> Nobody standing in front of the lens or on the lane while it locks. It takes a second or two.</li>
      <li><b>Then leave it.</b> Once it says READY, don't bump the phone. It re-checks every few seconds and re-locks on its own if it moves. Put it in the same spot next time and it's ready straight away.</li>
    </ol></div>

    <div class="card"><div class="k">What the checklist means</div><ul>
      <li><b>Left edge / Right edge:</b> the two sides of the lane. Drawn in blue and pink as soon as they're found.</li>
      <li><b>Lane shape:</b> the two edges together look like a bright lane between dark gutters.</li>
      <li><b>Foul line / Lane end:</b> the red and white lines. Both must be seen, because they set the distances.</li>
      <li><b>Steady 3/3:</b> three checks in a row agree. Then it locks.</li>
    </ul></div>

    <div class="card"><div class="k">If it won't lock</div><ul>
      <li>Read the hint under the video. It says what's missing: both gutters, the foul line, too dark, glare.</li>
      <li>After about 12 seconds it asks you to <b>tap your lane once</b>. It then follows that lane's edges. Distances are approximate if the foul line isn't in view.</li>
      <li>Last resort: <b>Place corners</b> and tap the four corners yourself.</li>
      <li>Several lanes in view? If yours is not clearly in the middle, the lanes are numbered on screen: <b>tap yours</b>. Picked the wrong one? Tap <b>Re-lock</b>.</li>
      <li>Speed reads far off? That usually means a wrong lock. Tap <b>Re-lock</b>.</li>
      <li>Tap <b>Save frame</b> if it keeps failing and send me the files. Real frames are how I improve this.</li>
    </ul></div>`;
    $("gd-close").onclick = () => (el.classList.remove("on"), el.innerHTML = "");
  }

  // core/src/pins.ts
  var PIN_INCHES = [
    [0, 0],
    [-6, 10.392],
    [6, 10.392],
    [-12, 20.785],
    [0, 20.785],
    [12, 20.785],
    [-18, 31.177],
    [-6, 31.177],
    [6, 31.177],
    [18, 31.177]
  ];
  var INCH_PER_X = 41.5 / 39;
  var PIN_W = 4.766;
  var PIN_H2 = 15;
  var COLS = 5;
  var ROWS = 9;
  function pinBoxes(P) {
    return PIN_INCHES.map(([lat, behind], i) => {
      const x = 19.5 + lat / INCH_PER_X;
      const y = 60 + behind / 12;
      const base = P(x, y);
      const r = PIN_W / 2 / INCH_PER_X;
      const wpx = Math.abs(P(x + r, y).x - P(x - r, y).x);
      const hpx = wpx * (PIN_H2 / PIN_W) * 0.95;
      return { id: i + 1, x0: base.x - wpx * 0.45, x1: base.x + wpx * 0.45, y0: base.y - hpx, y1: base.y };
    });
  }
  function deckRegion(boxes) {
    const wide = Math.max(...boxes.map((b) => b.x1 - b.x0));
    return {
      x0: Math.min(...boxes.map((b) => b.x0)) - wide * 1.2,
      x1: Math.max(...boxes.map((b) => b.x1)) + wide * 1.2,
      y0: Math.min(...boxes.map((b) => b.y0)) - wide * 0.5,
      y1: Math.max(...boxes.map((b) => b.y1)) + wide * 0.5
    };
  }
  function samplePins(gray, w, h, boxes, ox = 0, oy = 0) {
    const mean3 = (x0, y0, x1, y1) => {
      const a = Math.max(0, Math.floor(x0 - ox));
      const b = Math.min(w - 1, Math.ceil(x1 - ox) - 1);
      const c = Math.max(0, Math.floor(y0 - oy));
      const d = Math.min(h - 1, Math.ceil(y1 - oy) - 1);
      if (b < a || d < c) return NaN;
      let s = 0;
      let n = 0;
      for (let y = c; y <= d; y++) for (let x = a; x <= b; x++) s += gray[y * w + x], n++;
      return n ? s / n : NaN;
    };
    const wide = Math.max(...boxes.map((b) => b.x1 - b.x0));
    const cx0 = Math.min(...boxes.map((b) => b.x0));
    const cx1 = Math.max(...boxes.map((b) => b.x1));
    const cy0 = Math.min(...boxes.map((b) => b.y0));
    const cy1 = Math.max(...boxes.map((b) => b.y1));
    const left = mean3(cx0 - wide * 2.4, cy0, cx0 - wide * 0.5, cy1);
    const right = mean3(cx1 + wide * 0.5, cy0, cx1 + wide * 2.4, cy1);
    const ref = Number.isFinite(left) && Number.isFinite(right) ? (left + right) / 2 : Number.isFinite(left) ? left : right;
    return boxes.map((bx) => {
      const bw = bx.x1 - bx.x0;
      const bh = bx.y1 - bx.y0;
      const cells = [];
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cells.push(mean3(bx.x0 + bw * c / COLS, bx.y0 + bh * r / ROWS, bx.x0 + bw * (c + 1) / COLS, bx.y0 + bh * (r + 1) / ROWS));
      const m = cells.reduce((s, v) => s + v, 0) / cells.length;
      return { id: bx.id, cells, mean: m, ref, ok: cells.every(Number.isFinite) && Number.isFinite(ref) };
    });
  }
  var pinContrast = (s) => s.ok ? Math.abs(s.mean - s.ref) : 0;
  function pinsReadable(base) {
    return base.filter((s) => pinContrast(s) >= 8).length >= 8;
  }
  function readPins(base, now) {
    const standing = base.map((b, i) => {
      const n = now[i];
      const c = pinContrast(b);
      if (!n || !n.ok || c < 8) return null;
      const shift = n.ref - b.ref;
      let d = 0;
      for (let k2 = 0; k2 < b.cells.length; k2++) d += Math.abs(n.cells[k2] - shift - b.cells[k2]);
      d /= b.cells.length;
      return d < 0.4 * c + 2;
    });
    const readable = standing.filter((s) => s !== null).length;
    return { standing, down: standing.filter((s) => s === false).length, readable };
  }
  function settledCount(counts) {
    const c = counts.filter((v) => v !== null);
    for (let i = 0; i + 1 < c.length; i++) if (c[i] === c[i + 1]) return c[i];
    return c.length ? c[Math.floor(c.length / 2)] : null;
  }

  // camera/camera.ts
  var video = $("v");
  var overlay = $("o");
  var ctx = overlay.getContext("2d");
  var status = $("status");
  var GW = 192;
  var GH = 108;
  var work = document.createElement("canvas");
  var wctx = work.getContext("2d", { willReadFrequently: true });
  var CORNER_PROMPTS = ["Tap the LEFT edge of the lane at the foul line", "Tap the RIGHT edge of the lane at the foul line", "Tap the RIGHT edge of the lane at the pins end", "Tap the LEFT edge of the lane at the pins end"];
  var LANE_CORNERS = [
    { x: 0, y: 0 },
    { x: LANE_BOARDS, y: 0 },
    { x: LANE_BOARDS, y: LANE_LENGTH_FT },
    { x: 0, y: LANE_LENGTH_FT }
  ];
  var stream = null;
  var corners = [];
  var H = null;
  var Hinv = null;
  var trail = [];
  var lastShot = null;
  var bg = null;
  var laneMask = null;
  var armed = false;
  var path = [];
  var lastBlob = null;
  var lost = 0;
  var t0 = 0;
  var viewMode = "lane";
  var view3d = null;
  var host3d = null;
  var shown3dKey = "";
  var laneToPx = (x, y) => Hinv ? applyHomography(Hinv, { x, y }) : { x: 0, y: 0 };
  var view2 = () => ({ ctx, width: overlay.width, P: laneToPx });
  function schedule() {
    if (typeof video.requestVideoFrameCallback === "function") video.requestVideoFrameCallback((n, m) => onFrame(n, m));
    else requestAnimationFrame((t) => onFrame(t, { mediaTime: video.currentTime }));
  }
  async function startCamera() {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60, min: 30 } },
      audio: false
    });
    video.srcObject = stream;
    await video.play();
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;
    await setupZoom();
    GH = Math.round(GW * video.videoHeight / video.videoWidth);
    work.width = GW;
    work.height = GH;
    document.body.classList.add("live");
    const fps = stream.getVideoTracks()[0].getSettings().frameRate;
    setText("fps", fps ? `${Math.round(fps)} FPS` : "LIVE");
    const saved = savedCalibration();
    if (saved) {
      applyCalibration(saved, "your saved setup, verifying");
      verifyUntil = performance.now() + 12e3;
    } else status.textContent = `Camera on (${fps ? Math.round(fps) : "?"} fps). Looking for the lane\u2026`;
    schedule();
  }
  var mode = "auto";
  var detectStartedAt = 0;
  var lastDetectAt = 0;
  var locks = [];
  var candidate = null;
  var driftCount = 0;
  var verifyUntil = 0;
  var MAX_DW = 1280;
  var pending = null;
  var lastCandidates = [];
  var dcanvas = document.createElement("canvas");
  var dctx = dcanvas.getContext("2d", { willReadFrequently: true });
  var CAL_KEY = "laneiq.calibration";
  var lastLockConf = null;
  function applyCalibration(c, how) {
    logLock({ how, secs: /saved setup/.test(how) || !detectStartedAt ? null : Math.round((performance.now() - detectStartedAt) / 100) / 10, confidence: lastLockConf, foulSeen: lastCandidates[0] ? lastCandidates[0].rows.foul !== null : null });
    corners = c;
    H = solveHomography(corners, LANE_CORNERS);
    Hinv = solveHomography(LANE_CORNERS, corners);
    buildMask();
    bg = null;
    armed = true;
    candidate = null;
    setStep(4);
    setReady(true);
    status.textContent = `Lane locked (${how}). Ready: just bowl, every shot is tracked automatically.`;
    renderScan();
    try {
      localStorage.setItem(CAL_KEY, JSON.stringify({ z: zoomCaps ? zoomNow : 1, n: corners.map((p) => ({ x: p.x / video.videoWidth, y: p.y / video.videoHeight })) }));
    } catch {
    }
  }
  function savedCalibration() {
    try {
      const raw = JSON.parse(localStorage.getItem(CAL_KEY) ?? "null");
      if (raw?.n?.length === 4 && Math.abs((raw.z ?? 1) - (zoomCaps ? zoomNow : 1)) > 0.01) return null;
      if (raw?.n?.length === 4) return raw.n.map((p) => ({ x: p.x * video.videoWidth, y: p.y * video.videoHeight }));
    } catch {
    }
    return null;
  }
  function grabGray() {
    const w = Math.min(MAX_DW, video.videoWidth);
    dcanvas.width = w;
    dcanvas.height = Math.round(w * video.videoHeight / video.videoWidth);
    dctx.drawImage(video, 0, 0, dcanvas.width, dcanvas.height);
    const px = dctx.getImageData(0, 0, dcanvas.width, dcanvas.height).data;
    const g = new Uint8ClampedArray(dcanvas.width * dcanvas.height);
    for (let i = 0; i < g.length; i++) g[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
    if (prevGray && prevGray.length === g.length && !H) {
      let d = 0, c = 0;
      for (let i = 0; i < g.length; i += 31) {
        d += Math.abs(g[i] - prevGray[i]);
        c++;
      }
      if (d / c < 7) for (let i = 0; i < g.length; i++) g[i] = g[i] + prevGray[i] >> 1;
    }
    prevGray = Uint8ClampedArray.from(g);
    let sum = 0, sq = 0, n = 0;
    for (let i = 0; i < g.length; i += 23) {
      sum += g[i];
      sq += g[i] * g[i];
      n++;
    }
    const mean3 = sum / n;
    const sd3 = Math.sqrt(Math.max(0, sq / n - mean3 * mean3));
    frameHint = mean3 < 38 ? "It's too dark to see the lane. Add light or move the phone toward the lights." : mean3 > 232 ? "The picture is washed out by glare. Angle the phone away from the bright reflections." : sd3 < 14 ? "The picture looks flat or out of focus. Wipe the lens and check the phone is focused on the lane." : "";
    return { g, w: dcanvas.width, h: dcanvas.height, k: video.videoWidth / dcanvas.width, px };
  }
  function chromaChannels(px, n) {
    const a = new Uint8ClampedArray(n);
    const b = new Uint8ClampedArray(n);
    for (let i = 0; i < n; i++) {
      const r = px[i * 4], g = px[i * 4 + 1], bl = px[i * 4 + 2];
      a[i] = 128 + (r - bl) * 0.9;
      b[i] = 128 + (g - (r + bl) / 2) * 1.6;
    }
    return [a, b];
  }
  var frameHint = "";
  var prevGray = null;
  var diagView = null;
  var scaled = (d, k2) => ({ ...d, corners: d.corners.map((p) => ({ x: p.x * k2, y: p.y * k2 })) });
  var solid = isSolid;
  var chooseList = [];
  var chooseSeen = 0;
  var polyHas = (poly, x, y) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) if (poly[i].y > y !== poly[j].y > y && x < (poly[j].x - poly[i].x) * (y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x) inside = !inside;
    return inside;
  };
  var centerOf = (c) => ({ x: c.reduce((s, p) => s + p.x, 0) / c.length, y: c.reduce((s, p) => s + p.y, 0) / c.length });
  var adjusted = false;
  var dragIx = -1;
  var detectMs = 0;
  function detectNow() {
    const t02 = performance.now();
    try {
      return detectNow2();
    } finally {
      detectMs = performance.now() - t02;
    }
  }
  function detectNow2() {
    const f = grabGray();
    const dg = newDiag();
    let found = detectLanes(f.g, f.w, f.h, 4, void 0, dg);
    if (!found.some(solid)) {
      for (const ch of chromaChannels(f.px, f.g.length)) {
        const dg2 = newDiag();
        const alt = detectLanes(ch, f.w, f.h, 4, void 0, dg2);
        if (alt.length && alt.reduce((m, d) => Math.max(m, d.confidence), 0) > found.reduce((m, d) => Math.max(m, d.confidence), 0)) {
          found = alt;
          Object.assign(dg, dg2);
        }
      }
    }
    lastCandidates = found.map((d) => scaled(d, f.k));
    const k2 = f.k;
    const seg = (s) => ({ x0: s.x0 * k2, y0: s.y0 * k2, x1: s.x1 * k2, y1: s.y1 * k2 });
    diagView = { ...dg, guess: dg.guess ? { left: seg(dg.guess.left), right: seg(dg.guess.right) } : null, foulRow: dg.foulRow === null ? null : dg.foulRow * k2, pitRow: dg.pitRow === null ? null : dg.pitRow * k2 };
    return lastCandidates[0] ?? null;
  }
  function pill(text, cls) {
    const el = $("ready");
    el.textContent = text;
    el.classList.remove("go", "scan", "ask");
    if (cls) el.classList.add(cls);
  }
  function renderScan(hint = "") {
    const el = $("scan");
    const show = document.body.classList.contains("live") && !H && mode !== "manual";
    el.classList.toggle("hide", !show);
    $("tracebtn").classList.toggle("hide", !(document.body.classList.contains("live") && !H && mode !== "manual"));
    $("snapbtn").classList.toggle("hide", !(show && adjusted && pending));
    if (!show) return;
    if (mode === "choose") {
      el.innerHTML = `<span class="sc ask">\u261D Tap your lane</span><div class="note" style="flex-basis:100%">${hint || "I can see more than one lane. Tap the one you are bowling on."}</div>`;
      return;
    }
    if (mode === "tap") {
      el.innerHTML = `<span class="sc ask">\u261D Tap your lane</span><div class="note" style="flex-basis:100%">${hint || "Tap on the lane surface, between its two gutters, and I'll follow the edges from there."}</div>`;
      return;
    }
    const g = diagView;
    const items = [
      ["Left edge", !!g && g.leftLines > 0],
      ["Right edge", !!g && g.rightLines > 0],
      ["Lane shape", !!g?.guess],
      ["Foul line", g?.foulRow != null],
      ["Lane end", g?.pitRow != null],
      [`Steady ${Math.min(locks.length, 3)}/3`, locks.length >= 3]
    ];
    el.innerHTML = items.map(([l, ok]) => `<span class="sc ${ok ? "ok" : ""}">${ok ? "\u2713" : "\u25CB"} ${l}</span>`).join("") + (hint ? `<div class="note" style="flex-basis:100%">${hint}</div>` : "");
  }
  function drawScanner(now) {
    const s = overlay.width / 1280;
    const W = overlay.width;
    const Hh = overlay.height;
    ctx.save();
    const y = now / 2200 % 1 * Hh;
    const grad = ctx.createLinearGradient(0, y - 60 * s, 0, y + 6 * s);
    grad.addColorStop(0, "rgba(70,230,255,0)");
    grad.addColorStop(1, "rgba(70,230,255,.28)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, y - 60 * s, W, 66 * s);
    ctx.fillStyle = "rgba(160,245,255,.9)";
    ctx.shadowColor = "rgba(70,230,255,.9)";
    ctx.shadowBlur = 14 * s;
    ctx.fillRect(0, y, W, 2.5 * s);
    ctx.shadowBlur = 0;
    const pad = 22 * s;
    const len = 48 * s;
    ctx.strokeStyle = `rgba(70,230,255,${0.55 + 0.4 * Math.sin(now / 350)})`;
    ctx.lineWidth = 4 * s;
    for (const [cx, cy, dx, dy] of [[pad, pad, 1, 1], [W - pad, pad, -1, 1], [pad, Hh - pad, 1, -1], [W - pad, Hh - pad, -1, -1]]) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + dy * len);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + dx * len, cy);
      ctx.stroke();
    }
    const g = diagView;
    if (g?.guess) {
      const seg = (a, color, text) => {
        ctx.setLineDash([14 * s, 10 * s]);
        ctx.strokeStyle = color;
        ctx.lineWidth = 4 * s;
        ctx.beginPath();
        ctx.moveTo(a.x0, a.y0);
        ctx.lineTo(a.x1, a.y1);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = color;
        ctx.font = `700 ${15 * s}px system-ui`;
        ctx.fillText(text, (a.x0 + a.x1) / 2 + 10 * s, (a.y0 + a.y1) / 2);
      };
      seg(g.guess.left, "#46e6ff", "left edge");
      seg(g.guess.right, "#ff4fd8", "right edge");
      const rowLine = (row, color, text) => {
        if (row === null) return;
        const lx = g.guess.left.x0 + (g.guess.left.x1 - g.guess.left.x0) * (row - g.guess.left.y0) / Math.max(1, g.guess.left.y1 - g.guess.left.y0);
        const rx = g.guess.right.x0 + (g.guess.right.x1 - g.guess.right.x0) * (row - g.guess.right.y0) / Math.max(1, g.guess.right.y1 - g.guess.right.y0);
        ctx.strokeStyle = color;
        ctx.lineWidth = 4 * s;
        ctx.beginPath();
        ctx.moveTo(lx - 20 * s, row);
        ctx.lineTo(rx + 20 * s, row);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.font = `700 ${15 * s}px system-ui`;
        ctx.fillText(text, rx + 26 * s, row + 5 * s);
      };
      rowLine(g.foulRow, "#ff5a6e", "foul line");
      rowLine(g.pitRow, "#ffffff", "lane end");
    }
    chooseList.forEach((c, i) => {
      ctx.setLineDash([10 * s, 8 * s]);
      ctx.strokeStyle = "rgba(90,255,176,.95)";
      ctx.fillStyle = "rgba(90,255,176,.14)";
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      c.forEach((p, k2) => k2 ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      const m = centerOf(c);
      ctx.fillStyle = "#06121a";
      ctx.beginPath();
      ctx.arc(m.x, m.y, 20 * s, 0, 7);
      ctx.fill();
      ctx.fillStyle = "rgba(90,255,176,1)";
      ctx.font = `800 ${22 * s}px system-ui`;
      ctx.textAlign = "center";
      ctx.fillText(String(i + 1), m.x, m.y + 8 * s);
      ctx.textAlign = "start";
    });
    if (pending) {
      pending.corners.forEach((p, i) => {
        ctx.fillStyle = adjusted ? "rgba(90,255,176,1)" : "rgba(255,255,255,.95)";
        ctx.strokeStyle = "rgba(0,0,0,.7)";
        ctx.lineWidth = 3 * s;
        ctx.beginPath();
        ctx.arc(p.x, p.y, (i === dragIx ? 17 : 13) * s, 0, 7);
        ctx.fill();
        ctx.stroke();
      });
    }
    if (candidate) {
      ctx.setLineDash([10 * s, 8 * s]);
      ctx.strokeStyle = "rgba(90,255,176,.9)";
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      candidate.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }
  function enterTap(reason) {
    mode = "tap";
    corners = [];
    candidate = null;
    pending = null;
    setStep(0);
    setReady(false);
    $("confirm").classList.add("hide");
    $("manualbtn").classList.remove("hide");
    status.textContent = `${reason} Tap your lane once and I'll follow its edges.`;
    pill("TAP LANE", "ask");
    renderScan();
  }
  function enterChoose(list) {
    mode = "choose";
    chooseList = list;
    candidate = null;
    pending = null;
    locks = [];
    setStep(0);
    setReady(false);
    $("manualbtn").classList.remove("hide");
    status.textContent = `I can see ${list.length} lanes. Tap the one you are bowling on.`;
    pill("TAP YOUR LANE", "ask");
    renderScan();
  }
  function enterManual(reason) {
    mode = "manual";
    corners = [];
    candidate = null;
    pending = null;
    setStep(0);
    setReady(false);
    $("confirm").classList.add("hide");
    $("manualbtn").classList.add("hide");
    status.textContent = `${reason} ${CORNER_PROMPTS[0]}`;
    pill("PLACE CORNERS", "ask");
    renderScan();
  }
  function autoDetectTick(now) {
    if (mode !== "auto") return;
    if (!detectStartedAt) detectStartedAt = now;
    if (adjusted && pending) return;
    if (now - lastDetectAt < Math.max(400, detectMs * 2)) return;
    lastDetectAt = now;
    detectNow();
    const ch = chooseLane(lastCandidates, video.videoWidth);
    chooseSeen = !ch.pick && ch.choices.length > 1 ? chooseSeen + 1 : 0;
    lastLockConf = ch.pick?.confidence ?? lastCandidates[0]?.confidence ?? null;
    if (chooseSeen >= 2) return enterChoose(ch.choices.map((c) => c.corners));
    const d = ch.pick ?? lastCandidates[0] ?? null;
    pill("SCANNING\u2026", "scan");
    const tol = video.videoWidth * 0.03;
    if (d && solid(d)) {
      pending = null;
      $("confirm").classList.add("hide");
      candidate = d.corners;
      locks.push(d.corners);
      locks = locks.slice(-3);
      setStep(Math.min(3, locks.length));
      status.textContent = "Found the lane, confirming\u2026";
      renderScan("Hold still for a moment while I confirm it.");
      if (locks.length === 3 && locks.every((l) => detectionsAgree(locks[0], l, tol))) {
        applyCalibration(d.corners, "automatic");
        locks = [];
        return;
      }
    } else {
      locks = [];
      candidate = d ? d.corners : null;
      setStep(0);
      let hint = frameHint || diagView?.hint || "Scanning for the lane. Keep both gutters, the foul line and the pins in view.";
      if (d && d.confidence >= 0.4 && now - detectStartedAt > 5e3) {
        pending = d;
        $("confirm").classList.remove("hide");
        hint = d.rows.foul === null ? "Is this your lane? The dashed outline is my best guess (distances will be approximate: I can't see the foul line). Confirm it, or keep scanning." : "Is this your lane? The dashed outline is my best guess. Confirm it, or keep scanning.";
        status.textContent = hint;
      } else {
        pending = null;
        $("confirm").classList.add("hide");
        status.textContent = hint;
      }
      renderScan(hint);
    }
    if (now - detectStartedAt > (pending ? 25e3 : 12e3)) enterTap("Couldn't lock on automatically.");
  }
  var lastDriftCheck = 0;
  function driftCheck(now) {
    const every = now < verifyUntil ? 1500 : 4e3;
    if (!H || mode !== "auto" || path.length || now < cooldownUntil || now - lastDriftCheck < every) return;
    lastDriftCheck = now;
    detectNow();
    const here = centerOf(corners);
    const d = lastCandidates.filter(solid).sort((a, b) => Math.hypot(centerOf(a.corners).x - here.x, centerOf(a.corners).y - here.y) - Math.hypot(centerOf(b.corners).x - here.x, centerOf(b.corners).y - here.y))[0];
    if (!d) return;
    if (detectionsAgree(corners, d.corners, video.videoWidth * 0.06)) {
      driftCount = 0;
      if (now < verifyUntil) status.textContent = "Lane locked and verified. Ready: just bowl.";
    } else if (++driftCount >= (now < verifyUntil ? 2 : 3)) {
      driftCount = 0;
      applyCalibration(d.corners, "re-locked, the phone moved");
    }
  }
  var overlayPt = (e) => {
    const r = overlay.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * overlay.width, y: (e.clientY - r.top) / r.height * overlay.height };
  };
  overlay.addEventListener("pointermove", (e) => {
    if (dragIx < 0 || !pending) return;
    const p = overlayPt(e);
    pending.corners[dragIx] = { x: Math.max(0, Math.min(overlay.width, p.x)), y: Math.max(0, Math.min(overlay.height, p.y)) };
    candidate = pending.corners;
  });
  var endDrag = () => dragIx = -1;
  overlay.addEventListener("pointerup", endDrag);
  overlay.addEventListener("pointercancel", endDrag);
  overlay.addEventListener("pointerdown", (e) => {
    if (H) return;
    if (pending && (mode === "auto" || mode === "tap")) {
      const p = overlayPt(e);
      const reach = 46 * (overlay.width / 1280);
      let bi = -1;
      let bd = reach;
      pending.corners.forEach((c, i) => {
        const d = Math.hypot(c.x - p.x, c.y - p.y);
        if (d < bd) bd = d, bi = i;
      });
      if (bi >= 0) {
        dragIx = bi;
        adjusted = true;
        renderScan();
        overlay.setPointerCapture?.(e.pointerId);
        status.textContent = "Drag each corner onto the lane: the two nearest corners onto the foul line at the gutter edges, the two far ones onto the lane at the pins. Then Confirm.";
        return;
      }
    }
    if (mode === "choose") {
      const r1 = overlay.getBoundingClientRect();
      const px = (e.clientX - r1.left) / r1.width * overlay.width;
      const py = (e.clientY - r1.top) / r1.height * overlay.height;
      const hit = chooseList.find((c) => polyHas(c, px, py)) ?? [...chooseList].sort((a, b) => Math.hypot(centerOf(a).x - px, centerOf(a).y - py) - Math.hypot(centerOf(b).x - px, centerOf(b).y - py))[0];
      chooseList = [];
      mode = "auto";
      $("manualbtn").classList.add("hide");
      if (hit) applyCalibration(hit, "you picked it");
      return;
    }
    if (mode === "tap") {
      const r0 = overlay.getBoundingClientRect();
      const tx = (e.clientX - r0.left) / r0.width * video.videoWidth;
      const ty = (e.clientY - r0.top) / r0.height * video.videoHeight;
      const f = grabGray();
      const d = detectLaneAt(f.g, f.w, f.h, tx / f.k, ty / f.k);
      if (!d) {
        pending = null;
        candidate = null;
        $("confirm").classList.add("hide");
        status.textContent = "Couldn't follow the lane edges from there. Tap on the lane surface between its two gutters, or use Place corners.";
        return;
      }
      pending = scaled(d, f.k);
      candidate = pending.corners;
      $("confirm").classList.remove("hide");
      status.textContent = pending.rows.foul === null ? "Is this your lane? Distances will be approximate because the foul line isn't in view. Confirm, or tap again." : "Is this your lane? Confirm, or tap again.";
      return;
    }
    if (mode !== "manual") return;
    const r = overlay.getBoundingClientRect();
    corners.push({ x: (e.clientX - r.left) / r.width * overlay.width, y: (e.clientY - r.top) / r.height * overlay.height });
    if (corners.length === 4) applyCalibration(corners, "manual");
    else {
      setStep(corners.length);
      status.textContent = CORNER_PROMPTS[corners.length];
    }
  });
  watchForUpdates((msg, reload) => {
    const bar = document.createElement("div");
    bar.className = "invitebox";
    bar.style.cssText = "position:fixed;left:12px;right:12px;bottom:78px;z-index:50;display:flex;gap:10px;align-items:center;justify-content:space-between";
    bar.innerHTML = `<b>${msg}</b><button class="btn" id="upd-go">Update</button>`;
    document.body.append(bar);
    bar.querySelector("button").onclick = reload;
  }, () => !document.body.classList.contains("live"));
  $("guide-open").onclick = openGuide;
  $("guide-hud").onclick = openGuide;
  $("confirm").onclick = () => {
    if (!pending) return;
    $("confirm").classList.add("hide");
    $("manualbtn").classList.add("hide");
    applyCalibration(pending.corners, adjusted ? "placed by hand from my guess" : pending.rows.foul === null ? "one tap, approximate" : "one tap");
    pending = null;
    adjusted = false;
  };
  $("manualbtn").onclick = () => enterManual("Placing the corners yourself.");
  $("tracebtn").onclick = () => {
    const W = video.videoWidth;
    const Hh = video.videoHeight;
    if (!W) return;
    const start = lastCandidates[0]?.corners ?? [
      { x: W * 0.22, y: Hh * 0.92 },
      { x: W * 0.78, y: Hh * 0.92 },
      { x: W * 0.55, y: Hh * 0.36 },
      { x: W * 0.45, y: Hh * 0.36 }
    ];
    chooseList = [];
    chooseSeen = 0;
    mode = "auto";
    locks = [];
    pending = { corners: start.map((p) => ({ ...p })), confidence: 0.3, notes: [], rows: { foul: null, pit: null, vanishing: null } };
    candidate = pending.corners;
    adjusted = true;
    $("confirm").classList.remove("hide");
    $("manualbtn").classList.add("hide");
    status.textContent = "Drag the four white dots onto the lane: the two near ones on the foul line at the edges of the lane (inside the gutters), the two far ones where the lane reaches the pins. Tap Snap to edges to tighten it, then Confirm lane.";
    pill("TRACE YOUR LANE", "ask");
    renderScan();
  };
  $("snapbtn").onclick = () => {
    if (!pending) return;
    const f = grabGray();
    const c = pending.corners;
    const mid = { x: (c[0].x + c[1].x + c[2].x + c[3].x) / 4, y: (c[0].y + c[1].y + c[2].y + c[3].y) / 4 };
    let d = detectLaneAt(f.g, f.w, f.h, mid.x / f.k, mid.y / f.k);
    if (!d) {
      const alts = detectLanes(f.g, f.w, f.h, 4).map((x) => scaled(x, f.k));
      const near = alts.sort((a, b) => Math.hypot(centerOf(a.corners).x - mid.x, centerOf(a.corners).y - mid.y) - Math.hypot(centerOf(b.corners).x - mid.x, centerOf(b.corners).y - mid.y))[0];
      if (near) d = { ...near, corners: near.corners.map((p) => ({ x: p.x / f.k, y: p.y / f.k })) };
    }
    if (!d) {
      status.textContent = "I couldn't find clear lane edges there. Drag the corners onto the lane yourself, then Confirm.";
      return;
    }
    pending = scaled(d, f.k);
    candidate = pending.corners;
    status.textContent = "Snapped to the lane edges. If it sits right, Confirm lane; otherwise drag a corner to fix it.";
  };
  $("saveframe").onclick = async () => {
    const f = grabGray();
    const full = document.createElement("canvas");
    full.width = video.videoWidth;
    full.height = video.videoHeight;
    full.getContext("2d").drawImage(video, 0, 0);
    const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const dl = (blob, name) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4e3);
    };
    const dets = detectLanes(f.g, f.w, f.h, 3).map((d) => scaled(d, f.k));
    dl(new Blob([JSON.stringify({ video: { w: video.videoWidth, h: video.videoHeight }, lockedCorners: H ? corners : null, candidates: dets.map((d) => ({ corners: d.corners, confidence: d.confidence, rows: d.rows, notes: d.notes })), at: (/* @__PURE__ */ new Date()).toISOString() }, null, 2)], { type: "application/json" }), `laneiq-frame-${stamp}.json`);
    await new Promise((r) => setTimeout(r, 500));
    full.toBlob((b) => b && dl(b, `laneiq-frame-${stamp}.jpg`), "image/jpeg", 0.92);
    status.textContent = "Saved the frame and the detector's results to your downloads.";
  };
  function relock(logMiss = true) {
    if (logMiss) markRedone();
    $("confirm").classList.add("hide");
    $("manualbtn").classList.add("hide");
    pending = null;
    adjusted = false;
    corners = [];
    H = null;
    Hinv = null;
    lastShot = null;
    trail = [];
    path = [];
    mode = "auto";
    detectStartedAt = 0;
    locks = [];
    chooseList = [];
    chooseSeen = 0;
    verifyUntil = 0;
    try {
      localStorage.removeItem(CAL_KEY);
    } catch {
    }
    setStep(0);
    setReady(false);
    status.textContent = "Looking for the lane again\u2026";
    pill("SCANNING\u2026", "scan");
    renderScan();
    bg = null;
    laneMask = null;
    armed = false;
  }
  $("reset").onclick = () => relock();
  var ZOOM_KEY = "laneiq.zoom";
  var zoomCaps = null;
  var zoomNow = 1;
  var zoomLevels = [1];
  function drawZoomBar() {
    const bar = $("zoombar");
    bar.innerHTML = zoomLevels.map((z) => `<button class="seg ${Math.abs(z - zoomNow) < 0.01 ? "on" : ""}" data-z="${z}">${z}\xD7</button>`).join("");
    bar.querySelectorAll("button").forEach((b) => b.onclick = () => void setZoom(Number(b.dataset.z)));
  }
  async function setupZoom() {
    const track = stream?.getVideoTracks()[0];
    const caps = track?.getCapabilities?.() ?? {};
    zoomCaps = caps.zoom && caps.zoom.max > caps.zoom.min ? { min: caps.zoom.min, max: caps.zoom.max } : null;
    zoomLevels = zoomCaps ? [0.5, 1, 2, 3, 5, 8].filter((z) => z >= zoomCaps.min - 1e-6 && z <= zoomCaps.max + 1e-6) : [1, 1.5, 2, 3];
    if (!zoomLevels.includes(1)) zoomLevels.unshift(Math.max(zoomCaps?.min ?? 1, 1));
    let saved = 1;
    try {
      saved = Number(localStorage.getItem(ZOOM_KEY) ?? 1) || 1;
    } catch {
    }
    zoomNow = zoomLevels.includes(saved) ? saved : zoomLevels[0];
    await setZoom(zoomNow, false);
  }
  async function setZoom(z, dropLock = true) {
    zoomNow = z;
    const track = stream?.getVideoTracks()[0];
    if (zoomCaps && track) {
      try {
        await track.applyConstraints({ advanced: [{ zoom: z }] });
      } catch {
        status.textContent = "This phone would not change the camera zoom.";
      }
      video.style.transform = overlay.style.transform = "";
      if (dropLock && (H || pending)) {
        relock(false);
        status.textContent = `Zoom ${z}\xD7: looking for the lane again at this zoom\u2026`;
      }
    } else {
      const c = corners.length === 4 ? centerOf(corners) : { x: video.videoWidth / 2, y: video.videoHeight / 2 };
      const origin = `${c.x / Math.max(1, video.videoWidth) * 100}% ${c.y / Math.max(1, video.videoHeight) * 100}%`;
      for (const el of [video, overlay]) {
        el.style.transformOrigin = origin;
        el.style.transform = z === 1 ? "" : `scale(${z})`;
      }
      if (z !== 1) status.textContent = `Zoom ${z}\xD7 (on screen only: this phone does not let the app zoom the lens, so detection still uses the whole picture).`;
    }
    try {
      localStorage.setItem(ZOOM_KEY, String(z));
    } catch {
    }
    drawZoomBar();
  }
  $("vt-lane").onclick = () => setMode("lane");
  $("vt-raw").onclick = () => setMode("raw");
  $("vt-3d").onclick = () => setMode("3d");
  function setMode(m) {
    viewMode = m;
    $("vt-lane").classList.toggle("on", m === "lane");
    $("vt-raw").classList.toggle("on", m === "raw");
    $("vt-3d").classList.toggle("on", m === "3d");
    if (m === "3d" && !host3d) {
      host3d = document.createElement("div");
      host3d.style.cssText = "position:absolute;inset:0;z-index:2";
      $("stage").insertBefore(host3d, $("viewtoggle"));
      view3d = mount3D(host3d);
    }
    if (host3d) host3d.style.display = m === "3d" ? "block" : "none";
    overlay.style.display = m === "3d" ? "none" : "block";
    video.style.visibility = m === "3d" ? "hidden" : "visible";
    shown3dKey = "";
  }
  function sync3D() {
    if (!view3d) return;
    const live2 = path.length > 1;
    const src = live2 ? path : lastShot?.path;
    const key = `${live2 ? "L" : "S"}${src?.length ?? 0}${lastShot?.at ?? 0}`;
    if (key === shown3dKey) return;
    shown3dKey = key;
    view3d.setPaths(src ? [{ path: src, color: "ramp", width: 4, ballAt: live2 ? null : void 0 }] : []);
  }
  function inPolygon(p, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i];
      const b = poly[j];
      if (a.y > p.y !== b.y > p.y && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  }
  function buildMask() {
    const sx = video.videoWidth / GW;
    const sy = video.videoHeight / GH;
    laneMask = new Uint8Array(GW * GH);
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) laneMask[y * GW + x] = inPolygon({ x: (x + 0.5) * sx, y: (y + 0.5) * sy }, corners) ? 1 : 0;
  }
  function findBlobs(fg) {
    const seen = new Uint8Array(GW * GH);
    const blobs = [];
    const stack = [];
    for (let i = 0; i < fg.length; i++) {
      if (!fg[i] || seen[i]) continue;
      let sx = 0;
      let sy = 0;
      let area = 0;
      stack.push(i);
      seen[i] = 1;
      while (stack.length) {
        const k2 = stack.pop();
        const x = k2 % GW;
        const y = k2 / GW | 0;
        sx += x;
        sy += y;
        area++;
        for (const n of [k2 - 1, k2 + 1, k2 - GW, k2 + GW]) {
          if (n < 0 || n >= fg.length || !fg[n] || seen[n]) continue;
          if (n === k2 - 1 && x === 0 || n === k2 + 1 && x === GW - 1) continue;
          seen[n] = 1;
          stack.push(n);
        }
      }
      blobs.push({ gx: sx / area, gy: sy / area, area });
    }
    return blobs;
  }
  var sigAcc = new Array(SIG_LEN).fill(0);
  var CROP = 24;
  var cropCanvas = document.createElement("canvas");
  cropCanvas.width = cropCanvas.height = CROP;
  var cropCtx = cropCanvas.getContext("2d", { willReadFrequently: true });
  function circleCounts(cx, cy, r) {
    cropCtx.drawImage(video, cx - r, cy - r, r * 2, r * 2, 0, 0, CROP, CROP);
    return signatureCounts(cropCtx.getImageData(0, 0, CROP, CROP).data, CROP);
  }
  function captureBall(cx, cy, radius) {
    const counts = circleCounts(cx, cy, Math.max(5, Math.min(60, radius * 1.2)));
    for (let i = 0; i < SIG_LEN; i++) sigAcc[i] += counts[i];
  }
  onScan(() => openScanLab(() => renderBall(S.shots.at(-1))));
  var enrolling = null;
  onEnroll((name, catalogKey) => {
    if (!stream) return void (status.textContent = "Start the camera first, then show me the ball.");
    setMode("lane");
    enrolling = { name, catalogKey, sigs: [], nextAt: 0, until: performance.now() + 6e3 };
    status.textContent = `Hold ${name} inside the circle and rotate it slowly\u2026`;
  });
  function enrollTick(now) {
    if (!enrolling) return;
    const r = Math.min(video.videoWidth, video.videoHeight) * 0.2;
    const cx = video.videoWidth / 2;
    const cy = video.videoHeight / 2;
    if (now >= enrolling.nextAt) {
      enrolling.nextAt = now + 450;
      enrolling.sigs.push(normalize(circleCounts(cx, cy, r)));
    }
    const left = Math.max(0, enrolling.until - now) / 6e3;
    const s = overlay.width / 1280;
    ctx.save();
    ctx.strokeStyle = "rgba(70,230,255,.9)";
    ctx.lineWidth = 4 * s;
    ctx.setLineDash([10 * s, 8 * s]);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 7);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(255,79,216,.95)";
    ctx.beginPath();
    ctx.arc(cx, cy, r + 10 * s, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - left));
    ctx.stroke();
    ctx.restore();
    if (now >= enrolling.until) finishEnroll();
  }
  async function finishEnroll() {
    const e = enrolling;
    enrolling = null;
    const picked = e.sigs.filter((_, i) => i % 2 === 0).slice(0, 8);
    const ball = { id: newId(), name: e.name, exemplars: picked, catalogKey: e.catalogKey };
    S.arsenal.push(ball);
    await saveArsenal();
    status.textContent = `Learned ${e.name} from ${picked.length} views. I'll recognize it on the lane.`;
    renderBall(S.shots.at(-1));
  }
  var rec = null;
  function pickMime() {
    for (const m of ["video/mp4", "video/webm;codecs=vp9", "video/webm"]) if (window.MediaRecorder?.isTypeSupported?.(m)) return m;
    return void 0;
  }
  function startRecording(startT) {
    if (!stream || !window.MediaRecorder || S.demo) return;
    try {
      const mime = pickMime();
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 3e6 } : void 0);
      const chunks = [];
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      mr.start();
      rec = { mr, chunks, startT };
    } catch {
      rec = null;
    }
  }
  function stopRecording(tailMs) {
    const r = rec;
    rec = null;
    if (!r) return Promise.resolve(null);
    return new Promise((resolve) => {
      r.mr.onstop = () => resolve(r.chunks.length ? { blob: new Blob(r.chunks, { type: r.mr.mimeType || "video/mp4" }), startT: r.startT } : null);
      setTimeout(() => r.mr.state !== "inactive" && r.mr.stop(), tailMs);
    });
  }
  function drawOverlay(now) {
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    if (viewMode === "3d") return sync3D();
    if (enrolling) return;
    if (!H) drawScanner(now);
    if (viewMode !== "lane") return;
    const v = view2();
    drawCorners(v, corners);
    if (!H && candidate) {
      const s = overlay.width / 1280;
      ctx.save();
      ctx.setLineDash([10 * s, 8 * s]);
      ctx.strokeStyle = "rgba(70,230,255,.85)";
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      candidate.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
    if (!H || !Hinv) return;
    drawLaneGrid(v);
    if (lastShot) {
      const age = (now - lastShot.at) / 1e3;
      strokeTrail(v, lastShot.trail, age < 10 ? 1 : Math.max(0.35, 1 - (age - 10) / 10), false);
      drawShotMarkers(v, lastShot.a);
    }
    if (trail.length > 1) {
      strokeTrail(v, trail.slice(-40), 1, true);
      drawBallHead(v, trail[trail.length - 1]);
    }
  }
  var confirmed = false;
  var cooldownUntil = 0;
  function resetTrack() {
    sigAcc = new Array(SIG_LEN).fill(0);
    path = [];
    trail = [];
    lastBlob = null;
    lost = 0;
    confirmed = false;
  }
  function onFrame(_now, meta) {
    schedule();
    const now = performance.now();
    drawOverlay(now);
    enrollTick(now);
    if (!H) autoDetectTick(now);
    else if (armed) driftCheck(now), pinWatch(now);
    if (!H || !laneMask || !armed || enrolling) return;
    wctx.drawImage(video, 0, 0, GW, GH);
    const px = wctx.getImageData(0, 0, GW, GH).data;
    const gray = new Float32Array(GW * GH);
    for (let i = 0; i < gray.length; i++) gray[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
    if (!bg) {
      bg = gray.slice();
      return;
    }
    if (now < cooldownUntil) return;
    const fg = new Uint8Array(GW * GH);
    for (let i = 0; i < gray.length; i++) if (laneMask[i] && Math.abs(gray[i] - bg[i]) > 28) fg[i] = 1;
    const sy = overlay.height / GH;
    const sx = overlay.width / GW;
    const cands = findBlobs(fg).filter((b) => b.area >= 2 && b.area <= 260);
    let best;
    if (lastBlob) {
      const d = (b) => Math.hypot(b.gx - lastBlob.gx, b.gy - lastBlob.gy);
      best = cands.filter((b) => d(b) < 14).sort((a, b) => d(a) - d(b))[0];
    } else {
      best = cands.map((b) => ({ b, l: applyHomography(H, { x: b.gx * sx, y: b.gy * sy }) })).filter((c) => c.l.y < 20).sort((a, b) => a.l.y - b.l.y)[0]?.b;
    }
    if (best) {
      lost = 0;
      lastBlob = best;
      const lane = applyHomography(H, { x: best.gx * sx, y: best.gy * sy });
      if (!path.length) t0 = meta.mediaTime;
      path.push({ t: meta.mediaTime - t0, x: lane.x, y: lane.y });
      trail.push({ x: best.gx * sx, y: best.gy * sy });
      if (lane.y < 30) captureBall(best.gx * sx, best.gy * sy, Math.sqrt(best.area / Math.PI) * sx);
      if (!confirmed && path.length >= 5) {
        const a = path[0];
        const b = path[path.length - 1];
        const mph = (b.y - a.y) / (b.t - a.t) * (3600 / 5280);
        if (mph >= 6 && mph <= 35) {
          confirmed = true;
          status.textContent = "Ball detected, tracking\u2026";
          startRecording(b.t);
        } else if (path.length >= 8) resetTrack();
      }
      if (lane.y > 56) void finish();
    } else if (lastBlob && ++lost > 10) {
      if (confirmed) void finish();
      else resetTrack();
    } else if (!lastBlob) {
      for (let i = 0; i < bg.length; i++) bg[i] += (gray[i] - bg[i]) * 0.02;
    }
  }
  var idleDeck = null;
  var fullDeck = null;
  var deckCand = null;
  var lastPinLook = 0;
  var pinCanvas = document.createElement("canvas");
  var pinCtx = pinCanvas.getContext("2d", { willReadFrequently: true });
  function lookAtPins() {
    if (!Hinv || S.demo || !video.videoWidth) return null;
    const boxes = pinBoxes(laneToPx);
    const r = deckRegion(boxes);
    const x0 = Math.max(0, Math.floor(r.x0));
    const y0 = Math.max(0, Math.floor(r.y0));
    const w = Math.min(video.videoWidth, Math.ceil(r.x1)) - x0;
    const h = Math.min(video.videoHeight, Math.ceil(r.y1)) - y0;
    if (w < 24 || h < 8 || w > 1e3 || h > 600) return null;
    pinCanvas.width = w;
    pinCanvas.height = h;
    pinCtx.drawImage(video, x0, y0, w, h, 0, 0, w, h);
    const px = pinCtx.getImageData(0, 0, w, h).data;
    const g = new Uint8ClampedArray(w * h);
    for (let i = 0; i < g.length; i++) g[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
    return samplePins(g, w, h, boxes, x0, y0);
  }
  function pinWatch(now) {
    if (path.length || lastBlob || now < cooldownUntil || now - lastPinLook < 1200) return;
    lastPinLook = now;
    const cur = lookAtPins();
    if (!cur) return;
    if (deckCand && readPins(deckCand, cur).readable >= 6 && readPins(deckCand, cur).down === 0) {
      idleDeck = cur;
      if (pinsReadable(cur)) fullDeck = cur;
    }
    deckCand = cur;
  }
  function pinfallNow(start, full, now) {
    if (start && readPins(start, now).readable >= 5 && !(full && pinsReadable(full) && readPins(full, start).down >= 5)) {
      const r = readPins(start, now);
      return { down: r.down, standing: full ? readPins(full, now).standing : r.standing };
    }
    if (full && start) {
      const before = readPins(full, start).standing;
      const after = readPins(full, now).standing;
      return { down: after.filter((s, i) => before[i] === true && s === false).length, standing: after };
    }
    return null;
  }
  var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function readPinfall(shot, start, full) {
    if (!start && !full) return;
    const counts = [];
    const stands = [];
    for (const wait of [900, 400, 400, 400, 400, 400]) {
      await sleep(wait);
      const cur = lookAtPins();
      const r = cur ? pinfallNow(start, full, cur) : null;
      counts.push(r ? r.down : null);
      stands.push(r ? r.standing : []);
      if (counts.length >= 2 && counts[counts.length - 1] !== null && counts[counts.length - 1] === counts[counts.length - 2]) break;
    }
    const n = settledCount(counts);
    if (n === null || shot.result) return;
    const at = counts.findIndex((c, i) => c === n && (counts[i + 1] === n || i === counts.length - 1));
    const standing = stands[Math.max(0, at)] ?? [];
    const leave = n === 10 ? [] : standing.map((s, i) => s ? i + 1 : 0).filter(Boolean);
    shot.result = { pinsDown: n, auto: true, ...leave.length ? { leave } : {} };
    await updateShot(shot);
    renderResult(shot);
    status.textContent = n === 10 ? "Strike, read from the camera." : `${n} pins down, read from the camera.`;
  }
  async function finish() {
    const startDeck = idleDeck;
    const fullRack = fullDeck;
    const points = path.length;
    const a = analyzeShot(path);
    const saved = path;
    const savedTrail = trail;
    const sig = sigAcc.some((x) => x > 0) ? normalize(sigAcc) : null;
    resetTrack();
    bg = null;
    cooldownUntil = performance.now() + 3e3;
    const clipP = stopRecording(1200);
    if (!a) {
      void clipP;
      status.textContent = `Ball seen but not enough evidence (${points} points). Watching for the next shot.`;
      return;
    }
    status.textContent = a.speedMph < 8 || a.speedMph > 26 ? `Speed reads ${a.speedMph.toFixed(1)} mph, which looks off. The lane lock may be wrong: tap Re-lock.` : "Shot captured. Watching for the next shot.";
    const full = a.entryBoard === null ? savedTrail : [...savedTrail, laneToPx(boardToX(a.entryBoard), 59.5)];
    lastShot = { trail: full, a, at: performance.now(), path: saved };
    const clip = await clipP;
    const shot = {
      id: newId(),
      at: (/* @__PURE__ */ new Date()).toISOString(),
      sessionId: S.sessionId,
      ballId: null,
      a,
      m: deriveMetrics(a, saved, S.profile?.hand ?? "R"),
      path: saved,
      cal: corners.map((p) => ({ ...p })),
      vw: video.videoWidth,
      vh: video.videoHeight,
      recStartT: clip?.startT ?? 0,
      hasClip: !!clip,
      sig
    };
    if (clip) await saveClip(shot.id, clip.blob).catch(() => shot.hasClip = false);
    await registerShot(shot);
    void readPinfall(shot, startDeck, fullRack);
  }
  $("start").onclick = () => startCamera().catch((e) => status.textContent = `Camera error: ${e.message}. Camera needs an https:// address.`);
  function synthPath(startX, bp, entryX, speedFtS) {
    const out = [];
    const mid = startX + 3;
    for (let i = 0; i < 400; i++) {
      const t = i / 60;
      const y = speedFtS * t;
      if (y > 59) break;
      const x = y <= bp ? startX + (mid - startX) * Math.sin(Math.PI / 2 * (y / bp)) : mid + (entryX - mid) * ((y - bp) / (59.5 - bp)) ** 2;
      out.push({ t, x, y });
    }
    return out;
  }
  async function runDemo() {
    S.demo = true;
    window.__laneiq = { S };
    S.profile = { id: "demo", name: "Demo bowler", hand: "R", quiz: { ...defaultAnswers("Demo bowler"), style: "two-handed", level: "league", focus: ["speed-consistency"] }, created: (/* @__PURE__ */ new Date()).toISOString() };
    const sigFor = (rgb) => {
      const px = new Uint8ClampedArray(CROP * CROP * 4);
      for (let i = 0; i < CROP * CROP; i++) {
        const c = i * 7919 % 100 < 60 ? rgb : [15, 15, 15];
        px.set([c[0] + i * 13 % 9, c[1], c[2], 255], i * 4);
      }
      return normalize(signatureCounts(px, CROP));
    };
    const red = [200, 30, 40];
    const ranked = S.catalog.filter((c) => motionIndex(c) !== null).sort((x, y) => motionIndex(y) - motionIndex(x));
    const chosen = ranked.length >= 3 ? [ranked[0], ranked[Math.floor(ranked.length / 2)], ranked[ranked.length - 1]] : ranked;
    const looks = [red, [30, 60, 210], [40, 160, 80]];
    S.arsenal = chosen.map((c, i) => ({ id: ["a", "b", "c"][i], name: `${c.manufacturer} ${c.name}`, exemplars: [sigFor(looks[i]), sigFor(looks[i])], catalogKey: c.key }));
    let seed = 7;
    const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
    const base = Date.now() - 3 * 864e5;
    for (let i = 0; i < 48; i++) {
      const high = i % 3 === 0;
      const entryBoard = 17.5 + (high ? 2 + rnd() * 2 : (rnd() - 0.5) * 1.6);
      const speed = (16.2 + (rnd() - 0.5) * 3.2) * (5280 / 3600);
      const p = synthPath(boardToX(10) + (rnd() - 0.5) * 2, 44 - i % 12 * 0.4, boardToX(entryBoard), speed);
      const a = analyzeShot(p);
      const m = deriveMetrics(a, p, "R");
      const strike = m.pocketMiss !== null && Math.abs(m.pocketMiss) <= 1 ? rnd() < 0.8 : rnd() < 0.15;
      S.shots.push({ id: `demo${i}`, at: new Date(base + i * 24e4 + (i > 24 ? 864e5 : 0)).toISOString(), sessionId: i > 24 ? "demoB" : "demoA", ballId: "a", a, m, path: p, cal: [], vw: 1280, vh: 720, recStartT: 0, hasClip: false, sig: sigFor(red), result: { pinsDown: strike ? 10 : 7 + Math.floor(rnd() * 3) } });
    }
    document.body.classList.add("live");
    setText("fps", "DEMO");
    setMode("lane");
    overlay.width = 1280;
    overlay.height = 720;
    $("stage").style.background = "linear-gradient(#1a1410, #3a2a1c 55%, #8a6a44)";
    corners = [{ x: 330, y: 640 }, { x: 950, y: 640 }, { x: 700, y: 200 }, { x: 580, y: 200 }];
    H = solveHomography(corners, LANE_CORNERS);
    Hinv = solveHomography(LANE_CORNERS, corners);
    setStep(4);
    setReady(true);
    status.textContent = "Demo: simulated shots on a mock lane";
    changed();
    let t0d = performance.now();
    let n = 0;
    const tick = () => {
      const t = (performance.now() - t0d) / 1e3;
      const bp = 46 - n * 1.8;
      const speed = 17.2 * (5280 / 3600);
      const y = speed * t;
      if (t >= 0 && y <= 59) {
        const x = y <= bp ? boardToX(10) + 3 * Math.sin(Math.PI / 2 * (y / bp)) : boardToX(10) + 3 + (boardToX(17.5) - boardToX(10) - 3) * ((y - bp) / (59.5 - bp)) ** 2;
        path.push({ t, x, y });
        trail.push(laneToPx(x, y));
      } else if (path.length) {
        const a = analyzeShot(path);
        if (a) {
          const shot = { id: newId(), at: (/* @__PURE__ */ new Date()).toISOString(), sessionId: S.sessionId, ballId: "a", a, m: deriveMetrics(a, path, "R"), path, cal: corners, vw: 1280, vh: 720, recStartT: 0, hasClip: false, sig: sigFor(red) };
          lastShot = { trail: [...trail], a, at: performance.now(), path: [...path] };
          void registerShot(shot);
          status.textContent = "Shot captured. Watching for the next shot.";
        }
        path = [];
        trail = [];
        n++;
        t0d = performance.now() + 2500;
      }
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      drawOverlay(performance.now());
      requestAnimationFrame(tick);
    };
    tick();
    renderBall(void 0);
    renderResult(void 0);
    renderLane();
  }
  window.addEventListener("hashchange", () => {
    captureIncomingHash();
    void handleIncoming();
  });
  (async () => {
    captureIncomingHash();
    initTabs();
    await loadReference();
    const dl = document.getElementById("catalog-list");
    const fill = () => dl && (dl.innerHTML = S.catalog.map((b) => `<option value="${(b.manufacturer + " " + b.name).replace(/"/g, "&quot;")}">`).join(""));
    fill();
    if (location.search.includes("demo")) return void runDemo().then(() => (fill(), handleIncoming()));
    const has = await bootProfile();
    if (has) {
      renderBall(void 0);
      renderResult(void 0);
      renderLane();
      handleIncoming();
    } else showQuiz("first", () => (showTab("live"), handleIncoming()));
    changed();
  })();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").then(() => navigator.serviceWorker.ready).then(() => setText("offline", "Ready offline \u2713")).catch(() => {
    });
  }
})();
