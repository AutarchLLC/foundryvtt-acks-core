# End-to-end tests

The system is tested in a real Foundry server driven by [Playwright](https://playwright.dev).
Foundry needs a licensed install, so these tests run locally, not in CI.

## One-time setup

1. Install Foundry v14 and activate your license once (any build: Electron, portable or Node.js zip).
2. `npm install`
3. Copy `e2e/foundry.config.example.json` to `e2e/foundry.config.json` (gitignored) and set:

   | Key              | Meaning                                                                                                                                                            |
   | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
   | `installPath`    | Foundry install folder: the Electron install root, a portable root, or an unzipped Node.js build.                                                                  |
   | `userDataPath`   | Optional. Folder that contains `Config/license.json`. By default the portable root and the platform's default user data folder are searched.                       |
   | `port`           | Optional, default `30001`. Keep it different from your normal Foundry port so both can run.                                                                        |
   | `browserChannel` | Optional, default `"chrome"` (your installed Chrome). `"msedge"` also works, or `""` for Playwright's bundled Chromium (`npx playwright install chromium` first). |

   Each key can also be set with an environment variable: `FOUNDRY_INSTALL_PATH`, `FOUNDRY_USER_DATA_PATH`,
   `FOUNDRY_PORT`, `FOUNDRY_BROWSER_CHANNEL`.

## Running

```bash
npm run test:e2e                      # headless
npm run test:e2e -- --headed          # watch the browser
npm run test:e2e -- --ui              # Playwright UI: pick tests, time-travel through steps
npm run test:e2e -- -g "save"         # tests whose title matches
npx playwright show-report playwright-report
```

Playwright starts the test server itself and stops it at the end. Failed tests keep a trace and a
screenshot in `test-results/` (`npx playwright show-trace <trace.zip>`).

## The test server

`npm run foundry:test` starts the same server by hand. It never touches your own Foundry data:

- `.foundry-test/` (gitignored) is used as Foundry's user data folder. It gets a copy of your
  `license.json` and a junction `Data/systems/acks` → this checkout's `src/`.
- The `acks-e2e` world is rebuilt on every start from `e2e/fixtures/world/`. Each subfolder there is a
  world collection (`users`, `settings`, …) of JSON documents, compiled to LevelDB with the Foundry CLI.
  Use `npm run foundry:test -- --keep` to keep the world from the previous run.
- The world has two GM users without passwords: **Gamemaster** for people and **Playwright** for the tests.
  Foundry allows one session per user, so join as Gamemaster at `http://localhost:30001` to watch while
  tests run. Expect the tests to delete world actors, items and chat messages between tests.
- If the server is already running, Playwright reuses it instead of starting another.

JS changes need a page reload (Foundry serves files with `no-store`). CSS, templates and lang files hot-reload.

## Writing tests

Tests live in `e2e/tests/*.spec.mjs` and import `test` / `expect` from `e2e/support/foundry.mjs`:

- `page` is a GM page in a freshly reset world: no world actors, items, chat messages or combats, no open
  sheets or dialogs. The login is shared by all tests, because joining takes a few seconds.
- A test fails if the page throws an uncaught exception, even when its own assertions pass.
- Helpers: `createActor`, `openActorSheet`, `dialog(page, title)`, `latestChatMessage`.

Prefer `page.evaluate` against the Foundry API (`game.actors`, `actor.update`, …) for setup and data
assertions, and real clicks for the behaviour under test (sheet actions, dialogs, chat cards).
Select elements by stable hooks such as `data-action`, `data-tab` or `data-save`, not by styling classes.
