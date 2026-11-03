import { z } from 'zod';

const YOUTUBE_HOSTS = new Set([
	'youtube.com',
	'www.youtube.com',
	'm.youtube.com',
	'music.youtube.com',
	'youtu.be'
]);

export function youtubeUrlProblem(value: string): string | undefined {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return 'That is not a valid URL';
	}
	if (!['http:', 'https:'].includes(url.protocol) || !YOUTUBE_HOSTS.has(url.hostname)) {
		return 'Only YouTube links are supported';
	}
	if (url.pathname === '/playlist') return 'Playlist links are not supported, share a single video';
}

export function folderNameProblem(name: string): string | undefined {
	if (/[/\\]/.test(name)) return 'Folder name cannot contain slashes';
	if (name.startsWith('.')) return 'Folder name cannot start with a dot';
	if (/\p{Cc}/u.test(name)) return 'Folder name cannot contain control characters';
	if (new TextEncoder().encode(name).length > 255) return 'Folder name is too long';
}

const reportProblem =
	(problem: (value: string) => string | undefined) => (value: string, ctx: z.RefinementCtx) => {
		const message = problem(value);
		if (message) ctx.addIssue({ code: 'custom', message });
	};

const tagOverride = z
	.string()
	.trim()
	.max(200, 'Keep it under 200 characters')
	.regex(/^\P{Cc}*$/u, 'Control characters are not allowed')
	.optional()
	.transform((value) => value || undefined);

export const submitJobSchema = z.object({
	url: z
		.string()
		.trim()
		.superRefine(reportProblem((url) => (url ? youtubeUrlProblem(url) : 'Paste a YouTube link'))),
	root: z.string().min(1, 'Pick a destination'),
	path: z.string().default(''),
	newFolder: z
		.string()
		.trim()
		.superRefine(reportProblem((name) => (name ? folderNameProblem(name) : undefined)))
		.optional()
		.transform((value) => value || undefined),
	artist: tagOverride,
	title: tagOverride,
	album: tagOverride
});
