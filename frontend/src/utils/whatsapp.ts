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
`🙏 *Jai Ganesh! Thank you for your generous contribution.*

📜 *DONATION RECEIPT VOUCHER*
---------------------------------------
🏛️ *Trust:* ${org}
🧾 *Receipt No:* ${details.receiptNumber}
📅 *Date:* ${formattedDate}
👤 *Donor Name:* ${details.donorName}
💰 *Amount Paid:* ${formattedAmount}
💳 *Payment Mode:* ${modeText}
${details.purpose ? `📌 *Purpose:* ${details.purpose}\n` : ''}---------------------------------------
✅ *Status:* Confirmed & Recorded
Tax Exemption (80G) Eligible
${verifyUrl ? `\n🔗 *View & Verify Receipt Online:*\n${verifyUrl}\n` : ''}
_Issued via Hissob ERP system._`;

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
