import { Resend } from 'resend'
import { formatCurrency } from './utils'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'Vaultly <notifications@vaultly.app>'

// ── Weekly Vault Score digest ────────────────────────────────────────────────
export async function sendVaultScoreEmail({
  to, name, score, trend, label, netWorth, currency = 'GBP',
}: {
  to: string; name: string; score: number; trend: number
  label: string; netWorth: number; currency?: string
}) {
  const trendText = trend === 0
    ? 'unchanged'
    : trend > 0
    ? `up ${trend} points`
    : `down ${Math.abs(trend)} points`

  const scoreColour = score >= 750 ? '#059669'
    : score >= 600 ? '#22c55e'
    : score >= 450 ? '#6366f1'
    : score >= 300 ? '#f59e0b'
    : '#94a3b8'

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your Vault Score this week: ${score}/850 — ${label}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:540px;margin:0 auto;padding:32px 16px">
    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-flex;align-items:center;gap:10px">
        <div style="width:40px;height:40px;border-radius:12px;background:#6366f1;display:inline-flex;align-items:center;justify-content:center">
          <span style="color:white;font-size:20px">V</span>
        </div>
        <span style="font-size:20px;font-weight:700;color:#1e293b">Vaultly</span>
      </div>
    </div>

    <!-- Card -->
    <div style="background:white;border-radius:24px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,0.06);border:1px solid #f1f5f9">
      <p style="margin:0 0 8px;font-size:14px;color:#64748b">Hi ${name.split(' ')[0]},</p>
      <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#1e293b">Your weekly Vault Score</h1>

      <!-- Score ring (CSS-based) -->
      <div style="text-align:center;margin:24px 0">
        <div style="display:inline-block;background:linear-gradient(135deg,${scoreColour}20,${scoreColour}10);border:3px solid ${scoreColour};border-radius:50%;width:120px;height:120px;line-height:120px">
          <span style="font-size:36px;font-weight:800;color:${scoreColour}">${score}</span>
        </div>
        <div style="margin-top:8px">
          <span style="font-size:16px;font-weight:600;color:${scoreColour}">${label}</span>
          <span style="font-size:13px;color:#94a3b8;margin-left:8px">${trendText} this week</span>
        </div>
      </div>

      <!-- Net worth -->
      <div style="background:#f8fafc;border-radius:12px;padding:16px;margin:16px 0;text-align:center">
        <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Net Worth</p>
        <p style="margin:0;font-size:28px;font-weight:700;color:#1e293b">${formatCurrency(netWorth, currency)}</p>
      </div>

      <div style="text-align:center;margin-top:24px">
        <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display:inline-block;background:#6366f1;color:white;text-decoration:none;padding:12px 28px;border-radius:12px;font-size:14px;font-weight:600">
          Open my vault →
        </a>
      </div>
    </div>

    <p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:24px">
      You're receiving this because you enabled weekly summaries in Vaultly.<br>
      <a href="${process.env.NEXTAUTH_URL}/profile" style="color:#6366f1">Manage notifications</a>
    </p>
  </div>
</body>
</html>`,
  })
}

// ── Monthly narrative email ───────────────────────────────────────────────────
export async function sendNarrativeEmail({
  to, name, headline, content, month,
}: {
  to: string; name: string; headline: string; content: string; month: string
}) {
  const [y, m] = month.split('-')
  const monthLabel = new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your ${monthLabel} wealth story is ready`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:540px;margin:0 auto;padding:32px 16px">
    <div style="text-align:center;margin-bottom:32px">
      <span style="font-size:20px;font-weight:700;color:#1e293b">📖 Vaultly</span>
    </div>
    <div style="background:white;border-radius:24px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
      <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">${monthLabel}</p>
      <h1 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#1e293b">${headline}</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#475569">${content}</p>
      <div style="text-align:center">
        <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display:inline-block;background:#6366f1;color:white;text-decoration:none;padding:12px 28px;border-radius:12px;font-size:14px;font-weight:600">
          See full story →
        </a>
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:24px">
      <a href="${process.env.NEXTAUTH_URL}/profile" style="color:#6366f1">Manage notifications</a>
    </p>
  </div>
</body>
</html>`,
  })
}

// ── Renewal reminder ─────────────────────────────────────────────────────────
export async function sendRenewalReminderEmail({
  to, name, renewalName, amount, dueDate, currency = 'GBP',
}: {
  to: string; name: string; renewalName: string
  amount: number; dueDate: string; currency?: string
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `⏰ Reminder: ${renewalName} renews in 7 days`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:540px;margin:0 auto;padding:32px 16px">
    <div style="background:white;border-radius:24px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1e293b">Renewal coming up</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#64748b">Hi ${name.split(' ')[0]}, just a heads-up:</p>
      <div style="background:#fef9ec;border:1px solid #fbbf24;border-radius:12px;padding:16px;margin:16px 0">
        <p style="margin:0 0 4px;font-weight:600;color:#92400e;font-size:16px">${renewalName}</p>
        <p style="margin:0;color:#78350f;font-size:14px">
          ${formatCurrency(amount, currency)} due on ${new Date(dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
      <p style="font-size:14px;color:#64748b">Review it in Vaultly to cancel, negotiate, or mark as handled.</p>
      <div style="text-align:center;margin-top:20px">
        <a href="${process.env.NEXTAUTH_URL}/renewals" style="display:inline-block;background:#6366f1;color:white;text-decoration:none;padding:12px 28px;border-radius:12px;font-size:14px;font-weight:600">
          View renewals →
        </a>
      </div>
    </div>
  </div>
</body>
</html>`,
  })
}
