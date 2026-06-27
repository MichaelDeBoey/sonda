import type { Connection, Dependency, Issue } from '../types.js';

const MAX_CIRCULAR_IMPORT_ISSUES = 100;
const IMPORT_CONNECTION_KINDS = new Set<Connection['kind']>(['import', 'require', 'dynamic-import']);

type Graph = Map<string, Array<string>>;

/**
 * Finds common issues in the report data.
 */
export function updateIssues(dependencies: Array<Dependency>, connections: Array<Connection>): Array<Issue> {
	return [...findDuplicatedDependencies(dependencies), ...findCircularImports(connections)];
}

function findDuplicatedDependencies(dependencies: Array<Dependency>): Array<Issue> {
	return dependencies
		.filter(dependency => dependency.paths.length > 1)
		.map(dependency => ({
			type: 'duplicated-dependency',
			severity: 'warning',
			message: `Dependency "${dependency.name}" appears to be bundled from multiple paths.`,
			data: {
				name: dependency.name,
				paths: dependency.paths
			}
		}));
}

function findCircularImports(connections: Array<Connection>): Array<Issue> {
	const graph = createImportGraph(connections);
	const stronglyConnectedComponents = findStronglyConnectedComponents(graph)
		.filter(component => component.length > 1 || hasSelfReference(graph, component[0]!))
		.toSorted(compareComponents);

	return stronglyConnectedComponents.slice(0, MAX_CIRCULAR_IMPORT_ISSUES).map(component => {
		const cycle = findCycleInComponent(graph, component);

		return {
			type: 'circular-import',
			severity: 'warning',
			message: `Circular import detected between ${cycle.length - 1} modules.`,
			data: { cycle }
		};
	});
}

function createImportGraph(connections: Array<Connection>): Graph {
	const graph = new Map<string, Set<string>>();

	for (const connection of connections) {
		if (!IMPORT_CONNECTION_KINDS.has(connection.kind)) {
			continue;
		}

		const targets = graph.get(connection.source) ?? new Set<string>();
		targets.add(connection.target);
		graph.set(connection.source, targets);

		if (!graph.has(connection.target)) {
			graph.set(connection.target, new Set());
		}
	}

	return new Map([...graph].map(([node, targets]) => [node, [...targets].toSorted()]));
}

function findStronglyConnectedComponents(graph: Graph): Array<Array<string>> {
	let index = 0;
	const stack: Array<string> = [];
	const indexes = new Map<string, number>();
	const lowLinks = new Map<string, number>();
	const stacked = new Set<string>();
	const components: Array<Array<string>> = [];

	function visit(node: string): void {
		indexes.set(node, index);
		lowLinks.set(node, index);
		index++;
		stack.push(node);
		stacked.add(node);

		for (const next of graph.get(node) ?? []) {
			if (!indexes.has(next)) {
				visit(next);
				lowLinks.set(node, Math.min(lowLinks.get(node)!, lowLinks.get(next)!));
			} else if (stacked.has(next)) {
				lowLinks.set(node, Math.min(lowLinks.get(node)!, indexes.get(next)!));
			}
		}

		if (lowLinks.get(node) !== indexes.get(node)) {
			return;
		}

		const component: Array<string> = [];
		let current: string | undefined;

		do {
			current = stack.pop();

			if (current === undefined) {
				break;
			}

			stacked.delete(current);
			component.push(current);
		} while (current !== node);

		components.push(component.toSorted());
	}

	for (const node of [...graph.keys()].toSorted()) {
		if (!indexes.has(node)) {
			visit(node);
		}
	}

	return components;
}

function findCycleInComponent(graph: Graph, component: Array<string>): Array<string> {
	const nodes = new Set(component);
	const start = component[0]!;

	if (hasSelfReference(graph, start)) {
		return [start, start];
	}

	for (const next of graph.get(start) ?? []) {
		if (!nodes.has(next)) {
			continue;
		}

		const path = findPath(graph, next, start, nodes);

		if (path) {
			return [start, ...path];
		}
	}

	return [start, start];
}

function findPath(graph: Graph, source: string, target: string, allowedNodes: Set<string>): Array<string> | null {
	const queue = [source];
	const visited = new Set([source]);
	const previous = new Map<string, string>();

	for (let index = 0; index < queue.length; index++) {
		const current = queue[index]!;

		if (current === target) {
			return reconstructPath(previous, source, target);
		}

		for (const next of graph.get(current) ?? []) {
			if (!allowedNodes.has(next) || visited.has(next)) {
				continue;
			}

			visited.add(next);
			previous.set(next, current);
			queue.push(next);
		}
	}

	return null;
}

function reconstructPath(previous: Map<string, string>, source: string, target: string): Array<string> {
	const path = [target];
	let current = target;

	while (current !== source) {
		current = previous.get(current)!;
		path.push(current);
	}

	return path.reverse();
}

function hasSelfReference(graph: Graph, node: string): boolean {
	return graph.get(node)?.includes(node) ?? false;
}

function compareComponents(a: Array<string>, b: Array<string>): number {
	return a[0]! < b[0]! ? -1 : Number(a[0]! > b[0]!);
}
