import axios from "axios";

const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";

type EmailParams = {
  to: string;
  subject: string;
  html: string;
};

async function sendEmail(params: EmailParams): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.warn("SENDGRID_API_KEY not set – skipping email to", params.to);
    return;
  }

  const fromEmail = process.env.SENDGRID_FROM_EMAIL ?? "bookings@nyumbastays.com";
  const fromName = process.env.SENDGRID_FROM_NAME ?? "Nyumba Stays";

  try {
    await axios.post(
      SENDGRID_API_URL,
      {
        personalizations: [{ to: [{ email: params.to }] }],
        from: { email: fromEmail, name: fromName },
        subject: params.subject,
        content: [{ type: "text/html", value: params.html }],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error: any) {
    console.error("Failed to send email:", error.response?.data ?? error.message);
  }
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-MW", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const PUBLIC_URL = () => process.env.PUBLIC_URL ?? "http://localhost:3000";

function baseTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
  <tr><td style="background:#4f46e5;padding:24px 32px;">
    <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">Nyumba Stays</h1>
  </td></tr>
  <tr><td style="padding:32px;">
    <h2 style="margin:0 0 16px;color:#18181b;font-size:18px;">${title}</h2>
    ${body}
  </td></tr>
  <tr><td style="padding:24px 32px;background:#fafafa;border-top:1px solid #e4e4e7;">
    <p style="margin:0;font-size:12px;color:#71717a;text-align:center;">
      Nyumba Stays &middot; Short-term Apartments in Lilongwe<br>
      Questions? Reply to this email or WhatsApp +265 999 000 000
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;color:#71717a;font-size:14px;width:140px;">${label}</td>
    <td style="padding:8px 0;color:#18181b;font-size:14px;font-weight:500;">${value}</td>
  </tr>`;
}

export async function sendBookingConfirmation(params: {
  guestEmail: string;
  guestName: string;
  bookingId: string;
  propertyName: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  totalAmount: number;
  currency: string;
  paymentLink: string;
}): Promise<void> {
  const total = formatCurrency(params.totalAmount, params.currency);
  const cancelUrl = `${PUBLIC_URL()}/cancel-booking?bookingId=${params.bookingId}`;

  const body = `
    <p style="color:#3f3f46;font-size:14px;line-height:1.6;">
      Hi ${params.guestName},<br><br>
      Thank you for booking with Nyumba Stays! Here are your booking details:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      ${infoRow("Booking Ref", params.bookingId.slice(0, 8).toUpperCase())}
      ${infoRow("Property", params.propertyName)}
      ${infoRow("Check-in", formatDate(params.checkInDate))}
      ${infoRow("Check-out", formatDate(params.checkOutDate))}
      ${infoRow("Nights", String(params.nights))}
      ${infoRow("Total", total)}
    </table>
    <p style="color:#3f3f46;font-size:14px;line-height:1.6;">
      Please complete your payment to confirm the booking:
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${params.paymentLink}" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
        Pay ${total} Now
      </a>
    </div>
    <p style="color:#71717a;font-size:12px;line-height:1.6;">
      Payment link expires in 24 hours. If it expires, you can request a new one.<br><br>
      Need to cancel? <a href="${cancelUrl}" style="color:#4f46e5;">Cancel your booking here</a>.
    </p>`;

  await sendEmail({
    to: params.guestEmail,
    subject: `Booking Confirmation – ${params.propertyName}`,
    html: baseTemplate("Booking Confirmed", body),
  });
}

export async function sendPaymentSuccess(params: {
  guestEmail: string;
  guestName: string;
  bookingId: string;
  propertyName: string;
  checkInDate: string;
  checkOutDate: string;
  amountPaid: number;
  currency: string;
}): Promise<void> {
  const paid = formatCurrency(params.amountPaid, params.currency);
  const cancelUrl = `${PUBLIC_URL()}/cancel-booking?bookingId=${params.bookingId}`;

  const body = `
    <p style="color:#3f3f46;font-size:14px;line-height:1.6;">
      Hi ${params.guestName},<br><br>
      Great news — your payment of <strong>${paid}</strong> has been received! Your booking is now confirmed.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      ${infoRow("Booking Ref", params.bookingId.slice(0, 8).toUpperCase())}
      ${infoRow("Property", params.propertyName)}
      ${infoRow("Check-in", formatDate(params.checkInDate))}
      ${infoRow("Check-out", formatDate(params.checkOutDate))}
      ${infoRow("Amount Paid", paid)}
      ${infoRow("Status", '<span style="color:#16a34a;font-weight:600;">Paid ✓</span>')}
    </table>
    <h3 style="color:#18181b;font-size:15px;margin:24px 0 8px;">What to expect</h3>
    <ul style="color:#3f3f46;font-size:14px;line-height:1.8;padding-left:20px;">
      <li>You will receive check-in instructions closer to your arrival date.</li>
      <li>WiFi, parking, and local support are included.</li>
      <li>Contact us if you need early check-in or late check-out.</li>
    </ul>
    <p style="color:#71717a;font-size:12px;line-height:1.6;margin-top:24px;">
      Need to cancel? <a href="${cancelUrl}" style="color:#4f46e5;">Cancel your booking here</a>.<br>
      Free cancellation up to 48 hours before check-in.
    </p>`;

  await sendEmail({
    to: params.guestEmail,
    subject: `Payment Received – ${params.propertyName}`,
    html: baseTemplate("Payment Confirmed", body),
  });
}

export async function sendCancellationConfirmation(params: {
  guestEmail: string;
  guestName: string;
  bookingId: string;
  propertyName: string;
  checkInDate: string;
  checkOutDate: string;
  refundAmount: number;
  currency: string;
}): Promise<void> {
  const refund = formatCurrency(params.refundAmount, params.currency);

  const body = `
    <p style="color:#3f3f46;font-size:14px;line-height:1.6;">
      Hi ${params.guestName},<br><br>
      Your booking has been cancelled. Here are the details:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      ${infoRow("Booking Ref", params.bookingId.slice(0, 8).toUpperCase())}
      ${infoRow("Property", params.propertyName)}
      ${infoRow("Check-in", formatDate(params.checkInDate))}
      ${infoRow("Check-out", formatDate(params.checkOutDate))}
      ${infoRow("Refund", params.refundAmount > 0 ? refund : "No refund")}
      ${infoRow("Status", '<span style="color:#dc2626;font-weight:600;">Cancelled</span>')}
    </table>
    ${params.refundAmount > 0 ? `<p style="color:#3f3f46;font-size:14px;line-height:1.6;">
      Your refund of <strong>${refund}</strong> will be processed within 5–7 business days.
    </p>` : ""}
    <div style="text-align:center;margin:24px 0;">
      <a href="${PUBLIC_URL()}/properties" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
        Browse Properties
      </a>
    </div>
    <p style="color:#71717a;font-size:12px;line-height:1.6;">
      We're sorry to see you go. We hope to host you in the future!
    </p>`;

  await sendEmail({
    to: params.guestEmail,
    subject: `Booking Cancelled – ${params.propertyName}`,
    html: baseTemplate("Booking Cancelled", body),
  });
}
