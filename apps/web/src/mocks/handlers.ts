import { http, HttpResponse, delay } from "msw";
import { examples, publication } from "@gaiapus/contracts/fixtures";
import { publishedCoverage, publishedObservations } from "@gaiapus/contracts";
const meta = {
  app_contract_version: "0.1.0",
  request_id: "browser-development-mock",
  publication_version: publication.publication_version,
};
const response = (data: unknown) => HttpResponse.json({ data, meta });
const unavailable = () =>
  HttpResponse.json(
    {
      error: { code: "not_found", message: "Este exemplo não foi publicado." },
      meta,
    },
    { status: 404 },
  );
export const handlers = [
  http.get("/v1/geography", async () => {
    await delay(150);
    return response({ items: publication.areas, next_cursor: null });
  }),
  http.get("/v1/coverage", ({ request }) => {
    const id = new URL(request.url).searchParams.get("area_id") ?? "";
    return publication.areas.some((a) => a.area_id === id)
      ? response(publishedCoverage(id))
      : unavailable();
  }),
  http.get("/v1/examples", ({ request }) => {
    const id = new URL(request.url).searchParams.get("area_id");
    return response({
      items: examples
        .filter((e) => !id || e.area_id === id)
        .map(
          ({
            result: _r,
            input_snapshot: _i,
            source_refs: _s,
            warnings: _w,
            ...summary
          }) => summary,
        ),
      next_cursor: null,
    });
  }),
  http.get("/v1/examples/:id", async ({ params }) => {
    await delay(120);
    const example = examples.find((e) => e.example_id === params.id);
    return example ? response(example) : unavailable();
  }),
  http.get("/v1/observations", ({ request }) => {
    const p = new URL(request.url).searchParams;
    return response(
      publishedObservations(
        p.get("area_id") ?? "",
        p.get("start") ?? "2024-04-01",
        p.get("end") ?? "2024-07-31",
      ),
    );
  }),
  http.post("/v1/:resource", () =>
    HttpResponse.json(
      {
        error: {
          code: "unauthenticated",
          message: "Entre para executar uma análise ou salvar comparações.",
        },
        meta,
      },
      { status: 401 },
    ),
  ),
];
