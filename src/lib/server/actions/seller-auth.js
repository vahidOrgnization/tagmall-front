"use server";

import { cookies } from "next/headers";
import http from "@/app/api/axiosInstance";

const ACCESS_COOKIE = "tagmall_seller_access";
const REFRESH_COOKIE = "tagmall_seller_refresh";
const REGISTRATION_COOKIE = "tagmall_seller_registration";
const refreshes = new Map();

export async function hasSellerSession() {
  try {
    const cookieStore = await cookies();
    return cookieStore.has(ACCESS_COOKIE) || cookieStore.has(REFRESH_COOKIE);
  } catch (err) {
    handleUnexpectedSellerAuthError("hasSellerSession", err);
    return false;
  }
}

function writeCookie(cookieStore, name, value, maxAge) {
  cookieStore.set(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

const unavailable = { ok: false, message: "ارتباط با سامانهٔ فروشندگان برقرار نشد." };
const invalid = { ok: false, status: 401, message: "لطفاً دوباره وارد شوید." };

function handleUnexpectedSellerAuthError(action, error) {
  if (process.env.NODE_ENV === "development") {
    // Avoid logging request payloads or authentication headers.
    console.error("[seller-auth] " + action, { name: error?.name || "Error" });
  }
  return unavailable;
}

function serializeSellerAuthError(error) {
  const response = error?.response;
  if (!response) return unavailable;

  const { data, status, headers } = response;
  return {
    ok: false,
    status,
    message: data?.message || unavailable.message,
    code: data?.error_code,
    errors: data?.errors,
    attempts: data?.remaining_attempts,
    retryAfter: Number(data?.retry_after ?? headers?.["retry-after"]) || 0,
  };
}

async function requestSellerAuth({ url, method, data, accessToken, deviceId }) {
  const baseURL =
    process.env.SELLER_API_BASE_URL?.replace(/\/+$/, "") ||
    (process.env.NODE_ENV === "production" ? "" : "http://backend.tagmall.ir/api/v1/seller");

  if (!baseURL || (process.env.NODE_ENV === "production" && !baseURL.startsWith("https://"))) {
    return unavailable;
  }

  const headers = { Accept: "application/json", "Accept-Language": "fa-IR" };
  if (method === "POST") headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = "Bearer " + accessToken;
  if (typeof deviceId === "string" && /^[a-f0-9-]{36}$/i.test(deviceId)) {
    headers["X-Device-Id"] = deviceId;
  }

  try {
    const response = await http({
      baseURL,
      url,
      method,
      data,
      headers,
      timeout: 12000,
      maxRedirects: 0,
    });
    const responseData = response.data;
    if (responseData?.success !== true) return unavailable;
    return { ok: true, data: responseData.data };
  } catch (err) {
    return serializeSellerAuthError(err);
  }
}

function publicChallenge(result) {
  if (!result.ok) return result;
  const { challenge_id, code_length, resend_after, expires_in, mobile_masked, seller_type } =
    result.data ?? {};
  if (
    !challenge_id ||
    ![5, 6].includes(code_length) ||
    !Number.isFinite(resend_after) ||
    resend_after < 0 ||
    !Number.isFinite(expires_in) ||
    expires_in <= 0
  )
    return unavailable;
  return {
    ok: true,
    data: { challenge_id, code_length, resend_after, expires_in, mobile_masked, seller_type },
  };
}

export async function startSellerOtp({ seller_type, mobile, company_national_id, deviceId }) {
  try {
    const result = publicChallenge(
      await requestSellerAuth({
        url: "/auth/otp/request",
        method: "POST",
        data: { seller_type, mobile, ...(seller_type === "LEGAL" && { company_national_id }) },
        deviceId,
      }),
    );
    if (!result.ok) return result;

    const cookieStore = await cookies();
    cookieStore.delete(REGISTRATION_COOKIE);
    return result;
  } catch (err) {
    return handleUnexpectedSellerAuthError("startSellerOtp", err);
  }
}

export async function resendSellerOtp({ challenge_id, deviceId }) {
  try {
    return publicChallenge(
      await requestSellerAuth({
        url: "/auth/otp/resend",
        method: "POST",
        data: { challenge_id },
        deviceId,
      }),
    );
  } catch (err) {
    return handleUnexpectedSellerAuthError("resendSellerOtp", err);
  }
}

function saveSession(cookieStore, data) {
  if (
    !data?.access_token ||
    !data.refresh_token ||
    !Number.isInteger(data.expires_in) ||
    data.expires_in <= 0 ||
    !Number.isInteger(data.refresh_expires_in) ||
    data.refresh_expires_in <= 0
  )
    return false;

  writeCookie(cookieStore, ACCESS_COOKIE, data.access_token, data.expires_in);
  writeCookie(cookieStore, REFRESH_COOKIE, data.refresh_token, data.refresh_expires_in);
  return true;
}

export async function verifySellerOtp({ challenge_id, code }) {
  try {
    const result = await requestSellerAuth({
      url: "/auth/otp/verify",
      method: "POST",
      data: { challenge_id, code },
    });
    if (!result.ok) return result;
    const data = result.data;
    const cookieStore = await cookies();
    if (data?.status === "REGISTRATION_REQUIRED") {
      if (!data.registration_token || !Number.isInteger(data.expires_in) || data.expires_in <= 0)
        return unavailable;
      writeCookie(cookieStore, REGISTRATION_COOKIE, data.registration_token, data.expires_in);
      return { ok: true, data: { status: data.status, seller_preview: data.seller_preview } };
    }
    if (
      !["AUTHENTICATED", "ONBOARDING_REQUIRED"].includes(data?.status) ||
      !saveSession(cookieStore, data)
    ) {
      return unavailable;
    }
    cookieStore.delete(REGISTRATION_COOKIE);
    return { ok: true, data: { status: data.status } };
  } catch (err) {
    return handleUnexpectedSellerAuthError("verifySellerOtp", err);
  }
}

export async function registerSeller(type, fields) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(REGISTRATION_COOKIE)?.value;
    if (!token) return { ...invalid, code: "REGISTRATION_TOKEN_INVALID" };
    if (!["individual", "legal"].includes(type)) return unavailable;
    const result = await requestSellerAuth({
      url: "/auth/registrations/" + type,
      method: "POST",
      data: { ...fields, registration_token: token },
    });
    if (!result.ok) {
      if (result.code === "REGISTRATION_TOKEN_INVALID") cookieStore.delete(REGISTRATION_COOKIE);
      return result;
    }
    if (!saveSession(cookieStore, result.data)) return unavailable;
    cookieStore.delete(REGISTRATION_COOKIE);
    return { ok: true };
  } catch (err) {
    return handleUnexpectedSellerAuthError("registerSeller", err);
  }
}

