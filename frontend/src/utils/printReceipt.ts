/**
 * printReceipt.ts
 * Utility to open a branded, print-ready receipt popup window.
 * Prints only the receipt without any app UI chrome.
 */
import { getMyOrganization } from '../api/services';

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
/** Open a professional print popup for a donation receipt */
export async function printReceiptWindow(receipt: PrintReceiptData, fallbackOrgName = 'Hissob ERP'): Promise<void> {
  let orgData: any = null;
  try {
    orgData = await getMyOrganization();
  } catch (err) {
    console.error('Failed to fetch org settings for receipt', err);
  }
  const orgName = orgData?.name || fallbackOrgName;
  const logoUrl = orgData?.logo_url ? import.meta.env.VITE_API_URL?.replace('/api/v1', '') + orgData.logo_url : 'https://cdn-icons-png.flaticon.com/512/103/103328.png';
  const qrCodeUrl = orgData?.qr_code_url ? import.meta.env.VITE_API_URL?.replace('/api/v1', '') + orgData.qr_code_url : null;
  const upiId = orgData?.upi_id || 'hissob@upi';
  
  const amountWords = numberToWords(Number(receipt.amount));
  
  const p = (receipt.purpose || '').toLowerCase();
  const isGanesh = p.includes('ganesh') || p.includes('festival') || p.includes('utsav');
  const isMahaprasad = p.includes('prasad') || p.includes('annadaan');
  const isDecoration = p.includes('decor');
  const isSocial = p.includes('social');
  const isDonation = !isGanesh && !isMahaprasad && !isDecoration && !isSocial && (p.includes('donation') || p.includes('vargani'));
  const isOther = !isGanesh && !isMahaprasad && !isDecoration && !isSocial && !isDonation;

  const mode = (receipt.payment_mode || 'CASH').toUpperCase();
  const isCash = mode === 'CASH';
  const isUPI = mode === 'UPI';
  const isBank = mode === 'NEFT' || mode === 'RTGS' || mode === 'BANK TRANSFER';
  const isCheque = mode === 'CHEQUE';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Donation Receipt ${receipt.receipt_number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Mukta:wght@400;600;700;800&family=Inter:wght@400;500;600;700;800;900&family=Yatra+One&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', sans-serif;
      background: #cbd5e1;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .receipt-wrapper {
      width: 1050px;
      height: 742px; /* A4 Landscape aspect ratio */
      background: #ffffff;
      position: relative;
      overflow: hidden;
      border: 4px solid transparent;
      border-left: 6px dashed #cbd5e1; /* Perforated Edge */
      background-clip: padding-box;
      border-radius: 12px;
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.3);
      padding: 20px;
      display: flex;
      flex-direction: column;
    }
    
    /* Elegant gradient border wrapper */
    .receipt-wrapper::before {
      content: ''; position: absolute; top: 0; right: 0; bottom: 0; left: 0;
      z-index: -1; margin: -4px; border-radius: inherit;
      background: linear-gradient(135deg, #ea580c, #fcd34d, #ea580c, #4338ca);
      border-left: none;
    }

    /* Faint Center Watermark */
    .watermark-bg {
      position: absolute;
      top: 55%; left: 50%;
      transform: translate(-50%, -50%);
      font-size: 450px;
      color: #fb923c;
      opacity: 0.04;
      z-index: 0;
      font-weight: 900;
      pointer-events: none;
      line-height: 1;
    }

    /* Wavy Backgrounds */
    .bg-wave-left {
      position: absolute; top: -100px; left: -80px; width: 400px; height: 350px;
      background: linear-gradient(135deg, #ff9100, #ffb347);
      border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
      opacity: 0.15; z-index: 0;
    }
    .bg-wave-right {
      position: absolute; top: -120px; right: -80px; width: 450px; height: 300px;
      background: linear-gradient(135deg, #1e3a8a, #4338ca);
      border-radius: 60% 40% 30% 70% / 50% 40% 60% 40%;
      opacity: 0.08; z-index: 0;
    }
    .bg-wave-bottom {
      position: absolute; bottom: -80px; left: -100px; width: 120%; height: 160px;
      background: linear-gradient(90deg, #1e3a8a, #3730a3, #4338ca);
      border-radius: 50% 50% 0 0 / 100% 100% 0 0;
      opacity: 0.85; z-index: 0;
    }

    /* Top Header Section */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      z-index: 1;
      padding: 0 20px;
    }
    
    .ganesha-wrapper {
      position: relative;
      width: 140px; height: 140px;
      transform: scale(1.3);
      transform-origin: center left;
    }
    /* Sunburst effect */
    .ganesha-wrapper::before {
      content: ''; position: absolute; top: -10px; left: -10px; right: -10px; bottom: -10px;
      background: repeating-conic-gradient(from 0deg, #fef08a 0deg 15deg, transparent 15deg 30deg);
      border-radius: 50%; opacity: 0.5; z-index: -1; animation: spin 20s linear infinite;
    }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    .ganesha-img {
      width: 140px; height: 140px;
      border-radius: 50%;
      box-shadow: 0 0 25px rgba(255, 145, 0, 0.5), inset 0 0 10px rgba(255,145,0,0.2);
      background: url('${logoUrl}') center/contain no-repeat, #fff;
      border: 3px solid #ff9100;
      position: relative; z-index: 1;
    }

    .header-center {
      text-align: center;
      flex: 1;
    }
    .shree-text { color: #d92d20; font-family: 'Yatra One', cursive; font-size: 22px; margin-bottom: -4px; letter-spacing: 2px;}
    .mandal-title { color: #1e3a8a; font-family: 'Yatra One', cursive; font-size: 52px; line-height: 1.1; margin-bottom: 2px; text-shadow: 1px 1px 0 rgba(0,0,0,0.05);}
    .mandal-address { color: #334155; font-size: 15px; font-weight: 600; }
    .mandal-reg { color: #475569; font-size: 12px; font-weight: 500; margin-top: 4px; letter-spacing: 0.5px;}

    .logo-container {
      display: flex; align-items: center; gap: 10px;
      background: rgba(255,255,255,0.9); padding: 8px 12px; border-radius: 12px; border: 1px solid #f1f5f9; box-shadow: 0 4px 10px rgba(0,0,0,0.03);
    }
    .logo-icon {
      width: 48px; height: 48px;
      background: linear-gradient(135deg, #1e3a8a, #4338ca); color: #fff; border-radius: 10px;
      display: flex; justify-content: center; align-items: center;
      font-weight: 800; font-size: 28px; border: 2px solid #ff9100;
      box-shadow: 0 4px 8px rgba(30,58,138,0.2);
    }
    .logo-text { color: #1e3a8a; font-weight: 900; font-size: 26px; line-height: 1; letter-spacing: -0.5px;}
    .logo-text span { font-size: 10px; font-weight: 600; color: #64748b; display: block; letter-spacing: 0;}

    /* Orange Donation Banner */
    .banner-row {
      display: flex; justify-content: center;
      position: relative; z-index: 1; margin-top: 10px; margin-bottom: 15px;
    }
    .main-banner {
      background: linear-gradient(90deg, #c2410c 0%, #ea580c 50%, #c2410c 100%);
      color: #fff;
      padding: 4px 70px 8px;
      border-radius: 40px;
      text-align: center;
      box-shadow: 0 6px 15px rgba(234,88,12,0.3);
      border: 3px solid #fff;
      position: relative;
    }
    .main-banner::before, .main-banner::after {
      content: '⚜'; position: absolute; top: 50%; transform: translateY(-50%);
      color: #fde68a; font-size: 24px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .main-banner::before { left: 24px; }
    .main-banner::after { right: 24px; }
    .main-banner h2 { font-size: 24px; font-weight: 900; letter-spacing: 1.5px; line-height: 1.2; text-shadow: 0 2px 4px rgba(0,0,0,0.1);}
    .main-banner p { font-size: 20px; font-family: 'Yatra One', cursive; letter-spacing: 1px; color: #ffedd5; margin-top: -2px;}

    /* Receipt No & Date with Barcode */
    .meta-row {
      display: flex; justify-content: space-between; align-items: flex-end;
      position: relative; z-index: 1; padding: 0 30px; margin-bottom: 15px;
    }
    .meta-box {
      background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px;
      padding: 8px 20px; font-size: 14px; color: #475569; font-weight: 600;
      display: flex; align-items: center; justify-content: space-between; width: auto; gap: 12px;
      white-space: nowrap;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
    }
    .meta-box strong { font-size: 17px; color: #0f172a; font-weight: 800; }
    
    .barcode-box {
      display: flex; flex-direction: column; align-items: center;
    }
    .barcode {
      height: 28px; width: 140px;
      background-image: repeating-linear-gradient(to right, #0f172a, #0f172a 2px, transparent 2px, transparent 4px, #0f172a 4px, #0f172a 5px, transparent 5px, transparent 8px, #0f172a 8px, #0f172a 11px, transparent 11px, transparent 14px);
      margin-bottom: 4px; opacity: 0.8;
    }
    .barcode-text { font-size: 9px; color: #64748b; font-weight: 700; letter-spacing: 2px;}

    /* Layout Body */
    .body-content {
      display: flex; gap: 20px; padding: 0 10px; position: relative; z-index: 1; flex: 1;
    }

    /* Left Panel */
    .left-panel {
      flex: 1.1;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      background: #fff;
      display: flex; flex-direction: column;
      overflow: hidden;
      box-shadow: 0 4px 10px rgba(0,0,0,0.03);
    }
    .panel-head-blue {
      background: linear-gradient(90deg, #4f46e5, #4338ca); color: #fff; padding: 10px 16px;
      font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 10px; letter-spacing: 0.5px;
    }
    .donor-info { padding: 12px 16px; }
    .info-table { width: 100%; border-collapse: collapse; }
    .info-table td { padding: 8px 0; font-size: 15px; border-bottom: 1px dashed #cbd5e1; }
    .info-table tr:last-child td { border-bottom: none; }
    .info-table td:first-child { width: 100px; color: #475569; font-weight: 600; }
    .info-table td:last-child { color: #0f172a; font-weight: 700; }

    /* Amount Box with Rubber Stamp */
    .amt-box-wrapper {
      background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border-radius: 10px; border: 1px solid #fed7aa;
      margin: 10px 16px; display: flex; padding: 16px; align-items: center; gap: 16px;
      box-shadow: inset 0 2px 5px rgba(255,255,255,0.8), 0 2px 8px rgba(234,88,12,0.08);
      position: relative; overflow: hidden;
    }
    .rubber-stamp {
      position: absolute; right: 20px; top: 10px;
      transform: rotate(-15deg);
      border: 3px solid rgba(220, 38, 38, 0.25);
      color: rgba(220, 38, 38, 0.25);
      font-size: 20px; font-weight: 900;
      padding: 2px 10px; border-radius: 6px;
      letter-spacing: 4px; pointer-events: none;
      text-transform: uppercase;
    }
    .rupee-icon {
      background: linear-gradient(135deg, #ea580c, #c2410c); color: #fff; width: 56px; height: 56px;
      border-radius: 10px; display: flex; justify-content: center; align-items: center;
      font-size: 32px; font-weight: 800; box-shadow: 0 4px 8px rgba(234,88,12,0.3);
    }
    .amt-nums { flex: 1; }
    .amt-nums .lbl { font-size: 11px; color: #9a3412; font-weight: 800; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px;}
    .amt-nums .val { font-size: 34px; font-weight: 900; color: #0f172a; line-height: 1; letter-spacing: -0.5px;}
    .amt-words-box { flex: 1.5; border-left: 2px solid #fdba74; padding-left: 16px; }
    .amt-words-box .lbl { font-size: 11px; color: #9a3412; font-weight: 800; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px;}
    .amt-words-box .val { font-size: 14px; font-weight: 700; color: #0f172a; line-height: 1.3;}

    .remarks {
      background: #f0f9ff; border-radius: 8px; padding: 10px 16px;
      margin: 0 16px 12px; font-size: 14px; color: #0369a1; font-weight: 600; border: 1px solid #bae6fd;
    }
    .remarks strong { color: #075985; font-weight: 800;}

    /* Right Panel */
    .right-panel {
      flex: 1;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      background: rgba(248, 250, 252, 0.8);
      padding: 16px;
      display: flex; flex-direction: column; gap: 16px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.03);
    }
    .rp-section-title { font-size: 16px; font-weight: 800; color: #1e3a8a; display: flex; align-items: center; gap: 8px; margin-bottom: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;}
    .purpose-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    
    .cb-item { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; color: #334155; }
    .cb-box { width: 18px; height: 18px; border: 2px solid #94a3b8; border-radius: 4px; display: flex; justify-content: center; align-items: center; font-size: 13px; color: #fff; background: #fff;}
    .cb-box.active { background: #ea580c; border-color: #ea580c; box-shadow: 0 2px 4px rgba(234,88,12,0.3);}
    .other-line { border-bottom: 1px dashed #94a3b8; flex: 1; display: inline-block; min-width: 40px; margin-left: 4px; }

    .payment-box {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; flex: 1;
      display: flex; justify-content: space-between; gap: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.02);
    }
    .pay-details { flex: 1; }
    .pay-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .utr-text { font-size: 13px; color: #475569; font-weight: 600; background: #f1f5f9; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0;}
    .utr-text strong { color: #0f172a; font-size: 14px; font-weight: 800; display: block; margin-top: 2px;}

    .qr-box {
      width: 100px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px;
      text-align: center; background: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center;
    }
    .qr-box img { width: 100%; height: auto; mix-blend-mode: multiply; border-radius: 4px;}
    .qr-box div { font-size: 11px; font-weight: 800; color: #1e3a8a; margin-bottom: 6px; }
    .qr-box .upi-id { font-size: 9px; color: #64748b; word-break: break-all; margin-top: 4px; font-weight: 600; }

    /* Bottom Footer */
    .footer {
      display: flex; flex-direction: column; align-items: center;
      position: relative; z-index: 1; margin-top: 15px; padding-bottom: 10px;
    }
    .footer-yellow {
      background: linear-gradient(90deg, #fef08a, #fde047, #fef08a); border-radius: 8px; padding: 8px 40px;
      text-align: center; border: 1px solid #facc15; box-shadow: 0 4px 10px rgba(0,0,0,0.08);
    }
    .footer-yellow h3 { color: #b45309; font-size: 20px; font-weight: 900; font-family: 'Mukta', sans-serif; margin-bottom: 2px; }
    .footer-yellow p { color: #713f12; font-size: 13px; font-weight: 600; font-style: italic; }
    
    .signatures {
      width: 100%; display: flex; justify-content: space-between; padding: 0 50px; margin-top: -10px;
    }
    .sig { text-align: center; }
    .sig-line { width: 160px; border-bottom: 2px solid #334155; height: 30px; margin-bottom: 8px; position: relative;}
    .sig-line::after { content: ''; position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%); opacity: 0.2; font-size: 20px;}
    .sig-label { font-size: 14px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px;}
    .sig-white { color: #fff; } /* Right signature on top of blue wave */
    .sig-line-white { border-bottom: 2px solid #fff; }
    .sig-line-white::after { color: #fff; opacity: 0.4;}

    @media print {
      @page { size: A4 landscape; margin: 0; }
      body { padding: 0; background: #fff; }
      .receipt-wrapper { border: none; box-shadow: none; width: 297mm; height: 210mm; border-radius: 0;}
      .receipt-wrapper::before { display: none; }
      .ganesha-wrapper::before { animation: none; transform: rotate(45deg); opacity: 0.3; } /* Stop animation on print */
    }
  </style>
</head>
<body>
  <div class="receipt-wrapper">
    <div class="watermark-bg">ॐ</div>
    <div class="bg-wave-left"></div>
    <div class="bg-wave-right"></div>
    <div class="bg-wave-bottom"></div>

    <!-- Header -->
    <div class="header">
      <div class="ganesha-wrapper">
        <div class="ganesha-img"></div>
      </div>
      <div class="header-center">
        <div class="shree-text">॥ श्री गणेशाय नमः ॥</div>
        <div class="mandal-title">${orgName}</div>
        <div class="mandal-address">${receipt.donor?.address ? receipt.donor.address + ', ' : ''}${receipt.donor?.city || 'Maharashtra, India'}</div>
        <div class="mandal-reg">Registered Organization | Official Receipt</div>
      </div>
      <div class="logo-container">
        <div class="logo-icon">H</div>
        <div class="logo-text">Hisob<span>Simple Accounting<br>for Mandal & Trusts</span></div>
      </div>
    </div>

    <!-- Banner -->
    <div class="banner-row">
      <div class="main-banner">
        <h2>DONATION RECEIPT</h2>
        <p>देणगी पावती</p>
      </div>
    </div>

    <!-- Meta -->
    <div class="meta-row">
      <div class="meta-box">Receipt No. &nbsp;&nbsp;&nbsp;&nbsp;<strong>${receipt.receipt_number}</strong></div>
      <div class="barcode-box">
        <div class="barcode"></div>
        <div class="barcode-text">* ${receipt.receipt_number.toUpperCase()} *</div>
      </div>
      <div class="meta-box">Date &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>${receipt.receipt_date || new Date().toLocaleDateString('en-IN')}</strong></div>
    </div>

    <!-- Body -->
    <div class="body-content">
      <!-- Left Box -->
      <div class="left-panel">
        <div class="panel-head-blue">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 11c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z"></path></svg>
          Received With Thanks From
        </div>
        <div class="donor-info">
          <table class="info-table">
            <tr><td>Donor Name</td><td>: <strong>${receipt.donor?.full_name || 'Anonymous'}</strong></td></tr>
            <tr><td>Address</td><td>: ${receipt.donor?.address || '—'} ${receipt.donor?.city ? ', ' + receipt.donor.city : ''}</td></tr>
            <tr><td>Mobile No.</td><td>: ${receipt.donor?.phone || '—'}</td></tr>
            <tr><td>Email</td><td>: ${receipt.donor?.email || '—'}</td></tr>
          </table>
        </div>
        <div class="amt-box-wrapper">
          <div class="rubber-stamp">RECEIVED</div>
          <div class="rupee-icon">₹</div>
          <div class="amt-nums">
            <div class="lbl">Amount</div>
            <div class="val">${Number(receipt.amount).toLocaleString('en-IN')}/-</div>
          </div>
          <div class="amt-words-box">
            <div class="lbl">Amount in Words</div>
            <div class="val">Rupees ${amountWords}</div>
          </div>
        </div>
        <div class="remarks">
          <strong>Remarks :</strong> ${receipt.notes || receipt.purpose || 'Happy Ganesh Festival! Ganpati Bappa Morya!'}
        </div>
      </div>

      <!-- Right Box -->
      <div class="right-panel">
        <div>
          <div class="rp-section-title">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2L15 8L21 9L16.5 14L18 20L12 17L6 20L7.5 14L3 9L9 8L12 2Z"></path></svg>
            Purpose of Donation
          </div>
          <div class="purpose-grid">
            <div class="cb-item"><div class="cb-box ${isGanesh ? 'active' : ''}">${isGanesh ? '✓' : ''}</div> Ganesh Festival</div>
            <div class="cb-item"><div class="cb-box ${isDonation ? 'active' : ''}">${isDonation ? '✓' : ''}</div> Donation</div>
            <div class="cb-item"><div class="cb-box ${isMahaprasad ? 'active' : ''}">${isMahaprasad ? '✓' : ''}</div> Mahaprasad</div>
            <div class="cb-item"><div class="cb-box ${isDecoration ? 'active' : ''}">${isDecoration ? '✓' : ''}</div> Decoration</div>
            <div class="cb-item"><div class="cb-box ${isSocial ? 'active' : ''}">${isSocial ? '✓' : ''}</div> Social Activity</div>
            <div class="cb-item"><div class="cb-box ${isOther ? 'active' : ''}">${isOther ? '✓' : ''}</div> Other <span class="other-line">${isOther ? receipt.purpose : ''}</span></div>
          </div>
        </div>

        <div class="payment-box">
          <div class="pay-details">
            <div class="rp-section-title" style="margin-bottom:8px;">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect><path d="M2 10H22"></path></svg>
              Payment Mode
            </div>
            <div class="pay-grid">
              <div class="cb-item"><div class="cb-box ${isCash ? 'active' : ''}">${isCash ? '✓' : ''}</div> Cash</div>
              <div class="cb-item"><div class="cb-box ${isUPI ? 'active' : ''}">${isUPI ? '✓' : ''}</div> UPI</div>
              <div class="cb-item"><div class="cb-box ${isBank ? 'active' : ''}">${isBank ? '✓' : ''}</div> Bank Transfer</div>
              <div class="cb-item"><div class="cb-box ${isCheque ? 'active' : ''}">${isCheque ? '✓' : ''}</div> Cheque</div>
            </div>
            <div class="utr-text">
              Transaction / UTR No. : <strong>${receipt.transaction_ref || receipt.upi_reference || receipt.cheque_number || '—'}</strong>
            </div>
          </div>
          <div class="qr-box">
            <div>Scan & Pay (UPI)</div>
            ${qrCodeUrl 
              ? `<img src="${qrCodeUrl}" alt="QR" />` 
              : `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=${upiId}&pn=${orgName}&am=${receipt.amount}" alt="QR" />`
            }
            <div class="upi-id">UPI ID: ${upiId}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-yellow">
        <h3>॥ गणपती बाप्पा मोरया ॥</h3>
        <p>Thank you for your valuable contribution. Your support helps us in making our celebrations better every year.</p>
      </div>
    </div>

    <div class="signatures">
      <div class="sig">
        <div class="sig-line"></div>
        <div class="sig-label">Donor Signature</div>
      </div>
      <div class="sig">
        <div class="sig-line sig-line-white"></div>
        <div class="sig-label sig-white">Authorized Signature</div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 600);
    };
  </script>
</body>
</html>`;

  const printWin = window.open('', '_blank', 'width=1100,height=800,toolbar=0,menubar=0,scrollbars=1');
  if (printWin) {
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
  }
}
