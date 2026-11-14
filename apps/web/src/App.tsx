import { AuthPanel } from './features/auth/AuthPanel';
import { useAuthSession } from './features/auth/useAuthSession';
import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  ArrowRight,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CloudRain,
  Database,
  Droplets,
  ExternalLink,
  Flag,
  Globe2,
  Home,
  Info,
  Layers,
  Leaf,
  LoaderCircle,
  LocateFixed,
  Map,
  MapPin,
  Menu,
  Minus,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sprout,
  Table2,
  TriangleAlert,
  X,
} from "lucide-react";
import type {
  CoverageResult,
  ExampleDetail,
  Geography,
  WaterRiskPayload,
  YieldPayload,
} from "@gaiapus/contracts";
import { Panel } from "./components/Panel";
import { Dialog } from "./components/Dialog";
import { api, ApiError } from "./lib/api/client";
import { dayLabel, number } from "./lib/format";
import {
  contextSearch,
  parseContext,
  reduceContext,
} from "./features/explore/state";
import { WaterChart } from "./features/compare/WaterChart";

const GeographyMap = lazy(() => import("./features/explore/GeographyMap"));
type Modal = "sources" | "comparison" | "about" | "signin" | "search" | null;
type PageData = {
  coverage: CoverageResult;
  examples: ExampleDetail[];
  area: string;
};
const cropName = (crop: string) => (crop === "soy" ? "Soja" : "Milho safrinha");
const stateName: Record<string, string> = {
  "BR-MT": "Mato Grosso",
  "BR-MG": "Minas Gerais",
  "BR-GO": "Goiás",
  "BR-BA": "Bahia",
};

