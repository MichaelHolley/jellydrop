import { building } from '$app/env';
import { defineEnvVars } from '@sveltejs/kit/env';
import { z } from 'zod';

export const variables = defineEnvVars({
	LIBRARY_ROOTS: {
		description:
			'Comma-separated `Label:/path` pairs, e.g. `Music:/media/music,Motivation:/media/motivation`',
		schema: building ? z.string().optional() : z.string().min(1)
	},
	STAGING_DIR: {
		description: 'Download workspace, emptied on startup. Defaults to a folder in the OS temp dir.',
		schema: z.string().optional()
	},
	YTDLP_COOKIES: {
		description: 'Optional path to a Netscape-format YouTube cookies file',
		schema: z.string().optional()
	}
});
