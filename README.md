# jellydrop

Paste a YouTube link, pick a folder in one of your Jellyfin libraries, and jellydrop downloads the audio with yt-dlp, tags it, embeds the thumbnail as cover art, and files it into the library.

- Keeps the original audio stream (m4a/opus), no re-encode
- Optional Artist/Title/Album overrides; the filename follows the final title
- One download at a time, with live progress in the browser
- Never overwrites: name collisions get a ` (2)`, ` (3)`, … suffix

## Setup

1. Copy [`docker-compose.yml`](docker-compose.yml) and adjust it:
   - `user`: the UID:GID Jellyfin runs as (`id jellyfin` on the host)
   - `LIBRARY_ROOTS` and the matching bind mounts: the same host directories your Jellyfin libraries use
2. `docker compose up -d --build`
3. In Jellyfin, enable **Real time monitoring** for each library (Dashboard → Libraries → library → Manage library). jellydrop doesn't call Jellyfin's API; new files are picked up by the file watcher.

The port is published on `127.0.0.1` only. jellydrop has no login of its own, so put it behind your reverse proxy's auth or reach it via Tailscale.

jellydrop expects to be served over HTTPS (it rejects form submissions whose origin doesn't match). If your proxy forwards plain HTTP from an HTTPS origin, that's fine. For plain-HTTP access, set `PROTOCOL_HEADER=x-forwarded-proto` and have the proxy send that header.

## Environment variables

| Variable        | Required | Description                                                                                                      |
| --------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `LIBRARY_ROOTS` | yes      | Comma-separated `Label:/path` pairs, e.g. `Music:/media/music,Motivation:/media/motivation`. Paths must exist.   |
| `STAGING_DIR`   | no       | Download workspace, emptied on startup. `/staging` in the Docker image.                                          |
| `YTDLP_COOKIES` | no       | Path to a Netscape-format cookies file, for when YouTube starts blocking your server's IP. Can be mounted `:ro`. |

The app refuses to start if `LIBRARY_ROOTS` is malformed or a path doesn't exist.

yt-dlp is upgraded on every container start, so a restart picks up fixes for YouTube changes.

## Development

```sh
cp .env.example .env   # point LIBRARY_ROOTS at local folders
pnpm install
pnpm dev
```

You need `yt-dlp` (with `mutagen`), `ffmpeg` and Node on your `PATH`. Validate changes with `pnpm run check` and `pnpm run lint`.
