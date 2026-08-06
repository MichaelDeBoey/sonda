import { SondaVitePlugin, Config, type UserOptions } from 'sonda';
import type { AstroIntegration } from 'astro';

export default function SondaAstroPlugin(userOptions: UserOptions = {}): AstroIntegration {
	const options = new Config(userOptions, {
		integration: 'astro',
		filename: 'sonda_[env]_[index]'
	});
	let buildOutput: 'static' | 'server';

	if (!options.enabled) {
		return { name: 'sonda/astro', hooks: {} };
	}

	return {
		name: 'sonda/astro',
		hooks: {
			'astro:config:done'({ buildOutput: output }) {
				buildOutput = output;
			},

			'astro:build:setup'({ updateConfig }) {
				updateConfig({
					plugins: [
						{
							name: 'sonda/astro',
							applyToEnvironment(environment) {
								const isClient = environment.name === 'client';
								const isServer = environment.name === 'ssr' && buildOutput === 'server' && options.server;

								if (!isClient && !isServer) {
									return false;
								}

								// Because this configuration is shared between multiple builds, we need to clone it
								const sondaOptions = options.clone();

								// Replace the "[env]" token with the current build type
								sondaOptions.filename = sondaOptions.filename.replace('[env]', isClient ? 'client' : 'server');

								return {
									...SondaVitePlugin(sondaOptions),
									name: 'sonda/astro'
								};
							}
						}
					]
				});
			}
		}
	};
}
