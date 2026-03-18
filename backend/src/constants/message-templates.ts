export const MESSAGE_TEMPLATES = {
  PAYMENT_REMINDER: {
    SMS: 'Hi {{member_name}}, your {{amount}} contribution is due {{due_date}}. Group: {{group_name}}',
    WHATSAPP: `Hi {{member_name}},\n\nReminder: Your contribution of {{amount}} is due on {{due_date}}.\n\nGroup: {{group_name}}\nAccount: {{account_number}}\n\nThank you!`,
  },
  
  PAYMENT_CONFIRMED: {
    SMS: 'Payment confirmed: {{amount}} received on {{payment_date}}. Thank you!',
    WHATSAPP: `Payment Confirmed! ✅\n\nHi {{member_name}},\n\nWe've received your {{amount}} contribution.\n\nDate: {{payment_date}}\nAccount: {{account_number}}\n\nThank you!`,
  },
  
  PAYMENT_OVERDUE: {
    SMS: 'URGENT: Your {{amount}} payment is {{days_overdue}} days overdue. Please pay ASAP. Group: {{group_name}}',
    WHATSAPP: `⚠️ Payment Overdue\n\nHi {{member_name}},\n\nYour {{amount}} contribution is {{days_overdue}} days overdue.\n\nPlease make payment as soon as possible to avoid penalties.\n\nGroup: {{group_name}}\nContact admin: {{admin_contact}}`,
  },
  
  PAYOUT_NOTIFICATION: {
    SMS: 'You\'ll receive {{payout_amount}} on {{payout_date}}. Group: {{group_name}}',
    WHATSAPP: `Payout Notice 💰\n\nHi {{member_name}},\n\nYou're scheduled to receive {{payout_amount}} on {{payout_date}}.\n\nGroup: {{group_name}}\n\nStay tuned!`,
  },
  
  MEMBER_APPROVED: {
    SMS: 'Welcome to {{group_name}}! Your account: {{account_number}}. First payment: {{amount}} due {{due_date}}',
    WHATSAPP: `Welcome! 🎉\n\nHi {{member_name}},\n\nYou've been approved to join {{group_name}}!\n\nAccount Number: {{account_number}}\nContribution Amount: {{amount}}\nPayment Frequency: {{frequency}}\nFirst Payment Due: {{due_date}}\n\nWelcome aboard!`,
  },
  
  MONTHLY_SUMMARY: {
    WHATSAPP: `Monthly Summary 📊\n\nHi {{member_name}},\n\nGroup: {{group_name}}\nTotal Contributed This Month: {{monthly_total}}\nTotal Contributed Overall: {{total_contributed}}\nNext Payment: {{next_payment_date}}\n\nGroup Health: {{group_compliance}}% compliance rate\n\nKeep up the great work!`,
  },
};
