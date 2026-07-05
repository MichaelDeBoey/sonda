import { mkdirSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { updateDependencies } from '../src/report/processors/dependencies.js';
import type { Report } from '../src/report/report.js';

const toDistPath = (...path: Array<string>) => join(import.meta.dirname, 'dist', ...path);
const createReport = (resources: Array<string>) =>
	({
		resources: resources.map(name => ({ name }))
	}) as unknown as Report;

describe('updateDependencies', () => {
	it('keeps distinct package paths for the same package name', () => {
		const appPath = toDistPath('app', 'node_modules', 'foo');
		const vendorPath = toDistPath('vendor', 'node_modules', 'foo');

		mkdirSync(appPath, { recursive: true });
		mkdirSync(vendorPath, { recursive: true });

		expect(
			updateDependencies(
				createReport(['tests/dist/app/node_modules/foo/index.js', 'tests/dist/vendor/node_modules/foo/index.js'])
			)
		).toEqual([
			{
				name: 'foo',
				paths: ['tests/dist/app/node_modules/foo', 'tests/dist/vendor/node_modules/foo']
			}
		]);
	});

	it('ignores package paths that do not exist', () => {
		expect(updateDependencies(createReport(['tests/dist/missing/node_modules/foo/index.js']))).toEqual([]);
	});
});
