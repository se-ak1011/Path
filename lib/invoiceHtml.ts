// Builds a clean, print-ready HTML invoice for expo-print → PDF.
// Branding rule: the therapist's own logo + practice details are used when set;
// otherwise it falls back to a tasteful PATH wordmark header.

interface InvoiceLine { description: string; date?: string | null; qty?: number; unit_fee?: number; amount: number; }

interface BuildInvoiceParams {
  invoice: {
    number: string;
    status: 'draft' | 'sent' | 'paid';
    line_items: InvoiceLine[];
    total: number;
    issued_at: string | null;
    paid_at: string | null;
  };
  billTo: string;                 // client alias / reference (pseudonymised)
  therapist: {
    full_name?: string;
    practice_name?: string;
    email?: string;
    logo_url?: string;
    professional_body?: string;
    membership_number?: string;
    city?: string;
    postcode_area?: string;
  };
}

const money = (n: number) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');
const esc = (s?: string | null) => (s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export function buildInvoiceHtml({ invoice, billTo, therapist }: BuildInvoiceParams): string {
  const hasLogo = !!therapist.logo_url;
  const practice = esc(therapist.practice_name || therapist.full_name || 'Private Practice');
  const paid = invoice.status === 'paid';

  const brandHeader = hasLogo
    ? `<img src="${esc(therapist.logo_url)}" alt="logo" style="max-height:64px;max-width:220px;object-fit:contain;" />`
    : `<div class="wordmark">PA<span class="bar">|</span>TH</div>`;

  const practiceLines = [
    esc(therapist.full_name),
    therapist.professional_body ? `${esc(therapist.professional_body)}${therapist.membership_number ? ' · ' + esc(therapist.membership_number) : ''}` : '',
    [esc(therapist.city), esc(therapist.postcode_area)].filter(Boolean).join(', '),
    esc(therapist.email),
  ].filter(Boolean).map(l => `<div>${l}</div>`).join('');

  const rows = invoice.line_items.map(li => `
    <tr>
      <td>${esc(li.description)}</td>
      <td class="num">${money(li.amount)}</td>
    </tr>`).join('');

  return `<!doctype html><html><head><meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; color: #1a1a1e; margin: 0; padding: 40px; -webkit-print-color-adjust: exact; }
    .top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .wordmark { font-size: 34px; font-weight: 800; letter-spacing: 2px; color: #17131e; }
    .wordmark .bar { color: #7B6C91; font-weight: 400; margin: 0 1px; }
    .practice { text-align: right; font-size: 12px; color: #55555f; line-height: 1.6; }
    .practice .name { font-size: 15px; font-weight: 700; color: #1a1a1e; margin-bottom: 4px; }
    h1 { font-size: 24px; letter-spacing: -0.3px; margin: 0 0 4px; }
    .muted { color: #77777f; font-size: 13px; }
    .meta { display: flex; gap: 48px; margin: 28px 0 8px; }
    .meta .label { text-transform: uppercase; letter-spacing: 1px; font-size: 10px; color: #99999f; margin-bottom: 4px; }
    .meta .value { font-size: 14px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th { text-align: left; text-transform: uppercase; letter-spacing: 1px; font-size: 10px; color: #99999f; border-bottom: 2px solid #eceaf0; padding: 10px 0; }
    th.num, td.num { text-align: right; }
    td { padding: 14px 0; border-bottom: 1px solid #f0eef4; font-size: 14px; }
    .total-row { display: flex; justify-content: flex-end; margin-top: 20px; }
    .total-box { min-width: 240px; }
    .total-box .line { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .total-box .grand { border-top: 2px solid #17131e; margin-top: 6px; padding-top: 12px; font-size: 20px; font-weight: 800; }
    .stamp { display: inline-block; margin-top: 28px; border: 2px solid ${paid ? '#5B8A6F' : '#b0a0c4'}; color: ${paid ? '#5B8A6F' : '#7B6C91'}; padding: 6px 16px; border-radius: 6px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; font-size: 13px; }
    .footer { margin-top: 60px; padding-top: 16px; border-top: 1px solid #eceaf0; font-size: 11px; color: #a0a0a8; }
  </style></head>
  <body>
    <div class="top">
      <div>${brandHeader}</div>
      <div class="practice"><div class="name">${practice}</div>${practiceLines}</div>
    </div>

    <h1>Invoice ${esc(invoice.number)}</h1>

    <div class="meta">
      <div><div class="label">Billed to</div><div class="value">${esc(billTo)}</div></div>
      <div><div class="label">Issued</div><div class="value">${fmtDate(invoice.issued_at)}</div></div>
      ${paid ? `<div><div class="label">Paid</div><div class="value">${fmtDate(invoice.paid_at)}</div></div>` : ''}
    </div>

    <table>
      <thead><tr><th>Description</th><th class="num">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="total-row"><div class="total-box">
      <div class="line grand"><span>Total</span><span>${money(invoice.total)}</span></div>
    </div></div>

    <div class="stamp">${paid ? 'Paid' : invoice.status === 'sent' ? 'Awaiting payment' : 'Draft'}</div>

    <div class="footer">${hasLogo ? esc(practice) : 'Generated with PATH · practice administration for therapists'}</div>
  </body></html>`;
}
