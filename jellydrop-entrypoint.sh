#!/bin/sh
pip install --quiet --upgrade "yt-dlp[default]" \
	|| echo "jellydrop: could not upgrade yt-dlp, using $(yt-dlp --version)" >&2
exec node build
