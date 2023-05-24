/**
* Return an object picking the keys to include in the new object
* @param {Object} input The input object to modify
* @param {Function} picker Function called as `(v, k)` to decide whether to pick each key
* @returns {Object} A shallow copy of the input object with the omitted fields omitted
* @url https://github.com/MomsFriendlyDevCo/Nodash
*/
export function pickBy(input, picker) {
	return Object.entries(input).reduce((acc, [key, val]) => {
		if (picker(val, key)) acc[key] = val;
		return acc;
	}, {});
}
