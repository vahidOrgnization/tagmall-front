"use server";

import { cookies } from "next/headers";
import axios from "axios";

const accessCookie = "tagmall_seller_access";
const refreshCookie = "tagmall_seller_refresh";
const registrationCookie = "tagmall_seller_registration";
const refreshes = new Map();

export async function hasSellerSession() {
  const jar = await cookies();
  return jar.has(accessCookie) || jar.has(refreshCookie);
}

function writeCookie(jar, name, value, maxAge) {
  jar.set(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

const unavailable = { ok: false, message: "ارتباط با سامانهٔ فروشندگان برقرار نشد." };
const invalid = { ok: false, status: 401, message: "لطفاً دوباره وارد شوید." };

async function request(path, { body, access, deviceId } = {}) {
  const base = process.env.SELLER_API_BASE_URL?.replace(/\/+$/, "") ||
    (process.env.NODE_ENV === "production" ? "" : "http://backend.tagmall.ir/api/v1/seller");
  if (!base || (process.env.NODE_ENV === "production" && !base.startsWith("https://"))) {
    return unavailable;
  }
  try {
    const { data } = await axios.request({
      url: base + path,
      method: body === undefined ? "GET" : "POST",
      data: body,
      headers: {
        Accept: "application/json",
        "Accept-Language": "fa-IR",
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...(access && { Authorization: "Bearer " + access }),
        ...(typeof deviceId === "string" && /^[a-f0-9-]{36}$/i.test(deviceId) && { "X-Device-Id": deviceId }),
      },
      timeout: 12000,
      maxRedirects: 0,
    });
    if (data?.success !== true) return unavailable;
    return { ok: true, data: data.data };
  } catch (error) {
    const response = error.response;
    if (!response) return unavailable;
    return {
      ok: false,
      status: response.status,
      message: response.data?.message || unavailable.message,
      code: response.data?.error_code,
      errors: response.data?.errors,
      attempts: response.data?.remaining_attempts,
      retryAfter: Number(response.data?.retry_after ?? response.headers?.["retry-after"]) || 0,
    };
  }
}

function publicChallenge(result) {
  if (!result.ok) return result;
  const { challenge_id, code_length, resend_after, expires_in, mobile_masked, seller_type } = result.data ?? {};
  if (!challenge_id || ![5, 6].includes(code_length) ||
    !Number.isFinite(resend_after) || resend_after < 0 ||
    !Number.isFinite(expires_in) || expires_in <= 0) return unavailable;
  return { ok: true, data: { challenge_id, code_length, resend_after, expires_in, mobile_masked, seller_type } };
}

export async function startSellerOtp({ seller_type, mobile, company_national_id, deviceId }) {
  const result = publicChallenge(await request("/auth/otp/request", {
    body: { seller_type, mobile, ...(seller_type === "LEGAL" && { company_national_id }) },
    deviceId,
  }));
  if (result.ok) (await cookies()).delete(registrationCookie);
  return result;
}

export async function resendSellerOtp({ challenge_id, deviceId }) {
  return publicChallenge(await request("/auth/otp/resend", { body: { challenge_id }, deviceId }));
}

function saveSession(jar, data) {
  if (!data?.access_token || !data.refresh_token ||
    !Number.isInteger(data.expires_in) || data.expires_in <= 0 ||
    !Number.isInteger(data.refresh_expires_in) || data.refresh_expires_in <= 0) return false;

  writeCookie(jar, accessCookie, data.access_token, data.expires_in);
  writeCookie(jar, refreshCookie, data.refresh_token, data.refresh_expires_in);
  return true;
}

export async function verifySellerOtp({ challenge_id, code }) {
  const result = await request("/auth/otp/verify", { body: { challenge_id, code } });
  if (!result.ok) return result;
  const data = result.data;
  const jar = await cookies();
  if (data?.status === "REGISTRATION_REQUIRED") {
    if (!data.registration_token || !Number.isInteger(data.expires_in) || data.expires_in <= 0) return unavailable;
    writeCookie(jar, registrationCookie, data.registration_token, data.expires_in);
    return { ok: true, data: { status: data.status, seller_preview: data.seller_preview } };
  }
  if (!["AUTHENTICATED", "ONBOARDING_REQUIRED"].includes(data?.status) || !saveSession(jar, data)) {
    return unavailable;
  }
  jar.delete(registrationCookie);
  return { ok: true, data: { status: data.status } };
}

export async function registerSeller(type, fields) {
  const jar = await cookies();
  const token = jar.get(registrationCookie)?.value;
  if (!token) return { ...invalid, code: "REGISTRATION_TOKEN_INVALID" };
  if (!["individual", "legal"].includes(type)) return unavailable;
  const result = await request("/auth/registrations/" + type, {
    body: { ...fields, registration_token: token },
  });
  if (!result.ok) {
    if (result.code === "REGISTRATION_TOKEN_INVALID") jar.delete(registrationCookie);
    return result;
  }
  if (!saveSession(jar, result.data)) return unavailable;
  jar.delete(registrationCookie);
  return { ok: true };
}

function refreshSession(token) {
  if (!refreshes.has(token)) {
    const pending = request("/auth/token/refresh", { body: { refresh_token: token } });
    refreshes.set(token, pending);
    void pending.finally(() => refreshes.delete(token));
  }
  return refreshes.get(token);
}

function clearSession(jar) {
  jar.delete(accessCookie);
  jar.delete(refreshCookie);
  jar.delete(registrationCookie);
}

async function withSession(operation) {
  const jar = await cookies();
  const access = jar.get(accessCookie)?.value;
  if (access) {
    const result = await operation(access);
    if (result.status !== 401) return result;
  }
  const token = jar.get(refreshCookie)?.value;
  if (!token) return invalid;
  const result = await refreshSession(token);
  if (!result.ok) {
    if (result.status === 401 || result.status === 403) clearSession(jar);
    return result;
  }
  if (!saveSession(jar, result.data)) return unavailable;
  return operation(result.data.access_token);
}

export async function getSellerPanelSession() {
  return withSession(async (access) => {
    const me = await request("/auth/me", { access });
    if (!me.ok) return me;
    if (!me.data?.seller?.status) return unavailable;
    const active = me.data.seller.status === "ACTIVE";
    const panel = await request(active ? "/dashboard/summary" : "/onboarding/state", { access });
    if (!panel.ok) return panel;
    return { ok: true, data: { ...me.data, ...(active ? { summary: panel.data } : { onboarding: panel.data }) } };
  });
}

export async function logoutSeller() {
  const result = await withSession((access) => request("/auth/logout", { access, body: {} }));
  if (result.ok || result.status === 401 || result.status === 403) {
    clearSession(await cookies());
    return { ok: true };
  }
  return result;
}
