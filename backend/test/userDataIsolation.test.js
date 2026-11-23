import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import axios from "axios";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

let app;
let mongo;

function mockGithubGet(path) {
  const match = path.match(/^\/repos\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error("Unexpected GitHub test request.");
  const [, ownerName, name] = match;
  if (path.endsWith("/languages")) return { data: { JavaScript: 100 } };
  if (path.includes("/git/trees/")) return { data: { tree: [], truncated: false } };
  return {
    data: {
      id: `${ownerName}/${name}`.length,
      name,
      full_name: `${ownerName}/${name}`,
      private: false,
      default_branch: "main",
      html_url: `https://github.com/${ownerName}/${name}`,
      owner: { html_url: `https://github.com/${ownerName}` },
      description: "Test repository",
      language: "JavaScript",
      stargazers_count: 10,
      forks_count: 2,
      watchers_count: 3,
      open_issues_count: 0,
      license: { spdx_id: "MIT" },
      size: 1,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-02T00:00:00.000Z",
      pushed_at: "2026-01-02T00:00:00.000Z",
      topics: []
    }
  };
}

before(async () => {
  process.env.JWT_SECRET = "test-only-jwt-secret-with-at-least-32-characters";
  process.env.GEMINI_API_KEY = "test-only-gemini-key";
  mongo = await MongoMemoryServer.create({ instance: { dbName: "reposense_user_isolation_test" } });
  process.env.MONGODB_URI = mongo.getUri();
  await mongoose.connect(process.env.MONGODB_URI);
  const createAxiosClient = axios.create.bind(axios);
  axios.create = (config) => config.baseURL === "https://api.github.com"
    ? { get: async (path) => mockGithubGet(path) }
    : createAxiosClient(config);
  ({ default: app } = await import("../src/app.js"));
});

after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

async function registerAndLogin(name, email) {
  const password = "test-password-123";
  const registration = await request(app)
    .post("/api/auth/register")
    .send({ name, email, password });
  assert.equal(registration.status, 201);

  const login = await request(app)
    .post("/api/auth/login")
    .send({ email, password });
  assert.equal(login.status, 200);
  return {
    token: login.body.token,
    user: login.body.user
  };
}

async function createAnalysis(token, fullName) {
  const response = await request(app)
    .post("/api/github/analyze")
    .set("Authorization", `Bearer ${token}`)
    .send({ url: `https://github.com/${fullName}` });
  assert.equal(response.status, 200);
  return response.body.data.analysisId;
}

test("history is isolated by authenticated user across registration, login, and CRUD", async () => {
  const accountA = await registerAndLogin("User A", "user-a@example.test");
  const analysisA1 = await createAnalysis(accountA.token, "owner-a/repo-one");
  const analysisA2 = await createAnalysis(accountA.token, "owner-a/repo-two");

  const dashboardA = await request(app)
    .get("/api/history")
    .set("Authorization", `Bearer ${accountA.token}`);
  assert.equal(dashboardA.status, 200);
  assert.equal(dashboardA.body.data.length, 2);

  const accountB = await registerAndLogin("User B", "user-b@example.test");
  const dashboardBEmpty = await request(app)
    .get("/api/history")
    .set("Authorization", `Bearer ${accountB.token}`);
  assert.equal(dashboardBEmpty.status, 200);
  assert.equal(dashboardBEmpty.body.data.length, 0);

  await createAnalysis(accountB.token, "owner-b/repo-one");
  const dashboardB = await request(app)
    .get("/api/history")
    .set("Authorization", `Bearer ${accountB.token}`);
  assert.equal(dashboardB.status, 200);
  assert.equal(dashboardB.body.data.length, 1);
  assert.equal(dashboardB.body.data[0].fullName, "owner-b/repo-one");

  const foreignRead = await request(app)
    .get(`/api/history/${analysisA1}`)
    .set("Authorization", `Bearer ${accountB.token}`);
  assert.equal(foreignRead.status, 404);

  const foreignUpdate = await request(app)
    .patch(`/api/history/${analysisA1}`)
    .set("Authorization", `Bearer ${accountB.token}`)
    .send({ data: { fullName: "owner-b/forged" } });
  assert.equal(foreignUpdate.status, 404);

  const foreignDelete = await request(app)
    .delete(`/api/history/${analysisA1}`)
    .set("Authorization", `Bearer ${accountB.token}`);
  assert.equal(foreignDelete.status, 404);

  const unauthorized = await request(app).get("/api/history");
  assert.equal(unauthorized.status, 401);

  const loginAAgain = await request(app)
    .post("/api/auth/login")
    .send({ email: "user-a@example.test", password: "test-password-123" });
  assert.equal(loginAAgain.status, 200);
  const dashboardAAfterRelogin = await request(app)
    .get("/api/history")
    .set("Authorization", `Bearer ${loginAAgain.body.token}`);
  assert.equal(dashboardAAfterRelogin.status, 200);
  assert.equal(dashboardAAfterRelogin.body.data.length, 2);
  assert.deepEqual(
    dashboardAAfterRelogin.body.data.map((item) => item.id).sort(),
    [analysisA1, analysisA2].sort()
  );

  const loginBAgain = await request(app)
    .post("/api/auth/login")
    .send({ email: "user-b@example.test", password: "test-password-123" });
  assert.equal(loginBAgain.status, 200);
  const dashboardBAfterRelogin = await request(app)
    .get("/api/history")
    .set("Authorization", `Bearer ${loginBAgain.body.token}`);
  assert.equal(dashboardBAfterRelogin.status, 200);
  assert.equal(dashboardBAfterRelogin.body.data.length, 1);
  assert.equal(dashboardBAfterRelogin.body.data[0].fullName, "owner-b/repo-one");
});
