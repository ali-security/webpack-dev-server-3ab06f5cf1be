"use strict";

const webpack = require("webpack");
const Server = require("../../lib/Server");
const config = require("../fixtures/client-config/webpack.config");
const runBrowser = require("../helpers/run-browser");
const [port1, port2] = require("../ports-map")["cross-origin-request"];

describe("cross-origin requests", () => {
  const devServerPort = port1;
  const htmlServerPort = port2;
  const htmlServerHost = "127.0.0.1";

  it("should return 403 for cross-origin no-cors non-module script tag requests", async () => {
    const compiler = webpack(config);
    const devServerOptions = {
      port: devServerPort,
      allowedHosts: "auto",
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    // Start a separate server for serving the HTML file
    const http = require("http");
    const htmlServer = http.createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <html>
          <head>
            <script src="http://localhost:${devServerPort}/main.js"></script>
          </head>
          <body></body>
        </html>
      `);
    });
    htmlServer.listen(htmlServerPort, htmlServerHost);

    const { page, browser } = await runBrowser();

    try {
      const pageErrors = [];

      page.on("pageerror", (error) => {
        pageErrors.push(error);
      });

      const scriptTagRequest = page.waitForResponse(
        `http://localhost:${devServerPort}/main.js`
      );

      await page.goto(`http://${htmlServerHost}:${htmlServerPort}`);

      const response = await scriptTagRequest;

      expect(response.status()).toBe(403);
    } finally {
      await browser.close();
      await server.stop();
      htmlServer.close();
    }
  });

  it("should return 200 for cross-origin cors non-module script tag requests", async () => {
    const compiler = webpack(config);
    const devServerOptions = {
      port: devServerPort,
      allowedHosts: "auto",
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    // Start a separate server for serving the HTML file
    const http = require("http");
    const htmlServer = http.createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <html>
          <head>
            <script src="http://localhost:${devServerPort}/main.js" crossorigin></script>
          </head>
          <body></body>
        </html>
      `);
    });
    htmlServer.listen(htmlServerPort, htmlServerHost);

    const { page, browser } = await runBrowser();

    try {
      const pageErrors = [];

      page.on("pageerror", (error) => {
        pageErrors.push(error);
      });

      const scriptTagRequest = page.waitForResponse(
        `http://localhost:${devServerPort}/main.js`
      );

      await page.goto(`http://${htmlServerHost}:${htmlServerPort}`);

      const response = await scriptTagRequest;

      expect(response.status()).toBe(200);
    } finally {
      await browser.close();
      await server.stop();
      htmlServer.close();
    }
  });

  it("should return 200 for cross-origin no-cors non-module script tag requests with the 'allowedHost' option and 'all' value", async () => {
    const compiler = webpack(config);
    const devServerOptions = {
      port: devServerPort,
      allowedHosts: "all",
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    // Start a separate server for serving the HTML file
    const http = require("http");
    const htmlServer = http.createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <html>
          <head>
            <script src="http://localhost:${devServerPort}/main.js"></script>
          </head>
          <body></body>
        </html>
      `);
    });
    htmlServer.listen(htmlServerPort, htmlServerHost);

    const { page, browser } = await runBrowser();

    try {
      const pageErrors = [];

      page.on("pageerror", (error) => {
        pageErrors.push(error);
      });

      const scriptTagRequest = page.waitForResponse(
        `http://localhost:${devServerPort}/main.js`
      );

      await page.goto(`http://${htmlServerHost}:${htmlServerPort}`);

      const response = await scriptTagRequest;

      expect(response.status()).toBe(200);
    } finally {
      await browser.close();
      await server.stop();
      htmlServer.close();
    }
  });

  it("should return 200 for cross-origin no-cors non-module script tag requests with the `allowedHost` option and the `localhost` value", async () => {
    const compiler = webpack(config);
    const devServerOptions = {
      port: devServerPort,
      allowedHosts: ["localhost"],
    };
    const server = new Server(devServerOptions, compiler);

    await server.start();

    // Start a separate server for serving the HTML file
    const http = require("http");
    const htmlServer = http.createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <html>
          <head>
            <script src="http://localhost:${devServerPort}/main.js"></script>
          </head>
          <body></body>
        </html>
      `);
    });
    htmlServer.listen(htmlServerPort, htmlServerHost);

    const { page, browser } = await runBrowser();

    try {
      const pageErrors = [];

      page.on("pageerror", (error) => {
        pageErrors.push(error);
      });

      const scriptTagRequest = page.waitForResponse(
        `http://localhost:${devServerPort}/main.js`
      );

      await page.goto(`http://${htmlServerHost}:${htmlServerPort}`);

      const response = await scriptTagRequest;

      expect(response.status()).toBe(200);
    } finally {
      await browser.close();
      await server.stop();
      htmlServer.close();
    }
  });
});

