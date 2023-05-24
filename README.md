@MomsFriendlyDevCo/Axiosy
=========================
A simple wrapper around Axios which adds some additional features:

* Auto-retry on all outgoing requests - configure further by setting [raxConfig](https://github.com/JustinBeckwith/retry-axios#usage)
* Simple logging for outgoing, retry and errored requests via [@MomsFriendlyDevCo/Debug](https://github.com/MomsFriendlyDevCo/Debug)
* New error reporting class `AxiosError` which includes (sane) error reporting + doesn't spew a giant recursive object to the console if you just log it
* Log request / response to disk with a simple boolean


Usage
-----
This module mutates the global Axios instance so it needs to be included once to function.


### Method #0 - Update package.json to hot swap `axios` for this NPM
```json
{
  ...
  "imports": {
    "axios": "@momsfriendlydevco/axiosy"
   },
  ...
}
```


### Method #1 - Inject into global Axios instance
```javascript
import axios from 'axios';
import {inject} from '@momsfriendlydevco/axiosy';

inject(); // Inject into global object

// Can now use `Axios` with above features
```


### Method #2 - Use the packages, already injected version of Axios
```javascript
import axios from '@momsfriendlydevco/axiosy';

// Can now use `Axios` with above features
```


### Method #3 - Inject into a instanced version of Axios
```javascript
import axios from 'axios';
import {inject} from '@momsfriendlydevco/axiosy';

let myAxios = inject(axios.create()); // Add to instanced object

// myAxios is now a private, injected version of Axios
```

API
===
This library follows the default Axios [Request](https://axios-http.com/docs/req_config) schema and returns the default Axios [Response](https://axios-http.com/docs/res_schema) except for the following additions.

AxiosRequest.log
----------------
Log the outgoing request to the console.
Enabled by default. Set to falsy to disable.
If truhty (but not an object), will default to the following options:

| Option     | Type      | Default | Description              |
|------------|-----------|---------|--------------------------|
| `request`  | `Boolean` | `true`  | Log requests to console  |
| `response` | `Boolean` | `false` | Log responses to console |



AxiosRequest.debug
------------------
Write the request / response objects to disk for this request.
This can be a simple `true` to enable both behaiours (which uses all defaults) or an object containing any of the following:

| Option           | Type       | Default | Description                                                                                                          |
|------------------|------------|---------|----------------------------------------------------------------------------------------------------------------------|
| `request`        | `Boolean`  | `true`  | Write the request to disk                                                                                            |
| `requestPath`    | `Function` |         | Where to store the request, called as `(request)`. Default is to store in OS temp directory + some request details   |
| `requestFormat`  | `Function` |         | Mutate the incoming raw AxiosRequest before saving. Called as `(AxiosRequest)`                                       |
| `response`       | `Boolean`  | `true`  | Write the response to disk                                                                                           |
| `responsePath`   | `Function` |         | Where to store the response, called as `(response)`. Default is to store in OS temp directory + some request details |
| `responseFormat` | `Function` |         | Mutate the incoming raw AxiosResponse before saving. Called as `(AxiosResponse)`                                     |
| `formatter`      | `Function` |         | Geneal JSON to string formatter, defaults to tabbed output                                                           |


AxiosRequest.raxConfig
----------------------
[Axios-Retry](https://github.com/JustinBeckwith/retry-axios) options.

These default to the following unless overridden per-request or by editing `AxiosInstance.defaults.raxConfig`.

```javascript
instance.defaults.raxConfig = {
  retry: 5, // Retry 5 times on requests that return a response (500, etc) before giving up.  Defaults to 3.
  noResponseRetries: 5, // Retry 5 times on errors that don't return a response (ENOTFOUND, ETIMEDOUT, etc).
  statusCodesToRetry: [[100, 199], [400, 499], [500, 599]], // Retry everything except 2?? (OK), 3?? (redirect) codes
  backoffType: 'exponential',
};
```
