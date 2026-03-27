// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";

// Must mock before importing auth
vi.mock("server-only", () => ({}));

const mockCookieStore = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

import { createSession, getSession, deleteSession, verifySession } from "@/lib/auth";
import { NextRequest } from "next/server";

const SECRET = new TextEncoder().encode("development-secret-key");
const COOKIE_NAME = "auth-token";

async function makeToken(payload: object, expired = false) {
  const exp = expired
    ? Math.floor(Date.now() / 1000) - 10
    : Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
  return new SignJWT({ ...payload, exp })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .sign(SECRET);
}

function makeRequest(token?: string) {
  const headers = token ? { cookie: `${COOKIE_NAME}=${token}` } : {};
  return new NextRequest("http://localhost/", { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// createSession

test("createSession sets an httpOnly cookie", async () => {
  await createSession("user-1", "test@example.com");

  expect(mockCookieStore.set).toHaveBeenCalledOnce();
  const [name, , options] = mockCookieStore.set.mock.calls[0];
  expect(name).toBe(COOKIE_NAME);
  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
});

test("createSession cookie expires in ~7 days", async () => {
  const before = Date.now();
  await createSession("user-1", "test@example.com");
  const after = Date.now();

  const [, , options] = mockCookieStore.set.mock.calls[0];
  const expires: Date = options.expires;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  expect(expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
  expect(expires.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
});

test("createSession token encodes userId and email", async () => {
  await createSession("user-42", "hello@example.com");

  const [, token] = mockCookieStore.set.mock.calls[0];
  const { jwtVerify } = await import("jose");
  const { payload } = await jwtVerify(token, SECRET);
  expect(payload.userId).toBe("user-42");
  expect(payload.email).toBe("hello@example.com");
});

// getSession

test("getSession returns null when no cookie", async () => {
  mockCookieStore.get.mockReturnValue(undefined);
  const result = await getSession();
  expect(result).toBeNull();
});

test("getSession returns payload for valid token", async () => {
  const token = await makeToken({ userId: "u1", email: "a@b.com" });
  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();
  expect(session?.userId).toBe("u1");
  expect(session?.email).toBe("a@b.com");
});

test("getSession returns null for expired token", async () => {
  const token = await makeToken({ userId: "u1", email: "a@b.com" }, true);
  mockCookieStore.get.mockReturnValue({ value: token });

  const result = await getSession();
  expect(result).toBeNull();
});

test("getSession returns null for tampered token", async () => {
  mockCookieStore.get.mockReturnValue({ value: "not.a.valid.jwt" });
  const result = await getSession();
  expect(result).toBeNull();
});

// deleteSession

test("deleteSession removes the auth cookie", async () => {
  await deleteSession();
  expect(mockCookieStore.delete).toHaveBeenCalledWith(COOKIE_NAME);
});

// verifySession

test("verifySession returns null when no cookie on request", async () => {
  const result = await verifySession(makeRequest());
  expect(result).toBeNull();
});

test("verifySession returns payload for valid token on request", async () => {
  const token = await makeToken({ userId: "u2", email: "x@y.com" });
  const result = await verifySession(makeRequest(token));
  expect(result?.userId).toBe("u2");
  expect(result?.email).toBe("x@y.com");
});

test("verifySession returns null for expired token on request", async () => {
  const token = await makeToken({ userId: "u2", email: "x@y.com" }, true);
  const result = await verifySession(makeRequest(token));
  expect(result).toBeNull();
});

test("verifySession returns null for tampered token on request", async () => {
  const result = await verifySession(makeRequest("bad.token.value"));
  expect(result).toBeNull();
});
