import type { PrintReceiptData } from './printReceipt';

function formatDateDDMMYYYY(dateStr?: string): string {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const parts = dateStr.split('T')[0].split('-');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export function getMarathiReceiptHtml(
  receipt: PrintReceiptData, 
  orgName: string, 
  orgData: any,
  logoUrl: string, 
  qrCodeUrl: string | null, 
  upiId: string, 
  amountWords: string,
  verifyQrUrlOverride?: string | null,
  defaultUpiQrUrlOverride?: string | null
): string {
  
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

  const verifyQrUrl = verifyQrUrlOverride !== undefined 
    ? verifyQrUrlOverride 
    : (receipt.id ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + '/verify/' + receipt.id)}` : null);
  
  const defaultUpiQrUrl = defaultUpiQrUrlOverride || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(orgName)}&am=${receipt.amount}`;

  return `<!DOCTYPE html>
<html lang="mr">
<head>
  <meta charset="UTF-8" />
  <title>Donation Receipt ${receipt.receipt_number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Mukta:wght@400;600;700;800&family=Inter:wght@400;500;600;700&family=Yatra+One&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Mukta', 'Inter', sans-serif;
      background: #e2e8f0;
      display: flex; justify-content: center; align-items: center; min-height: 100vh;
      -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
    }
    
    .receipt-wrapper {
      width: 1050px; height: 742px; /* A4 Landscape */
      background: #fdfaf0;
      position: relative; overflow: hidden;
      border: 8px solid #6b1718;
      border-radius: 4px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      padding: 24px 32px;
      display: flex; flex-direction: column;
    }
    /* Inner Gold Border */
    .receipt-wrapper::after {
      content: ''; position: absolute; top: 8px; right: 8px; bottom: 8px; left: 8px;
      border: 1.5px solid #c89c3c; z-index: 1; pointer-events: none;
    }
    
    /* Bottom curved swoosh decoration */
    .swoosh-left, .swoosh-right {
      position: absolute; bottom: 0; width: 300px; height: 100px; background: #6b1718;
      z-index: 0;
    }
    .swoosh-left { left: 0; border-top-right-radius: 100% 80%; }
    .swoosh-right { right: 0; border-top-left-radius: 100% 80%; }
    .swoosh-left-gold, .swoosh-right-gold {
      position: absolute; bottom: 0; width: 310px; height: 110px; background: #c89c3c;
      z-index: -1;
    }
    .swoosh-left-gold { left: 0; border-top-right-radius: 100% 80%; }
    .swoosh-right-gold { right: 0; border-top-left-radius: 100% 80%; }

    /* Top corner decorations */
    .corner-tl, .corner-tr {
      position: absolute; top: 12px; width: 40px; height: 40px; border: 4px solid #6b1718; z-index: 1;
    }
    .corner-tl { left: 12px; border-right: none; border-bottom: none; }
    .corner-tr { right: 12px; border-left: none; border-bottom: none; }

    /* Top Header */
    .header {
      display: flex; justify-content: space-between; align-items: stretch;
      margin-bottom: 24px; z-index: 2; position: relative; padding: 0 10px;
    }

    /* Left Logo */
    .logo-area {
      width: 180px; text-align: center;
    }
    .logo-area img {
      width: 150px; height: 150px; object-fit: contain;
      filter: drop-shadow(0 4px 6px rgba(107,23,24,0.3));
    }

    /* Center Info */
    .center-info {
      flex: 1; text-align: center; padding-top: 10px;
    }
    .shree-namah {
      font-size: 18px; color: #6b1718; font-weight: 700; letter-spacing: 2px;
      margin-bottom: 4px;
    }
    .org-name {
      font-family: 'Yatra One', cursive; font-size: 56px; color: #6b1718;
      line-height: 1.1; margin-bottom: 10px;
      display: flex; justify-content: center; align-items: center; gap: 15px;
    }
    .org-name::before, .org-name::after {
      content: '❖'; font-size: 28px; color: #b8860b; font-family: 'Inter', sans-serif;
    }
    .address-line {
      font-size: 16px; color: #333; font-weight: 600;
    }
    .address-line span {
      display: inline-block; padding-bottom: 4px; border-bottom: 1px solid #d1d5db;
    }
    .reg-info {
      font-size: 13px; color: #555; margin-top: 6px; font-weight: 500;
    }

    /* Right Info */
    .right-info {
      width: 240px; display: flex; flex-direction: column; align-items: flex-end; padding-top: 10px; gap: 20px;
    }
    .receipt-badge {
      background: #6b1718; color: #fff; font-family: 'Mukta', sans-serif;
      font-size: 24px; font-weight: 800; padding: 4px 36px;
      border: 3px solid #6b1718; border-radius: 30px;
      position: relative;
      box-shadow: inset 0 0 0 2px #c89c3c;
    }
    .receipt-badge::before, .receipt-badge::after {
      content: '✦'; position: absolute; top: 50%; transform: translateY(-50%); color: #c89c3c; font-size: 16px;
    }
    .receipt-badge::before { left: 14px; }
    .receipt-badge::after { right: 14px; }
    
    .meta-box-group {
      width: 100%; border: 1.5px solid #d1d5db; border-radius: 4px; background: #fff;
    }
    .meta-row {
      display: flex; justify-content: space-between; padding: 10px 16px; font-size: 15px; align-items: center;
    }
    .meta-row:first-child { border-bottom: 1.5px solid #d1d5db; }
    .meta-label { color: #555; font-weight: 600; }
    .meta-value { color: #6b1718; font-weight: 800; font-size: 18px; letter-spacing: 1px;}
    
    .marathi-verify-qr {
      width: 100%; display: flex; align-items: center; justify-content: center; gap: 12px;
      border: 1.5px solid #d1d5db; border-radius: 4px; padding: 6px; background: #fff;
    }
    .marathi-verify-qr img { width: 50px; height: 50px; }
    .marathi-verify-qr span { font-size: 11px; font-weight: 800; color: #333; text-align: left; line-height: 1.3;}

    /* Main Body */
    .main-body {
      display: flex; gap: 24px; flex: 1; z-index: 2; position: relative;
    }

    /* Section Headings (3D Ribbon) */
    .section-ribbon-container {
      text-align: center; margin-bottom: 18px; margin-top: -30px;
    }
    .section-ribbon {
      background: #7a1e1f; color: #fff; display: inline-block;
      padding: 6px 40px; font-size: 16px; font-weight: 700;
      position: relative; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .section-ribbon::before, .section-ribbon::after {
      content: ''; position: absolute; bottom: -8px; border: 4px solid transparent; border-top-color: #4a0d0e;
    }
    .section-ribbon::before { left: 0; border-right-color: #4a0d0e; }
    .section-ribbon::after { right: 0; border-left-color: #4a0d0e; }
    .ribbon-end-left, .ribbon-end-right {
      position: absolute; top: 4px; bottom: -4px; width: 20px; background: #6b1718; z-index: -1;
    }
    .ribbon-end-left { left: -16px; clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 10px 50%); }
    .ribbon-end-right { right: -16px; clip-path: polygon(0 0, 100% 0, calc(100% - 10px) 50%, 100% 100%, 0 100%); }

    /* Left Box (Donor Info) */
    .left-box {
      flex: 1.1; border: 1.5px solid #d1d5db; border-radius: 6px; padding: 24px 20px 20px;
      background: #fdfaf0; display: flex; flex-direction: column; position: relative;
    }
    .form-group {
      display: flex; align-items: flex-end; margin-bottom: 18px; font-size: 16px;
    }
    .form-label {
      width: 100px; font-weight: 600; color: #333; display: flex; justify-content: space-between;
    }
    .form-line {
      flex: 1; border-bottom: 1.5px solid #a1a1aa; margin-left: 12px; padding-bottom: 2px;
      color: #111; font-weight: 700; min-height: 26px; padding-left: 8px;
    }
    
    .amount-display {
      margin-top: auto; display: flex; align-items: stretch; border: 1.5px solid #c89c3c;
      border-radius: 6px; background: #fff; overflow: hidden;
    }
    .amt-box {
      background: #6b1718; color: #fff; display: flex;
      padding: 12px 24px; align-items: center; gap: 16px; min-width: 180px; justify-content: center;
    }
    .amt-rupee { font-size: 42px; font-weight: 800; color: #e5e7eb; line-height: 1;}
    .amt-val { font-size: 38px; font-weight: 800; letter-spacing: 1px; line-height: 1;}
    .amt-words {
      flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 12px 20px;
      border-left: 1.5px solid #c89c3c;
    }
    .amt-words-lbl { color: #c89c3c; font-size: 13px; font-weight: 700; margin-bottom: 4px; }
    .amt-words-val { font-weight: 700; color: #111; font-size: 16px;}

    .tip-msg { margin-top: 20px; font-size: 14px; color: #444; }
    .tip-msg strong { color: #6b1718; }

    /* Right Box (Purpose & Payment) */
    .right-box {
      flex: 0.9; display: flex; flex-direction: column; gap: 20px;
    }
    .purpose-box, .payment-box {
      border: 1.5px solid #d1d5db; border-radius: 6px; padding: 24px 20px 20px; background: #fdfaf0; position: relative;
    }
    .grid-3col {
      display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px 12px; font-size: 14px;
    }
    .grid-4col {
      display: grid; grid-template-columns: auto auto auto auto; gap: 16px 12px; font-size: 14px; align-items: center; justify-content: space-between;
    }
    .cb-item { display: flex; align-items: center; gap: 8px; font-weight: 600; color: #333; white-space: nowrap;}
    .cb-square {
      width: 16px; height: 16px; border: 1.5px solid #444; border-radius: 2px;
      display: flex; justify-content: center; align-items: center; font-size: 14px; background: #fff;
    }
    .cb-square.checked { color: #000; font-weight: 900;}

    .payment-box { flex: 1; display: flex; flex-direction: column; }
    .utr-row { display: flex; align-items: flex-end; margin-top: 20px; font-size: 15px; font-weight: 600; color: #333;}
    
    .qr-thankyou {
      margin-top: 20px; display: flex; gap: 20px; background: #fff;
      border: 1.5px solid #d1d5db; border-radius: 6px; padding: 12px 16px; align-items: center; flex: 1;
    }
    .qr-img {
      width: 90px; height: 90px; padding: 0; text-align: center;
    }
    .qr-img img { width: 100%; height: 100%; object-fit: contain; }
    .qr-img span { font-size: 10px; font-weight: 700; display: block; margin-top: 4px; color: #333;}
    .ty-text { flex: 1; text-align: center;}
    .ty-text .upi { font-size: 13px; color: #555; font-weight: 700; margin-bottom: 4px;}
    .ty-text .upi-val { font-size: 12px; color: #111; margin-bottom: 12px; font-weight: 600;}
    .ty-text .lbl { font-size: 13px; color: #555; font-weight: 600;}
    .ty-text .msg { font-size: 20px; color: #6b1718; font-weight: 800;}

    /* Signatures */
    .signatures {
      display: flex; justify-content: space-between; align-items: flex-end;
      margin-top: 20px; z-index: 2; position: relative; padding: 0 40px;
    }
    .sig-block { text-align: center; width: 220px; }
    .sig-line { border-bottom: 1.5px solid #a1a1aa; height: 30px; margin-bottom: 8px;}
    .sig-lbl { font-size: 15px; font-weight: 600; color: #6b1718;}
    .footer-msg { font-size: 28px; font-weight: 800; color: #6b1718; letter-spacing: 2px; padding: 0 20px; position: relative;}
    .footer-msg::before, .footer-msg::after {
      content: ''; position: absolute; top: 50%; width: 60px; height: 2px; background: #c89c3c;
    }
    .footer-msg::before { left: -50px; }
    .footer-msg::after { right: -50px; }

    @media print {
      @page { size: A4 landscape; margin: 0; }
      body { padding: 0; background: #fff; }
      .receipt-wrapper { width: 297mm; height: 210mm; border-radius: 0; box-shadow: none; border-width: 4px;}
    }
  </style>
</head>
<body>
  <div class="receipt-wrapper">
    <!-- Decorative Swooshes & Corners -->
    <div class="corner-tl"></div><div class="corner-tr"></div>
    <div class="swoosh-left-gold"></div><div class="swoosh-right-gold"></div>
    <div class="swoosh-left"></div><div class="swoosh-right"></div>
    
    <!-- Header -->
    <div class="header">
      <div class="logo-area">
        <img src="${logoUrl}" alt="Logo" />
      </div>
      <div class="center-info">
        <div class="shree-namah">॥ श्री गणेशाय नमः ॥</div>
        <div class="org-name">${orgName}</div>
        <div class="address-line">
          <span>&#x1F4CD; ${orgData?.address ? orgData.address + (orgData?.city ? ', ' + orgData.city : '') : (orgData?.city ? orgData.city + (orgData?.state ? ', ' + orgData.state : '') : 'Maharashtra, India')}</span>
        </div>
        <div class="reg-info">
          नोंदणी क्र.: ${orgData?.registration_number || '______________'} &nbsp;|&nbsp; PAN: ${orgData?.pan || '______________'}
        </div>
      </div>
      <div class="right-info">
        <div class="receipt-badge">देणगी पावती</div>
        <div class="meta-box-group">
          <div class="meta-row">
            <span class="meta-label">पावती क्र.</span>
            <span class="meta-value">${receipt.receipt_number}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">दिनांक</span>
            <span class="meta-value">${formatDateDDMMYYYY(receipt.receipt_date)}</span>
          </div>
        </div>
        ${verifyQrUrl ? `
        <div class="marathi-verify-qr">
          <img src="${verifyQrUrl}" alt="Verify QR" />
          <span>स्कॅन करून<br/>पावती तपासा</span>
        </div>
        ` : ''}
      </div>
    </div>

    <!-- Body -->
    <div class="main-body">
      <!-- Left Panel -->
      <div class="left-box">
        <div class="section-ribbon-container">
          <div class="section-ribbon">देणगीदाराची माहिती<div class="ribbon-end-left"></div><div class="ribbon-end-right"></div></div>
        </div>
        
        <div class="form-group">
          <div class="form-label">नाव <span>:</span></div>
          <div class="form-line">${receipt.donor?.full_name || ''}</div>
        </div>
        <div class="form-group">
          <div class="form-label">पत्ता <span>:</span></div>
          <div class="form-line">${receipt.donor?.address || ''}</div>
        </div>
        <div class="form-group">
          <div class="form-label">शहर <span>:</span></div>
          <div class="form-line">${receipt.donor?.city || ''}</div>
        </div>
        <div class="form-group">
          <div class="form-label">मोबाईल क्र. <span>:</span></div>
          <div class="form-line">${receipt.donor?.phone || ''}</div>
        </div>
        <div class="form-group">
          <div class="form-label">ईमेल <span>:</span></div>
          <div class="form-line">${receipt.donor?.email || ''}</div>
        </div>

        <div class="amount-display">
          <div class="amt-box">
            <div class="amt-rupee">₹</div>
            <div class="amt-val">${Number(receipt.amount).toLocaleString('en-IN')}/-</div>
          </div>
          <div class="amt-words">
            <div class="amt-words-lbl">रक्कम शब्दात</div>
            <div class="amt-words-val">रुपये ${amountWords}</div>
          </div>
        </div>
        <div class="tip-msg">
          <strong>टीप / संदेश :</strong> ${receipt.notes || 'आपली देणगी आमच्यासाठी मोलाची आहे.'}
        </div>
      </div>

      <!-- Right Panel -->
      <div class="right-box">
        <div class="purpose-box">
          <div class="section-ribbon-container">
            <div class="section-ribbon">देणगीचा उद्देश<div class="ribbon-end-left"></div><div class="ribbon-end-right"></div></div>
          </div>
          <div class="grid-3col">
            <div class="cb-item"><div class="cb-square ${isGanesh ? 'checked' : ''}">${isGanesh ? '✓' : ''}</div> गणेशोत्सव</div>
            <div class="cb-item"><div class="cb-square ${isDonation ? 'checked' : ''}">${isDonation ? '✓' : ''}</div> सर्वसाधारण देणगी</div>
            <div class="cb-item"><div class="cb-square ${isMahaprasad ? 'checked' : ''}">${isMahaprasad ? '✓' : ''}</div> महाप्रसाद</div>
            <div class="cb-item"><div class="cb-square ${isDecoration ? 'checked' : ''}">${isDecoration ? '✓' : ''}</div> देखावा / सजावट</div>
            <div class="cb-item"><div class="cb-square ${isSocial ? 'checked' : ''}">${isSocial ? '✓' : ''}</div> सामाजिक उपक्रम</div>
            <div class="cb-item" style="grid-column: span 1;"><div class="cb-square ${isOther ? 'checked' : ''}">${isOther ? '✓' : ''}</div> अन्य <span style="border-bottom: 1.5px solid #a1a1aa; flex: 1; margin-left: 8px; display:inline-block; height: 20px;">${isOther ? receipt.purpose : ''}</span></div>
          </div>
        </div>

        <div class="payment-box">
          <div class="section-ribbon-container">
            <div class="section-ribbon">भरणा पद्धत<div class="ribbon-end-left"></div><div class="ribbon-end-right"></div></div>
          </div>
          <div class="grid-4col">
            <div class="cb-item"><div class="cb-square ${isCash ? 'checked' : ''}">${isCash ? '✓' : ''}</div> रोख</div>
            <div class="cb-item"><div class="cb-square ${isUPI ? 'checked' : ''}">${isUPI ? '✓' : ''}</div> UPI</div>
            <div class="cb-item"><div class="cb-square ${isBank ? 'checked' : ''}">${isBank ? '✓' : ''}</div> बँक ट्रान्सफर</div>
            <div class="cb-item"><div class="cb-square ${isCheque ? 'checked' : ''}">${isCheque ? '✓' : ''}</div> चेक</div>
          </div>
          <div class="utr-row">
            UTR / व्यवहार क्र. : <span style="border-bottom: 1.5px solid #a1a1aa; flex: 1; margin-left: 12px; display:inline-block; padding-left: 4px;">${receipt.transaction_ref || receipt.upi_reference || receipt.cheque_number || ''}</span>
          </div>

          <div class="qr-thankyou">
            <div class="qr-img">
              ${qrCodeUrl 
                ? `<img src="${qrCodeUrl}" alt="QR" />`
                : `<img src="${defaultUpiQrUrl}" alt="QR" />`
              }
              <span>Scan & Pay (UPI)</span>
            </div>
            <div class="ty-text">
              <div class="upi">UPI ID</div>
              <div class="upi-val">${upiId}</div>
              <div class="lbl">आपल्या अमूल्य सहकार्याबद्दल</div>
              <div class="msg">मनःपूर्वक धन्यवाद!</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Signatures -->
    <div class="signatures">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-lbl">देणगीदाराची सही</div>
      </div>
      <div class="footer-msg">॥ गणपती बाप्पा मोरया ॥</div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-lbl">अध्यक्ष / अधिकृत सही</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
