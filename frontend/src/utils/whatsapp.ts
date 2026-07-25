/**
 * Utility helper to generate WhatsApp message links for instant donation receipt dispatch.
 */

export interface ReceiptWhatsAppDetails {
  receiptNumber: string;
  donorName: string;
  donorPhone?: string;
  amount: number;
  paymentMode: string;
  receiptDate: string;
  orgName?: string;
  purpose?: string;
}

export function generateWhatsAppReceiptLink(details: ReceiptWhatsAppDetails): string {
  const org = details.orgName || 'Hissob Trust Management';
  const modeText = (details.paymentMode || 'CASH').toUpperCase();
  const formattedAmount = `₹ ${Number(details.amount || 0).toLocaleString('en-IN')}`;

  const messageText = 
`🙏 *Jai Ganesh! Thank you for your generous contribution.*

📜 *DONATION RECEIPT VOUCHER*
---------------------------------------
🏛️ *Trust:* ${org}
🧾 *Receipt No:* ${details.receiptNumber}
📅 *Date:* ${details.receiptDate}
👤 *Donor Name:* ${details.donorName}
💰 *Amount Paid:* ${formattedAmount}
💳 *Payment Mode:* ${modeText}
${details.purpose ? `📌 *Purpose:* ${details.purpose}\n` : ''}---------------------------------------
✅ *Status:* Confirmed & Recorded
` + "Tax Exemption (80G) Eligible\n\n" + 
`_Issued via Hissob ERP system._`;

  const encodedText = encodeURIComponent(messageText);

  // Clean phone number (remove non-digits)
  let cleanPhone = (details.donorPhone || '').replace(/\D/g, '');
  if (cleanPhone && !cleanPhone.startsWith('91') && cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }

  if (cleanPhone) {
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  }

  return `https://api.whatsapp.com/send?text=${encodedText}`;
}
