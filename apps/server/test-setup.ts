import dotenv from "dotenv";

// The repo root holds the only .env; `import.meta.dir` is apps/server.
dotenv.config({ path: `${import.meta.dir}/../../.env` });

/** `postgresql://…/chess` → `postgresql://…/chess_test`. */
function deriveTestUrl(url: string): string {
  const parsed = new URL(url);
  const name = parsed.pathname.replace(/^\//, "");

  parsed.pathname = `/${name}_test`;

  return parsed.toString();
}

const configured = process.env.TEST_DATABASE_URL;
const development = process.env.DATABASE_URL;

if (!configured && !development) {
  throw new Error(
    "Set DATABASE_URL (or TEST_DATABASE_URL) before running the server tests.",
  );
}

const testUrl = configured ?? deriveTestUrl(development!);

// The suites truncate tables between tests, so pointing at the development
// database would quietly destroy it. Refuse anything not named for testing.
const name = new URL(testUrl).pathname.replace(/^\//, "");

if (!name.endsWith("_test")) {
  throw new Error(
    `Refusing to run tests against "${name}" — the database name must end in "_test".`,
  );
}

process.env.DATABASE_URL = testUrl;
process.env.NODE_ENV = "test";
