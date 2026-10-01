// api/send-low-stock-alert.js
// Called by the app the moment a sale drops a product's stock to/below its
// minimum threshold. Uses Resend (resend.com) — free tier is generous and the
// API is a single fetch call, no SDK required.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { toEmail, bizName, productName, currentStock, minStock } = req.body;
  if (!toEmail || !productName) {
    return res.status(400).json({ error: 'toEmail and productName are required' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = process.env.ALERT_FROM_EMAIL || 'Trakit Alerts <onboarding@resend.dev>';

  if (!RESEND_API_KEY) {
    // Don't break the sale flow over a missing config — just log it server-side.
    console.error('RESEND_API_KEY is not set — low-stock email skipped');
    return res.status(200).json({ sent: false, reason: 'Email not configured' });
  }

  const stockWord = currentStock === 0 ? 'out of stock' : `down to ${currentStock} left`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [toEmail],
        subject: `Low stock: ${productName} — ${stockWord}`,
        html: `
          <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;">
            <h2 style="color:#0A0A0A;">Stock running low</h2>
            <p style="color:#3A3A3A;line-height:1.6;">
              <strong>${productName}</strong> at <strong>${bizName || 'your shop'}</strong> is ${stockWord}
              (your alert threshold is set to ${minStock}).
            </p>
            <p style="color:#3A3A3A;line-height:1.6;">
              Restock soon to avoid turning away a sale.
            </p>
            <p style="color:#8A8A8A;font-size:12px;margin-top:24px;">— Sent automatically by Trakit</p>
          </div>
        `,
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error('Resend error:', errText);
      return res.status(200).json({ sent: false, reason: 'Email provider error' });
    }

    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error('send-low-stock-alert error:', err);
    return res.status(200).json({ sent: false, reason: 'Network error' });
  }
}
