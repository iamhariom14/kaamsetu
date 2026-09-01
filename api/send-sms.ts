// Vercel Serverless Function — runs on the server, never in the browser.
// The Fast2SMS API key stays here (process.env.FAST2SMS_API_KEY) and is
// never sent to the client, unlike the old VITE_FAST2SMS_API_KEY approach.
//
// Deployed automatically by Vercel at: /api/send-sms

import type { VercelRequest, VercelResponse } from "@vercel/node";

const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!FAST2SMS_API_KEY) {
    console.warn("FAST2SMS_API_KEY not set on the server — skipping urgent SMS.");
    return res.status(200).json({ skipped: true, reason: "SMS not configured" });
  }

  const { workerPhone, customerName, service, address } = (req.body ?? {}) as {
    workerPhone?: string;
    customerName?: string;
    service?: string;
    address?: string;
  };

  const digits = String(workerPhone || "").replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) {
    return res.status(400).json({ error: "No valid 10-digit worker phone provided" });
  }
  if (!customerName || !service || !address) {
    return res.status(400).json({ error: "customerName, service, and address are required" });
  }

  const message = `Kaamsetu URGENT: ${customerName} needs a ${service} right now at ${address}. Open the Kaamsetu app to accept.`;

  const url = new URL("https://www.fast2sms.com/dev/bulkV2");
  url.searchParams.set("authorization", FAST2SMS_API_KEY);
  url.searchParams.set("route", "q");
  url.searchParams.set("message", message);
  url.searchParams.set("language", "english");
  url.searchParams.set("flash", "0");
  url.searchParams.set("numbers", digits);

  try {
    const fast2smsRes = await fetch(url.toString());
    const data = await fast2smsRes.json();
    if (data.return !== true) {
      console.error("Fast2SMS rejected the SMS:", data);
      return res.status(502).json({ error: "Fast2SMS rejected the message", details: data });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Failed to send urgent SMS:", err);
    return res.status(500).json({ error: "Failed to send SMS" });
  }
}
