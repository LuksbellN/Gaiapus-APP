// Small guide shown while a stake is being added: the real model, rotatable, with the QR label marked.
// The 3D part is a separate chunk loaded only when WebGL exists; without it, or if the model fails to load, the
// same information is given in words. The guide never takes focus, opens nothing and sends nothing.
import { lazy, Suspense, useId, useState } from 'react';
import { QrCode, Rotate3d } from 'lucide-react';
import { useI18n } from '../i18n';
import { webglAvailable } from '../sim/field-state';
import type { GuideView } from './stake-view';

const StakeViewer = lazy(() => import('./StakeViewer'));
type State = 'loading' | 'ready' | 'failed' | 'unavailable';

export function StakeGuide() {
  const { t } = useI18n(); const titleId = useId();
  const [state, setState] = useState<State>(() => (webglAvailable() ? 'loading' : 'unavailable'));
  const [view, setView] = useState<GuideView>('qr'); const [nonce, setNonce] = useState(0);
  const show = state === 'loading' || state === 'ready';
  const choose = (v: GuideView) => { setView(v); setNonce((n) => n + 1); }; // pressing the same view again re-centres it
  return (
    <figure className="stake-guide" data-testid="stake-guide" data-state={state} data-view={view} aria-labelledby={titleId}>
      <figcaption id={titleId} className="stake-guide__title">{t('area.guide.title')}</figcaption>
      {show && <div className="stake-guide__stage">
        <Suspense fallback={null}><StakeViewer view={view} nonce={nonce} label={t('area.guide.label')} onReady={() => setState('ready')} onFail={() => setState('failed')} /></Suspense>
        {state === 'loading' && <p className="stake-guide__status meta-13" role="status">{t('area.guide.loading')}</p>}
      </div>}
      {show && <div className="row stake-guide__views">
        <button type="button" className="btn btn--sm" aria-pressed={view === 'qr'} onClick={() => choose('qr')}><QrCode size={16} aria-hidden />{t('area.guide.showQr')}</button>
        <button type="button" className="btn btn--sm" aria-pressed={view === 'whole'} onClick={() => choose('whole')}><Rotate3d size={16} aria-hidden />{t('area.guide.whole')}</button>
      </div>}
      <p className="meta-13">{t('area.guide.where')}{show ? ` ${t('area.guide.ring')}` : ''}</p>
      {show ? <p className="meta-13">{t('area.guide.rotate')} {t('area.guide.scale')}</p> : <p className="meta-13" role="status">{t(state === 'failed' ? 'area.guide.failed' : 'area.guide.unavailable')}</p>}
    </figure>
  );
}
