import AxiosError from '#lib/axiosError';
import Logger from '@momsfriendlydevco/debug';
import * as rax from 'retry-axios';

/**
* Mutates the global Axios instance:
* - Outgoing request logging is enabled
* - Automatic wrappiong of errors into the AxiosError class - fixes weird output, tidies up console reporting + general toObject() sanity
* - Axios+Axios-retry is the default invocation
*
* @param {Axios} [instance=axios] A local Axios instance to inject. If omitted the global `axios` instance is mutated instead
* @returns {Axios} The mutated (or global) Axios instance
*/
export default function inject(instance) {
	let log = new Logger('Axios');

	/**
	* Set various Axios settings so they are more predictable and less irritating
	*/


	/**
	* Make axios announce when its making a request
	*/
	instance.interceptors.request.use(config => {
		let params = Object.entries(config?.params ?? {})
			.filter(([key]) => !/(auth|key|pass)/i.test(key))
			.map(([key, val]) => log.colors.dim(`${key}=${val}`));

		log(
			'Request',
			log.colors.blue(config.method.toUpperCase()),
			log.colors.cyan(config.url),
			...(params.length > 0
				? [
					log.colors.dim('?'),
					params.join(log.colors.gray('&')),
				] : []
			),
		)
		return config;
	});


	// Set default options
	instance.defaults.raxConfig = {
		instance,
		retry: 5, // Retry 5 times on requests that return a response (500, etc) before giving up.  Defaults to 3.
		noResponseRetries: 5, // Retry 5 times on errors that don't return a response (ENOTFOUND, ETIMEDOUT, etc).
		statusCodesToRetry: [[100, 199], [400, 499], [500, 599]], // Retry everything except 2?? (OK), 3?? (redirect) codes
		backoffType: 'exponential',
		onRetryAttempt(err) {
			let raxCfg = rax.getConfig(err);
			log.warn(log.colors.yellow('RETRY'), log.colors.cyan(`#${raxCfg.currentRetryAttempt}/${raxCfg.retry}`), log.colors.blue(err.config.method.toUpperCase() || 'GET'), log.colors.cyan(err.config.url));
		},
		shouldRetry(err) {
			let raxCfg = rax.getConfig(err);
			if (raxCfg.currentRetryAttempt >= raxCfg.retry) return false // Ensure max retries is always respected

			// Handle the request based on your other config options, e.g. `statusCodesToRetry`
			return rax.shouldRetryRequest(err)
		}
	};

	// Glue Retry-Axios into the global object
	rax.attach(instance);

	// Monkey patch Axios so that any error messages are sane rather than printing the entire Axios object
	instance.interceptors.response.use(response => response, err => {
		if (err instanceof AxiosError) { // Already an AxiosError instance - just throw it
			throw err;
		} else { // Wrap generic Axios output into an AxiosError instance
			throw new AxiosError(err)
		}
	});

	return instance;
}
