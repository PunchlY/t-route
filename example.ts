import type { IncomingMessage, ServerResponse, } from 'http';
import { createServer } from 'http';
import { Route, Wildcard } from './index.js';

const route = new Route<(req: IncomingMessage, res: ServerResponse<IncomingMessage> & { req: IncomingMessage; }, param: Record<string, string>) => any>();

route.init`/`((_req, res) => {
    res.end('hello world');
});
route.init`/${/(?<name>.*?)/}${['.png', '.jpg']}`((_req, res, param) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(param)); // {"name":"..."}
});
route.init`/test/${Wildcard}`((_req, res, param) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(param)); // {"*":"..."}
});

const FULL_PATH_REGEXP = /^https?:\/\/.*?\//;
const server = createServer((req, res) => {
    if (req.method! !== 'GET') {
        res.statusCode = 405;
        res.end('Method Not Allowed');
        return;
    }
    let url = req.url!.split('?', 1)[0];
    if (url.charCodeAt(0) !== 47)
        url = url.replace(FULL_PATH_REGEXP, '/');
    const param = Object.create(null);
    const call = route.find(url, param);
    if (!call) {
        res.statusCode = 404;
        res.end('Not Found');
        return;
    }
    Function.call.call(call, route, req, res, param);
});

server.listen(3000);
