/**
 * 布局与路径计算 — 对齐 patient_journey_v5.html 的 SVG 蛇形时间线（连续圆弧转折）
 */

import type { TimelineEventV4 } from '../../hooks/usePatientTimeline';

export const JOURNEY_SVG = {
  COL_W: 160,
  LINE_Y: 80,
  ROW_H: 220,
  CARD_H_EST: 76,
  CARD_W: 148,
  STEM_LEN: 32,
  /**
   * 箭头尖相对竖线终点 ay 的偏移，须与 PatientJourneyV4 中 polygon 一致（±5）
   */
  ARROW_TIP_OFFSET: 5,
  /** 箭头尖到卡片边的间距：上方卡片底边 / 下方卡片顶边 使用同一数值 */
  CARD_GAP_FROM_ARROW: 4,
  /** 画布顶部留白：避免首行「卡片在轨道上方」时卡片顶部被容器裁切 */
  CANVAS_PAD_TOP: 72,
  CORNER_R: 36,
  PAD_L: 20,
  PAD_R: 20,
  /** 与 v5 一致：每行最多列数 */
  PER_ROW: 6,
} as const;

export type CatCfg = { color: string; trackColor: string; cardBg: string };

export type PathSeg = { d: string; stroke: string; key: string };

export type JourneyNodeModel = {
  gIdx: number;
  x: number;
  y: number;
  ev: TimelineEventV4 & { date: string; category: string };
  goUp: boolean;
  /** 卡片在轨道下方：距画布顶边的 top */
  cardTop: number;
  /**
   * 卡片在轨道上方：卡片底边距画布顶边的 y（与箭头尖间距 = CARD_GAP_FROM_ARROW）。
   * 用 bottom 定位，避免按固定 CARD_H_EST 算 top 导致矮卡片与箭头之间出现大块空白。
   */
  cardBottomY?: number;
  key: string;
};

const {
  COL_W,
  LINE_Y,
  ROW_H,
  PAD_L,
  PAD_R,
  PER_ROW,
  CORNER_R,
  STEM_LEN,
  ARROW_TIP_OFFSET,
  CARD_GAP_FROM_ARROW,
  CANVAS_PAD_TOP,
} = JOURNEY_SVG;

function leftRightX() {
  const leftX = PAD_L;
  const rightX = PAD_L + (PER_ROW - 1) * COL_W + COL_W / 2;
  return { leftX, rightX };
}

/**
 * 合并事件 → SVG 路径片段 + 节点（卡片绝对定位）
 */
