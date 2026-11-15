import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { compile } from 'json-schema-to-typescript';
import { schema, routes } from './schema-definition.mjs';
const root = new URL('../', import.meta.url);
const check = process.argv.includes('--check');
const put = async (path, content) => {
  const target = new URL(path, root);
  if (check) {
    if (await readFile(target, 'utf8') !== content) throw new Error(`Generated drift: ${path}`);
  } else await writeFile(target, content);
};
await mkdir(new URL('schemas/', root), { recursive: true });
await mkdir(new URL('src/generated/', root), { recursive: true });
await put('schemas/application.json', JSON.stringify(schema, null, 2) + '\n');
// Unreferenced definitions must remain exported for independent frontend consumers.
const typesSchema = structuredClone({ ...schema, properties: Object.fromEntries(Object.keys(schema.$defs).map(name => [name, { $ref: `#/$defs/${name}` }])) });
// The TS generator cannot express JSON Schema if/then branches. Keep these checks
// in Ajv, and generate the complete nullable payload structure rather than `unknown`.
delete typesSchema.$defs.YieldPayload.allOf;
typesSchema.$defs.YieldPayload.title = 'YieldPayload';
typesSchema.$defs.WaterRiskPayload.title = 'WaterRiskPayload';
await put('src/generated/types.ts', await compile(typesSchema, 'GaiapusContracts', { bannerComment: '/* Generated from application schemas; run pnpm contracts:generate. */', unreachableDefinitions: true, additionalProperties: false, style: { singleQuote: true } }));
await put('src/generated/routes.ts', `/* Generated; do not edit. */\nexport const routeContracts = ${JSON.stringify(routes, null, 2)} as const;\n`);
const componentRef = name => ({ $ref: `#/components/schemas/${name}` });
const convertRefs = value => JSON.parse(JSON.stringify(value).replaceAll('#/$defs/', '#/components/schemas/'));
const paths = {};
for (const [method, url, body, query, response, privateRoute, extraQuery] of routes) {
  const path = url.replace(':id', '{id}');
  const parameters = query ? Object.entries(schema.$defs[query].properties).map(([name, value]) => ({ name, in: url.includes(':id') ? 'path' : 'query', required: schema.$defs[query].required.includes(name), schema: convertRefs(value) })) : [];
  // Routes with path parameters and a query string declare the query schema as a seventh entry.
  if (extraQuery) parameters.push(...Object.entries(schema.$defs[extraQuery].properties).map(([name, value]) => ({ name, in: 'query', required: schema.$defs[extraQuery].required.includes(name), schema: convertRefs(value) })));
  if (method === 'POST' && url === '/v1/comparisons') parameters.push({ name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', minLength: 1, maxLength: 128 } });
  paths[path] ??= {};
  paths[path][method.toLowerCase()] = { operationId: `${method.toLowerCase()}_${url.replace(/[^a-z0-9]/gi, '_')}`, security: privateRoute ? [{ bearerAuth: [] }] : [], parameters, ...(body ? { requestBody: { required: true, content: { 'application/json': { schema: componentRef(body) } } } } : {}), responses: { [response ? '200' : '204']: { description: 'Success', ...(response ? { content: { 'application/json': { schema: componentRef(response) } } } : {}) }, default: { description: 'Application error', content: { 'application/json': { schema: componentRef('ErrorResponse') } } } } };
}
// Rewrite local refs inside upstream definitions relative to their containing component.
await put('schemas/openapi.json', JSON.stringify({ openapi: '3.1.0', info: { title: 'Gaiapus API', version: '0.1.0' }, paths, components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } }, schemas: convertRefs(schema.$defs) } }, null, 2) + '\n');
console.log(check ? 'Generated contracts/types/OpenAPI match.' : 'Generated contracts/types/OpenAPI.');
