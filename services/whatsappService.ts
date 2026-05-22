import { api } from './mockApi';
import { StoreSettings, WhatsAppTemplate, Sale } from '../types';

export const whatsappService = {
  formatMessage(template: string, data: Record<string, any>) {
    let result = template;
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key] !== undefined && data[key] !== null ? String(data[key]) : '';
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }
    }
    return result;
  },

  async autoSendInvoice(sale: Sale, settings: StoreSettings) {
      if (!settings.whatsappAutoSendOnInvoice || settings.whatsappMode !== 'api') return;
      if (!sale.customer.phone) return; // Cannot auto send without phone
      
      const templates = await api.getWhatsAppTemplates();
      let templateBody = '';
      
      const invoiceTemplates = templates.filter(t => t.type === 'invoice');
      if (invoiceTemplates.length > 0) {
          templateBody = invoiceTemplates.find(t => t.isDefault)?.body || invoiceTemplates[0].body;
      } else {
          templateBody = `*فاتورة مبيعات من {{store_name}}*\nرقم الفاتورة: {{invoice_number}}\nالتاريخ: {{date}}\n*الإجمالي: {{amount}}*`;
      }

      const messageData = {
          store_name: settings.storeName,
          invoice_number: sale.id.toUpperCase(),
          date: new Date(sale.date).toLocaleDateString('ar-EG'),
          amount: String(sale.total), // Consider passing currency string or formatting it properly later if needed
          customer_name: sale.customer.name
      };

      const formattedMessage = this.formatMessage(templateBody, messageData);
      
      this.sendMessage(
          sale.customer.phone,
          formattedMessage,
          settings,
          invoiceTemplates[0]?.id,
          sale.customer.name
      ).catch(e => console.error("Auto WhatsApp Send Error", e));
  },

  async sendMessage(
    phone: string, 
    message: string, 
    settings: StoreSettings, 
    templateId?: string,
    customerName?: string,
    attachment?: { name: string; base64: string }
  ): Promise<{ success: boolean; error?: string }> {
    // Format phone number to international format (starting with country code, no +)
    // assuming numbers often start with 0 in local formats or +
    let formattedPhone = phone.replace(/\D/g, '');
    
    // Simple naive check. A real app needs robust phone parsing (eg, libphonenumber)
    if (formattedPhone.startsWith('0')) {
      // Assuming a generic country code might be needed if they didn't provide one, usually we just keep it as is 
      // but wa.me requires country code, e.g., 20 for Egypt, 966 for KSA. For now, we just pass the formatted phone numbers.
      // E.g., user is expected to put country code, or we could add +countrycode. 
    }

    if (settings.whatsappMode === 'api') {
      if (!settings.whatsappApiUrl || !settings.whatsappToken || !settings.whatsappPhoneId) {
        return { success: false, error: 'إعدادات API غير مكتملة' };
      }

      try {
        // Mock of network request - In real implementation, this would be an actual fetch request 
        // to Meta WhatsApp Cloud API or other provider
        
        // Example for Meta Cloud API
        /*
        const response = await fetch(`${settings.whatsappApiUrl}/${settings.whatsappPhoneId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${settings.whatsappToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: formattedPhone,
            type: "text",
            text: { body: message }
          })
        });
        
        if (!response.ok) {
           throw new Error('فشل إرسال الرسالة عبر API');
        }
        */

        // For now, we simulate success since we are in a mock environment without a real API URL
        // If a real URL is provided, uncomment the fetch block above.
        
        // Log to db
        await api.logWhatsAppMessage({
            to: formattedPhone,
            customerName,
            templateId,
            body: message + (attachment ? `\n[مرفق ملف: ${attachment.name}]` : ''),
            status: 'success',
            mode: 'api'
        });

        return { success: true };
      } catch (error: any) {
        await api.logWhatsAppMessage({
            to: formattedPhone,
            customerName,
            templateId,
            body: message,
            status: 'failed',
            error: error.message,
            mode: 'api'
        });
        return { success: false, error: error.message };
      }
    } else {
      // mode: wa.me
      const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      
      await api.logWhatsAppMessage({
          to: formattedPhone,
          customerName,
          templateId,
          body: message,
          status: 'success',
          mode: 'wa.me'
      });

      return { success: true };
    }
  }
};
