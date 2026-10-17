interface OccupancyDonutProps {
	percent: number;
}

export default function AdminOccupancyDonut(props: OccupancyDonutProps) {
	const percent = props.percent;
	const RADIUS = 54;
	const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
	const drawn = (percent / 100) * CIRCUMFERENCE;

	return (
		<svg viewBox="0 0 130 130" class="size-36 shrink-0" role="img" aria-label={`Ocupación de slots: ${percent}%`}>
			<circle cx="65" cy="65" r={RADIUS} fill="none" stroke="var(--aka)" stroke-opacity="0.15" stroke-width="10" />
			<circle
				cx="65"
				cy="65"
				r={RADIUS}
				fill="none"
				stroke="var(--aka)"
				stroke-width="10"
				stroke-linecap="round"
				stroke-dasharray={`${drawn.toFixed(1)} ${CIRCUMFERENCE.toFixed(1)}`}
				transform="rotate(-90 65 65)"
			/>
			<text x="65" y="71" text-anchor="middle" class="fill-foreground font-mono font-semibold" font-size="22">
				{percent}%
			</text>
		</svg>
	);
}
