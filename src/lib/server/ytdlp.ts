import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import type { TagOverrides } from '#lib/types.js';

const PROGRESS = 'JD_PROGRESS ';
const TITLE = 'JD_TITLE ';
const FILE = 'JD_FILE ';

type DownloadOptions = {
	url: string;
	outputDir: string;
	overrides: TagOverrides;
	cookiesFile?: string;
	onTitle: (title: string) => void;
	onProgress: (percent: number) => void;
};

export async function downloadAudio(options: DownloadOptions): Promise<string> {
	const { url, outputDir, overrides, cookiesFile } = options;
	const args = [
		'-x',
		'--embed-metadata',
		'--embed-thumbnail',
		'--convert-thumbnails',
		'jpg',
		'--no-playlist',
		'--newline',
		// --print implies --quiet, which would otherwise hide progress lines
		'--progress',
		'--no-simulate',
		'--progress-template',
		`download:${PROGRESS}%(progress.downloaded_bytes)s %(progress.total_bytes)s %(progress.total_bytes_estimate)s`,
		'--print',
		`before_dl:${TITLE}%(title)s`,
		'--print',
		`after_move:${FILE}%(filepath)s`,
		'--js-runtimes',
		'node',
		...overrideArgs(overrides),
		...(cookiesFile ? ['--cookies', cookiesFile] : []),
		'-P',
		outputDir,
		'-o',
		'%(title)s.%(ext)s',
		'--',
		url
	];

	const child = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] });
	let filePath: string | undefined;
	let lastError: string | undefined;
	let lastStderr: string | undefined;

	const handleLine = (line: string, fromStderr: boolean) => {
		if (line.startsWith(PROGRESS)) {
			const percent = parsePercent(line.slice(PROGRESS.length));
			if (percent !== undefined) options.onProgress(percent);
		} else if (line.startsWith(TITLE)) {
			options.onTitle(line.slice(TITLE.length));
		} else if (line.startsWith(FILE)) {
			filePath = line.slice(FILE.length);
		} else if (fromStderr && line.trim()) {
			lastStderr = line.trim();
			if (line.startsWith('ERROR:')) lastError = line.slice('ERROR:'.length).trim();
		}
	};
	createInterface({ input: child.stdout }).on('line', (line) => handleLine(line, false));
	createInterface({ input: child.stderr }).on('line', (line) => handleLine(line, true));

	const exitCode = await new Promise<number | null>((resolve, reject) => {
		child.on('error', reject);
		child.on('close', resolve);
	}).catch((error: NodeJS.ErrnoException) => {
		throw new Error(error.code === 'ENOENT' ? 'yt-dlp is not installed' : error.message);
	});

	if (exitCode !== 0)
		throw new Error(lastError ?? lastStderr ?? `yt-dlp exited with code ${exitCode}`);
	if (!filePath) throw new Error('yt-dlp finished without reporting a file');
	return filePath;
}

function parsePercent(fields: string): number | undefined {
	const [downloaded, total, estimate] = fields.split(' ').map(Number);
	const size = total || estimate;
	if (!downloaded || !size) return undefined;
	return Math.min(100, (downloaded / size) * 100);
}

/**
 * Overrides go into `meta_*` fields so they win over yt-dlp's own tags (e.g. `track` beats `title`).
 * `title` is set too so the filename follows the overridden title.
 */
function overrideArgs({ artist, title, album }: TagOverrides): string[] {
	const fields: [string, string | undefined][] = [
		['title', title],
		['meta_title', title],
		['meta_artist', artist],
		['meta_album_artist', artist],
		['meta_album', album]
	];
	return fields.flatMap(([field, value]) =>
		value === undefined ? [] : ['--parse-metadata', literalParseMetadata(value, field)]
	);
}

// FROM is an output template (so `%` needs doubling) and must not look like a bare field name,
// hence the `#` fences. Colons are escaped because yt-dlp splits FROM:TO on the first bare colon.
function literalParseMetadata(value: string, field: string) {
	const from = `#${value}#`.replaceAll('%', '%%').replaceAll(':', '\\:');
	return `pre_process:${from}:^#(?P<${field}>.+)#$`;
}