function refreshSession(token) {
  if (!refreshes.has(token)) {
    const pending = requestSellerAuth({
      url: "/auth/token/refresh",
      method: "POST",
      data: { refresh_token: token },
    });
    refreshes.set(token, pending);
    const release = () => refreshes.delete(token);
    void pending.then(release, release);
  }
  return refreshes.get(token);
}

function clearSession(cookieStore) {
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
  cookieStore.delete(REGISTRATION_COOKIE);
}

async function withSession(operation) {
  const cookieStore = await cookies();
  const access = cookieStore.get(ACCESS_COOKIE)?.value;
  if (access) {
    const result = await operation(access);
    if (result.status !== 401) return result;
  }
  const token = cookieStore.get(REFRESH_COOKIE)?.value;
  if (!token) return invalid;
  const result = await refreshSession(token);
  if (!result.ok) {
    if (result.status === 401 || result.status === 403) clearSession(cookieStore);
    return result;
  }
  if (!saveSession(cookieStore, result.data)) return unavailable;
  return operation(result.data.access_token);
}

export async function getSellerPanelSession() {
  try {
    return await withSession(async (access) => {
      const me = await requestSellerAuth({ url: "/auth/me", method: "GET", accessToken: access });
      if (!me.ok) return me;
      if (!me.data?.seller?.status) return unavailable;
      const active = me.data.seller.status === "ACTIVE";
      const panel = await requestSellerAuth({
        url: active ? "/dashboard/summary" : "/onboarding/state",
        method: "GET",
        accessToken: access,
      });
      if (!panel.ok) return panel;
      return {
        ok: true,
        data: { ...me.data, ...(active ? { summary: panel.data } : { onboarding: panel.data }) },
      };
    });
  } catch (err) {
    return handleUnexpectedSellerAuthError("getSellerPanelSession", err);
  }
}

export async function logoutSeller() {
  try {
    const result = await withSession((access) =>
      requestSellerAuth({ url: "/auth/logout", method: "POST", accessToken: access, data: {} }),
    );
    if (result.ok || result.status === 401 || result.status === 403) {
      const cookieStore = await cookies();
      clearSession(cookieStore);
      return { ok: true };
    }
    return result;
  } catch (err) {
    return handleUnexpectedSellerAuthError("logoutSeller", err);
  }
}