export function buildMergedJourneySvg(
  events: Array<TimelineEventV4 & { date: string; category: string }>,
  catCfg: Record<string, CatCfg>
): {
  svgW: number;
  svgH: number;
  pathSegs: PathSeg[];
  nodes: JourneyNodeModel[];
} {
  if (events.length === 0) {
    return { svgW: 400, svgH: 200, pathSegs: [], nodes: [] };
  }

  const { leftX, rightX } = leftRightX();
  const totalRows = Math.ceil(events.length / PER_ROW);
  const svgW = PAD_L + PER_ROW * COL_W + PAD_R;
  const svgH = CANVAS_PAD_TOP + totalRows * ROW_H + 24;

  const pathSegs: PathSeg[] = [];
  let segIdx = 0;

  const pushSeg = (d: string, stroke: string) => {
    pathSegs.push({ d, stroke, key: `p-${segIdx++}` });
  };

  for (let ri = 0; ri < totalRows; ri++) {
    const slice = events.slice(ri * PER_ROW, (ri + 1) * PER_ROW);
    const isRtl = ri % 2 === 1;
    const rowY = CANVAS_PAD_TOP + ri * ROW_H + LINE_Y;
    const k = slice.length;

    const xs: number[] = [];
    for (let ni = 0; ni < k; ni++) {
      const posX = isRtl
        ? PAD_L + (PER_ROW - 1 - ni) * COL_W + COL_W / 2
        : PAD_L + ni * COL_W + COL_W / 2;
      xs.push(posX);
    }

    const strokeOf = (cat: string) => catCfg[cat]?.trackColor ?? '#888';

    if (!isRtl) {
      if (k === 0) continue;
      pushSeg(`M ${leftX} ${rowY} L ${xs[0]} ${rowY}`, strokeOf(slice[0]!.category));
      for (let i = 0; i < k - 1; i++) {
        pushSeg(`M ${xs[i]} ${rowY} L ${xs[i + 1]} ${rowY}`, strokeOf(slice[i]!.category));
      }
      pushSeg(`M ${xs[k - 1]} ${rowY} L ${rightX} ${rowY}`, strokeOf(slice[k - 1]!.category));
    } else {
      if (k === 0) continue;
      /* 右→左：rightX → 各节点（x 递减）→ leftX */
      if (Math.abs(rightX - xs[0]!) > 0.5) {
        pushSeg(`M ${rightX} ${rowY} L ${xs[0]} ${rowY}`, strokeOf(slice[0]!.category));
      }
      for (let i = 0; i < k - 1; i++) {
        pushSeg(`M ${xs[i]} ${rowY} L ${xs[i + 1]} ${rowY}`, strokeOf(slice[i]!.category));
      }
      if (Math.abs(xs[k - 1]! - leftX) > 0.5) {
        pushSeg(`M ${xs[k - 1]} ${rowY} L ${leftX} ${rowY}`, strokeOf(slice[k - 1]!.category));
      }
    }

    if (ri < totalRows - 1) {
      const nextY = CANVAS_PAD_TOP + (ri + 1) * ROW_H + LINE_Y;
      const r = Math.min(CORNER_R, (nextY - rowY) / 2 - 4);
      const exitCat = slice[slice.length - 1]!.category;
      const cStroke = strokeOf(exitCat);
      const endX = isRtl ? leftX : rightX;
      if (!isRtl) {
        const d = `M ${endX} ${rowY} A ${r} ${r} 0 0 1 ${endX + r} ${rowY + r} L ${endX + r} ${nextY - r} A ${r} ${r} 0 0 1 ${endX} ${nextY}`;
        pushSeg(d, cStroke);
      } else {
        const d = `M ${endX} ${rowY} A ${r} ${r} 0 0 0 ${endX - r} ${rowY + r} L ${endX - r} ${nextY - r} A ${r} ${r} 0 0 0 ${endX} ${nextY}`;
        pushSeg(d, cStroke);
      }
    }
  }

  const nodes: JourneyNodeModel[] = [];
  for (let ri = 0; ri < totalRows; ri++) {
    const slice = events.slice(ri * PER_ROW, (ri + 1) * PER_ROW);
    const isRtl = ri % 2 === 1;
    const rowY = CANVAS_PAD_TOP + ri * ROW_H + LINE_Y;
    slice.forEach((ev, ni) => {
      const gIdx = ri * PER_ROW + ni;
      const x = isRtl
        ? PAD_L + (PER_ROW - 1 - ni) * COL_W + COL_W / 2
        : PAD_L + ni * COL_W + COL_W / 2;
      const goUp = gIdx % 2 === 0;
      const stemY2 = goUp ? rowY - STEM_LEN : rowY + STEM_LEN;
      const t = ARROW_TIP_OFFSET;
      const g = CARD_GAP_FROM_ARROW;
      /* 向下：顶边 = 箭头尖下缘 + g；向上：底边 = 箭头尖上缘 − g（渲染时用 bottom 对齐） */
      const cardBottomY = goUp ? stemY2 - t - g : undefined;
      const cardTop = goUp ? 0 : stemY2 + t + g;

      nodes.push({
        gIdx,
        x,
        y: rowY,
        ev,
        goUp,
        cardTop,
        cardBottomY,
        key: `mj::${gIdx}`,
      });
    });
  }

  return { svgW, svgH, pathSegs, nodes };
}

/**
 * 左侧分类按钮的垂直位置：与该类事件在时间线上的包围盒垂直居中对齐；
 * 若当前无该类节点，则在画布高度内均匀占位。
 * （调用方应对「全部展开」的参考节点传入，避免折叠后按钮重排。）
 */
export function computeCategoryPillCenters(
  nodes: JourneyNodeModel[],
  catOrder: readonly string[],
  canvasHeight: number,
  cardEst = JOURNEY_SVG.CARD_H_EST
): Record<string, number> {
  const bounds: Record<string, { min: number; max: number }> = {};
  for (const c of catOrder) {
    bounds[c] = { min: Infinity, max: -Infinity };
  }
  for (const n of nodes) {
    const cat = n.ev.category;
    if (!bounds[cat]) continue;
    let top: number;
    let bottom: number;
    if (n.goUp) {
      const bottomY = n.cardBottomY ?? n.y - STEM_LEN - ARROW_TIP_OFFSET - CARD_GAP_FROM_ARROW;
      top = bottomY - cardEst;
      bottom = Math.max(bottomY, n.y + 28);
    } else {
      top = Math.min(n.y - ARROW_TIP_OFFSET, n.cardTop);
      bottom = n.cardTop + cardEst;
    }
    const b = bounds[cat]!;
    b.min = Math.min(b.min, top);
    b.max = Math.max(b.max, bottom);
  }
  const centers: Record<string, number> = {};
  const nCats = catOrder.length;
  const h = Math.max(canvasHeight, 1);
  catOrder.forEach((cat, i) => {
    const b = bounds[cat]!;
    if (b.min === Infinity) {
      centers[cat] = ((i + 0.5) / nCats) * h;
    } else {
      centers[cat] = (b.min + b.max) / 2;
    }
  });
  return centers;
}
