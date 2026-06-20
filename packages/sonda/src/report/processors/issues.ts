import type { Dependency, Issue } from '../types.js';

/**
 * Finds common issues in the report data.
 */
export function updateIssues(dependencies: Array<Dependency>): Array<Issue> {
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
