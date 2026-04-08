import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

type GiftCertificateEmailPayload = {
  code: string;
  amount?: number | null;
  currency?: string | null;
};

type SendOrderConfirmationEmailArgs = {
  to: string;
  productKey: string;
  downloadToken?: string | null;
  giftCertificate?: GiftCertificateEmailPayload | null;
};

function formatMoney(amount?: number | null, currency?: string | null) {
  if (typeof amount !== "number") return null;
  return `${(amount / 100).toFixed(2)} ${String(currency || "usd").toUpperCase()}`;
}

export async function sendOrderConfirmationEmail({
  to,
  productKey,
  downloadToken,
  giftCertificate,
}: SendOrderConfirmationEmailArgs) {
  if (!resend) {
    console.warn("RESEND_API_KEY missing, skipping email send");
    return;
  }

  const isDigital = Boolean(downloadToken);
  const isGift = Boolean(giftCertificate?.code);

  const subject = isGift
    ? "Your Blue Wave Experiences gift certificate is ready"
    : "Your Blue Wave Experiences purchase is ready";

  const moneyLabel = formatMoney(giftCertificate?.amount, giftCertificate?.currency);

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 640px; margin: 0 auto; padding: 24px;">
      <h1 style="margin: 0 0 16px; font-size: 28px;">Thanks for your purchase</h1>
      <p style="margin: 0 0 16px;">We’ve confirmed your order for <strong>${productKey}</strong>.</p>

      ${isGift ? `
        <div style="margin: 24px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 16px; background: #f8fafc;">
          <h2 style="margin: 0 0 12px; font-size: 20px;">Your gift certificate code</h2>
          <p style="margin: 0 0 12px; color: #4b5563;">Share this code with the recipient so they can redeem it later.</p>
          <div style="font-size: 30px; font-weight: 700; letter-spacing: 1px; margin-bottom: 12px;">${giftCertificate?.code}</div>
          ${moneyLabel ? `<p style="margin: 0; color: #4b5563;">Value: <strong>${moneyLabel}</strong></p>` : ""}
        </div>
      ` : ""}

      ${isDigital ? `
        <div style="margin: 24px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 16px; background: #f8fafc;">
          <h2 style="margin: 0 0 12px; font-size: 20px;">Your digital access</h2>
          <p style="margin: 0 0 12px; color: #4b5563;">Use the link below to access your purchase.</p>
          <p style="margin: 0;"><a href="${process.env.PUBLIC_APP_URL || ""}/download/${downloadToken}" style="color: #2563eb;">Download your purchase</a></p>
        </div>
      ` : ""}

      <p style="margin-top: 24px; color: #4b5563;">If you have any issues, just reply to this email and we’ll help.</p>
      <p style="margin-top: 24px;">Blue Wave Experiences</p>
    </div>
  `;

  await resend.emails.send({
    from: "Blue Wave Experiences <info@desertpaddleboards.com>",
    to,
    subject,
    html,
  });
}
