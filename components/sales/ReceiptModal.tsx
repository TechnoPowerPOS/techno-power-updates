
import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { Sale } from '../../types';
import { useSettings } from '../../hooks/useSettings';
import { formatCurrency, toArabicIndic, formatAmount } from '../../utils/localization';
import { Printer, FileText, MessageCircle, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { whatsappService } from '../../services/whatsappService';
import { api } from '../../services/mockApi';
import { hardwareService } from '../../services/hardwareService';
import Barcode from 'react-barcode';
import { InvoiceDesignRenderer } from './InvoiceDesignRenderer';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

const getQrUrl = (data: string) => `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data)}`;

const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, sale }) => {
  const { settings } = useSettings();
  const [isExporting, setIsExporting] = useState(false);
  const [isSendingWa, setIsSendingWa] = useState(false);

  // Always return the Modal to satisfy Rules of Hooks (hooks inside settings/sale/isOpen checks)
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={sale ? `معاينة فاتورة #${sale.id.toUpperCase()}` : 'معاينة الفاتورة'}
      footer={
        (!isOpen || !sale || !settings) ? null : (
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 w-full">
              <div className="flex gap-2 w-full md:w-auto">
                  <Button variant="secondary" onClick={onClose} className="rounded-xl flex-grow md:flex-grow-0 h-12 px-6 font-bold text-slate-600 hover:bg-slate-200">إغلاق</Button>
              </div>
              
              <div className="flex gap-2 w-full md:w-auto">
                  <Button 
                    onClick={async () => {
                        setIsSendingWa(true);
                        try {
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
                                amount: formatCurrency(sale.total, settings.currency),
                                customer_name: sale.customer.name
                            };
                            const formattedMessage = whatsappService.formatMessage(templateBody, messageData);
                            const customerPhone = sale.customer.phone || '0000000000';
                            let attachment;
                            const receiptElement = document.getElementById('printable-receipt-area');
                            if (receiptElement) {
                                const canvas = await html2canvas(receiptElement, { scale: 2 });
                                const imgData = canvas.toDataURL('image/png');
                                const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: settings.invoiceDesign.template === 'thermal' ? [80, 200] : 'a4' });
                                const pdfWidth = pdf.internal.pageSize.getWidth();
                                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                                attachment = { name: `invoice_${sale.id}.pdf`, base64: pdf.output('datauristring') };
                            }
                            const res = await whatsappService.sendMessage(customerPhone, formattedMessage, settings as any, undefined, sale.customer.name, attachment);
                            if (!res.success) alert(res.error);
                        } catch (e) { console.error(e); alert('فشل الإرسال'); } finally { setIsSendingWa(false); }
                    }} 
                    isLoading={isSendingWa} 
                    className="bg-[#25D366] hover:bg-[#128C7E] rounded-xl flex-grow md:flex-grow-0 h-12 shadow-md shadow-green-500/20 text-white font-bold"
                  >
                    <MessageCircle size={18} className="me-2"/> مشاركة واتساب
                  </Button>
                  <Button 
                    onClick={async () => {
                        const element = document.getElementById('printable-receipt-area');
                        if (!element) return;
                        setIsExporting(true);
                        try {
                            const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
                            const imgData = canvas.toDataURL('image/png');
                            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: settings.invoiceDesign.template === 'thermal' ? [80, 200] : 'a4' });
                            const pdfWidth = pdf.internal.pageSize.getWidth();
                            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                            pdf.save(`invoice-${sale.id.toLowerCase()}.pdf`);
                        } catch (err) { console.error(err); } finally { setIsExporting(false); }
                    }} 
                    isLoading={isExporting} 
                    className="bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 rounded-xl flex-grow md:flex-grow-0 h-12 text-white font-bold"
                  >
                    <Download size={18} className="me-2"/> حفظ PDF
                  </Button>
                  <Button 
                    onClick={() => hardwareService.print({
                        deviceName: settings.hardwareSettings?.defaultPrinterName,
                        silent: settings.hardwareSettings?.printMode === 'direct'
                    })} 
                    className="bg-indigo-600 hover:bg-indigo-700 rounded-xl flex-grow md:flex-grow-0 h-12 shadow-lg shadow-indigo-500/30 text-white font-black px-8"
                  >
                    <Printer size={18} className="me-2"/> طباعة
                  </Button>
              </div>
          </div>
        )
      }
    >
        {(!isOpen || !sale || !settings) ? (
            <div className="p-8 text-center text-slate-400">جاري تحميل البيانات...</div>
        ) : (
            <div className="bg-slate-100 dark:bg-slate-800 p-2 md:p-6 overflow-hidden custom-scrollbar relative">
                {settings.invoiceDesign.template === 'free' && settings.invoiceDesign.customCss && <style>{settings.invoiceDesign.customCss}</style>}
                
                <div id="printable-receipt-area" className="mx-auto rounded-xl">
                    <InvoiceDesignRenderer sale={sale as any} settings={settings as any} />
                </div>

                <style>{`
                    @media print {
                        body * { visibility: hidden; }
                        #printable-receipt-area, #printable-receipt-area * { visibility: visible; }
                        #printable-receipt-area { 
                            position: absolute; 
                            left: 0; 
                            top: 0; 
                            width: 100% !important; 
                            box-shadow: none !important;
                            border: none !important;
                        }
                    }
                `}</style>
            </div>
        )}
    </Modal>
  );
};

export default ReceiptModal;
