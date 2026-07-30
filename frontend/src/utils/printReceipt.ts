/**
 * printReceipt.ts
 * Utility to open a branded, print-ready receipt popup window.
 * Prints only the receipt without any app UI chrome.
 */
import { getMyOrganization } from '../api/services';
import { getMarathiReceiptHtml } from './marathiReceiptHtml';
import { formatDateDDMMYYYY } from './formatDate';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';

export interface PrintReceiptData {
  id?: string;
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
export function getPaymentRef(receipt: PrintReceiptData): string {
  const mode = receipt.payment_mode?.toUpperCase();
  if (mode === 'UPI' && receipt.upi_reference) return `UPI Ref: ${receipt.upi_reference}`;
  if (mode === 'CHEQUE' && receipt.cheque_number) return `Cheque No: ${receipt.cheque_number}${receipt.bank_name ? ' | Bank: ' + receipt.bank_name : ''}`;
  if ((mode === 'NEFT' || mode === 'RTGS') && receipt.transaction_ref) return `Transaction Ref: ${receipt.transaction_ref}`;
  return '';
}

// formatDateDDMMYYYY imported from ./formatDate

// Logo & QR base64 cache to avoid re-fetching the same image for every receipt
let _cachedLogoBase64: string | null = null;
let _cachedLogoUrl: string | null = null;
const _qrBase64Cache = new Map<string, string>();

async function getCachedImageBase64(url: string): Promise<string> {
  if (_qrBase64Cache.has(url)) return _qrBase64Cache.get(url)!;
  try {
    const b64 = await imageToBase64(url);
    _qrBase64Cache.set(url, b64);
    return b64;
  } catch (err) {
    console.error('Failed to convert image to base64', url, err);
    return url;
  }
}

function formatDonorAddress(donor?: any): string {
  if (!donor) return '—';
  const parts = [];
  if (donor.address && donor.address.trim() && donor.address.trim() !== '—') {
    parts.push(donor.address.trim());
  }
  if (donor.city && donor.city.trim() && donor.city.trim() !== '—') {
    parts.push(donor.city.trim());
  }
  return parts.length > 0 ? parts.join(', ') : '—';
}

/** Helper to convert image URL to base64 Data URL to prevent CORS canvas tainting on mobile */
async function imageToBase64(url: string): Promise<string> {
  if (!url || url.startsWith('data:')) return url;
  try {
    const response = await fetch(url);
    if (!response.ok) return url;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    // If fetch failed due to CORS or network error, attempt Image element fallback
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
            return;
          }
        } catch {}
        resolve(url);
      };
      img.onerror = () => resolve(url);
      img.src = url;
    });
  }
}

/** Generate the full HTML content for the receipt.
 *  @param orgDataOverride — pass pre-fetched org data to avoid redundant API calls.
 */
