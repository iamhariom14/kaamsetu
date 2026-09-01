// Vercel Serverless Function — runs on the server, never in the browser.
//
// Uses Textbelt's free tier (key="textbelt") — no signup, no recharge, no
// DLT registration. Limit: 1 free SMS per day, shared across everyone using
// the public "textbelt" key worldwide, so it's meant for demos, not
// production. For real usage later, swap TEXTBELT_KEY for a paid key from
// textbelt.com (set as an env var) or move back to a DLT-registered gateway.
//
// Deployed automatically by Vercel at: /api/send-sms

const TEXTBELT_KEY = process.env.TEXTBELT_KEY || "textbelt";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
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

  // Textbelt needs E.164 format outside the US — prefix with India's +91.
  const phone = `+91${digits}`;
  const message = `Kaamsetu URGENT: ${customerName} needs a ${service} right now at ${address}. Open the Kaamsetu app to accept.`;

  try {
    const textbeltRes = await fetch("https://textbelt.com/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message, key: TEXTBELT_KEY }),
    });
    const data = await textbeltRes.json();
    if (!data.success) {
      console.error("Textbelt rejected the SMS:", data);
      return res.status(502).json({ error: "Textbelt rejected the message", details: data });
    }
    return res.status(200).json({ success: true, textId: data.textId, quotaRemaining: data.quotaRemaining });
  } catch (err) {
    console.error("Failed to send urgent SMS:", err);
    return res.status(500).json({ error: "Failed to send SMS" });
  }
}
