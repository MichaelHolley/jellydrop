<script lang="ts">
	type Tone = 'idle' | 'active' | 'done' | 'failed';

	let { seed, progress = 0, tone }: { seed: string; progress?: number; tone: Tone } = $props();

	const BAR_COUNT = 56;
	const BAR_PITCH = 4;
	const HEIGHT = 24;

	const heights = $derived(barHeights(seed));
	const filledBars = $derived(tone === 'idle' ? 0 : Math.round((progress / 100) * BAR_COUNT));

	const fillClass = {
		idle: 'fill-plum-700',
		active: 'fill-amber',
		done: 'fill-mint',
		failed: 'fill-coral/70'
	} satisfies Record<Tone, string>;

	// Seeded from the job id so each job keeps its own recognisable shape across updates
	function barHeights(seed: string) {
		let state =
			[...seed].reduce(
				(hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619),
				2166136261
			) >>> 0 || 1;
		const random = () => {
			state ^= state << 13;
			state ^= state >>> 17;
			state ^= state << 5;
			return (state >>> 0) / 4294967296;
		};
		return Array.from({ length: BAR_COUNT }, (_, i) => {
			const envelope = Math.sin((Math.PI * (i + 0.5)) / BAR_COUNT) ** 0.6;
			return 0.16 + 0.84 * envelope * (0.3 + 0.7 * random());
		});
	}
</script>

<svg
	viewBox="0 0 {BAR_COUNT * BAR_PITCH} {HEIGHT}"
	preserveAspectRatio="none"
	class="block h-7 w-full"
	aria-hidden="true"
>
	{#each heights as height, i (i)}
		<rect
			x={i * BAR_PITCH}
			y={(HEIGHT - height * HEIGHT) / 2}
			width={BAR_PITCH * 0.6}
			height={height * HEIGHT}
			rx="1.2"
			class={[
				'motion-safe:transition-[fill] motion-safe:duration-300',
				i < filledBars ? fillClass[tone] : 'fill-plum-800'
			]}
		/>
	{/each}
</svg>
