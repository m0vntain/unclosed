FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run typecheck && npm test && npm run build

FROM build AS production-dependencies
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY scripts ./scripts
RUN mkdir -p /data /scan && chown node:node /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s CMD node -e "fetch('http://localhost:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/server/apps/server/src/server.js"]
