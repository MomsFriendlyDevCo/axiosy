import AxiosError from '#lib/axiosError';
import Debug from 'debug';
import Logger from '@momsfriendlydevco/debug';
import * as rax from 'retry-axios';
import {path as tempPath} from 'temp';
import {pickBy} from '#lib/objUtils';
import {writeFile} from 'node:fs/promises';

let debug = Debug('axiosy');

export let axiosyDefaults = {
	debugMode: { // Apply this structure if debug.enabled
		debug: true,
		log: {
			request: true,
			response: true,
		},
	},
	log: { // The following are assumed on any AxiosRequest
		request: true,
		response: false,
	},
	debug: { // The following are assumed if AxiosRequest.debug is truthy but is not an object
		request: true,
		requestPath(req) {
			return tempPath({
				prefix: `axios-${req.method}-${req.debug.formatUrl(req.url)}-req-`,
				suffix: '.json',
			});
		},
		requestFormat(req) {
			return pickBy(req, (v, k) => !/^(_|\$)/.test(k));
		},

		autoEnableLogResponse: true,
		response: true,
		responsePath(res) {
			let req = res.config;
			return tempPath({
				prefix: `axios-${req.method}-${req.debug.formatUrl(req.url)}-res-`,
				suffix: '.json',
			});
		},
		responseFormat(res) {
			return {
				request: {
					method: res.config.method,
					url: res.config.url,
					params: res.config.params,
					headers: res.config.headers,
				},
				...pickBy(res, (v, k) => // Truncated version of res object
					!/^(config|request)$/.test(k)
					&& !/^(_|\$)/.test(k)
				),
			};
		},

		formatter(obj) {
			return JSON.stringify(obj, null, '\t');
		},
		formatUrl(url) {
			return url
				.replace(/^https?:\/\//, '')
				.replace(/\/$/, '')
				.replace(/\//g, '-');
		},
	},
};

/**
* Mutates the global Axios instance:
* - Outgoing request logging is enabled
* - Automatic wrapping of errors into the AxiosError class - fixes weird output, tidies up console reporting + general toObject() sanity
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
	* Add additional behvaiour to the Axios request object
	*
	*  - Make Axios log when its making a request (if AxiosRequest.log)
	*  - Add disk logging (if AxiosRequest.debug)
	*
	*/
	instance.interceptors.request.use(req => {
		// Extend booleans into object specs if given {{{
		// Process.env / Debug mode
		if (debug.enabled) Object.assign(req, axiosyDefaults.debugMode);

		// Convert simple "true" values into their object expandos
		if (req.debug === true) req.debug = axiosyDefaults.debug;
		if (req.log === true) req.log = axiosyDefaults.log;

		// Apply combined behaviours
		if (req.debug?.response && req.debug?.autoEnableLogResponse) req.log.response = true;
		// }}}

		// Disk logging - compute path {{{
		let debugWritePath;

		// Compute write path
		if (req.debug?.request) debugWritePath = req.debug.requestPath(req);
		// }}}

		// Log request output {{{
		if (req.log?.request) {
			let params = Object.entries(req?.params ?? {})
				.filter(([key]) => !/(auth|key|pass)/i.test(key))
				.map(([key, val]) => log.colors.dim(`${key}=${val}`));

			log(
				'Request',
				log.colors.blue(req.method.toUpperCase()),
				log.colors.cyan(req.url),
				...(params.length > 0
					? [
						log.colors.dim('?'),
						params.join(log.colors.gray('&')),
					] : []
				),
			);
			if (debugWritePath)
				log(
					'       ',
					log.colors.blueBright('-->'),
					log.colors.cyan(debugWritePath),
				);
		}
		// }}}

		// Write request to disk (in background) {{{
		if (debugWritePath)
			writeFile(debugWritePath, req.debug.formatter(req.debug.requestFormat(req)));
		// }}}

		return req;
	});


	/**
	* Add additional behvaiour to the Axios response object
	*
	*  - Make Axios log when its receieved a response
	*  - Add disk logging (if AxiosRequest.debug)
	*
	*/
	instance.interceptors.response.use(res => {
		let req = res.config; // NOTE that we have to use `config` and not `request` as thats Axios' own mangled version of the request

		// Disk loggging - compute path {{{
		let debugWritePath;
		if (req.debug?.response) debugWritePath = req.debug.responsePath(res)
		// }}}

		// Log response output {{{
		if (req.log?.response) {
			let params = Object.entries(res?.params ?? {})
				.filter(([key]) => !/(auth|key|pass)/i.test(key))
				.map(([key, val]) => log.colors.dim(`${key}=${val}`));

			log(
				'Response',
				log.colors.blue(req.method.toUpperCase()),
				log.colors.cyan(req.url),
				...(params.length > 0
					? [
						log.colors.dim('?'),
						params.join(log.colors.gray('&')),
					] : []
				),
				res.status >= 200 && res.status < 300 ? log.colors.bold.green(res.status)
					: res.status >= 300 && res.status < 400 ? log.colors.yellow(res.status)
					: log.colors.bold.red(res.status),
			);
			if (debugWritePath)
				log(
					'       ',
					log.colors.blueBright('<--'),
					log.colors.cyan(debugWritePath),
				);
		}
		// }}}

		// Write request to disk (in background, if AxiosRequest.debug) {{{
		if (debugWritePath)
			writeFile(debugWritePath, req.debug.formatter(req.debug.responseFormat(res)));
		// }}}

		return res;
	});


	// Set default options
	instance.defaults.log = true;
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
