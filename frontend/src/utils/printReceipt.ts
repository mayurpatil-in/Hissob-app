/**
 * printReceipt.ts
 * Utility to open a branded, print-ready receipt popup window.
 * Prints only the receipt without any app UI chrome.
 */

export interface PrintReceiptData {
  receipt_number: string;
  receipt_date: string;
  amount: number;
  payment_mode: string;
  purpose?: string;
  notes?: string;
  upi_reference?: string;
  cheque_number?: string;
  bank_name?: string;
  transaction_ref?: string;
  status?: string;
  donor?: {
    full_name: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    pan_number?: string;
    is_80g_eligible?: boolean;
    donor_number?: string;
  };
  collector_name?: string;
  financial_year?: string;
  festival_name?: string;
}

/** Convert number to Indian currency words */
function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  }

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = convert(rupees) + ' Rupees';
  if (paise > 0) result += ' and ' + convert(paise) + ' Paise';
  return result + ' Only';
}

/** Generate the payment reference line */
function getPaymentRef(receipt: PrintReceiptData): string {
  const mode = receipt.payment_mode?.toUpperCase();
  if (mode === 'UPI' && receipt.upi_reference) return `UPI Ref: ${receipt.upi_reference}`;
  if (mode === 'CHEQUE' && receipt.cheque_number) return `Cheque No: ${receipt.cheque_number}${receipt.bank_name ? ' | Bank: ' + receipt.bank_name : ''}`;
  if ((mode === 'NEFT' || mode === 'RTGS') && receipt.transaction_ref) return `Transaction Ref: ${receipt.transaction_ref}`;
  return '';
}

/** Open a professional print popup for a donation receipt */
export function printReceiptWindow(receipt: PrintReceiptData, orgName = 'Hissob ERP'): void {
  const amountWords = numberToWords(Number(receipt.amount));
  const paymentRef = getPaymentRef(receipt);
  const is80G = receipt.donor?.is_80g_eligible;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Receipt ${receipt.receipt_number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      background: #f5f5f5;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 20px;
      min-height: 100vh;
    }
    .receipt {
      background: #ffffff;
      width: 210mm;
      max-width: 100%;
      border: 2px solid #0B2347;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.12);
    }
    .header {
      background: linear-gradient(135deg, #0B2347 0%, #1E5AA8 100%);
      padding: 24px 32px;
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .header-logo {
      width: 56px; height: 56px;
      background: #F97316;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; font-weight: 900; color: #fff;
      flex-shrink: 0;
    }
    .header-text h1 { color: #ffffff; font-size: 20px; font-weight: 900; margin-bottom: 2px; }
    .header-text p { color: rgba(255,255,255,0.75); font-size: 12px; }
    .receipt-meta {
      background: #F97316;
      padding: 10px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .receipt-meta span { color: #ffffff; font-size: 13px; font-weight: 700; }
    .badge-80g {
      background: #22C55E;
      color: #fff;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
    }
    .body { padding: 28px 32px; }
    .section { margin-bottom: 20px; }
    .section-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #888;
      margin-bottom: 8px;
      border-bottom: 1px solid #eee;
      padding-bottom: 4px;
    }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field label { font-size: 11px; color: #666; display: block; margin-bottom: 2px; }
    .field value { font-size: 14px; font-weight: 600; color: #0B2347; }
    .amount-box {
      background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
      border: 2px solid #22C55E;
      border-radius: 8px;
      padding: 16px 20px;
      text-align: center;
      margin: 20px 0;
    }
    .amount-box .amount-number {
      font-size: 36px;
      font-weight: 900;
      color: #15803D;
      letter-spacing: -1px;
    }
    .amount-box .amount-words {
      font-size: 12px;
      color: #166534;
      font-weight: 600;
      margin-top: 4px;
    }
    .mode-pill {
      display: inline-block;
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      color: #1D4ED8;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px dashed #ccc;
    }
    .sig-box { text-align: center; }
    .sig-line { width: 140px; border-bottom: 1px solid #333; height: 32px; margin: 0 auto 6px; }
    .sig-label { font-size: 11px; color: #666; }
    .footer {
      background: #F8F9FC;
      padding: 12px 32px;
      text-align: center;
      border-top: 1px solid #eee;
    }
    .footer p { font-size: 10px; color: #999; }
    .payment-ref { font-size: 12px; color: #666; margin-top: 4px; }
    @media print {
      body { background: #fff; padding: 0; }
      .receipt { box-shadow: none; border-radius: 0; border: 1px solid #ccc; width: 100%; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="header-logo">H</div>
      <div class="header-text">
        <h1>${orgName}</h1>
        <p>Official Donation Receipt &mdash; Festival Collection Management System</p>
      </div>
    </div>

    <div class="receipt-meta">
      <span>Receipt No: ${receipt.receipt_number}</span>
      <span>Date: ${receipt.receipt_date || new Date().toLocaleDateString('en-IN')}</span>
      ${is80G ? '<span class="badge-80g">✓ 80G Eligible</span>' : ''}
    </div>

    <div class="body">
      <!-- Donor Details -->
      <div class="section">
        <div class="section-title">Donor Details</div>
        <div class="grid-2">
          <div class="field">
            <label>Full Name</label>
            <value>${receipt.donor?.full_name || 'Anonymous Donor'}</value>
          </div>
          <div class="field">
            <label>Phone</label>
            <value>${receipt.donor?.phone || '—'}</value>
          </div>
          ${receipt.donor?.address ? `<div class="field"><label>Address</label><value>${receipt.donor.address}${receipt.donor.city ? ', ' + receipt.donor.city : ''}</value></div>` : ''}
          ${receipt.donor?.pan_number ? `<div class="field"><label>PAN Number</label><value>${receipt.donor.pan_number}</value></div>` : ''}
        </div>
      </div>

      <!-- Amount -->
      <div class="amount-box">
        <div class="amount-number">₹ ${Number(receipt.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        <div class="amount-words">${amountWords}</div>
      </div>

      <!-- Payment Details -->
      <div class="section">
        <div class="section-title">Payment Details</div>
        <div class="grid-2">
          <div class="field">
            <label>Payment Mode</label>
            <value><span class="mode-pill">${(receipt.payment_mode || 'CASH').toUpperCase()}</span></value>
          </div>
          <div class="field">
            <label>Purpose / Cause</label>
            <value>${receipt.purpose || 'Festival Donation'}</value>
          </div>
          ${receipt.festival_name ? `<div class="field"><label>Festival / Campaign</label><value>${receipt.festival_name}</value></div>` : ''}
          ${receipt.financial_year ? `<div class="field"><label>Financial Year</label><value>${receipt.financial_year}</value></div>` : ''}
        </div>
        ${paymentRef ? `<p class="payment-ref">🔗 ${paymentRef}</p>` : ''}
      </div>

      <!-- Collector -->
      <div class="section">
        <div class="section-title">Collection Details</div>
        <div class="field">
          <label>Collected By</label>
          <value>${receipt.collector_name || 'Collector'}</value>
        </div>
      </div>

      <!-- Signatures -->
      <div class="signatures">
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-label">Collector Signature</div>
        </div>
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-label">Authorized Trustee / Treasurer</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>This is a computer-generated receipt. Powered by Hissob ERP | Festival Collection & Financial Management</p>
      ${is80G ? '<p style="color:#15803D; font-weight:600; margin-top:4px;">This donation is eligible for 80G tax exemption under Income Tax Act.</p>' : ''}
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`;

  const printWin = window.open('', '_blank', 'width=900,height=700,toolbar=0,menubar=0,scrollbars=1');
  if (printWin) {
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
  }
}
