FROM node:22.23.4-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json .npmrc ./
COPY packages/contracts ./packages/contracts
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile --filter @gaiapus/api... && pnpm --filter @gaiapus/contracts build && pnpm --filter @gaiapus/api build

FROM node:22.23.4-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001
COPY --from=build --chown=node:node /app /app
# After frontend integration, copy apps/web/dist to /app/apps/web/dist in the
# combined deployment image. The API image also works independently.
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/api/dist/server.js"]
