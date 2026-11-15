// Demonstration board of the crop archetypes (design preview only). The cards are painted by one shared WebGL
// renderer in a lazy chunk; without WebGL 2, or if that chunk fails, the same plans are drawn as 2D side views.
// This component never touches a selector, a capability or a series: it is a study sheet, labelled as such.
import { useEffect, useRef, useState } from 'react';
import { n0 } from '../format';
import { useI18n, type MessageKey } from '../i18n';
import { useLazy } from '../lazyPage';
import { usePrefs } from '../prefs';
import type { BoardCount, BoardView } from '../sim/CropBoard3D';
import { webglAvailable } from '../sim/field-state';
import { BOARD, type BoardRow } from '../sim/plants/board';
import { Plant2D } from '../sim/plants/Plant2D';
import { Notice, Pill, Seg } from './index';

const loadPainter = () => import('../sim/CropBoard3D');
const VIEWS: BoardView[] = ['oblique', 'front', 'silhouette', 'detail'];
type BoardWindow = { __gaiapusBoard?: 'ready' | 'failed' | 'flat' };
const flag = (v: BoardWindow['__gaiapusBoard']) => { (window as unknown as BoardWindow).__gaiapusBoard = v; };

export function CropBoard() {
  const { t } = useI18n(); const theme = usePrefs((p) => p.theme); const [view, setView] = useState<BoardView>('oblique');
  const [gl] = useState(webglAvailable); const painter = useLazy(loadPainter, gl); const [broken, setBroken] = useState(false);
  const flat = !gl || painter.failed || broken;
  const canvases = useRef(new Map<string, HTMLCanvasElement>()); const host = useRef<HTMLDivElement>(null);
  const [counts, setCounts] = useState<Record<string, BoardCount>>({}); const [tick, setTick] = useState(0); const [painted, setPainted] = useState(false);

  // Repaint when the layout width changes (cards are sized by CSS).
  useEffect(() => { const el = host.current; if (!el) return; let width = el.clientWidth, timer = 0; const ro = new ResizeObserver(() => { if (Math.abs(el.clientWidth - width) < 8) return; width = el.clientWidth; clearTimeout(timer); timer = window.setTimeout(() => setTick((v) => v + 1), 160); }); ro.observe(el); return () => { ro.disconnect(); clearTimeout(timer); }; }, []);
  useEffect(() => { if (flat) flag('flat'); }, [flat]);
  useEffect(() => {
    const mod = painter.mod; if (!mod || flat) return; let alive = true;
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#163C2D'; const dpr = Math.min(2, window.devicePixelRatio || 1);
    (async () => {
      const next: Record<string, BoardCount> = {};
      try {
        for (const row of BOARD) {
          // One row per frame keeps the page responsive while the sheet fills in.
          await new Promise((r) => requestAnimationFrame(r)); if (!alive) return;
          const jobs = row.cards.flatMap((card) => { const canvas = canvases.current.get(card.id); if (!canvas) return []; const box = canvas.getBoundingClientRect(); canvas.width = Math.round(box.width * dpr); canvas.height = Math.round(box.height * dpr); return [{ id: card.id, canvas, plan: card.plan, heightM: row.heightM }]; });
          mod.paintBoard(jobs, view, theme, ink).forEach((c, i) => { next[jobs[i].id] = c; });
        }
        if (alive) { setCounts(next); setPainted(true); flag('ready'); }
      } catch { if (alive) { setBroken(true); flag('failed'); } }
    })();
    return () => { alive = false; };
  }, [painter.mod, flat, view, theme, tick]);
  useEffect(() => () => { painter.mod?.disposeBoard(); }, [painter.mod]);

  const heaviest = (row: BoardRow) => row.cards.map((c) => counts[c.id]).filter(Boolean).sort((a, b) => b.detail - a.detail)[0];
  return (
    <section className="card crop-board" aria-labelledby="h-crop-board" data-testid="crop-board" data-mode={flat ? 'flat' : painted ? 'ready' : 'loading'} ref={host}>
      <h2 id="h-crop-board">{t('designPreview.board.title')}</h2>
      <Notice tone="warn" title={t('designPreview.board.noticeTitle')}>{t('designPreview.board.notice')}</Notice>
      {flat ? <p className="meta">{t('designPreview.board.flat')}</p>
        : <div className="row-between"><Seg legend={t('designPreview.board.viewLegend')} name="board-view" value={view} onChange={setView} options={VIEWS.map((v) => ({ value: v, label: t(`designPreview.board.view.${v}` as MessageKey) }))} />{!painted && <span className="meta" role="status">{t('designPreview.board.loading')}</span>}</div>}
      {BOARD.map((row) => {
        const name = t(`designPreview.board.row.${row.id}` as MessageKey); const heavy = heaviest(row);
        return <section key={row.id} className="crop-board__row" aria-labelledby={`h-board-${row.id}`} data-testid={`board-row-${row.id}`} data-integrated={row.integrated}>
          <div className="row-between"><h3 id={`h-board-${row.id}`}>{name}</h3>{row.integrated ? <Pill tone="ok">{t('designPreview.board.integrated')}</Pill> : <Pill tone="warn">{t('designPreview.board.boardOnly')}</Pill>}</div>
          <p className="meta">{t(`designPreview.board.look.${row.id}` as MessageKey)}</p>
          <div className="crop-board__grid">
            {row.cards.map((card) => { const stage = t(`designPreview.board.stage.${card.stage}` as MessageKey); const label = t('designPreview.board.cardLabel', { crop: name, stage }); const H = row.heightM * 100;
              return <figure key={card.id} className="crop-card" data-testid={`board-card-${card.id}`}>
                <div className="crop-card__stage">
                  {flat ? <svg viewBox={`${-H * 0.42} ${-H * 1.02} ${H * 0.84} ${H * 1.08}`} role="img" aria-label={label} preserveAspectRatio="xMidYMax meet"><Plant2D plan={card.plan('field')} scale={100} /><rect x={-H * 0.42} y={0} width={H * 0.84} height={H * 0.06} fill="var(--soil)" /></svg>
                    : <canvas ref={(el) => { if (el) canvases.current.set(card.id, el); else canvases.current.delete(card.id); }} role="img" aria-label={label} />}
                </div>
                <figcaption>{stage}</figcaption>
              </figure>; })}
          </div>
          {heavy && <p className="meta-13">{t('designPreview.board.triangles', { detail: n0(heavy.detail), field: n0(heavy.field), far: n0(heavy.far) })}</p>}
        </section>;
      })}
    </section>
  );
}
