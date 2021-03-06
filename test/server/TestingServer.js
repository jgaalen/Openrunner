'use strict';
/* eslint-env node */
const os = require('os');
const {assert} = require('chai');
const Promise = require('bluebird');
const express = require('express');
const http = require('http');
const https = require('https');
const serveIndex = require('serve-index');
const Throttle = require('throttle');
const {resolve: pathResolve} = require('path');
const {stat, createReadStream, readFile} = require('fs-extra');
const mime = require('mime');
const morgan = require('morgan');
const jsonHtmlify = require('htmlescape');

const log = require('../../lib/logger')({pid: process.pid, hostname: os.hostname(), MODULE: 'TestingServer'});
const {CnCServer} = require('../..');

const STATIC_CONTENT_PATH = pathResolve(__dirname, './static');
const TLS_PRIVATE_KEY_PATH = pathResolve(__dirname, './tls/private.key');
const TLS_CA_UNTRUSTED_ROOT_CERT = pathResolve(__dirname, './tls/ca-untrusted-root.crt');
const HTTP_SOCKET_KEEPALIVE = 10 * 1000;
const DEFAULT_HTTP_TIMEOUT = 30 * 1000;

class TestingServer {
    constructor({listenHost = 'localhost', listenPort = 0, badTLSListenPort = -1}) {
        this.configuredListenHost = listenHost;
        this.configuredListenPort = listenPort;
        this.configuredbadTLSListenPort = badTLSListenPort;
        this.expressApp = null;
        this.httpServer = null;
        this.cncServer = null;
    }

    async start() {
        log.info('Starting...');

        const app = express();
        this.expressApp = app;

        app.set('x-powered-by', false);
        app.use(morgan('dev'));

        /**
         * Supported query parameters:
         *
         * waitBeforeResponse - Wait this many milliseconds before sending a response
         * noCache - Send no cache headers
         * bytesPerSecond - Throttle the response streaming of static files (in bytes per second)
         */

        app.use((request, response, next) => {
            if (request.query.waitBeforeResponse) {
                setTimeout(() => next(), Number(request.query.waitBeforeResponse));
            }
            else {
                next();
            }
        });

        app.use((request, response, next) => {
            if ('noCache' in request.query) {
                response.set('Cache-Control', 'no-cache, no-store, must-revalidate'); // HTTP 1.1.
                response.set('Pragma', 'no-cache'); // HTTP 1.0.
                response.set('Expires', '0'); // Proxies.
            }
            next();
        });

        app.get('/', (request, response) => {
            response.status(404).send(`<a href="/static">Interesting stuff is at /static`);
        });

        app.get('/static/*', (request, response, next) => {
            const path = pathResolve(STATIC_CONTENT_PATH, './' + request.path.substr('/static/'.length));

            if (!path.startsWith(STATIC_CONTENT_PATH)) {
                throw Error('Invalid request.path');
            }

            stat(path).then(stats => {
                if (!stats.isFile()) {
                    next();
                    return;
                }

                response.setHeader('Content-Type', mime.getType(path));

                const readStream = createReadStream(path);

                if (request.query.bytesPerSecond) {
                    readStream.pipe(new Throttle({
                        bps: Number(request.query.bytesPerSecond),
                    })).pipe(response);
                }
                else {
                    readStream.pipe(response);
                }

            })
            .catch(error => (error.code === 'ENOENT' ? next() : next(error)));
        });
        app.use('/static', serveIndex(STATIC_CONTENT_PATH, {icons: true}));

        app.get('/404', (request, response) => {
            response.status(404).type('txt').send('Thing not found!');
        });

        app.get('/empty', (request, response) => {
            response.status(200).type('txt').send('');
        });

        app.get('/no-reply', (request, response) => {
            // do not send a response
        });

        app.get('/unexpected-close', (request, response) => {
            response.socket.destroy();
        });

        app.get('/redirect/307', (request, response) => {
            response.redirect(307, request.query.url);
        });

        app.get('/redirect/html', (request, response) => {
            response.status(200);
            response.type('html');
            response.send(`<!DOCTYPE html>
<html>
    <head>
        <title>JavaScript Redirect</title>
        <script>location.replace(${jsonHtmlify(request.query.url || '')})</script>
    </head>
    <body>
        <p>Bye!</p>
    </body>
</html>
            `);
        });

        app.get('/headers/json', (request, response) => {
            response.status(200);
            response.header('X-Foo', 'Value for the X-Foo Header');
            response.header('X-Bar', 'Value for the X-Bar Header');
            response.json({headers: request.headers});
        });

        app.get('/headers/html', (request, response) => {
            response.status(200);
            response.header('X-Foo', 'Value for the X-Foo Header');
            response.header('X-Bar', 'Value for the X-Bar Header');
            response.type('html');
            response.send(`<!DOCTYPE html>
<html>
    <head>
        <title>Headers</title>
        <script>window.requestHeaders = ${jsonHtmlify(request.headers)}</script>
    </head>
    <body>
        <pre id="requestHeadersDisplay"></pre>
        <script>requestHeadersDisplay.textContent = JSON.stringify(requestHeaders, null, 2)</script>
    </body>
</html>
            `);
        });

        app.use((request, response) => {
            response.status(404).send('Thing not found!');
        });

        app.use((err, request, response, next) => {
            log.error({err}, 'Error during express route');
            response.status(500).send('Something broke!');
        });

        this.httpServer = http.createServer(app);
        this.httpServer.on('connection', socket => {
            socket.setKeepAlive(true, HTTP_SOCKET_KEEPALIVE);
            socket.unref(); // Prevent these sockets from keeping the test runner process alive
        });
        this.httpServer.timeout = DEFAULT_HTTP_TIMEOUT;

        this.httpServer.listen(this.configuredListenPort, this.configuredListenHost);
        await new Promise(resolve => this.httpServer.once('listening', resolve));
        const address = this.httpServer.address();

        this.cncServer = new CnCServer({httpServer: this.httpServer});
        await this.cncServer.start();

        log.warn({address}, 'Started main HTTP server');

        if (this.configuredbadTLSListenPort >= 0) {
            const [key, cert] = await Promise.all([
                readFile(TLS_PRIVATE_KEY_PATH),
                readFile(TLS_CA_UNTRUSTED_ROOT_CERT),
            ]);

            this.badTLSHttpServer = https.createServer({key, cert}, (request, response) => {
                response.writeHead(200);
                response.end('Hello!');
            });
            this.badTLSHttpServer.listen(this.configuredbadTLSListenPort, this.configuredListenHost);
            await new Promise(resolve => this.badTLSHttpServer.once('listening', resolve));

            const address = this.badTLSHttpServer.address();
            log.warn({address}, 'Started Bad-TLS HTTP server');
        }
    }

