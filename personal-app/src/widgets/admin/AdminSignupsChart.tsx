import { For } from 'solid-js';
import type { AdminSignupByMonth } from '../../entities/admin/types';

interface SignupsChartProps {
	data: AdminSignupByMonth[];
}

export default function AdminSignupsChart(props: SignupsChartProps) {
	const data = props.data;
	const max = Math.max(...data.map((entry) => entry.value));

	return (
		<div class="flex h-48 items-end gap-2 sm:gap-3" role="img" aria-label="Altas por mes de los últimos 8 meses">
			<For each={data}>
				{(entry, index) => {
					const isNewest = index() === data.length - 1;
					return (
						<div class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
							<p class-list={['text-xs', isNewest ? 'font-semibold text-aka' : 'text-muted-foreground']}>{entry.value}</p>
							<div
								class-list={['w-full rounded-t-[4px] transition-opacity', isNewest ? 'bg-aka' : 'bg-aka/20']}
								style={{ height: `${(entry.value / max) * 92}%` }}
							/>
							<p class="font-mono text-[10px] tracking-wider text-muted-foreground">{entry.month}</p>
						</div>
					);
				}}
			</For>
		</div>
	);
}
