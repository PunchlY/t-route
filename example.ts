import type { IncomingMessage, ServerResponse, } from 'http';
import { createServer } from 'http';
import { Route, Wildcard } from '.';

const route = new Route<(req: IncomingMessage, res: ServerResponse<IncomingMessage> & { req: IncomingMessage; }, param: Record<string, string>) => any>();

route.init`/`((_req, res) => {
    res.end('hello world');
});
route.init`/${/(?<name>.*?)/}${['.png', '.jpg']}`((_req, res, param) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(param));
});
route.init`/test/${Wildcard}`((_req, res, param) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(param));
});

const server = createServer((req, res) => {
    if (req.method! !== 'GET') {
        res.statusCode = 405;
        res.end('Method Not Allowed');
        return;
    }
    const find = route.find(req.url!);
    if (!find) {
        res.statusCode = 404;
        res.end('not found');
        return;
    }
    Function.call.call(find.data, route, req, res, find.param);
});

server.listen(3000);
