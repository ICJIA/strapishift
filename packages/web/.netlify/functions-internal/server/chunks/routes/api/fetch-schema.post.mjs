import { d as defineEventHandler, r as readBody, c as createError } from '../../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import '@iconify/utils';
import 'consola';

const ARTIFICIAL_DELAY_MS = 1e3;
function isPrivateIp(ip) {
  const normalized = ip.replace(/^::ffff:/, "");
  const parts = normalized.split(".");
  if (parts.length === 4) {
    const octets = parts.map((p) => {
      if (p.startsWith("0x") || p.startsWith("0X")) return parseInt(p, 16);
      if (p.startsWith("0") && p.length > 1) return parseInt(p, 8);
      return parseInt(p, 10);
    });
    if (octets.some((o) => isNaN(o) || o < 0 || o > 255)) return true;
    const [a, b, c, d] = octets;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 0) return true;
    return false;
  }
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "[::1]") return true;
  if (lower.startsWith("fe80:")) return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.includes("::ffff:")) return true;
  return false;
}
function validateAndNormalizeUrl(urlString) {
  if (typeof urlString !== "string" || urlString.length > 2048) {
    throw createError({ statusCode: 400, message: "Invalid URL" });
  }
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    throw createError({ statusCode: 400, message: "Invalid URL format. Include http:// or https://" });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw createError({ statusCode: 400, message: "URL must use http:// or https://" });
  }
  if (parsed.username || parsed.password) {
    throw createError({ statusCode: 400, message: "URL must not contain credentials" });
  }
  const hostname = parsed.hostname.toLowerCase();
  const blockedHostnames = [
    "metadata.google.internal",
    "metadata.goog",
    "kubernetes.default.svc"
  ];
  if (blockedHostnames.includes(hostname)) {
    throw createError({ statusCode: 400, message: "Blocked hostname" });
  }
  if ((hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]")) {
    throw createError({ statusCode: 400, message: "Cannot connect to localhost from production. Run StrapiShift locally instead." });
  }
  if (/^\d+$/.test(hostname)) {
    const ip = Number(hostname);
    if (ip >= 0 && ip <= 4294967295) {
      const a = ip >>> 24 & 255;
      const b = ip >>> 16 & 255;
      const c = ip >>> 8 & 255;
      const d = ip & 255;
      if (isPrivateIp(`${a}.${b}.${c}.${d}`)) {
        throw createError({ statusCode: 400, message: "Cannot connect to private network addresses" });
      }
    }
  }
  if (isPrivateIp(hostname)) {
    throw createError({ statusCode: 400, message: "Cannot connect to private network addresses" });
  }
  return `${parsed.protocol}//${parsed.host}`;
}
function sanitizeSchemaAttributes(attrs) {
  if (typeof attrs !== "object" || attrs === null || Array.isArray(attrs)) return {};
  const safe = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
    if (typeof value === "object" && value !== null) {
      safe[key] = JSON.parse(JSON.stringify(value));
    } else {
      safe[key] = value;
    }
  }
  return safe;
}
const fetchSchema_post = defineEventHandler(async (event) => {
  var _a, _b;
  await new Promise((resolve) => setTimeout(resolve, ARTIFICIAL_DELAY_MS));
  const body = await readBody(event);
  const bodyStr = JSON.stringify(body || {});
  if (bodyStr.length > 5e3) {
    throw createError({ statusCode: 400, message: "Request too large" });
  }
  const { url, email, password, version } = body || {};
  if (!url || !email || !password || !version) {
    throw createError({ statusCode: 400, message: "Missing required fields: url, email, password, version" });
  }
  if (typeof url !== "string" || typeof email !== "string" || typeof password !== "string") {
    throw createError({ statusCode: 400, message: "Invalid field types" });
  }
  if (version !== "v3" && version !== "v5") {
    throw createError({ statusCode: 400, message: 'Version must be "v3" or "v5"' });
  }
  if (!email.includes("@") || email.length > 254) {
    throw createError({ statusCode: 400, message: "Invalid email format" });
  }
  const baseUrl = validateAndNormalizeUrl(url);
  const authFailMessage = "Could not authenticate with the provided credentials and URL. Verify the URL is a running Strapi instance and the admin email/password are correct.";
  let token;
  try {
    const loginRes = await $fetch(`${baseUrl}/admin/login`, {
      method: "POST",
      body: { email, password },
      timeout: 1e4
    });
    token = ((_a = loginRes == null ? void 0 : loginRes.data) == null ? void 0 : _a.token) || (loginRes == null ? void 0 : loginRes.token);
    if (!token) {
      throw createError({ statusCode: 401, message: authFailMessage });
    }
  } catch (e) {
    if (e.statusCode === 401) throw e;
    throw createError({ statusCode: 401, message: authFailMessage });
  }
  const ctbPath = version === "v3" ? "/content-type-builder/content-types" : "/api/content-type-builder/content-types";
  let ctData;
  try {
    const response = await $fetch(`${baseUrl}${ctbPath}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 1e4,
      responseType: "json"
    });
    const responseStr = JSON.stringify(response);
    if (responseStr.length > 5e6) {
      throw createError({ statusCode: 502, message: "Response too large. The instance may have too many content types." });
    }
    ctData = response;
  } catch (e) {
    if (e.statusCode) throw e;
    throw createError({ statusCode: 502, message: "Could not fetch content types. The admin user may lack permissions." });
  }
  const items = (ctData == null ? void 0 : ctData.data) || ctData || [];
  if (!Array.isArray(items) || items.length > 200) {
    throw createError({ statusCode: 502, message: "Invalid or excessive response from Content Type Builder API" });
  }
  const schemas = {};
  const skipPrefixes = ["admin::", "strapi::"];
  const skipUids = [
    "plugin::users-permissions.permission",
    "plugin::users-permissions.role",
    "plugin::upload.file",
    "plugin::upload.folder",
    "plugin::i18n.locale",
    "plugin::content-releases.release",
    "plugin::content-releases.release-action"
  ];
  for (const item of items) {
    const uid = typeof (item == null ? void 0 : item.uid) === "string" ? item.uid : "";
    if (skipPrefixes.some((p) => uid.startsWith(p))) continue;
    if (skipUids.includes(uid)) continue;
    const name = uid.includes(".") ? uid.split(".").pop() || uid : uid;
    if (typeof name !== "string" || name.length > 100 || /[^a-zA-Z0-9_-]/.test(name)) continue;
    const schema = item.schema || item;
    if (schema == null ? void 0 : schema.attributes) {
      schemas[name] = {
        kind: schema.kind === "singleType" ? "singleType" : "collectionType",
        collectionName: typeof schema.collectionName === "string" ? schema.collectionName.slice(0, 100) : `${name}s`,
        info: {
          name: typeof ((_b = schema.info) == null ? void 0 : _b.name) === "string" ? schema.info.name.slice(0, 100) : name
        },
        attributes: sanitizeSchemaAttributes(schema.attributes),
        ...typeof schema.connection === "string" ? { connection: schema.connection.slice(0, 50) } : {}
      };
    }
  }
  return {
    success: true,
    schemas,
    contentTypeCount: Object.keys(schemas).length
  };
});

export { fetchSchema_post as default };
//# sourceMappingURL=fetch-schema.post.mjs.map
