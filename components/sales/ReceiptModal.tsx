
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
                
                <div id="printable-receipt-area" className={`receipt-container bg-white text-black p-4 md:p-10 shadow-2xl mx-auto font-sans relative rounded-xl border-t-8`} style={{ maxWidth: settings.invoiceDesign.template === 'thermal' ? '80mm' : '210mm', borderColor: settings.invoiceDesign.accentColor }}>
                    <div className="flex justify-between items-start mb-10 pb-6 border-b-2 border-slate-100">
                        <div className="flex flex-col gap-2">
                            {settings.invoiceDesign.showLogo && settings.logoUrl && <img src={settings.logoUrl} className="w-32 object-contain" alt="Logo" />}
                            <h2 className="text-3xl font-black" style={{ color: settings.invoiceDesign.accentColor }}>{settings.storeName}</h2>
                            <p className="text-sm font-bold text-slate-500">فاتورة ضريبية / Tax Invoice</p>
                            {settings.invoiceDesign.vatNumber && <p className="text-sm font-mono text-slate-600 mt-1">الرقم الضريبي: {toArabicIndic(settings.invoiceDesign.vatNumber)}</p>}
                        </div>
                        <div className="text-end bg-slate-50 p-4 rounded-2xl">
                            <h1 className="text-xl font-black text-slate-400 mb-1 tracking-widest">INVOICE</h1>
                            <p className="text-2xl font-black font-mono text-slate-800">#{sale.id.toUpperCase()}</p>
                            <p className="text-sm font-bold text-slate-500 mt-2">{new Date(sale.date).toLocaleDateString('ar-EG')}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-10">
                        <div className="p-4 bg-slate-50 rounded-2xl border-l-4" style={{ borderColor: settings.invoiceDesign.accentColor }}>
                            <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">معلومات العميل</h4>
                            <p className="font-bold text-lg text-slate-800">{sale.customer.name}</p>
                            {sale.customer.phone && <p className="text-xs text-slate-500">{sale.customer.phone}</p>}
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border-l-4" style={{ borderColor: settings.invoiceDesign.accentColor }}>
                            <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">تفاصيل العملية</h4>
                            <div className="flex justify-between text-sm mb-1"><span className="text-slate-500">البائع:</span> <span className="font-bold">{sale.cashier.name}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-slate-500">طريقة الدفع:</span> <span className="font-bold">{sale.paymentMethod === 'Cash' ? 'نقدي' : sale.paymentMethod === 'Card' ? 'بطاقة' : sale.paymentMethod === 'Split' ? 'مجزأ' : 'آجل'}</span></div>
                        </div>
                    </div>

                    <div className="mb-10">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-100 rounded-lg overflow-hidden text-slate-600">
                                <tr>
                                    <th className="text-start py-4 px-4 font-black rounded-r-lg">البيان</th>
                                    <th className="text-center py-4 font-black">الكمية</th>
                                    <th className="text-center py-4 font-black">السعر</th>
                                    <th className="text-end py-4 px-4 font-black rounded-l-lg">الإجمالي</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                 {sale.items.map(item => {
                                     const itemDiscount = item.discount || (item.sellPrice * (item.discountPercent || 0) / 100);
                                     return (
                                         <tr key={item.id}>
                                             <td className="py-4 px-4 font-bold text-slate-800">{item.name}</td>
                                             <td className="py-4 text-center font-mono font-bold">{toArabicIndic(item.quantity)}</td>
                                             <td className="py-4 text-center font-mono">{formatAmount(item.sellPrice)}</td>
                                             <td className="py-4 px-4 text-end font-black text-slate-800">{formatAmount((item.sellPrice - itemDiscount) * item.quantity)}</td>
                                         </tr>
                                     );
                                 })}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-end gap-8 pt-4 border-t-2 border-slate-100">
                        <div>
                            {settings.invoiceDesign.showQrCode && (
                                <div className="p-3 bg-white border-2 border-slate-100 rounded-2xl shadow-sm">
                                    <img src={getQrUrl(`INV:${sale.id}|TOTAL:${sale.total}|VAT:${settings.taxRegisterNumber}`)} className="w-28 h-28" alt="QR" />
                                </div>
                            )}
                        </div>
                        <div className="w-full md:w-80 space-y-3 bg-slate-50 p-6 rounded-3xl">
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>الإجمالي الفرعي:</span> 
                                <span className="font-mono">{formatAmount(sale.total - (sale.tax || sale.vatAmount || 0) + (sale.discountValue || sale.discount || 0))}</span>
                            </div>
                            {(sale.discountValue > 0 || sale.discount > 0) && (
                                <div className="flex justify-between text-sm text-rose-500">
                                    <span>الخصم:</span> 
                                    <span className="font-mono font-bold">-{formatAmount(sale.discountValue || sale.discount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>الضريبة المضافة ({toArabicIndic(settings.vatRate)}%):</span> 
                                <span className="font-mono">{formatAmount(sale.tax || sale.vatAmount || 0)}</span>
                            </div>
                            <div className="flex justify-between text-xl font-black pt-4 mt-2 border-t border-slate-200" style={{ color: settings.invoiceDesign.accentColor }}>
                                <span>الإجمالي / Total:</span>
                                <span className="font-mono">{formatCurrency(sale.total, settings.currency)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 text-center text-slate-500 text-sm font-bold pt-8 border-t border-dashed">
                        {settings.invoiceFooter || 'نشكركم لتعاملكم معنا'}
                        <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs">
                          {settings.storePhone && <span className="font-mono">{toArabicIndic(settings.storePhone)}</span>}
                          {settings.storeEmail && <span className="font-mono">{settings.storeEmail}</span>}
                          {settings.storeAddress && <span>{settings.storeAddress}</span>}
                        </div>
                    </div>
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