// @see https://github.com/webpack/webpack-dev-server/security/advisories/GHSA-79cf-xcqc-c78w
describe("cross-origin resource policy header", () => {
  const devServerPort = port1;

  let server;

  afterEach(async () => {
    if (server) {
      await server.stop();
      // Allow the port to be fully released before the next test
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
      server = null;
    }
  });

  function request(url, headers = {}) {
    const http = require("http");

    return new Promise((resolve, reject) => {
      const req = http.get(url, { headers }, (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({ status: res.statusCode, headers: res.headers, body });
        });
      });
      req.on("error", reject);
    });
  }

  it("should set Cross-Origin-Resource-Policy: same-origin by default", async () => {
    const compiler = webpack(config);
    server = new Server(
      { port: devServerPort, allowedHosts: "auto" },
      compiler
    );

    await server.start();

    const res = await request(`http://localhost:${devServerPort}/main.js`);

    expect(res.headers["cross-origin-resource-policy"]).toBe("same-origin");
  });

  it("should NOT set CORP header when allowedHosts is 'all'", async () => {
    const compiler = webpack(config);
    server = new Server({ port: devServerPort, allowedHosts: "all" }, compiler);

    await server.start();

    const res = await request(`http://localhost:${devServerPort}/main.js`);

    expect(res.headers["cross-origin-resource-policy"]).toBeUndefined();
  });

  it("should NOT set CORP header when user configures wildcard CORS", async () => {
    const compiler = webpack(config);
    server = new Server(
      {
        port: devServerPort,
        allowedHosts: "auto",
        headers: { "Access-Control-Allow-Origin": "*" },
      },
      compiler
    );

    await server.start();

    const res = await request(`http://localhost:${devServerPort}/main.js`);

    expect(res.headers["cross-origin-resource-policy"]).toBeUndefined();
  });

  it("should set CORP header when user configures a specific-origin Access-Control-Allow-Origin (no-cors embedding is not governed by CORS)", async () => {
    const compiler = webpack(config);
    server = new Server(
      {
        port: devServerPort,
        allowedHosts: "auto",
        headers: {
          "Access-Control-Allow-Origin": "http://foo.example.com",
        },
      },
      compiler
    );

    await server.start();

    const res = await request(`http://localhost:${devServerPort}/main.js`);

    expect(res.headers["cross-origin-resource-policy"]).toBe("same-origin");
  });

  it("should set CORP header when user configures Access-Control-Allow-Origin via headers array with a specific origin", async () => {
    const compiler = webpack(config);
    server = new Server(
      {
        port: devServerPort,
        allowedHosts: "auto",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "http://foo.example.com",
          },
        ],
      },
      compiler
    );

    await server.start();

    const res = await request(`http://localhost:${devServerPort}/main.js`);

    expect(res.headers["cross-origin-resource-policy"]).toBe("same-origin");
  });

  it("should NOT set CORP header when user configures wildcard Access-Control-Allow-Origin via headers array", async () => {
    const compiler = webpack(config);
    server = new Server(
      {
        port: devServerPort,
        allowedHosts: "auto",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
      compiler
    );

    await server.start();

    const res = await request(`http://localhost:${devServerPort}/main.js`);

    expect(res.headers["cross-origin-resource-policy"]).toBeUndefined();
  });

  it("should NOT set CORP header when host is in allowedHosts", async () => {
    const compiler = webpack(config);
    server = new Server(
      { port: devServerPort, allowedHosts: ["localhost"] },
      compiler
    );

    await server.start();

    const res = await request(`http://localhost:${devServerPort}/main.js`);

    expect(res.status).toBe(200);
    expect(res.headers["cross-origin-resource-policy"]).toBeUndefined();
  });
});

describe("cross-site request forgery on state-changing endpoints", () => {
  const devServerPort = port1;

  let server;

  beforeEach(async () => {
    const compiler = webpack(config);
    server = new Server(
      { port: devServerPort, allowedHosts: "auto" },
      compiler
    );

    await server.start();
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
      // Allow the port to be fully released before the next test
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
      server = null;
    }
  });

  function request(path, headers = {}) {
    const http = require("http");
    const url = `http://localhost:${devServerPort}${path}`;

    return new Promise((resolve, reject) => {
      const req = http.get(url, { headers }, (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({ status: res.statusCode, body });
        });
      });
      req.on("error", reject);
    });
  }

  for (const endpoint of [
    "/webpack-dev-server/invalidate",
    "/webpack-dev-server/open-editor",
  ]) {
    it(`should block cross-site requests to ${endpoint}`, async () => {
      const res = await request(endpoint, {
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
      });

      expect(res.status).toBe(403);
    });

    it(`should block same-site cross-origin requests to ${endpoint}`, async () => {
      // A page on another port of `localhost` is same-site but cross-origin
      const res = await request(endpoint, {
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
      });

      expect(res.status).toBe(403);
    });

    it(`should allow same-origin requests to ${endpoint}`, async () => {
      const res = await request(endpoint, {
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
      });

      expect(res.status).toBe(200);
    });

    it(`should allow user-initiated navigations to ${endpoint}`, async () => {
      const res = await request(endpoint, { "sec-fetch-site": "none" });

      expect(res.status).toBe(200);
    });
  }

  it("should block requests with a cross-origin Origin and no Sec-Fetch metadata", async () => {
    const res = await request("/webpack-dev-server/invalidate", {
      origin: "http://evil.example",
    });

    expect(res.status).toBe(403);
  });

  it("should allow requests without Sec-Fetch metadata or Origin (e.g. curl)", async () => {
    const res = await request("/webpack-dev-server/invalidate");

    expect(res.status).toBe(200);
  });

  it("should not launch an editor for a cross-site open-editor request", async () => {
    const res = await request(
      "/webpack-dev-server/open-editor?fileName=does-not-exist.js",
      { "sec-fetch-site": "cross-site" }
    );

    expect(res.status).toBe(403);
    expect(res.body).toBe("Cross-Origin request blocked");
  });
});

