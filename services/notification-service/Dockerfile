# ---- Build stage: has dev dependencies (TypeScript) and compiles to dist/ ----
FROM node:22-alpine AS build
WORKDIR /app
# package files first: Docker caches the npm ci layer until dependencies change.
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build
# Drop dev dependencies here, so the runtime stage copies a ready node_modules
# instead of resolving the lockfile a second time.
RUN npm prune --omit=dev && npm cache clean --force

# ---- Runtime stage: only production dependencies and the compiled code ----
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# The node image ships a non-root "node" user. If the app is ever hacked,
# the attacker is not root inside the container.
USER node
EXPOSE 8080
# Exec form (JSON array): node is PID 1 and receives SIGTERM directly, so the
# graceful shutdown in main.ts runs. "npm start" would swallow the signal.
CMD ["node", "dist/main.js"]
