import type { RenderElement } from "claude-code";
import type { WorkboardTask } from "#types/index.d.ts";
import { clip } from "./lines.ts";
import type { Table } from "./pane.tsx";
import { type TaskGroup, taskGroups } from "./summary.ts";

const OTHER = "Other";

export function taskRows(t: Table, tasks: WorkboardTask[], columns: number): RenderElement {
	const { Box } = t;
	return (
		<Box flexDirection="column" gap={1}>
			{taskGroups(tasks).map((group) => taskGroup(t, group, columns))}
		</Box>
	);
}

function taskGroup(t: Table, group: TaskGroup, columns: number): RenderElement {
	const { Box, Text } = t;
	return (
		<Box flexDirection="column" key={`group:${group.goal?.id ?? OTHER}`}>
			<Text weight="semibold" wrap="truncate-end">
				{clip(group.goal?.title ?? OTHER, columns)}
			</Text>
			{group.items.map((task) => taskRow(t, task, columns))}
		</Box>
	);
}

function taskRow(t: Table, task: WorkboardTask, columns: number): RenderElement {
	const { Box, Text } = t;
	const owner =
		task.owner === null ? null : (
			<Text dimColor size="footnote">
				{task.owner}
			</Text>
		);
	return (
		<Box flexDirection="row" gap={1} key={`task:${task.id}`}>
			<Box flexShrink={0} width={1} />
			<Box flexGrow={1} flexShrink={1} width={0}>
				<Text wrap="truncate-end">{clip(task.title, columns - 2 - (task.owner === null ? 0 : task.owner.length + 1))}</Text>
			</Box>
			{owner}
		</Box>
	);
}
