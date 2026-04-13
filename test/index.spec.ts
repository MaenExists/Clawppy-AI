import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
	SELF,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("Clawppy Worker", () => {
	it("returns 404 for unknown paths", async () => {
		const request = new IncomingRequest("http://example.com/unknown", { method: "POST" });
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(404);
	});

	it("returns 404 for non-POST requests to root", async () => {
		const request = new IncomingRequest("http://example.com/", { method: "GET" });
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(404);
	});

	it("returns 404 for unknown paths", async () => {
		const request = new IncomingRequest("http://example.com/unknown", { method: "POST" });
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(404);
	});

	it("returns 200 for health check", async () => {
		const request = new IncomingRequest("http://example.com/health");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.status).toBe("ok");
	});

	it("returns 400 when missing From parameter", async () => {
		const request = new IncomingRequest("http://example.com/", {
			method: "POST",
			body: new URLSearchParams({ Body: "hi" }),
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(400);
	});

	it("returns 400 when missing Body parameter", async () => {
		const request = new IncomingRequest("http://example.com/", {
			method: "POST",
			body: new URLSearchParams({ From: "whatsapp:+1234567890" }),
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(400);
	});

	it("greets new users with welcome message", async () => {
		const request = new IncomingRequest("http://example.com/", {
			method: "POST",
			body: new URLSearchParams({
				From: "whatsapp:+919999999999",
				Body: "Hi"
			}),
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
	});

	it("handles /map command", async () => {
		const request = new IncomingRequest("http://example.com/", {
			method: "POST",
			body: new URLSearchParams({
				From: "whatsapp:+1234567890",
				Body: "/map"
			}),
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
	});

	it("handles /help command", async () => {
		const request = new IncomingRequest("http://example.com/", {
			method: "POST",
			body: new URLSearchParams({
				From: "whatsapp:+1234567890",
				Body: "/help"
			}),
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
	});

	it("handles /upgrade command", async () => {
		const request = new IncomingRequest("http://example.com/", {
			method: "POST",
			body: new URLSearchParams({
				From: "whatsapp:+1234567890",
				Body: "/upgrade"
			}),
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
	});

	it("handles /streak command", async () => {
		const request = new IncomingRequest("http://example.com/", {
			method: "POST",
			body: new URLSearchParams({
				From: "whatsapp:+1234567890",
				Body: "/streak"
			}),
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
	});

	it("handles /reset command", async () => {
		const request = new IncomingRequest("http://example.com/", {
			method: "POST",
			body: new URLSearchParams({
				From: "whatsapp:+1234567890",
				Body: "/reset"
			}),
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
	});

	it("handles regular message", async () => {
		const request = new IncomingRequest("http://example.com/", {
			method: "POST",
			body: new URLSearchParams({
				From: "whatsapp:+1234567890",
				Body: "What is thermodynamics?"
			}),
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
	});
});