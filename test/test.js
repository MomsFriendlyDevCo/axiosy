import axios from '#lib/axios';
import {expect} from 'chai';
import express from 'express';
import expressLogger from 'express-log-url';

const port = 8181;
const url = `http://localhost:${port}`;

describe('@MomsFriendlyDevCo/Axiosy', ()=> {

	// Server setup {{{
	let server;
	let hitCount = 1;
	before('setup a server', function(finish) {
		var app = express();
		app.use(expressLogger);
		app.set('log.indent', '      ');
		app.get('/api/timeout', ()=> {}); // Intentionally hang
		app.get('/api/faulty', (req, res) => { // Respond to 2 in 3 requests with 408
			res.sendStatus(((hitCount++ % 3) == 0)
				? 200
				: 408
			);
		});
		server = app.listen(port, null, finish);
	});
	after(()=> server && server.close());
	// }}}

	before('setup quicker timeouts', ()=> {
		axios.defaults.raxConfig.backoffType = 'static';
		axios.defaults.raxConfig.retryDelay = 100;
		axios.defaults.timeout = 1000;
	});

	it('should be a basic axios object', ()=> {
		expect(axios).to.be.a('function');
		expect(axios).to.have.keys("create", "defaults", "delete", "get", "getUri", "head", "interceptors", "options", "patch", "patchForm", "post", "postForm", "put", "putForm", "request");
	});

	it('should try to access a non-existant URL', function(done) {
		axios.get('http://0.0.0.0:666')
			.then(()=> expect.fail)
			.catch(()=> done())
	});

	it('should try to access a endpoint that times out', function(done) {
		this.timeout(60 * 1000);
		axios.get(`${url}/api/timeout`)
			.then(()=> expect.fail)
			.catch(()=> done())
	});

	it('should try to access a misbehaving endpoint', function(done) {
		this.timeout(60 * 1000)
		axios.get(`${url}/api/faulty`)
			.then(()=> done())
			.catch(e => done(e))
	});

});
