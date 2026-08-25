"use strict";

module.exports = {
  testEnvironmentOptions: {
    url: "http://localhost/",
  },
  collectCoverage: false,
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "<rootDir>/test/",
    "<rootDir>/client/",
  ],
  testPathIgnorePatterns: [
    "<rootDir>/bin/this/process-arguments.js",
    // The browser-driven e2e suites cannot run on Apple-Silicon macOS: puppeteer
    // 13.7 predates mac-arm64 support, and its bundled Chromium wedges the jest
    // worker there with no test ever timing out. The full e2e suite still runs on
    // ubuntu and windows across every Node version in the matrix.
    ...(process.platform === "darwin" ? ["<rootDir>/test/e2e/"] : []),
  ],
  snapshotResolver: "<rootDir>/test/helpers/snapshotResolver.js",
  setupFilesAfterEnv: ["<rootDir>/scripts/setupTest.js"],
  globalSetup: "<rootDir>/scripts/globalSetupTest.js",
  moduleNameMapper: {
    // This forces Jest/jest-environment-jsdom to use a Node+CommonJS version of uuid, not a Browser+ESM one
    // See https://github.com/uuidjs/uuid/pull/616
    //
    // WARNING: if your dependency tree has multiple paths leading to uuid, this will force all of them to resolve to
    // whichever one happens to be hoisted to your root node_modules folder. This makes it much more dangerous
    // to consume future uuid upgrades. Consider using a custom resolver instead of moduleNameMapper.
    //
    // More:
    // https://jestjs.io/docs/upgrading-to-jest28#packagejson-exports
    // https://github.com/microsoft/accessibility-insights-web/pull/5421#issuecomment-1109168149
    //
    // FIXME: this uuid moduleNameMapper workaround can be removed after sockjs > uuid@v9 release
    // https://github.com/uuidjs/uuid/pull/616#issuecomment-1206283882
    "^uuid$": require.resolve("uuid"),
  },
};