    async stop() {
        log.info('Stopping...');

        if (this.cncServer) {
            await this.cncServer.stop();
            this.cncServer = null;
        }

        if (this.httpServer) {
            await Promise.fromCallback(cb => this.httpServer.close(cb));
            this.httpServer = null;
            log.info('Main HTTP server has been closed');
        }

        if (this.badTLSHttpServer) {
            await Promise.fromCallback(cb => this.badTLSHttpServer.close(cb));
            this.badTLSHttpServer = null;
            log.info('Bad-TLS HTTP server has been closed');
        }

        log.warn('Stopped');
    }

    get listenPort() {
        assert(this.httpServer, 'Main server has not been started');
        return this.httpServer.address().port;
    }

    get badTLSListenPort() {
        assert(this.badTLSHttpServer, 'Bad-TLS server has not been started');
        return this.badTLSHttpServer.address().port;
    }

    async waitForActiveCnCConnection() {
        await this.cncServer.waitForActiveConnection();
    }

    async runScript({scriptContent, stackFileName}) {
        return await this.cncServer.runScript({scriptContent, stackFileName});
    }

    async runScriptFromFunction(func, injected = {}) {
        const stackFileName = (func.name || 'integrationTest') + 'js';
        const scriptContent =
            `const injected = ${JSON.stringify(injected)};` +
            func.toString().replace(/^async\s*\(\)\s*=>\s*{|}$/g, '');
        return await this.runScript({scriptContent, stackFileName});
    }

    async reportCodeCoverage() {
        return await this.cncServer.reportCodeCoverage();
    }

}

module.exports = TestingServer;