export async function getReceiptHtmlContent(receipt: PrintReceiptData, fallbackOrgName = 'Hissob ERP', forShare = false, orgDataOverride?: any): Promise<string> {
  let orgData: any = orgDataOverride || null;
  if (!orgData) {
    try {
      orgData = await getMyOrganization();
    } catch (err) {
      console.error('Failed to fetch org settings for receipt', err);
    }
  }
  const orgName = orgData?.name || fallbackOrgName;
  let logoUrl = orgData?.logo_url ? import.meta.env.VITE_API_URL?.replace('/api/v1', '') + orgData.logo_url : 'https://cdn-icons-png.flaticon.com/512/103/103328.png';
  let qrCodeUrl = orgData?.qr_code_url ? import.meta.env.VITE_API_URL?.replace('/api/v1', '') + orgData.qr_code_url : null;
  let verifyQrUrl = receipt.id ? await QRCode.toDataURL(window.location.origin + '/verify/' + receipt.id, { margin: 1, width: 150 }).catch(() => null) : null;
  const upiId = orgData?.upi_id || '8275831212@upi';
  let defaultUpiQrUrl = await QRCode.toDataURL(`upi://pay?pa=${upiId}&pn=${orgName}&am=${receipt.amount}`, { margin: 1, width: 150 }).catch(() => '');

  if (forShare) {
    // Use cached logo base64 if the URL hasn't changed (avoids re-fetching per receipt)
    if (_cachedLogoUrl === logoUrl && _cachedLogoBase64) {
      logoUrl = _cachedLogoBase64;
    } else {
      const originalUrl = logoUrl;
      logoUrl = await imageToBase64(logoUrl);
      _cachedLogoUrl = originalUrl;
      _cachedLogoBase64 = logoUrl;
    }
    if (qrCodeUrl) qrCodeUrl = await getCachedImageBase64(qrCodeUrl);
  }
  
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

  let html = '';
  if (orgData?.receipt_template === 'marathi_traditional') {
    html = getMarathiReceiptHtml(receipt, orgName, orgData, logoUrl, qrCodeUrl, upiId, amountWords, verifyQrUrl, defaultUpiQrUrl);
  } else {
    html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Donation Receipt ${receipt.receipt_number}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mukta:wght@400;600;700;800&family=Inter:wght@400;500;600;700;800;900&family=Yatra+One&display=swap" />
  <style>
    
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
      position: absolute; top: -150px; left: -150px; width: 450px; height: 450px;
      background: linear-gradient(135deg, #ff9100, #ffb347);
      border-radius: 50%;
      opacity: 0.15; z-index: 0;
    }
    .bg-wave-right {
      position: absolute; top: -150px; right: -150px; width: 450px; height: 450px;
      background: linear-gradient(135deg, #1e3a8a, #4338ca);
      border-radius: 50%;
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
      width: 150px; height: 150px;
      display: flex; justify-content: center; align-items: center;
      background: #fff;
      border: 2px dashed #cf671f;
      border-radius: 50%; padding: 6px;
      transform: scale(1.15);
      transform-origin: center left;
    }
    .ganesha-wrapper::after {
      content: ''; position: absolute; top: -8px; right: -8px; bottom: -8px; left: -8px; border-radius: 50%; border: 1.5px solid #ffd4b3; z-index: 0;
    }
    .ganesha-img {
      width: 100%; height: 100%; border-radius: 50%; overflow: hidden; display: flex; justify-content: center; align-items: center;
      background: #fff; box-shadow: 0 4px 12px rgba(225, 149, 81, 0.4); z-index: 1;
    }
    .ganesha-img img {
      width: 100%; height: 100%; object-fit: contain; padding: 2px; background: #fff; transform: scale(1.05);
    }

    .header-center {
      text-align: center;
      flex: 1;
    }
    .shree-text { color: #d92d20; font-family: 'Yatra One', cursive; font-size: 22px; margin-bottom: -4px; letter-spacing: 2px;}
    .mandal-title { color: #1e3a8a; font-family: 'Yatra One', cursive; font-size: 52px; line-height: 1.1; margin-bottom: 2px; text-shadow: 1px 1px 0 rgba(0,0,0,0.05);}
    .mandal-address { color: #334155; font-size: 15px; font-weight: 600; }
    .mandal-reg { color: #475569; font-size: 12px; font-weight: 500; margin-top: 4px; letter-spacing: 0.5px;}

    .header-right {
      display: flex; flex-direction: column; gap: 8px; justify-content: center; align-items: flex-end; width: 230px;
    }

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
      content: '\\269C'; position: absolute; top: 50%; transform: translateY(-50%);
      color: #fde68a; font-size: 24px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .main-banner::before { left: 24px; }
    .main-banner::after { right: 24px; }
    .main-banner h2 { font-size: 24px; font-weight: 900; letter-spacing: 1.5px; line-height: 1.2; text-shadow: 0 2px 4px rgba(0,0,0,0.1);}
    .main-banner p { font-size: 20px; font-family: 'Yatra One', cursive; letter-spacing: 1px; color: #ffedd5; margin-top: -2px;}

    /* Info Boxes (Right Side) */
    .info-box-group {
      display: flex; flex-direction: column; gap: 6px; width: 100%;
    }
    .info-box {
      width: 100%; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; display: flex; align-items: center; padding: 4px 10px; gap: 10px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
    }
    .info-icon {
      width: 28px; height: 28px; background: linear-gradient(135deg, #ea580c, #c2410c); border-radius: 6px; display: flex; justify-content: center; align-items: center; color: #fff; box-shadow: 0 2px 5px rgba(234, 88, 12, 0.3);
    }
    .info-icon svg { width: 16px; height: 16px; }
    .info-icon.purple { background: linear-gradient(135deg, #7c3aed, #5b21b6); box-shadow: 0 2px 5px rgba(124, 58, 237, 0.3); }
    .info-icon.orange { background: linear-gradient(135deg, #ea580c, #c2410c); }
    .info-text { display: flex; flex-direction: column; text-align: left; }
    .info-lbl { font-size: 11px; font-weight: 700; line-height: 1.2; letter-spacing: 0.3px;}
    .info-box:nth-child(1) .info-lbl { color: #5b21b6; }
    .info-box:nth-child(2) .info-lbl { color: #ea580c; }
    .info-val { font-size: 15px; color: #0f172a; font-weight: 800; line-height: 1.2;}
    
    .qr-verify-box {
      width: 100%; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; display: flex; align-items: center; justify-content: center; padding: 6px 12px; gap: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.03);
    }
    .qr-verify-box img { width: 44px; height: 44px; border-radius: 4px; mix-blend-mode: multiply;}
    .qr-verify-box span { font-size: 13px; font-weight: 800; color: #312e81; text-align: left; line-height: 1.3; letter-spacing: 0.5px; text-transform: uppercase;}

    /* Layout Body */
    .body-content {
      display: flex; gap: 20px; padding: 0 10px; position: relative; z-index: 1; flex: 1;
    }

    /* Left Panel */
    .left-panel {
      flex: 1.1;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      background: #fff;
      display: flex; flex-direction: column;
      overflow: hidden;
      box-shadow: 0 4px 10px rgba(0,0,0,0.04);
    }
    .panel-head-blue {
      background: linear-gradient(90deg, #1e3a8a, #312e81); color: #fff; padding: 10px 18px;
      font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 10px; border-bottom: 3px solid #ea580c; letter-spacing: 0.5px;
    }
    .donor-info { padding: 12px 16px; }
    .info-table { width: 100%; border-collapse: collapse; }
    .info-table td { padding: 8px 0; font-size: 15px; border-bottom: 1px dashed #cbd5e1; }
    .info-table tr:last-child td { border-bottom: none; }
    .info-table td:first-child { width: 100px; color: #475569; font-weight: 600; }
    .info-table td:last-child { color: #0f172a; font-weight: 700; }

    /* Amount Box with Rubber Stamp */
    .amt-box-wrapper {
      background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border-radius: 12px; border: 2px solid #fed7aa;
      margin: 10px 16px; display: flex; padding: 16px; align-items: center; gap: 16px;
      box-shadow: 0 4px 12px rgba(234, 88, 12, 0.08);
      position: relative; overflow: hidden;
    }
    .amt-box-wrapper::after {
      content: 'RECEIVED'; position: absolute; right: 20px; top: 15px; font-size: 36px; color: rgba(220, 38, 38, 0.1); font-weight: 900; transform: rotate(-15deg); pointer-events: none; border: 3px solid rgba(220, 38, 38, 0.1); border-radius: 8px; padding: 4px 12px; letter-spacing: 2px;
    }
    .rubber-stamp { display: none; }
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
    .cb-box { width: 20px; height: 20px; border: 2px solid #94a3b8; border-radius: 5px; display: flex; justify-content: center; align-items: center; font-size: 14px; color: #fff; background: #fff; box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);}
    .cb-box.active { background: #ea580c; border-color: #ea580c; font-weight: 900; box-shadow: 0 2px 5px rgba(234, 88, 12, 0.4);}
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
      background: linear-gradient(90deg, #fef08a, #fde047, #fef08a); border-radius: 12px; padding: 12px 40px;
      text-align: center; border: 1px solid #facc15; box-shadow: 0 4px 12px rgba(0,0,0,0.15); width: 90%;
    }
    .footer-yellow h3 { color: #b45309; font-size: 22px; font-weight: 900; font-family: 'Mukta', sans-serif; margin-bottom: 2px; letter-spacing: 1px; }
    .footer-yellow p { color: #713f12; font-size: 14px; font-weight: 600; }
    
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

    .developer-footer {
      text-align: center;
      font-size: 10px;
      color: rgba(255, 255, 255, 0.85);
      font-weight: 500;
      letter-spacing: 0.5px;
      z-index: 10;
      margin-top: auto;
      margin-bottom: -12px;
    }
    .developer-footer strong {
      color: #ffffff;
      font-weight: 700;
    }

    @media print {
      @page { size: A4 landscape; margin: 0; }
      body { padding: 0; background: #fff; }
      .receipt-wrapper { border: none; box-shadow: none; width: 297mm; height: 210mm; border-radius: 0;}
      .receipt-wrapper::before { display: none; }
      .ganesha-wrapper::before { animation: none; transform: rotate(45deg); opacity: 0.3; } /* Stop animation on print */
    }

    /* Styles specifically for html2canvas to mimic print output */
    body.share-mode { padding: 0; background: #fff; }
    body.share-mode .receipt-wrapper { border: none; box-shadow: none; border-radius: 0; }
    body.share-mode .receipt-wrapper::before { display: none; }
    body.share-mode .ganesha-wrapper::before { animation: none; transform: rotate(45deg); opacity: 0.3; }
  </style>
</head>
<body ${forShare ? 'class="share-mode"' : ''}>
  <div class="receipt-wrapper">
    <div class="watermark-bg">ॐ</div>
    <div class="bg-wave-left"></div>
    <div class="bg-wave-right"></div>
    <div class="bg-wave-bottom"></div>

    <!-- Header -->
    <div class="header">
      <div class="ganesha-wrapper">
        <div class="ganesha-img">
          <img src="${logoUrl}" alt="Logo" />
        </div>
      </div>
      <div class="header-center">
        <div class="shree-text">॥ श्री गणेशाय नमः ॥</div>
        <div class="mandal-title">${orgName}</div>
        <div class="mandal-address">${orgData?.address ? orgData.address + (orgData?.city ? ', ' + orgData.city : '') : (orgData?.city ? orgData.city + (orgData?.state ? ', ' + orgData.state : '') : 'Maharashtra, India')}</div>
        <div class="mandal-reg">${orgData?.registration_number ? 'Reg. No: ' + orgData.registration_number + ' | Official Receipt' : 'Registered Organization | Official Receipt'}</div>
      </div>
      <div class="header-right">
        <div class="info-box-group">
          <div class="info-box">
            <div class="info-icon purple">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            </div>
            <div class="info-text">
              <span class="info-lbl">Receipt No.</span>
              <span class="info-val">${receipt.receipt_number}</span>
            </div>
          </div>
          <div class="info-box">
            <div class="info-icon orange">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><rect x="7" y="14" width="2" height="2"></rect><rect x="11" y="14" width="2" height="2"></rect><rect x="15" y="14" width="2" height="2"></rect></svg>
            </div>
            <div class="info-text">
              <span class="info-lbl">Date</span>
              <span class="info-val">${formatDateDDMMYYYY(receipt.receipt_date)}</span>
            </div>
          </div>
        </div>
        ${verifyQrUrl ? `
        <div class="qr-verify-box">
          <img src="${verifyQrUrl}" alt="Verify QR" />
          <span>SCAN TO<br/>VERIFY</span>
        </div>
        ` : ''}
      </div>
    </div>

    <!-- Banner -->
    <div class="banner-row">
      <div class="main-banner">
        <h2>DONATION RECEIPT</h2>
        <p>देणगी पावती</p>
      </div>
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
            <tr><td>Address</td><td>: ${formatDonorAddress(receipt.donor)}</td></tr>
            <tr><td>Mobile No.</td><td>: ${receipt.donor?.phone || '—'}</td></tr>
            <tr><td>Email</td><td>: ${receipt.donor?.email || '—'}</td></tr>
          </table>
        </div>
        <div class="amt-box-wrapper">
          <div class="rubber-stamp">RECEIVED</div>
          <div class="rupee-icon">&#8377;</div>
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
            <div class="cb-item"><div class="cb-box ${isGanesh ? 'active' : ''}">${isGanesh ? '&#10003;' : ''}</div> Ganesh Festival</div>
            <div class="cb-item"><div class="cb-box ${isDonation ? 'active' : ''}">${isDonation ? '&#10003;' : ''}</div> Donation</div>
            <div class="cb-item"><div class="cb-box ${isMahaprasad ? 'active' : ''}">${isMahaprasad ? '&#10003;' : ''}</div> Mahaprasad</div>
            <div class="cb-item"><div class="cb-box ${isDecoration ? 'active' : ''}">${isDecoration ? '&#10003;' : ''}</div> Decoration</div>
            <div class="cb-item"><div class="cb-box ${isSocial ? 'active' : ''}">${isSocial ? '&#10003;' : ''}</div> Social Activity</div>
            <div class="cb-item"><div class="cb-box ${isOther ? 'active' : ''}">${isOther ? '&#10003;' : ''}</div> Other <span class="other-line">${isOther ? receipt.purpose : ''}</span></div>
          </div>
        </div>

        <div class="payment-box">
          <div class="pay-details">
            <div class="rp-section-title" style="margin-bottom:8px;">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect><path d="M2 10H22"></path></svg>
              Payment Mode
            </div>
            <div class="pay-grid">
              <div class="cb-item"><div class="cb-box ${isCash ? 'active' : ''}">${isCash ? '&#10003;' : ''}</div> Cash</div>
              <div class="cb-item"><div class="cb-box ${isUPI ? 'active' : ''}">${isUPI ? '&#10003;' : ''}</div> UPI</div>
              <div class="cb-item"><div class="cb-box ${isBank ? 'active' : ''}">${isBank ? '&#10003;' : ''}</div> Bank Transfer</div>
              <div class="cb-item"><div class="cb-box ${isCheque ? 'active' : ''}">${isCheque ? '&#10003;' : ''}</div> Cheque</div>
            </div>
            <div class="utr-text">
              Transaction / UTR No. : <strong>${receipt.transaction_ref || receipt.upi_reference || receipt.cheque_number || '—'}</strong>
            </div>
          </div>
          <div class="qr-box">
            <div>Scan & Pay (UPI)</div>
            ${qrCodeUrl 
              ? `<img src="${qrCodeUrl}" alt="QR" />` 
              : `<img src="${defaultUpiQrUrl}" alt="QR" />`
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
    
    <div class="developer-footer">
      Powered By <strong>Hisob.in</strong> &nbsp;|&nbsp; Developed by <strong>mayurpatil.in</strong>
    </div>
  </div>
  ${forShare ? '' : `
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 600);
    };
  </script>
  `}
</body>
</html>`;
  }
  
  return html;
}

/** Open a professional print popup for a donation receipt */
export async function printReceiptWindow(receipt: PrintReceiptData, fallbackOrgName = 'Hissob ERP', orgData?: any): Promise<void> {
  const html = await getReceiptHtmlContent(receipt, fallbackOrgName, false, orgData);
  const printWin = window.open('', '_blank', 'width=1100,height=800,toolbar=0,menubar=0,scrollbars=1');
  if (printWin) {
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
  }
}

/** Direct download receipt image as PNG file */
export async function downloadReceiptImage(receipt: PrintReceiptData, fallbackOrgName = 'Hisob ERP', orgData?: any): Promise<void> {
  const STYLE_ID = 'hissob-receipt-dl-style';
  const ROOT_ID  = 'hissob-receipt-dl-root';

  try {
    const html = await getReceiptHtmlContent(receipt, fallbackOrgName, true, orgData);
    const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/i);
    const bodyMatch  = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (!styleMatch || !bodyMatch) throw new Error('Failed to parse receipt HTML');

    const scopedCss = styleMatch[1]
      .replace(/\bbody\.share-mode\b/g, '#' + ROOT_ID)
      .replace(/\bbody\b(?=\s*\{)/g,    '#' + ROOT_ID);

    const fontLinkId = 'hissob-receipt-fonts';
    if (!document.getElementById(fontLinkId)) {
      const link = document.createElement('link');
      link.id   = fontLinkId;
      link.rel  = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Mukta:wght@400;600;700;800&family=Inter:wght@400;500;600;700;800;900&family=Yatra+One&display=swap';
      document.head.appendChild(link);
    }

    const oldStyle = document.getElementById(STYLE_ID);
    if (oldStyle) oldStyle.remove();
    const styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    styleEl.textContent = scopedCss;
    document.head.appendChild(styleEl);

    const oldRoot = document.getElementById(ROOT_ID);
    if (oldRoot) oldRoot.remove();
    const root = document.createElement('div');
    root.id = ROOT_ID;
    root.style.cssText = [
      'position:absolute', 'top:-9999px', 'left:-9999px',
      'width:1100px',      'min-height:800px',
      'background:#fff',   'overflow:hidden',
      'display:flex',      'justify-content:center', 'align-items:center',
      'z-index:-1',
    ].join(';');
    root.innerHTML = bodyMatch[1].trim();
    document.body.appendChild(root);

    // Wait for Devanagari fonts to fully load before capture (fixes garbled Marathi text)
    await ensureDevanagariFonts();

    const wrapper = root.querySelector('.receipt-wrapper') as HTMLElement;
    if (!wrapper) throw new Error('Receipt wrapper not found in DOM');

    const canvas = await html2canvas(wrapper, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      foreignObjectRendering: false,
      logging: false,
    });

    root.remove();
    document.getElementById(STYLE_ID)?.remove();

    const fileName = `Receipt_${receipt.receipt_number}.png`;
    const dataUrl = canvas.toDataURL('image/png');
    downloadFallback(dataUrl, fileName);
  } catch (err) {
    document.getElementById(ROOT_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
    console.error('Failed to download receipt image', err);
    alert('Failed to download receipt image.');
  }
}

// ─── FONT & BLOB CACHE ──────────────────────────────────────────────────────
let _fontsLoaded = false;
const _receiptBlobCache = new Map<string, { blob: Blob; dataUrl: string; textMessage: string }>();
const _receiptBlobGenerating = new Set<string>();

/** Check if a receipt image blob is already pre-generated in cache */
export function isReceiptBlobCached(receiptId: string): boolean {
  return _receiptBlobCache.has(receiptId);
}

/** Ensure Devanagari fonts (Mukta + Yatra One) are loaded before html2canvas capture.
 *  Without this, Marathi/Hindi text renders as garbled characters.
 */
async function ensureDevanagariFonts(): Promise<void> {
  if (_fontsLoaded) return;

  const fontLinkId = 'hissob-receipt-fonts';
  if (!document.getElementById(fontLinkId)) {
    const link = document.createElement('link');
    link.id   = fontLinkId;
    link.rel  = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Mukta:wght@400;600;700;800&family=Inter:wght@400;500;600;700;800;900&family=Yatra+One&display=swap';
    document.head.appendChild(link);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (document.fonts) {
    try {
      await Promise.all([
        document.fonts.load('400 20px Mukta'),
        document.fonts.load('700 20px Mukta'),
        document.fonts.load('800 20px Mukta'),
        document.fonts.load('400 20px "Yatra One"'),
        document.fonts.load('700 20px Inter'),
      ]);
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (_) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  } else {
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  _fontsLoaded = true;
}

/** Build the WhatsApp text message for a receipt */
function buildReceiptTextMessage(receipt: PrintReceiptData, fallbackOrgName: string): string {
  const verifyUrl = receipt.id ? `${window.location.origin}/verify/${receipt.id}` : '';
  const formattedDate = formatDateDDMMYYYY(receipt.receipt_date);
  const formattedAmt  = `₹ ${Number(receipt.amount || 0).toLocaleString('en-IN')}`;
  const donorName     = receipt.donor?.full_name || 'Donor';
  const modeText      = (receipt.payment_mode || 'CASH').toUpperCase();

  return `🚩 *॥ श्री गणेशाय नमः ॥*
🏛️ *${fallbackOrgName}*

🙏 *आपल्या अमूल्य योगदानाबद्दल मनःपूर्वक धन्यवाद!*
*Thank you for your generous contribution.*

📜 *OFFICIAL DONATION RECEIPT | देणगी पावती*
━━━━━━━━━━━━━━━━━━━━━━━
🧾 *पावती क्र. (Receipt No):* ${receipt.receipt_number}
📅 *दिनांक (Date):* ${formattedDate}
👤 *देणगीदार (Donor):* ${donorName}
💰 *रक्कम (Amount):* *${formattedAmt}*
💳 *भरणा प्रकार (Mode):* ${modeText}
${receipt.purpose ? `📌 *उद्देश (Purpose):* ${receipt.purpose}\n` : ''}━━━━━━━━━━━━━━━━━━━━━━━
✅ *Status:* Confirmed & Authentic Receipt
${verifyUrl ? `\n🔗 *डिजिटल पावती ऑनलाइन पाहा व तपासा:*\n${verifyUrl}\n` : ''}
🌺 *गणपती बाप्पा मोरया! मंगलमूर्ती मोरया!*
_Generated by Hisob ERP System | Developed by www.mayurpatil.in_`;
}

export async function preGenerateReceiptBlob(receipt: PrintReceiptData, fallbackOrgName = 'Hisob ERP', orgData?: any): Promise<void> {
  const cacheKey = receipt.id || receipt.receipt_number;
  if (_receiptBlobCache.has(cacheKey) || _receiptBlobGenerating.has(cacheKey)) return;
  _receiptBlobGenerating.add(cacheKey);

  const STYLE_ID = `hissob-pregen-style-${cacheKey}`;
  const ROOT_ID  = `hissob-pregen-root-${cacheKey}`;

  try {
    const html = await getReceiptHtmlContent(receipt, fallbackOrgName, true, orgData);
    const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/i);
    const bodyMatch  = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (!styleMatch || !bodyMatch) return;

    const scopedCss = styleMatch[1]
      .replace(/\bbody\.share-mode\b/g, '#' + ROOT_ID)
      .replace(/\bbody\b(?=\s*\{)/g,    '#' + ROOT_ID);

    document.getElementById(STYLE_ID)?.remove();
    const styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    styleEl.textContent = scopedCss;
    document.head.appendChild(styleEl);

    document.getElementById(ROOT_ID)?.remove();
    const root = document.createElement('div');
    root.id = ROOT_ID;
    root.style.cssText = [
      'position:absolute', 'top:-99999px', 'left:-99999px',
      'width:1100px', 'min-height:800px', 'background:#fff',
      'overflow:hidden', 'display:flex', 'justify-content:center',
      'align-items:center', 'z-index:-999',
    ].join(';');
    root.innerHTML = bodyMatch[1].trim();
    document.body.appendChild(root);

    // Wait for Devanagari fonts to load before capturing (prevents garbled Marathi text)
    await ensureDevanagariFonts();

    const wrapper = root.querySelector('.receipt-wrapper') as HTMLElement;
    if (!wrapper) return;

    const canvas = await html2canvas(wrapper, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      foreignObjectRendering: false,
      logging: false,
    });

    root.remove();
    document.getElementById(STYLE_ID)?.remove();

    const dataUrl = canvas.toDataURL('image/png');
    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return;

    const textMessage = buildReceiptTextMessage(receipt, fallbackOrgName);
    _receiptBlobCache.set(cacheKey, { blob, dataUrl, textMessage });
  } catch (_) {
    // Silent fail — will fall back to on-demand generation
  } finally {
    _receiptBlobGenerating.delete(cacheKey);
    document.getElementById(ROOT_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
  }
}

/** Invalidate the cached blob for a receipt (call after editing a receipt) */
export function invalidateReceiptBlobCache(receiptId: string): void {
  _receiptBlobCache.delete(receiptId);
}

/** Generate an image and share via WhatsApp.
 * Uses pre-generated blob cache if available for instant mobile share.
 */
export async function shareReceiptViaWhatsApp(receipt: PrintReceiptData, fallbackOrgName = 'Hissob ERP', orgData?: any): Promise<void> {
  const cacheKey = receipt.id || receipt.receipt_number;
  const fileName  = `Receipt_${receipt.receipt_number}.png`;

  // ✅ FAST PATH: use pre-generated blob (called within user gesture — always works on mobile)
  const cached = _receiptBlobCache.get(cacheKey);
  if (cached) {
    const { blob, dataUrl, textMessage } = cached;
    if (typeof navigator !== 'undefined' && navigator.canShare) {
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `Donation Receipt ${receipt.receipt_number}`,
            text: textMessage,
            files: [file],
          });
          return;
        } catch (err: any) {
          if (err?.name === 'AbortError') return;
        }
      }
    }
    // Fallback for desktop
    downloadFallback(dataUrl, fileName);
    return;
  }

  // SLOW PATH: no cache — generate on demand (may not work on mobile due to gesture expiry)
  const STYLE_ID = 'hissob-receipt-share-style';
  const ROOT_ID  = 'hissob-receipt-share-root';

  try {
    // 1. Generate the receipt HTML (with all images pre-converted to base64)
    const html = await getReceiptHtmlContent(receipt, fallbackOrgName, true, orgData);


    // 2. Extract <style> and <body> content
    const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/i);
    const bodyMatch  = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (!styleMatch || !bodyMatch) throw new Error('Failed to parse receipt HTML');

    // 3. Scope CSS to our off-screen container so it doesn't leak to main page
    const scopedCss = styleMatch[1]
      .replace(/\bbody\.share-mode\b/g, '#' + ROOT_ID)
      .replace(/\bbody\b(?=\s*\{)/g,    '#' + ROOT_ID);

    // 4. Ensure Google Fonts are loaded in this document
    const fontLinkId = 'hissob-receipt-fonts';
    if (!document.getElementById(fontLinkId)) {
      const link = document.createElement('link');
      link.id   = fontLinkId;
      link.rel  = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Mukta:wght@400;600;700;800&family=Inter:wght@400;500;600;700;800;900&family=Yatra+One&display=swap';
      document.head.appendChild(link);
    }

    // 5. Inject scoped styles
    document.getElementById(STYLE_ID)?.remove();
    const styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    styleEl.textContent = scopedCss;
    document.head.appendChild(styleEl);

    // 6. Create off-screen container and inject receipt HTML
    document.getElementById(ROOT_ID)?.remove();
    const root = document.createElement('div');
    root.id = ROOT_ID;
    root.style.cssText = [
      'position:absolute', 'top:-9999px', 'left:-9999px',
      'width:1100px', 'min-height:800px', 'background:#fff',
      'overflow:hidden', 'display:flex', 'justify-content:center',
      'align-items:center', 'z-index:-1',
    ].join(';');
    root.innerHTML = bodyMatch[1].trim();
    document.body.appendChild(root);

    // 7. Wait for Devanagari fonts to fully load before capture (fixes garbled Marathi text)
    await ensureDevanagariFonts();

    // 8. Capture receipt canvas
    const wrapper = root.querySelector('.receipt-wrapper') as HTMLElement;
    if (!wrapper) throw new Error('Receipt wrapper not found in DOM');

    const canvas = await html2canvas(wrapper, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      foreignObjectRendering: false,
      logging: false,
    });

    // 9. Clean up DOM immediately after capture
    root.remove();
    document.getElementById(STYLE_ID)?.remove();

    const dataUrl  = canvas.toDataURL('image/png');

    // 10. CRITICAL FIX: Convert canvas to Blob using awaitable Promise.
    //     Using canvas.toBlob() as a raw callback causes navigator.share() to
    //     be called OUTSIDE the user-gesture window — browser blocks it.
    //     Wrapping in Promise keeps the async chain unbroken.
    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

    // 11. Build WhatsApp text message (reuse shared helper — no mojibake)
    const textMessage = buildReceiptTextMessage(receipt, fallbackOrgName);

    // 12. Attempt native Web Share API with image file
    if (blob && typeof navigator !== 'undefined' && navigator.canShare) {
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `Donation Receipt ${receipt.receipt_number}`,
            text: textMessage,
            files: [file],
          });
          return; // ✅ Share panel opened — done
        } catch (err: any) {
          if (err?.name === 'AbortError') return; // User cancelled — done
          // Other error (e.g. share not supported for files) — fall through
        }
      }
    }

    // 13. Fallback: download image + text-only share (desktop / unsupported browsers)
    downloadFallback(dataUrl, fileName);
  } catch (err) {
    document.getElementById(ROOT_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
    console.error('Failed to share receipt image', err);
    alert('Failed to generate receipt image. Please try again.');
  }
}

function downloadFallback(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