export default function App() {
  const authSession = useAuthSession();
  const [context, dispatch] = useReducer(
    reduceContext,
    location.search,
    parseContext,
  );
  const [places, setPlaces] = useState<Geography[]>([]);
  const [loadedData, setData] = useState<PageData | null>(null);
  const data = loadedData?.area === context.area_id ? loadedData : null;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [modal, setModal] = useState<Modal>(null);
  const [search, setSearch] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobile, setMobile] = useState(() => window.innerWidth <= 760);
  const [sourceExample, setSourceExample] = useState<ExampleDetail | null>(
    null,
  );
  const restoringHistory = useRef(false);
  const mockMode =
    import.meta.env.DEV && import.meta.env.VITE_APP_API_MODE !== "http";

  useEffect(() => {
    const controller = new AbortController();
    api
      .geography(controller.signal)
      .then((p) => setPlaces(p.items))
      .catch((e) => {
        if (e.name !== "AbortError")
          setError("Não foi possível carregar os locais. Tente novamente.");
      });
    return () => controller.abort();
  }, [reload]);
  useEffect(() => {
    const controller = new AbortController();
    const area = context.area_id ?? "5107925";
    let current = true;
    setLoading(true);
    setError("");
    setData(null);
    setPlaying(false);
    void Promise.all([
      api.coverage(area, controller.signal),
      api.examples(area, controller.signal),
    ])
      .then(async ([coverage, page]) => {
        const examples = await Promise.all(
          page.items.map((e) => api.example(e.example_id, controller.signal)),
        );
        if (current) {
          setData({ area, coverage, examples });
          setLoading(false);
        }
      })
      .catch((e) => {
        if (current && e.name !== "AbortError") {
          setLoading(false);
          setError(
            e instanceof ApiError && e.status === 404
              ? "Este local não foi encontrado no catálogo."
              : "Não foi possível carregar as evidências. Sua seleção foi mantida.",
          );
        }
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [context.area_id, reload]);
  useEffect(() => {
    if (restoringHistory.current) {
      restoringHistory.current = false;
      return;
    }
    const next = contextSearch(context);
    if (location.search !== next) history.pushState(null, "", next);
  }, [context]);
  useEffect(() => {
    const onBack = () => {
      restoringHistory.current = true;
      setModal(null);
      setSourceExample(null);
      dispatch({ type: "restore", context: parseContext(location.search) });
    };
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setModal("search");
      }
    };
    const visibility = () => {
      if (document.hidden) setPlaying(false);
    };
    const resize = () => setMobile(window.innerWidth <= 760);
    window.addEventListener("resize", resize);
    window.addEventListener("popstate", onBack);
    window.addEventListener("keydown", key);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("popstate", onBack);
      window.removeEventListener("keydown", key);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  const area = places.find((p) => p.area_id === context.area_id);
  const areaTitle =
    area?.name ??
    (context.area_id === "5107925" ? "Sorriso" : "Local selecionado");
  const areaSuffix =
    area?.state_id?.replace("BR-", "") ??
    (context.area_id === "5107925" ? "MT" : "");
  const waterExample = data?.examples.find(
    (e) => e.result.data.product === "water_risk_projection",
  );
  const water: WaterRiskPayload | undefined =
    waterExample?.result.data.product === "water_risk_projection"
      ? waterExample.result.data
      : undefined;
  const selectedDay =
    water?.days.find((d) => d.date === context.selected_date) ?? water?.days[0];
  const selectedIndex =
    water?.days.findIndex((d) => d.date === selectedDay?.date) ?? 0;
  const yieldExamples =
    data?.examples.filter((e) => e.result.data.product === "yield_estimate") ??
    [];
  const selectedExample =
    data?.examples.find((e) => e.example_id === context.example_id) ??
    waterExample ??
    data?.examples[0];
  const center: [number, number] = water
    ? [water.location.longitude, water.location.latitude]
    : area?.bbox
      ? [(area.bbox[0] + area.bbox[2]) / 2, (area.bbox[1] + area.bbox[3]) / 2]
      : [-53, -15];

  useEffect(() => {
    if (!playing || !water?.days.length) return;
    const timer = window.setInterval(() => {
      const next = water.days[(selectedIndex + 1) % water.days.length];
      if (next) dispatch({ type: "date", date: next.date });
    }, 1600);
    return () => window.clearInterval(timer);
  }, [playing, selectedIndex, water]);

  const selectDate = (date: string) => {
    setPlaying(false);
    dispatch({ type: "date", date });
  };
  const selectArea = (id: string) => {
    dispatch({ type: "area", area_id: id });
    setModal(null);
    setSearch("");
  };
  const openExample = (example: ExampleDetail) => {
    dispatch({
      type: "example",
      id: example.example_id,
      area_id: example.area_id,
      product_id: example.product_id,
    });
    setModal("comparison");
  };
  const openSources = (example?: ExampleDetail) => {
    setSourceExample(example ?? null);
    setModal("sources");
  };
  const navigate = (view: "explore" | "timeline" | "compare", map = false) => {
    dispatch({ type: "view", view });
    setShowMap(map);
    setMenuOpen(false);
    if (view === "compare") setModal("comparison");
    if (view === "timeline")
      document
        .getElementById("daily-timeline")
        ?.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
          block: "nearest",
        });
  };
  const filtered = useMemo(
    () =>
      places
        .filter(
          (p) => p.kind === "municipality" || p.kind === "published_field",
        )
        .filter((p) =>
          `${p.name} ${p.state_id ?? ""}`
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .includes(
              search
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase(),
            ),
        ),
    [places, search],
  );

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Ir para o conteúdo
      </a>
      <img className="farm-landscape" src="/art/farm-landscape.png" alt="" />
      <aside
        className={`sidebar ${menuOpen ? "is-open" : ""}`}
        aria-label="Navegação principal"
        inert={mobile && !menuOpen}
        aria-hidden={mobile && !menuOpen ? true : undefined}
      >
        <a href="/" className="brand" aria-label="Gaiapus, início">
          <img src="/brand/gaiapus-logo.jpg" alt="" />
          <strong>Gaiapus</strong>
          <span>
            Evidências para
            <br />o seu campo
          </span>
        </a>
        <nav>
          <button
            className={
              context.view === "explore" && !showMap
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => navigate("explore")}
          >
            <Home />
            Início
          </button>
          <button
            className={showMap ? "nav-item active" : "nav-item"}
            onClick={() => navigate("explore", true)}
          >
            <Map />
            Mapa
          </button>
          <button
            className={
              context.view === "timeline" ? "nav-item active" : "nav-item"
            }
            onClick={() => navigate("timeline")}
          >
            <CalendarDays />
            Histórico
          </button>
          <button
            className={
              context.view === "compare" ? "nav-item active" : "nav-item"
            }
            onClick={() => navigate("compare")}
          >
            <Layers />
            Comparar
          </button>
          <button
            className="nav-item"
            onClick={() => {
              setModal("about");
              setMenuOpen(false);
            }}
          >
            <CircleHelp />
            Sobre
          </button>
        </nav>
        <button className="publication-status" onClick={() => openSources()}>
          <span className="status-dot" />
          <span>
            Exemplos publicados<small>Origem e versões disponíveis</small>
          </span>
          <RefreshCw size={17} />
        </button>
        <div className="sidebar-bottom">
          <span>Da Terra às suas decisões.</span>
          <button onClick={() => openSources()}>
            Conheça as fontes <ExternalLink size={13} />
          </button>
        </div>
      </aside>

      <main id="main-content" className="main-content">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
          <div className="welcome">
            <span>Explore, entenda, compare.</span>
            <small>Inteligência ambiental com contexto.</small>
          </div>
          <button className="search-trigger" onClick={() => setModal("search")}>
            <Search size={17} />
            <span>Buscar um local</span>
            <kbd>⌘ K</kbd>
          </button>
          <button
            className="location-select"
            onClick={() => setModal("search")}
          >
            <MapPin size={17} />
            <span>
              {areaTitle}
              {areaSuffix ? `, ${areaSuffix}` : ""}
            </span>
            <ChevronDown size={16} />
          </button>
          <button className="sign-in" onClick={() => setModal("signin")}>
            {authSession ? 'Minha conta' : 'Entrar'} <ArrowRight size={15} />
          </button>
        </header>

        {mockMode && (
          <div className="dev-note">
            Prévia de desenvolvimento · respostas de exemplo
          </div>
        )}
        {error && (
          <div className="error-banner" role="alert">
            <TriangleAlert size={18} />
            <span>{error}</span>
            <button onClick={() => setReload((x) => x + 1)}>
              Tentar novamente
            </button>
          </div>
        )}

        <div className="dashboard">
          <div className="visual-column">
            <section className="earth-stage" aria-label="Exploração da Terra">
              <div className="map-tools" aria-label="Controles da ilustração">
                <div>
                  <button
                    aria-label="Ampliar ilustração"
                    onClick={() => setZoom((z) => Math.min(1.25, z + 0.08))}
                    disabled={showMap || zoom >= 1.25}
                  >
                    <Plus />
                  </button>
                  <button
                    aria-label="Reduzir ilustração"
                    onClick={() => setZoom((z) => Math.max(0.85, z - 0.08))}
                    disabled={showMap || zoom <= 0.85}
                  >
                    <Minus />
                  </button>
                </div>
                <button
                  aria-label="Restaurar visão da Terra"
                  onClick={() => {
                    setZoom(1);
                    setShowMap(false);
                  }}
                >
                  <LocateFixed />
                </button>
              </div>
              <div className="scene-breadcrumb">
                <button
                  onClick={() => {
                    setShowMap(false);
                    setZoom(1);
                  }}
                >
                  Terra
                </button>
                <ChevronRight size={12} />
                <span>Brasil</span>
                <ChevronRight size={12} />
                <strong>{areaTitle}</strong>
              </div>
              {showMap ? (
                <Suspense
                  fallback={<div className="map-message">Carregando mapa…</div>}
                >
                  <GeographyMap center={center} />
                </Suspense>
              ) : (
                <>
                  <div
                    className="earth-image-wrap"
                    style={{ transform: `scale(${zoom})` }}
                  >
                    <img
                      className="illustrated-earth"
                      src="/art/illustrated-earth.png"
                      alt="Ilustração colorida da Terra com destaque para a América do Sul; nuvens e chuva são decorativas."
                      fetchPriority="high"
                    />
                  </div>
                  <button
                    className="earth-marker"
                    onClick={() => setModal("search")}
                    aria-label={`Selecionar outro local. Atual: ${areaTitle}`}
                  >
                    <span className="marker-point" />
                    <span>
                      <strong>
                        {areaTitle}
                        {areaSuffix ? `, ${areaSuffix}` : ""}
                      </strong>
                      <small>
                        {loading
                          ? "Consultando evidências…"
                          : "Explorar evidências"}{" "}
                        <ChevronRight size={12} />
                      </small>
                    </span>
                  </button>
                  <span className="illustration-caption">
                    Globo ilustrativo · escolha um local para analisar
                  </span>
                </>
              )}
            </section>

            <Panel
              title="Projeção para os próximos dias"
              icon={CalendarDays}
              className="timeline-panel"
              action={
                <div className="timeline-actions">
                  <button
                    className="icon-button"
                    aria-label={playing ? "Pausar dias" : "Reproduzir dias"}
                    disabled={!water?.days.length}
                    onClick={() => setPlaying(!playing)}
                  >
                    {playing ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Ver valores em tabela"
                    onClick={() => setShowTable(!showTable)}
                  >
                    <Table2 size={17} />
                  </button>
                </div>
              }
            >
              <div
                id="daily-timeline"
                className="day-list"
                aria-label="Dias do exemplo hídrico"
              >
                {loading ? (
                  <div className="loading-state">
                    <LoaderCircle className="spin" size={20} />
                    Carregando exemplo publicado…
                  </div>
                ) : water?.days.length ? (
                  water.days.map((day) => (
                    <button
                      key={day.date}
                      className={`day-card ${selectedDay?.date === day.date ? "selected" : ""}`}
                      onClick={() => selectDate(day.date)}
                      aria-pressed={selectedDay?.date === day.date}
                    >
                      <span className="day-week">
                        {dayLabel(day.date, { weekday: "short" }).replace(
                          ".",
                          "",
                        )}
                      </span>
                      <span className="day-date">
                        {dayLabel(day.date, {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                      <CloudRain
                        className={`day-weather ${day.rain_mm > 10 ? "rain-heavy" : ""}`}
                        size={31}
                        strokeWidth={1.6}
                      />
                      <strong>
                        {number(day.rain_mm)} <small>mm</small>
                      </strong>
                      <span className={day.stress ? "day-risk" : "day-reserve"}>
                        {day.stress ? (
                          <Flag size={11} />
                        ) : (
                          <Droplets size={11} />
                        )}
                        {day.stress
                          ? "Estresse"
                          : `${number(day.storage_end_mm)} mm`}
                      </span>
                      {!day.validated_lead && (
                        <span className="experimental">Experimental</span>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="empty-state">
                    <Info size={20} />
                    <span>
                      Não há projeção hídrica publicada para este local.
                    </span>
                    <button onClick={() => selectArea("5107925")}>
                      Ver exemplo em Sorriso <ArrowRight size={13} />
                    </button>
                  </div>
                )}
              </div>
              <footer className="timeline-footer">
                <span>
                  <span className="tiny-dot" />
                  {water
                    ? `${water.days.length} dias servidos · limite avaliado de ${water.max_validated_lead_days} dias`
                    : "A disponibilidade varia por produto"}
                </span>
                <button onClick={() => openSources()}>
                  Dados do modelo <Info size={12} />
                </button>
              </footer>
              {showTable && water && (
                <div className="data-table-wrap">
                  <table>
                    <caption>Valores diários do exemplo, em milímetros</caption>
                    <thead>
                      <tr>
                        <th>Data UTC</th>
                        <th>Chuva</th>
                        <th>Reserva</th>
                        <th>Estresse</th>
                      </tr>
                    </thead>
                    <tbody>
                      {water.days.map((d) => (
                        <tr key={d.date}>
                          <td>{dayLabel(d.date)}</td>
                          <td>{number(d.rain_mm)}</td>
                          <td>{number(d.storage_end_mm)}</td>
                          <td>{d.stress ? "Sim" : "Não"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>

          <div className="evidence-column" aria-busy={loading}>
            <Panel
              title="Balanço hídrico"
              icon={CloudRain}
              className="conditions-panel"
              action={<span className="tag tag-blue">Exemplo publicado</span>}
            >
              <div className="conditions-content">
                <div className="reserve-main">
                  <CloudRain className="weather-hero" strokeWidth={1.3} />
                  <div>
                    <strong>
                      {selectedDay ? number(selectedDay.storage_end_mm) : "—"}
                      <small>mm</small>
                    </strong>
                    <span>Reserva modelada no solo</span>
                  </div>
                </div>
                <div className="condition-stat">
                  <Droplets size={23} />
                  <strong>
                    {selectedDay ? number(selectedDay.rain_mm) : "—"}
                    <small> mm</small>
                  </strong>
                  <span>Chuva projetada</span>
                </div>
                <div className="condition-stat">
                  <Flag
                    size={22}
                    className={selectedDay?.stress ? "amber" : "mint"}
                  />
                  <strong className={selectedDay?.stress ? "amber" : ""}>
                    {selectedDay ? (selectedDay.stress ? "Sim" : "Não") : "—"}
                  </strong>
                  <span>Estresse modelado</span>
                </div>
              </div>
              <div className="panel-caption">
                <CalendarDays size={12} />
                {selectedDay
                  ? dayLabel(selectedDay.date, {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })
                  : "Selecione um exemplo disponível"}
                <span>· Soja</span>
                <button onClick={() => openSources(waterExample)}>
                  Ver origem
                </button>
              </div>
            </Panel>

            <Panel
              title="Explore as culturas"
              icon={Sprout}
              className="crops-panel"
              action={<span className="tag tag-green">Exemplos</span>}
            >
              <p className="panel-description">
                Compare evidências. Entenda o que cada análise responde.
              </p>
              {yieldExamples.length ? (
                yieldExamples
                  .slice()
                  .sort((a, b) =>
                    (a.result.data as YieldPayload).crop === "maize2"
                      ? -1
                      : (b.result.data as YieldPayload).crop === "maize2"
                        ? 1
                        : 0,
                  )
                  .map((example, index) => {
                    const payload = example.result.data as YieldPayload;
                    return (
                      <button
                        key={example.example_id}
                        className={`crop-row ${index === 0 ? "crop-featured" : ""}`}
                        onClick={() => openExample(example)}
                      >
                        <span className="crop-state">
                          {payload.status === "ready" ? (
                            <Check size={17} />
                          ) : (
                            <Info size={17} />
                          )}
                        </span>
                        <span className="crop-copy">
                          <strong>{cropName(payload.crop)}</strong>
                          <span>
                            {payload.status === "before_first_cutoff"
                              ? "Antes do primeiro corte avaliado."
                              : `Estimativa municipal · safra ${payload.harvest_year}`}
                          </span>
                          <small>
                            {payload.status === "ready"
                              ? "Abrir exemplo retrospectivo"
                              : "Conhecer os limites da estimativa"}
                          </small>
                        </span>
                        <span
                          className={`crop-art ${payload.crop}`}
                          aria-hidden="true"
                        >
                          {payload.crop === "maize2" ? (
                            <Sprout size={35} strokeWidth={1.5} />
                          ) : (
                            <Leaf size={34} strokeWidth={1.5} />
                          )}
                        </span>
                        <ChevronRight className="crop-chevron" size={16} />
                      </button>
                    );
                  })
              ) : (
                <div className="empty-state compact">
                  <Leaf size={22} />
                  <span>
                    {loading
                      ? "Carregando culturas…"
                      : "Sem estimativas publicadas neste local."}
                  </span>
                </div>
              )}
              <div className="crop-unavailable">
                <TriangleAlert size={18} />
                <div>
                  <strong>Orientação de plantio</strong>
                  <span>Ainda não avaliada para este exemplo.</span>
                </div>
                <span className="tag">Em estudo</span>
              </div>
            </Panel>

            <Panel
              title="Contexto regional"
              icon={ChartNoAxesCombined}
              className="regional-panel"
              action={
                <button
                  className="icon-button"
                  aria-label="Abrir fontes do contexto regional"
                  onClick={() => openSources()}
                >
                  <Info size={16} />
                </button>
              }
            >
              <div className="regional-body">
                <BrazilMap />
                <dl>
                  <div>
                    <dt>
                      <MapPin size={14} />
                      Local selecionado
                    </dt>
                    <dd>
                      {areaTitle}
                      {areaSuffix ? `, ${areaSuffix}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <Layers size={14} />
                      Cobertura
                    </dt>
                    <dd>
                      {loading
                        ? "Consultando…"
                        : `${data?.coverage.products.filter((p) => p.availability !== "no_data").length ?? 0} produtos publicados`}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <ShieldCheck size={14} />
                      Hipótese de solo
                    </dt>
                    <dd>
                      {water
                        ? `Capacidade de ${number(water.soil.capacity_mm)} mm`
                        : "Não avaliada aqui"}
                    </dd>
                  </div>
                </dl>
              </div>
              <button className="regional-footer" onClick={() => openSources()}>
                Fontes, escala e limitações <ArrowRight size={13} />
              </button>
            </Panel>
          </div>
        </div>
        <footer className="page-footer">
          <span>
            <ShieldCheck size={13} />
            Evidências com origem. Decisões com contexto.
          </span>
          <span>
            Ilustração decorativa · análises identificadas por fonte e período
          </span>
        </footer>
      </main>

      {modal && (
        <Dialog
          title={
            modal === "search"
              ? "Escolha um local"
              : modal === "sources"
                ? "Fontes e limitações"
                : modal === "comparison"
                  ? "Explore a análise"
                  : modal === "signin"
                    ? "Seu campo, no seu espaço"
                    : "Da Terra ao seu campo"
          }
          onClose={() => setModal(null)}
          wide={modal === "comparison"}
        >
          {modal === "search" && (
            <>
              <label className="search-field">
                <Search size={19} />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Município ou região…"
                  aria-label="Buscar município ou região"
                />
              </label>
              <div className="search-results">
                {filtered.length ? (
                  filtered.map((p) => (
                    <button
                      key={p.area_id}
                      onClick={() => selectArea(p.area_id)}
                    >
                      <MapPin size={19} />
                      <span>
                        <strong>{p.name}</strong>
                        <small>
                          {p.state_id
                            ? (stateName[p.state_id] ?? p.state_id)
                            : "Brasil"}{" "}
                          ·{" "}
                          {p.kind === "published_field"
                            ? "Recorte publicado"
                            : "Município"}
                        </small>
                      </span>
                      <ArrowRight size={17} />
                    </button>
                  ))
                ) : (
                  <p>Nenhum local encontrado. Tente outro nome.</p>
                )}
              </div>
              <p className="dialog-note">
                A busca mostra os locais do catálogo publicado. A cobertura
                varia por produto.
              </p>
            </>
          )}
          {modal === "sources" && (
            <>
              <p>
                Você está explorando <strong>{areaTitle}</strong>. As análises
                são exemplos publicados, não medições ao vivo.
              </p>
              <div className="source-facts">
                <span>
                  <Database />
                  Origem identificada por produto
                </span>
                <span>
                  <MapPin />
                  Rendimento em escala municipal
                </span>
                <span>
                  <Droplets />
                  Solo com hipótese fixa, não medido
                </span>
              </div>
              {(
                sourceExample?.source_refs ??
                data?.coverage.source_refs ??
                []
              ).map((s) => (
                <div className="source-row" key={s.source_id}>
                  <strong>{s.source_id}</strong>
                  <p>{s.description}</p>
                  {s.url.startsWith("https://") && (
                    <a href={s.url} target="_blank" rel="noreferrer">
                      Consultar fonte <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              ))}
              <div className="notice amber-notice">
                <Info size={18} />
                <span>
                  A projeção hídrica não foi avaliada como efeito sobre
                  produtividade, lucro ou recomendação de plantio. A arte da
                  Terra e suas nuvens são decorativas.
                </span>
              </div>
              <small className="version-label">
                Pacote: {data?.coverage.publication_version ?? "consultando"}
              </small>
            </>
          )}
          {modal === "comparison" && (
            <>
              <div className="analysis-tabs">
                {data?.examples.map((e) => (
                  <button
                    key={e.example_id}
                    className={
                      selectedExample?.example_id === e.example_id
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      dispatch({
                        type: "example",
                        id: e.example_id,
                        area_id: e.area_id,
                        product_id: e.product_id,
                      })
                    }
                  >
                    {e.product_id === "water_risk_projection"
                      ? "Água no solo"
                      : "crop" in e.result.data ? cropName(e.result.data.crop) : "Estratégias"}
                  </button>
                ))}
              </div>
              {selectedExample ? (
                <Analysis
                  example={selectedExample}
                  selectedDate={selectedDay?.date ?? null}
                  onSources={() => openSources(selectedExample)}
                />
              ) : (
                <div className="empty-state">
                  Nenhuma análise publicada para este local. A busca e a
                  exploração continuam disponíveis.
                </div>
              )}
            </>
          )}
          {modal === "signin" && (
            <AuthPanel />
          )}
          {modal === "about" && (
            <>
              <p>
                A Gaiapus aproxima evidências ambientais das decisões do campo.
                Explore lugares, conheça as fontes e compare análises com seus
                limites à vista.
              </p>
              <ul className="about-list">
                <li>
                  <Globe2 />
                  Explore a geografia e os exemplos publicados.
                </li>
                <li>
                  <CalendarDays />
                  Inspecione datas, séries e períodos disponíveis.
                </li>
                <li>
                  <Layers />
                  Compare resultados sem perder hipóteses ou origem.
                </li>
              </ul>
              <div className="notice">
                Esta é a primeira estrutura de frontend. Conta pessoal, cenários
                personalizados e histórico de imagens completo seguem o plano de
                implementação.
              </div>
            </>
          )}
        </Dialog>
      )}
    </div>
  );
}

function Analysis({
  example,
  selectedDate,
  onSources,
}: {
  example: ExampleDetail;
  selectedDate: string | null;
  onSources: () => void;
}) {
  const payload = example.result.data;
  if (payload.product !== "yield_estimate" && payload.product !== "water_risk_projection") {
    return <div className="analysis-content"><h3>Comparação de estratégias</h3><p>Este produto foi adicionado ao catálogo. A visualização detalhada será conectada em uma próxima etapa, preservando suas hipóteses e fontes.</p><button className="text-button" onClick={onSources}>Consultar fontes <ArrowRight size={14} /></button></div>;
  }
  return (
    <div className="analysis-content">
      <div className="analysis-heading">
        <span className="tag tag-blue">
          Exemplo{" "}
          {payload.product === "yield_estimate" ? "retrospectivo" : "publicado"}
        </span>
        <h3>
          {payload.product === "water_risk_projection"
            ? "Água no solo, dia após dia."
            : `${cropName(payload.crop)} · safra ${payload.harvest_year}`}
        </h3>
      </div>
      {payload.product === "water_risk_projection" ? (
        <>
          <WaterChart water={payload} selectedDate={selectedDate} />
          <div className="analysis-facts">
            <div>
              <span>Período servido</span>
              <strong>
                {payload.days.length
                  ? `${dayLabel(payload.days[0]!.date)} a ${dayLabel(payload.days.at(-1)!.date)}`
                  : "Sem dias disponíveis"}
              </strong>
            </div>
            <div>
              <span>Solo assumido</span>
              <strong>{number(payload.soil.capacity_mm)} mm</strong>
            </div>
            <div>
              <span>Fonte meteorológica</span>
              <strong>{payload.forecast.provider}</strong>
            </div>
          </div>
          <p>
            A linha de referência usa a base climática indicada pelo modelo.
            Reserva hídrica não representa produtividade da cultura.
          </p>
          <details>
            <summary>Ver valores por dia</summary>
            <div className="data-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data UTC</th>
                    <th>Chuva (mm)</th>
                    <th>Reserva (mm)</th>
                    <th>Avaliado</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.days.map((d) => (
                    <tr key={d.date}>
                      <td>{dayLabel(d.date)}</td>
                      <td>{number(d.rain_mm)}</td>
                      <td>{number(d.storage_end_mm)}</td>
                      <td>{d.validated_lead ? "Sim" : "Experimental"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      ) : (
        <>
          <div className="yield-value">
            <strong>
              {payload.estimate_kg_ha === null
                ? "Ainda sem estimativa"
                : `${number(payload.estimate_kg_ha, 0)} kg/ha`}
            </strong>
            <span>
              Escala municipal · não representa a colheita de um talhão
            </span>
          </div>
          {payload.status === "before_first_cutoff" ? (
            <p>
              O exemplo foi solicitado no dia{" "}
              {payload.days_after_sowing_requested}. O primeiro corte suportado
              é o dia {Math.min(...payload.supported_cutoffs_days)} após a
              semeadura.
            </p>
          ) : (
            <div className="analysis-facts">
              <div>
                <span>Corte utilizado</span>
                <strong>{payload.cutoff_days_used} dias</strong>
              </div>
              <div>
                <span>Insumos até</span>
                <strong>
                  {payload.observed_through
                    ? dayLabel(payload.observed_through, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "Não disponível"}
                </strong>
              </div>
              <div>
                <span>Erro médio de avaliação</span>
                <strong>
                  {payload.validation
                    ? `${number(payload.validation.mae_kg_ha, 0)} kg/ha`
                    : "Não disponível"}
                </strong>
              </div>
            </div>
          )}
          <p>
            Exemplo retrospectivo da safra {payload.harvest_year}. O erro médio
            descreve a avaliação agregada do modelo; não é um intervalo de
            previsão para este resultado.
          </p>
        </>
      )}
      <button className="text-button" onClick={onSources}>
        Entender fontes e limitações <ArrowRight size={14} />
      </button>
    </div>
  );
}

function BrazilMap() {
  const [path, setPath] = useState("");
  useEffect(() => {
    let current = true;
    fetch("/art/brazil.geojson")
      .then((r) => r.json())
      .then((json) => {
        const geometry =
          json.type === "FeatureCollection"
            ? json.features[0].geometry
            : json.type === "Feature"
              ? json.geometry
              : json;
        const polygons: number[][][][] =
          geometry.type === "MultiPolygon"
            ? geometry.coordinates
            : [geometry.coordinates];
        const value = polygons
          .map((polygon) =>
            polygon
              .map(
                (ring) =>
                  ring
                    .map(
                      ([lon, lat], i) =>
                        `${i ? "L" : "M"}${((lon! + 74) * 3.2).toFixed(1)},${((6 - lat!) * 3.2).toFixed(1)}`,
                    )
                    .join(" ") + "Z",
              )
              .join(" "),
          )
          .join(" ");
        if (current) setPath(value);
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, []);
  return (
    <svg
      className="brazil-map"
      viewBox="0 0 130 140"
      aria-label="Contorno geográfico do Brasil"
      role="img"
    >
      <defs>
        <linearGradient id="brazil-land" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#a6d95a" />
          <stop offset=".5" stopColor="#3bb07d" />
          <stop offset="1" stopColor="#269be0" />
        </linearGradient>
      </defs>
      <path
        d={path}
        fill="url(#brazil-land)"
        stroke="#74cfb3"
        strokeWidth="0.8"
      />
    </svg>
  );
}