describe("malformed Host/Origin headers", () => {
  const devServerPort = port1;

  // The invalid IPv6 literal from the upstream report, which makes the legacy
  // `url.parse` throw while the `Host`/`Origin` header is validated.
  const malformedHost = "[::1";
  const malformedOrigin = "http://[::1/";

  let server;

  beforeEach(async () => {
    const compiler = webpack(config);
    server = new Server(
      { port: devServerPort, allowedHosts: "auto" },
      compiler
    );

    await server.start();
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
      // Allow the port to be fully released before the next test
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
      server = null;
    }
  });

  function request(path, headers = {}) {
    const http = require("http");
    const url = `http://localhost:${devServerPort}${path}`;

    return new Promise((resolve, reject) => {
      const req = http.get(url, { headers }, (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({ status: res.statusCode, body });
        });
      });
      req.on("error", reject);
    });
  }

  function openWebSocket(headers) {
    const WebSocket = require("ws");

    return new Promise((resolve) => {
      const messages = [];
      const ws = new WebSocket(`ws://localhost:${devServerPort}/ws`, {
        headers,
      });

      ws.on("message", (data) => {
        messages.push(JSON.parse(data.toString()));
      });
      ws.on("close", () => {
        resolve(messages);
      });
      ws.on("error", () => {
        resolve(messages);
      });
    });
  }

  it("should send header values the legacy url-parser rejects", () => {
    const url = require("url");
    const nodeMajor = Number(process.versions.node.split(".")[0]);

    // The parser only rejects these values from Node.js 18 on, which added a
    // forbidden-host-character check to it. On older versions the same values
    // merely resolve to a hostname that is not allowed, so the tests below are
    // a regression test for the thrown-parser-error crash on Node.js >= 18 and
    // a plain "not an allowed host" test everywhere else.
    if (nodeMajor < 18) {
      return;
    }

    expect(() => url.parse(`//${malformedHost}`, false, true)).toThrow();
    expect(() => url.parse(malformedOrigin, false, true)).toThrow();
  });

  it("should reject a WebSocket upgrade with a malformed Origin header", async () => {
    // Parsing the `Origin` used to throw inside the "connection" handler, an
    // uncaught exception that took the whole dev-server process down.
    const messages = await openWebSocket({
      host: `localhost:${devServerPort}`,
      origin: malformedOrigin,
    });

    expect(messages).toContainEqual({
      type: "error",
      data: "Invalid Host/Origin header",
    });

    // The server must still be alive: a normal request still succeeds.
    const res = await request("/main.js");

    expect(res.status).toBe(200);
  });

  it("should reject a WebSocket upgrade with a malformed Host header", async () => {
    // The `Host` is parsed before the `Origin`, on the same code path.
    const messages = await openWebSocket({ host: malformedHost });

    expect(messages).toContainEqual({
      type: "error",
      data: "Invalid Host/Origin header",
    });

    // The server must still be alive: a normal request still succeeds.
    const res = await request("/main.js");

    expect(res.status).toBe(200);
  });

  it("should reject a request with a malformed Host header", async () => {
    const net = require("net");

    // Sent over a raw socket so the malformed value reaches the server as-is.
    const response = await new Promise((resolve, reject) => {
      let raw = "";

      const socket = net.connect(devServerPort, "localhost", () => {
        socket.write(
          [
            "GET /main.js HTTP/1.1",
            `Host: ${malformedHost}`,
            "Connection: close",
            "",
            "",
          ].join("\r\n")
        );
      });

      socket.on("data", (chunk) => {
        raw += chunk.toString();
      });
      socket.on("close", () => {
        resolve(raw);
      });
      socket.on("error", reject);
    });

    // The host check answers the request instead of throwing, a thrown parser
    // error would surface as a 500 from the express error handler.
    expect(response).toMatch(/^HTTP\/1\.1 200 /);
    expect(response).toContain("Invalid Host header");

    // The server must still be alive: a normal request still succeeds.
    const res = await request("/main.js");

    expect(res.status).toBe(200);
  });

  it("should block a state-changing request with a malformed Origin header", async () => {
    // The same-origin comparison used to throw on a malformed `Origin`, the
    // request must simply be treated as cross-origin instead.
    const res = await request("/webpack-dev-server/invalidate", {
      origin: malformedOrigin,
    });

    expect(res.status).toBe(403);
    expect(res.body).toBe("Cross-Origin request blocked");
  });
});
