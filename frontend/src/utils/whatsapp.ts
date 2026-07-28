/**
 * Utility helper to generate WhatsApp message links for instant donation receipt dispatch.
 */

export interface ReceiptWhatsAppDetails {
  receiptId?: string;
  receiptNumber: string;
  donorName: string;
  donorPhone?: string;
  amount: number;
  paymentMode: string;
  receiptDate: string;
  orgName?: string;
  purpose?: string;
}

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

export function generateWhatsAppReceiptLink(details: ReceiptWhatsAppDetails): string {
  const org = details.orgName || 'Hisob ERP';
  const modeText = (details.paymentMode || 'CASH').toUpperCase();
  const formattedAmount = `₹ ${Number(details.amount || 0).toLocaleString('en-IN')}`;
  const formattedDate = formatDateDDMMYYYY(details.receiptDate);
  const verifyUrl = details.receiptId ? `${window.location.origin}/verify/${details.receiptId}` : '';

  const messageText = 
`🚩 *॥ श्री गणेशाय नमः ॥*
🏛️ *${org}*

🙏 *आपल्या अमूल्य योगदानाबद्दल मनःपूर्वक धन्यवाद!*
*Thank you for your generous contribution.*

📜 *OFFICIAL DONATION RECEIPT | देणगी पावती*
━━━━━━━━━━━━━━━━━━━━━━━
🧾 *पावती क्र. (Receipt No):* ${details.receiptNumber}
📅 *दिनांक (Date):* ${formattedDate}
👤 *देणगीदार (Donor):* ${details.donorName}
💰 *रक्कम (Amount):* *${formattedAmount}*
💳 *भरणा प्रकार (Mode):* ${modeText}
${details.purpose ? `📌 *उद्देश (Purpose):* ${details.purpose}\n` : ''}━━━━━━━━━━━━━━━━━━━━━━━
✅ *Status:* Confirmed & Authentic Receipt
${verifyUrl ? `\n🔗 *डिजिटल पावती ऑनलाइन पाहा व तपासा:*\n${verifyUrl}\n` : ''}
🌺 *गणपती बाप्पा मोरया! मंगलमूर्ती मोरया!*
_Issued via Hisob ERP System | Developed by www.mayurpatil.in_`;

  const encodedText = encodeURIComponent(messageText);

  // Clean phone number (remove non-digits)
  let cleanPhone = (details.donorPhone || '').replace(/\D/g, '');
  if (cleanPhone && !cleanPhone.startsWith('91') && cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }

  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }

  return `https://wa.me/?text=${encodedText}`;
}
