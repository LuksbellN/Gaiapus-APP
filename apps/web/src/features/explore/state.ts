import type { ExplorationContext } from "@gaiapus/contracts";

export const initialContext: ExplorationContext = {
  area_id: "5107925",
  view: "explore",
  product_id: "water_risk_projection",
  layer_id: null,
  period: null,
  selected_date: null,
  example_id: null,
};
type Action =
  | { type: "restore"; context: ExplorationContext }
  | { type: "area"; area_id: string }
  | { type: "view"; view: ExplorationContext["view"] }
  | { type: "date"; date: string }
  | {
      type: "example";
      id: string;
      area_id: string;
      product_id: ExplorationContext["product_id"];
    };
export function reduceContext(
  state: ExplorationContext,
  action: Action,
): ExplorationContext {
  switch (action.type) {
    case "restore":
      return action.context;
    case "area":
      return {
        ...state,
        area_id: action.area_id,
        selected_date: null,
        period: null,
        example_id: null,
        layer_id: null,
      };
    case "view":
      return { ...state, view: action.view };
    case "date":
      return { ...state, selected_date: action.date };
    case "example":
      return {
        ...state,
        area_id: action.area_id,
        product_id: action.product_id,
        example_id: action.id,
        selected_date: null,
      };
  }
}
export function contextSearch(state: ExplorationContext): string {
  const params = new URLSearchParams();
  if (state.area_id) params.set("area", state.area_id);
  params.set("view", state.view);
  if (state.product_id) params.set("product", state.product_id);
  if (state.selected_date) params.set("date", state.selected_date);
  if (state.example_id) params.set("example", state.example_id);
  if (state.layer_id) params.set("layer", state.layer_id);
  if (state.period) {
    params.set("start", state.period.start);
    params.set("end", state.period.end);
  }
  return `?${params}`;
}
export function parseContext(search: string): ExplorationContext {
  const p = new URLSearchParams(search);
  const view = p.get("view");
  const date = p.get("date");
  const isDay = (value: string | null): value is string => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const stamp = Date.parse(`${value}T00:00:00Z`);
    return (
      Number.isFinite(stamp) &&
      new Date(stamp).toISOString().slice(0, 10) === value
    );
  };
  const start = p.get("start");
  const end = p.get("end");
  const product = p.get("product");
  return {
    ...initialContext,
    area_id: p.get("area") || initialContext.area_id,
    view: view === "timeline" || view === "compare" ? view : "explore",
    product_id:
      product === "history" ||
      product === "yield_estimate" ||
      product === "strategy_comparison"
        ? product
        : "water_risk_projection",
    selected_date: isDay(date) ? date : null,
    layer_id: p.get("layer"),
    period: isDay(start) && isDay(end) && start <= end ? { start, end } : null,
    example_id: p.get("example"),
  };
}
