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
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Donation Receipt ${receipt.receipt_number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Mukta:wght@400;600;700;800&family=Inter:wght@400;500;600;700;800&family=Yatra+One&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', 'Mukta', sans-serif;
      background: #cbd5e1;
      display: flex; justify-content: center; align-items: center; min-height: 100vh;
      -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
    }
    
    .receipt-wrapper {
      width: 1050px; height: 742px; /* A4 Landscape */
      background: #ffffff;
      position: relative; overflow: hidden;
      border: 8px solid #fdfdfd;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(15, 23, 42, 0.15);
      display: flex; flex-direction: column;
    }
    /* Inner Gold/Orange Border */
    .receipt-wrapper::after {
      content: ''; position: absolute; top: 6px; right: 6px; bottom: 6px; left: 6px;
      border: 2px solid #e8a268; z-index: 1; pointer-events: none; border-radius: 8px;
    }
    
    /* Faint Center Watermark */
    .receipt-wrapper::before {
      content: 'ॐ'; position: absolute; top: 55%; left: 50%;
      transform: translate(-50%, -50%);
      font-size: 450px; color: #cf671f; opacity: 0.03;
      z-index: 0; font-family: 'Mukta', sans-serif; pointer-events: none; line-height: 1;
    }

    /* Top corner decorations */
    .corner-icon { position: absolute; width: 65px; height: 65px; opacity: 0.8; z-index: 2; color: #cf671f;}
    .corner-tl-svg { top: 10px; left: 10px; }
    .corner-tr-svg { top: 10px; right: 10px; transform: scaleX(-1); }

    /* Top Header */
    .header {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding: 16px 24px 0 24px; z-index: 2; position: relative;
    }

    /* Left Logo */
    .logo-area {
      width: 240px; text-align: center; position: relative; display: flex; justify-content: center; align-items: center;
    }
    .logo-circle {
      width: 170px; height: 170px; border-radius: 50%;
      background: #fff;
      border: 2px dashed #cf671f;
      display: flex; justify-content: center; align-items: center;
      position: relative; margin-top: 10px;
      padding: 6px;
      transform: scale(1.15);
      transform-origin: center left;
    }
    .logo-circle::after {
      content: ''; position: absolute; top: -8px; right: -8px; bottom: -8px; left: -8px; border-radius: 50%; border: 1.5px solid #ffd4b3; z-index: 0;
    }
    .logo-inner {
      width: 140px; height: 140px; border-radius: 50%; overflow: hidden;
      display: flex; justify-content: center; align-items: center;
      background: #fff; box-shadow: 0 4px 12px rgba(225, 149, 81, 0.4); z-index: 1;
    }
    .logo-inner img {
      width: 100%; height: 100%; object-fit: contain; padding: 2px; background: #fff; transform: scale(1.05);
    }

    /* Center Info */
    .center-info {
      flex: 1; text-align: center; padding-top: 0px;
    }
    .shree-namah {
      font-family: 'Yatra One', cursive; font-size: 24px; color: #b91c1c; font-weight: 400; letter-spacing: 2px;
      margin-bottom: -4px; display: flex; justify-content: center; align-items: center; gap: 8px;
    }
    .org-name {
      font-family: 'Yatra One', cursive; font-size: 60px; color: #1e3a8a; font-weight: 800;
      line-height: 1.1; margin-bottom: 4px; text-shadow: 1px 2px 2px rgba(0,0,0,0.08);
    }
    .address-line {
      font-size: 16px; color: #334155; font-weight: 700; display: flex; justify-content: center; align-items: center; gap: 6px;
    }
    .reg-info {
      font-size: 13px; color: #64748b; margin-top: 4px; font-weight: 600; letter-spacing: 0.5px;
    }

    /* Ribbon */
    .ribbon-wrapper {
      margin-top: 18px; position: relative; display: inline-block;
    }
    .ribbon {
      background: linear-gradient(90deg, #c2410c, #ea580c, #c2410c); color: #fff; padding: 6px 60px; font-size: 26px; font-weight: 900; font-family: 'Inter', sans-serif;
      position: relative; border-radius: 4px; z-index: 2; letter-spacing: 1.5px;
      box-shadow: 0 6px 15px rgba(234, 88, 12, 0.35);
      border: 1px solid #f97316;
    }
    .ribbon::before, .ribbon::after {
      content: ''; position: absolute; top: 50%; transform: translateY(-50%);
      border-style: solid; border-color: transparent; z-index: -1;
    }
    .ribbon-decor-left, .ribbon-decor-right {
      position: absolute; top: 12px; z-index: -1;
      border: 22px solid #c2410c;
    }
    .ribbon-decor-left {
      left: -35px; border-left-color: transparent; border-right-width: 45px;
    }
    .ribbon-decor-right {
      right: -35px; border-right-color: transparent; border-left-width: 45px;
    }
    .ribbon-shadow-left { position: absolute; left: 0; bottom: -10px; border: 5px solid transparent; border-top-color: #7c2d12; border-right-color: #7c2d12; z-index: 1;}
    .ribbon-shadow-right { position: absolute; right: 0; bottom: -10px; border: 5px solid transparent; border-top-color: #7c2d12; border-left-color: #7c2d12; z-index: 1;}
    .ribbon-sub { font-size: 22px; color: #1e3a8a; font-weight: 800; margin-top: 16px; font-family: 'Yatra One', cursive; display: flex; justify-content: center; align-items: center; gap: 10px;}
    .ribbon-sub::before, .ribbon-sub::after { content: '❖'; color: #ea580c; font-size: 16px; opacity: 0.8;}

    /* Right Info */
    .right-info {
      width: 270px; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;
    }
    .info-box-group {
      display: flex; flex-direction: column; gap: 6px; width: 100%;
    }
    .info-box {
      width: 250px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; display: flex; align-items: center; padding: 4px 10px; gap: 10px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
    }
    .info-icon {
      width: 28px; height: 28px; background: linear-gradient(135deg, #ea580c, #c2410c); border-radius: 6px; display: flex; justify-content: center; align-items: center; color: #fff; font-size: 14px; box-shadow: 0 2px 5px rgba(234, 88, 12, 0.3);
    }
    .info-icon.purple { background: linear-gradient(135deg, #4f46e5, #4338ca); box-shadow: 0 2px 5px rgba(79, 70, 229, 0.3); }
    .info-text { display: flex; flex-direction: column; }
    .info-lbl { font-size: 11px; color: #64748b; font-weight: 800; line-height: 1.2; text-transform: uppercase; letter-spacing: 0.5px;}
    .info-val { font-size: 15px; color: #0f172a; font-weight: 800; line-height: 1.2;}
    
    .qr-verify-box {
      width: 250px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; display: flex; align-items: center; justify-content: center; padding: 6px 12px; gap: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.03);
    }
    .qr-verify-box img { width: 44px; height: 44px; border-radius: 4px; mix-blend-mode: multiply;}
    .qr-verify-box span { font-size: 13px; font-weight: 800; color: #1e3a8a; text-align: left; line-height: 1.2; letter-spacing: 0.5px;}

    /* Main Body */
    .main-body {
      display: flex; gap: 24px; flex: 1; z-index: 2; position: relative; padding: 12px 28px 0 28px;
    }

    /* Left Box (Donor Info) */
    .left-panel {
      flex: 1.05; display: flex; flex-direction: column; gap: 14px;
    }
    .donor-box {
      border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; overflow: hidden;
      box-shadow: 0 4px 10px rgba(0,0,0,0.04); flex: 1; display: flex; flex-direction: column;
    }
    .donor-header {
      background: linear-gradient(90deg, #1e3a8a, #312e81); color: #fff; padding: 10px 18px; font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 10px; border-bottom: 3px solid #ea580c; letter-spacing: 0.5px;
    }
    .donor-header-icon { font-size: 20px; font-weight: 400; opacity: 0.9; margin-bottom: 2px;}
    .donor-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; flex: 1;}
    
    .form-group { display: flex; align-items: flex-start; font-size: 15px; }
    .form-icon { width: 30px; display: flex; justify-content: flex-start; color: #3b82f6; font-size: 18px; opacity: 0.9;}
    .form-label { width: 110px; font-weight: 700; color: #475569; }
    .form-colon { width: 20px; text-align: center; font-weight: 700; color: #475569; }
    .form-val { flex: 1; font-weight: 800; color: #0f172a; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px;}

    .amount-box {
      border: 2px solid #fed7aa; border-radius: 12px; background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); overflow: hidden; display: flex; align-items: stretch; position: relative;
      box-shadow: 0 4px 12px rgba(234, 88, 12, 0.08);
    }
    .amount-box::after {
      content: 'RECEIVED'; position: absolute; right: 20px; top: 15px; font-size: 36px; color: rgba(220, 38, 38, 0.1); font-weight: 900; transform: rotate(-15deg); pointer-events: none; border: 3px solid rgba(220, 38, 38, 0.1); border-radius: 8px; padding: 4px 12px; letter-spacing: 2px;
    }
    .amt-icon-box { background: linear-gradient(135deg, #ea580c, #c2410c); color: #fff; display: flex; justify-content: center; align-items: center; padding: 15px 25px; border-radius: 10px; margin: 12px; box-shadow: 0 4px 10px rgba(234, 88, 12, 0.3);}
    .amt-icon-box span { font-size: 42px; font-weight: 800; line-height: 1;}
    .amt-details { padding: 15px 12px; display: flex; flex-direction: column; justify-content: center; gap: 4px; z-index: 1;}
    .amt-val-lbl { font-size: 12px; color: #9a3412; font-weight: 900; letter-spacing: 0.5px;}
    .amt-val { font-size: 36px; font-weight: 900; color: #0f172a; line-height: 1; letter-spacing: -0.5px;}
    
    .amt-words-sec { border-left: 2px solid #fdba74; margin: 15px 0; padding: 0 15px; display: flex; flex-direction: column; justify-content: center; gap: 6px; flex: 1; z-index: 1;}
    .amt-words-lbl { font-size: 12px; color: #9a3412; font-weight: 900; letter-spacing: 0.5px;}
    .amt-words-val { font-size: 15px; font-weight: 700; color: #0f172a; line-height: 1.3;}

    .remarks-box {
      border: 1px solid #bae6fd; border-radius: 8px; background: #f0f9ff; padding: 12px 20px; font-size: 15px; display: flex; align-items: center; gap: 12px; color: #0369a1; font-weight: 600;
    }
    .remarks-box .icon { color: #0284c7; font-size: 20px;}
    .remarks-box strong { color: #075985; font-weight: 800;}

    /* Right Box (Purpose & Payment) */
    .right-panel {
      flex: 0.95; display: flex; flex-direction: column; gap: 14px;
    }
    .purpose-box, .payment-box {
      border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; padding: 18px 20px; position: relative; box-shadow: 0 4px 10px rgba(0,0,0,0.04);
    }
    .box-title { font-size: 17px; font-weight: 800; color: #1e3a8a; margin-bottom: 12px; display: flex; align-items: center; gap: 10px;}
    .box-title .icon { color: #3b82f6; font-size: 20px; margin-bottom: 2px;}
    .divider { border-bottom: 2px solid #e2e8f0; margin-bottom: 16px; margin-top: -6px;}
    
    .grid-2col {
      display: grid; grid-template-columns: 1fr 1fr; gap: 14px 10px; font-size: 15px;
    }
    .cb-item { display: flex; align-items: center; gap: 10px; font-weight: 600; color: #334155;}
    .cb-square {
      width: 22px; height: 22px; border: 2px solid #94a3b8; border-radius: 5px;
      display: flex; justify-content: center; align-items: center; font-size: 16px; background: #fff; box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
    }
    .cb-square.checked { background: #ea580c; border-color: #ea580c; color: #fff; font-weight: 900; box-shadow: 0 2px 5px rgba(234, 88, 12, 0.4);}

    .payment-box { flex: 1; display: flex; flex-direction: column; }
    .utr-box { background: #f8fafc; border-radius: 8px; padding: 14px 16px; margin-top: auto; display: flex; align-items: center; gap: 10px; font-size: 15px; color: #475569; width: 62%; border: 1px solid #e2e8f0;}
    .utr-val { font-weight: 800; color: #0f172a; flex: 1; min-height: 20px;}
    .utr-val span { border-bottom: 1.5px dashed #94a3b8; width: 100%; display: inline-block;}
    
    .qr-upi-box {
      position: absolute; right: 20px; bottom: 20px; width: 145px; border: 1px solid #cbd5e1; border-radius: 10px; background: #f8fafc; padding: 12px; text-align: center; box-shadow: 0 6px 12px rgba(0,0,0,0.05);
    }
    .qr-upi-box .title { font-size: 13px; font-weight: 900; color: #1e3a8a; margin-bottom: 10px;}
    .qr-upi-box img { width: 95px; height: 95px; margin: 0 auto; display: block; border-radius: 6px; mix-blend-mode: multiply;}
    .qr-upi-box .upi-id-lbl { font-size: 11px; color: #64748b; margin-top: 8px; font-weight: 700;}
    .qr-upi-box .upi-id-val { font-size: 12px; color: #0f172a; font-weight: 800; word-break: break-all;}

    /* Footer */
    .footer {
      margin-top: 12px; z-index: 2; position: relative; display: flex; flex-direction: column; align-items: center; width: 100%;
    }
    .footer-msg {
      font-size: 26px; font-weight: 800; color: #ea580c; margin-bottom: 4px; display: flex; align-items: center; gap: 20px; font-family: 'Mukta', sans-serif;
    }
    .lotus-icon { color: #ea580c; font-size: 28px; opacity: 0.9;}
    .footer-submsg { font-size: 18px; font-weight: 700; color: #334155; margin-bottom: 12px;}
    
    .bottom-bar {
      width: 100%; background: linear-gradient(90deg, #0f172a, #1e293b, #0f172a); color: #f8fafc; padding: 12px 30px;
      display: flex; justify-content: space-between; align-items: center; border-radius: 0 0 12px 12px; border-top: 2px solid #ea580c;
    }
    .bottom-item { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600;}
    .bottom-item .icon { font-size: 20px; color: #94a3b8; }
    .play-btn { background: #000; color: #fff; border-radius: 6px; padding: 6px 12px; display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700; border: 1px solid #334155; box-shadow: 0 2px 4px rgba(0,0,0,0.5);}
    .play-btn span { font-size: 16px;}

    @media print {
      @page { size: A4 landscape; margin: 0; }
      body { padding: 0; background: #fff; }
      .receipt-wrapper { width: 297mm; height: 210mm; border: none; box-shadow: none; border-radius: 0;}
      .receipt-wrapper::after { display: none; }
      .receipt-wrapper::before { color: #000; opacity: 0.02; }
      .bottom-bar { border-radius: 0; }
    }
  </style>
</head>
<body>
  <div class="receipt-wrapper">
    <!-- SVG Corners -->
    <svg class="corner-icon corner-tl-svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4"><path d="M0,40 C20,40 40,20 40,0" /><circle cx="20" cy="20" r="3" fill="currentColor"/></svg>
    <svg class="corner-icon corner-tr-svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4"><path d="M0,40 C20,40 40,20 40,0" /><circle cx="20" cy="20" r="3" fill="currentColor"/></svg>

    <!-- Header -->
    <div class="header">
      <div class="logo-area">
        <div class="logo-circle">
          <div class="logo-inner">
            <img src="${logoUrl}" alt="Logo" />
          </div>
        </div>
      </div>
      <div class="center-info">
        <div class="shree-namah">॥ श्री गणेशाय नमः ॥</div>
        <div class="org-name">${orgName}</div>
        <div class="address-line">
          <span style="color: #ea580c; font-size: 22px;">&#x1F4CD;</span> 
          ${orgData?.address ? orgData.address + (orgData?.city ? ', ' + orgData.city : '') : (orgData?.city ? orgData.city + (orgData?.state ? ', ' + orgData.state : '') : 'Maharashtra, India')}
        </div>
        <div class="reg-info">
          Registered Organization &nbsp;|&nbsp; Official Receipt
        </div>
        
        <div class="ribbon-wrapper">
          <div class="ribbon-shadow-left"></div>
          <div class="ribbon-decor-left"></div>
          <div class="ribbon">DONATION RECEIPT</div>
          <div class="ribbon-decor-right"></div>
          <div class="ribbon-shadow-right"></div>
        </div>
        <div class="ribbon-sub">देणगी पावती</div>
      </div>
      <div class="right-info">
        <div class="info-box-group">
          <div class="info-box">
            <div class="info-icon purple">★</div>
            <div class="info-text">
              <span class="info-lbl">Receipt No.</span>
              <span class="info-val">${receipt.receipt_number}</span>
            </div>
          </div>
          <div class="info-box">
            <div class="info-icon">📅</div>
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

    <!-- Body -->
    <div class="main-body">
      <!-- Left Panel -->
      <div class="left-panel">
        <div class="donor-box">
          <div class="donor-header">
            <span class="donor-header-icon">👤</span> Received With Thanks From
          </div>
          <div class="donor-body">
            <div class="form-group">
              <div class="form-icon">👤</div>
              <div class="form-label">Donor Name</div>
              <div class="form-colon">:</div>
              <div class="form-val">${receipt.donor?.full_name || ''}</div>
            </div>
            <div class="form-group">
              <div class="form-icon">📍</div>
              <div class="form-label">Address</div>
              <div class="form-colon">:</div>
              <div class="form-val">${receipt.donor?.address || ''}${receipt.donor?.city ? ', ' + receipt.donor.city : ''}</div>
            </div>
            <div class="form-group">
              <div class="form-icon">📞</div>
              <div class="form-label">Mobile No.</div>
              <div class="form-colon">:</div>
              <div class="form-val">${receipt.donor?.phone || ''}</div>
            </div>
            <div class="form-group">
              <div class="form-icon">✉️</div>
              <div class="form-label">Email</div>
              <div class="form-colon">:</div>
              <div class="form-val">${receipt.donor?.email || ''}</div>
            </div>
          </div>
        </div>

        <div class="amount-box">
          <div class="amt-icon-box">
            <span>₹</span>
          </div>
          <div class="amt-details">
            <div class="amt-val-lbl">AMOUNT</div>
            <div class="amt-val">${Number(receipt.amount).toLocaleString('en-IN')}/-</div>
          </div>
          <div class="amt-words-sec">
            <div class="amt-words-lbl">AMOUNT IN WORDS</div>
            <div class="amt-words-val">Rupees ${amountWords}</div>
          </div>
        </div>

        <div class="remarks-box">
          <span class="icon">💬</span>
          <div><strong>Remarks :</strong> ${receipt.notes || receipt.festival_name || 'Ganesh Utsav 2026'}</div>
        </div>
      </div>

      <!-- Right Panel -->
      <div class="right-panel">
        <div class="purpose-box">
          <div class="box-title"><span class="icon">★</span> Purpose of Donation</div>
          <div class="divider"></div>
          <div class="grid-2col">
            <div class="cb-item"><div class="cb-square ${isGanesh ? 'checked' : ''}">${isGanesh ? '✓' : ''}</div> Ganesh Festival</div>
            <div class="cb-item"><div class="cb-square ${isDonation ? 'checked' : ''}">${isDonation ? '✓' : ''}</div> Donation</div>
            <div class="cb-item"><div class="cb-square ${isMahaprasad ? 'checked' : ''}">${isMahaprasad ? '✓' : ''}</div> Mahaprasad</div>
            <div class="cb-item"><div class="cb-square ${isDecoration ? 'checked' : ''}">${isDecoration ? '✓' : ''}</div> Decoration</div>
            <div class="cb-item"><div class="cb-square ${isSocial ? 'checked' : ''}">${isSocial ? '✓' : ''}</div> Social Activity</div>
            <div class="cb-item"><div class="cb-square ${isOther ? 'checked' : ''}">${isOther ? '✓' : ''}</div> Other <span style="border-bottom: 1px dotted #a1a1aa; flex: 1; margin-left: 8px;">${isOther ? receipt.purpose : ''}</span></div>
          </div>
        </div>

        <div class="payment-box">
          <div class="box-title"><span class="icon">💳</span> Payment Mode</div>
          <div class="divider"></div>
          <div class="grid-2col" style="width: 65%;">
            <div class="cb-item"><div class="cb-square ${isCash ? 'checked' : ''}">${isCash ? '✓' : ''}</div> Cash</div>
            <div class="cb-item"><div class="cb-square ${isUPI ? 'checked' : ''}">${isUPI ? '✓' : ''}</div> UPI</div>
            <div class="cb-item"><div class="cb-square ${isBank ? 'checked' : ''}">${isBank ? '✓' : ''}</div> Bank Transfer</div>
            <div class="cb-item"><div class="cb-square ${isCheque ? 'checked' : ''}">${isCheque ? '✓' : ''}</div> Cheque</div>
          </div>
          
          <div class="utr-box">
            Transaction / UTR No. : 
            <div class="utr-val"><span>${receipt.transaction_ref || receipt.upi_reference || receipt.cheque_number || ''}</span></div>
          </div>

          <div class="qr-upi-box">
            <div class="title">Scan & Pay<br/>(UPI)</div>
            ${qrCodeUrl 
              ? `<img src="${qrCodeUrl}" alt="QR" />`
              : `<img src="${defaultUpiQrUrl}" alt="QR" />`
            }
            <div class="upi-id-lbl">UPI ID:</div>
            <div class="upi-id-val">${upiId}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-msg">
        <span class="lotus-icon">🪷</span> ॥ गणपती बाप्पा मोरया ॥ <span class="lotus-icon">🪷</span>
      </div>
      <div class="footer-submsg">आपल्या देणगीसाठी मनःपूर्वक धन्यवाद !</div>
      
      <div class="bottom-bar">
        <div class="bottom-item">
          <span class="icon">🌐</span> ${orgData?.website || 'www.hisob.in'}
        </div>
        <div class="bottom-item">
          <span class="icon">📞</span> ${orgData?.phone || '+91 12345 67890'}
        </div>
        <div class="bottom-item" style="gap: 16px;">
          <span>↓ आमचा ॲप डाउनलोड करा</span>
          <div class="play-btn">
            <span>▶</span> GET IT ON Google Play
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
