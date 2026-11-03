FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.7.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-slim
ENV NODE_ENV=production \
	STAGING_DIR=/staging \
	PATH=/opt/yt-dlp/bin:$PATH \
	PIP_NO_CACHE_DIR=1 \
	PIP_DISABLE_PIP_VERSION_CHECK=1 \
	XDG_CACHE_HOME=/tmp/cache
# The venv and staging dir are world-writable because the container runs as Jellyfin's UID,
# which only exists at runtime
RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates ffmpeg python3 python3-venv \
	&& rm -rf /var/lib/apt/lists/* \
	&& python3 -m venv /opt/yt-dlp \
	&& pip install "yt-dlp[default]" \
	&& chmod -R a+rwX /opt/yt-dlp \
	&& mkdir /staging \
	&& chmod 1777 /staging
WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./
COPY --chmod=755 jellydrop-entrypoint.sh /usr/local/bin/
EXPOSE 3000
ENTRYPOINT ["jellydrop-entrypoint.sh"]
