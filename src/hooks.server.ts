import type { ServerInit } from '@sveltejs/kit/hooks';
import { getConfig } from '#lib/server/config.js';
import { resetStaging } from '#lib/server/queue.js';

export const init: ServerInit = async () => {
	getConfig();
	await resetStaging();
};
