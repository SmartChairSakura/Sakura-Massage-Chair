const { createServer } = require('http');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = 3000;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception (handled):', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection (handled):', reason);
});

app.prepare().then(() => {
  const server = createServer((req, res) => {
    try {
      handle(req, res).catch((err) => {
        console.error('Request handle error:', err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end('Internal Server Error');
        }
      });
    } catch (err) {
      console.error('Server sync error:', err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    }
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Custom Next.js Server Ready on http://localhost:${port}`);
  });
});
