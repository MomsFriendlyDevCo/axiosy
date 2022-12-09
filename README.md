@MomsFriendlyDevCo/Axiosy
=========================
A simple wrapper around Axios which adds some additional features:

* Auto-retry on all outgoing requests - configure further by setting [raxConfig](https://github.com/JustinBeckwith/retry-axios#usage)
* Simple logging for outgoing, retry and errored requests via [@MomsFriendlyDevCo/Debug](https://github.com/MomsFriendlyDevCo/Debug)
* New error reporting class `AxiosError` which includes (sane) error reporting + doesn't spew a giant recursive object to the console if you just log it


Usage
-----
This module mutates the global Axios instance so it needs to be included once to function.

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
