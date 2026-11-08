function task(id: string, title: string, fields: string, links = "") {
	return `---\nid: ${id}\nkind: task\n${fields}\nrelationships:\n - kind: implements\n   target: project.launch\n${links}---\n# ${title}`;
}

export const launchFiles = {
	"ask.md":
		"---\nid: decision.scope\nkind: question\nscope: task\nurgency: whenever\noptions:\n - label: Ship\n   description: Launch this week\n - label: Wait\n   description: Launch next month\nrecommended: Ship\nattention:\n - id: direction\n   kind: decision\n   state: open\n   response_from: [maintainer]\n   reason: Choose the launch scope\n   unblocks: [task.asked]\n---\n# Launch scope",
	"asked.md": task("task.asked", "Pick the scope", "status: ready\nfleet: approved"),
	"blocked.md": task("task.blocked", "Ship after the page", "status: ready\nfleet: approved", " - kind: depends_on\n   target: task.build#proof\n"),
	"build.md":
		"---\nid: task.build\nkind: task\nstatus: working\nowner: claude\nfleet: approved\ncriteria:\n - id: proof\n   text: Show the page\nrelationships:\n - kind: implements\n   target: project.launch#page\n---\n# Build the page",
	"done.md": task("task.done", "Write the plan", "status: done"),
	"goal.md": "---\nid: project.launch\nkind: goal\nstatus: draft\ncriteria:\n - id: page\n   text: A page exists\n---\n# Launch",
	"held.md": task("task.held", "Wait for a person", "status: ready\nfleet: held"),
	"wire.md": task("task.wire", "Wire the form", "status: ready\nowner: claude\nfleet: approved", " - kind: depends_on\n   target: task.done\n"),
};
