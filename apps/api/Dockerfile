FROM node:22.23.4-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json .npmrc ./
COPY packages/contracts ./packages/contracts
COPY apps/api ./apps/api
COPY apps/web ./apps/web
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_APP_API_MODE=http
RUN pnpm install --frozen-lockfile --filter @gaiapus/api... --filter @gaiapus/web... && pnpm --filter @gaiapus/contracts build && pnpm --filter @gaiapus/api build && pnpm --filter @gaiapus/web build

FROM node:22.23.4-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001
COPY --from=build --chown=node:node /app /app
# Frontend and API are built together and served by the same Node process.
# Only public VITE_SUPABASE_* build arguments may be embedded in browser assets.
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/api/dist/server.js"]
