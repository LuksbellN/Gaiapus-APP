import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Identity, Repository } from '../../plugins/repository.js';
import type { UpdateAccountRequest, CreatePlaceRequest, RenamePlaceRequest, MonitoredPlace } from '@gaiapus/contracts';
import { areaById, paginate } from '../geography/public.js';
import { notFound } from '../../plugins/errors.js';
export type PrivateRequest = FastifyRequest & { identity: Identity; repository: Repository };
export function privateResult(request: FastifyRequest, data: unknown) {
  return { data, meta: { app_contract_version: '0.1.0', request_id: request.id } };
}
export function personalHandlers() {
  return {
    'GET /v1/me': async (request: PrivateRequest, _reply: FastifyReply) => privateResult(request, await request.repository.me()),
    'PATCH /v1/me': async (request: PrivateRequest) => {
      const patch = request.body as UpdateAccountRequest;
      if (patch.last_monitored_place_id && !await request.repository.place(patch.last_monitored_place_id)) notFound();
      await request.repository.updateAccount(patch); return privateResult(request, await request.repository.me());
    },
    'GET /v1/places': async (request: PrivateRequest) => privateResult(request, paginate(await request.repository.places(), request.query as Record<string, any>, `places:${request.identity.id}`)),
    'POST /v1/places': async (request: PrivateRequest) => {
      const input = request.body as CreatePlaceRequest; const area = areaById(input.area_id);
      return privateResult(request, await request.repository.createPlace(area.area_id, area.kind as MonitoredPlace['kind'], input.label ?? area.name));
    },
    'PATCH /v1/places/:id': async (request: PrivateRequest) => {
      const id = (request.params as { id: string }).id;
      return privateResult(request, await request.repository.renamePlace(id, (request.body as RenamePlaceRequest).label) ?? notFound());
    },
    'DELETE /v1/places/:id': async (request: PrivateRequest, reply: FastifyReply) => {
      if (!await request.repository.deletePlace((request.params as { id: string }).id)) notFound();
      return reply.code(204).send();
    },
  };
}
