import axiosGlobal from 'axios';
import inject from '#lib/inject';

let axios = axiosGlobal.create();
inject(axios);

export default axios;
