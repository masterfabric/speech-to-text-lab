import { NextResponse } from "next/server";

const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

type Body = {
  firstName?: unknown;
  lastName?: unknown;
  reason?: unknown;
  consent?: unknown;
  locale?: unknown;
};

function asNonEmptyString(value: unknown, max = 500): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

/**
 * Proxies onboarding form → Web3Forms so WEB3FORMS_ACCESS_KEY stays server-side.
 * Docs: https://docs.web3forms.com/ (POST https://api.web3forms.com/submit)
 *
 * Note: Web3Forms recommends browser-side submit on free plans; server IP
 * whitelisting may be required on some plans. Prefer WEB3FORMS_ACCESS_KEY;
 * NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY is accepted only as a last-resort fallback
 * and should not be committed.
 */
export async function POST(request: Request) {
  const accessKey =
    process.env.WEB3FORMS_ACCESS_KEY ||
    process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY;

  if (!accessKey) {
    return NextResponse.json(
      {
        success: false,
        message:
          "WEB3FORMS_ACCESS_KEY is not configured on the server (.env.local).",
      },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const firstName = asNonEmptyString(body.firstName, 120);
  const lastName = asNonEmptyString(body.lastName, 120);
  const reason = asNonEmptyString(body.reason, 4000);
  const locale = asNonEmptyString(body.locale, 16) ?? "tr";
  const consented = body.consent === true;

  if (!firstName || !lastName || !reason) {
    return NextResponse.json(
      {
        success: false,
        message: "firstName, lastName, and reason are required.",
      },
      { status: 400 }
    );
  }
  if (!consented) {
    return NextResponse.json(
      { success: false, message: "KVKK / local-data consent is required." },
      { status: 400 }
    );
  }

  const payload = {
    access_key: accessKey,
    subject: "speech-to-text-lab onboarding",
    from_name: "speech-to-text-lab",
    name: `${firstName} ${lastName}`,
    first_name: firstName,
    last_name: lastName,
    message: reason,
    reason,
    kvkk_consent: "yes",
    locale,
    botcheck: false,
  };

  try {
    const upstream = await fetch(WEB3FORMS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await upstream.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
      body?: { message?: string };
    };

    if (!upstream.ok || data.success === false) {
      const message =
        data.message ||
        data.body?.message ||
        `Web3Forms error (${upstream.status})`;
      return NextResponse.json(
        { success: false, message },
        { status: upstream.status >= 400 ? upstream.status : 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: data.message || data.body?.message || "Submitted",
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        message:
          e instanceof Error ? e.message : "Failed to reach Web3Forms",
      },
      { status: 502 }
    );
  }
}
