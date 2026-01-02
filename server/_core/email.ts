import { Resend } from "resend";

/**
 * Single Resend client for the whole backend
 */
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Types kept intentionally small and explicit.
 * These mirror what already exists in your DB.
 */
type Order = {
  id: string;
  customerEmail?: string | null;
};

type Purchase = {
  id: number;
  productKey: string;
};

/**
 * ============================================================
 * ORDER CONFIRMATION EMAIL
 * ============================================================
 *
 * This function:
 * - Sends ONE email per order
 * - Lists what was purchased
 * - Includes delivery links where applicable
 *
 * IMPORTANT RULES:
 * - No DB writes
 * - No Stripe calls
 * - No assumptions about frontend
 */
export async function sendOrderConfirmationEmail(args: {
  order: Order;
  purchases: Purchase[];
}) {
  const { order, purchases } = args;

  // Safety guard: never try to send without an email
  if (!order.customerEmail) {
    console.warn(
      "EMAIL: Order has no customer email, skipping",
      order.id
    );
    return;
  }

  /**
   * Build delivery lines
   * We do NOT embed files or secrets.
   * We ONLY point to backend delivery endpoints.
   */
  const deliveryLines = purchases.map(purchase => {
    return `
      <li>
        <strong>${purchase.productKey}</strong><br/>
        <a href="${process.env.PUBLIC_API_BASE_URL}/downloads/${purchase.id}">
          Download your purchase
        </a>
      </li>
    `;
  });

  /**
   * Very simple, reliable email HTML.
   * Styling can come later.
   */
  const html = `
    <div style="font-family: system-ui, sans-serif; line-height: 1.6;">
      <h2>Thank you for your purchase 🌊</h2>

      <p>
        Your order has been successfully processed.
      </p>

      <p>
        <strong>Order ID:</strong><br/>
        ${order.id}
      </p>

      <h3>Your items</h3>
      <ul>
        ${deliveryLines.join("")}
      </ul>

      <p style="margin-top: 24px;">
        If you have any issues, just reply to this email.
      </p>

      <p>
        — Desert Paddleboards
      </p>
    </div>
  `;

  /**
   * Send email
   */
  await resend.emails.send({
    from: "Desert Paddleboards <info@desertpaddleboards.com>",
    to: order.customerEmail,
    subject: "Your Desert Paddleboards purchase is ready",
    html,
  });

  console.log("EMAIL: Order confirmation sent", order.id);
}
