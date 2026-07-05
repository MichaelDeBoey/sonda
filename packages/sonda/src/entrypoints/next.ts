import { styleText } from 'util';
import { SondaWebpackPlugin, Config, type UserOptions } from 'sonda';
import type { NextConfig } from 'next';

let turbopackWarningShown = false;

export default function SondaNextPlugin(userOptions: UserOptions = {}) {
	return function Sonda(nextConfig: NextConfig = {}): NextConfig {
		const options = new Config(userOptions, {
			integration: 'next',
			filename: 'sonda_[env]_[index]'
		});

		if (!options.enabled) {
			return nextConfig;
		}

		warnIfTurbopackIsUsed();

		return Object.assign({}, nextConfig, {
			webpack(config, { nextRuntime, isServer }) {
				const env = nextRuntime || 'client';

				// Do not generate report for...
				if (
					// ... the `edge` build because none of its files have source maps
					env === 'edge' ||
					// ... the server build unless explicitly enabled
					(isServer && !options.server)
				) {
					return config;
				}

				// Because this configuration is shared between multiple builds, we need to clone it
				const sondaOptions = options.clone();

				// Replace the "[env]" token with the current build type
				sondaOptions.filename = sondaOptions.filename!.replace('[env]', env);

				// Add the Sonda plugin to the Webpack configuration
				config.plugins.push(new SondaWebpackPlugin(sondaOptions));

				return config;
			}
		} satisfies NextConfig);
	};
}

function warnIfTurbopackIsUsed(): void {
	const args = process.argv.slice(2);

	if (turbopackWarningShown || !args.includes('build') || args.includes('--webpack')) {
		return;
	}

	turbopackWarningShown = true;

	console.warn(
		styleText(
			'red',
			'Sonda does not support Next.js builds with Turbopack yet. Run `next build --webpack` to generate Sonda reports.'
		)
	);
}
