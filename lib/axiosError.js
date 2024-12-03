import util from 'node:util';

export default class AxiosError extends Error {
	/**
	* The original request URL, computed from the AxiosRequest object
	* @type {string}
	*/
	url;


	constructor(axiosError, ...params) {
		super(`Axios Error Code ${axiosError.response?.status || 'NOCODE'}`, ...params); // Pass remaining arguments (including vendor specific ones) to parent constructor

		this.axiosError = axiosError;
		this.name = 'AxiosError'; // Name for console reporting
		this.url = this.axiosError.request
			? this.axiosError.request?.url || this.axiosError.request.protocol + '//' + this.axiosError.request.host + this.axiosError.request.path
			: 'PRE-REQUEST';
	}


	/**
	* Override the custom inspect function so that any use of console.log(AxiosError) prints a simple response rather than a full Axios recursive object
	*/
	[util.inspect.custom]() {
		let errorText = this.toString();
		console.trace(errorText);
		return errorText;
	}


	/**
	* Return a human readable reason why the Axios request failed
	* @returns {string}
	*/
	toString() {
		return isFinite(this.axiosError?.response?.status) && this.axiosError.response.status >= 400
			? `Code ${this.axiosError.response.status} from ${this.url}`
			: this.axiosError.toString();
	}


	/**
	* Provide a simple method which returns a readable error object for debugging purposes
	* This is used by toJSON() to return a legible error object that doesn't give away anything security related - or too much data
	*/
	toObject() {
		return {
			error: this.toString(),
			request: {
				url: this.url,
				params: this.axiosError.request.params,
				headers: this.axiosError.request.headers,
			},
			response: {
				status: this.axiosError.response.status,
				data: this.axiosError.response?.data || this.axiosError.response?.text,
			},
		}
	}


	/**
	* Override the custom handler used by JSON.stringify() - and things that use it like express.Response.send()
	*/
	toJSON() {
		return this.toObject();
	}
}
