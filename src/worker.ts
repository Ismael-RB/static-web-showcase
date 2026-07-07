/// <reference types="@cloudflare/workers-types" />
// Single Worker entrypoint, required by `wrangler deploy` (unlike Pages,
// a plain Worker doesn't compile a /functions folder). `run_worker_first`
// in wrangler.jsonc restricts invocation to /api/* — every other request
// is served straight from the ASSETS binding (the Astro static build)
// without ever reaching this fetch handler.
//
// SMTP is sent directly (no third-party email API) via worker-mailer,
// which implements the SMTP protocol on top of Cloudflare's raw TCP
// sockets API (`cloudflare:sockets`) — nodemailer can't be used here since
// it depends on Node's `net`/`tls` modules, which don't exist in the
// Workers runtime even with the nodejs_compat flag.
import { WorkerMailer } from "worker-mailer";

interface Env {
	ASSETS: Fetcher;
	SMTP_HOST: string;
	SMTP_PORT: string;
	SMTP_SECURE: string;
	SMTP_AUTH_TYPE: string;
	SMTP_USER: string;
	SMTP_PASS: string;
	CONTACT_TO_EMAIL: string;
}

interface ContactPayload {
	name: string;
	email: string;
	message: string;
}

function parsePayload(value: unknown): ContactPayload | null {
	if (typeof value !== "object" || value === null) return null;
	const { name, email, message } = value as Record<string, unknown>;

	if (typeof name !== "string" || name.trim().length === 0) return null;
	if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
	if (typeof message !== "string" || message.trim().length === 0) return null;

	return { name: name.trim(), email: email.trim(), message: message.trim() };
}

async function handleContact(request: Request, env: Env): Promise<Response> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
	}

	const payload = parsePayload(body);
	if (!payload) {
		return Response.json({ success: false, error: "Missing or invalid fields." }, { status: 400 });
	}

	const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_AUTH_TYPE, SMTP_USER, SMTP_PASS, CONTACT_TO_EMAIL } = env;

	try {
		const mailer = await WorkerMailer.connect({
			credentials: { username: SMTP_USER, password: SMTP_PASS },
			authType: (SMTP_AUTH_TYPE as "plain" | "login" | "cram-md5" | undefined) ?? "login",
			host: SMTP_HOST,
			port: Number(SMTP_PORT),
			secure: SMTP_SECURE === "true",
		});

		await mailer.send({
			from: { name: "Static Web Showcase", email: SMTP_USER },
			to: { email: CONTACT_TO_EMAIL },
			subject: `New contact form message from ${payload.name}`,
			text: `From: ${payload.name} <${payload.email}>\n\n${payload.message}`,
		});

		return Response.json({ success: true });
	} catch (error) {
		console.error("Failed to send contact email", error);
		return Response.json(
			{ success: false, error: "Could not send the message. Please try again later." },
			{ status: 502 },
		);
	}
}

export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		if (url.pathname === "/api/contact") {
			if (request.method !== "POST") {
				return new Response("Method Not Allowed", { status: 405 });
			}
			return handleContact(request, env);
		}

		return new Response("Not Found", { status: 404 });
	},
} satisfies ExportedHandler<Env>;
