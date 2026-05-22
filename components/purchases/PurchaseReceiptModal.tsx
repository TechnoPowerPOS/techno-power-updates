import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { Purchase } from '../../types';
import { useSettings } from '../../hooks/useSettings';
import { formatCurrency, toArabicIndic, formatAmount } from '../../utils/localization';
import { Printer, FileText, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PurchaseReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: Purchase | null;
}

const PurchaseReceiptModal: React.FC<PurchaseReceiptModalProps> = ({ isOpen, onClose, purchase }) => {
  const { settings } = useSettings();
  const [isExporting, setIsExporting] = useState(false);
  
  if (!purchase || !settings) return null;

  const { template, showLogo, accentColor, customCss } = settings.invoiceDesign;
  const currency = settings.currency;
  
  const subTotalBeforeItemDiscounts = purchase.items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
  const totalItemDiscounts = purchase.items.reduce((sum, item) => sum + ((item.discount || 0) * item.quantity), 0);
  const subTotalAfterItemDiscounts = subTotalBeforeItemDiscounts - totalItemDiscounts;
  
  const additionalDiscount = purchase.discount || 0;
  const totalDiscount = totalItemDiscounts + additionalDiscount;
  
  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    const element = document.getElementById('printable-purchase-receipt-area');
    if (!element) return;
    
    setIsExporting(true);
    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff"
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: template === 'thermal' ? [80, 200] : 'a4'
        });
        
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`purchase-${purchase.id.toLowerCase()}.pdf`);
    } catch (err) {
        console.error("PDF Export failed", err);
    } finally {
        setIsExporting(false);
    }
  };

  const renderItemsTable = () => (
    <table className="w-full mb-6 text-xs">
        <thead className="border-b-2 border-slate-200">
            <tr>
                <th className="text-start py-3 px-1">المنتج</th>
                <th className="text-center py-3">السعر</th>
                <th className="text-center py-3">الخصم</th>
                <th className="text-center py-3">الكمية</th>
                <th className="text-end py-3">الإجمالي</th>
            </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
            {purchase.items.map(item => (
                <tr key={item.productId}>
                    <td className="py-3 px-1 font-bold">{item.name}</td>
                    <td className="py-3 text-center">{formatAmount(item.costPrice)}</td>
                    <td className="py-3 text-center text-emerald-500">{item.discount ? `-${formatAmount(item.discount)}` : '٠'}</td>
                    <td className="py-3 text-center">{toArabicIndic(item.quantity)}</td>
                    <td className="py-3 text-end font-black">{formatAmount((item.costPrice - (item.discount || 0)) * item.quantity)}</td>
                </tr>
            ))}
        </tbody>
    </table>
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`معاينة فاتورة المشتريات #${purchase.id.toUpperCase()}`}
      footer={
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 w-full">
            <div className="flex gap-2 w-full md:w-auto">
                <Button variant="secondary" onClick={onClose} className="rounded-xl flex-grow md:flex-grow-0 h-12 px-6 font-bold text-slate-600 hover:bg-slate-200">إغلاق</Button>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
                <Button onClick={handleDownloadPDF} isLoading={isExporting} className="bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 rounded-xl flex-grow md:flex-grow-0 h-12 text-white font-bold"><Download size={18} className="me-2"/> حفظ PDF</Button>
                <Button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl flex-grow md:flex-grow-0 h-12 shadow-lg shadow-indigo-500/30 text-white font-black px-8"><Printer size={18} className="me-2"/> طباعة الفاتورة</Button>
            </div>
        </div>
      }
    >
        <div className="bg-slate-100 dark:bg-slate-800 p-2 md:p-6 overflow-hidden custom-scrollbar relative">
            {template === 'free' && customCss && <style>{customCss}</style>}
            
            {template === 'professional' ? (
                <div id="printable-purchase-receipt-area" className="receipt-container bg-white text-black p-4 md:p-10 shadow-2xl mx-auto font-sans relative border-t-8 rounded-b-xl" style={{ maxWidth: '210mm', borderColor: accentColor }}>
                    <div className="flex justify-between items-start mb-10 pb-6 border-b-2 border-slate-100">
                        <div className="flex flex-col gap-2">
                            {showLogo && settings.logoUrl && <img src={settings.logoUrl} className="w-32 object-contain" alt="Logo" />}
                            <h2 className="text-3xl font-black" style={{ color: accentColor }}>{settings.storeName}</h2>
                            <p className="text-sm font-bold text-slate-500">فاتورة مشتريات / Purchase Invoice</p>
                        </div>
                        <div className="text-end bg-slate-50 p-4 rounded-2xl">
                            <h1 className="text-xl font-black text-slate-400 uppercase tracking-widest mb-1">PURCHASE</h1>
                            <p className="text-2xl font-black font-mono text-slate-800">#{purchase.id.toUpperCase()}</p>
                            <p className="text-sm font-bold text-slate-500 mt-2">{new Date(purchase.date).toLocaleDateString('ar-EG')}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-10">
                        <div className="p-4 bg-slate-50 rounded-2xl border-l-4" style={{ borderColor: accentColor }}>
                            <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">معلومات المورد</h4>
                            <p className="font-bold text-lg text-slate-800">{purchase.supplier.name}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border-l-4" style={{ borderColor: accentColor }}>
                            <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">تفاصيل العملية</h4>
                            <div className="flex justify-between text-sm mb-1"><span className="text-slate-500">المستلم:</span> <span className="font-bold">{purchase.employeeId || 'غير محدد'}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-slate-500">طريقة الدفع:</span> <span className="font-bold">{purchase.paymentMethod === 'Cash' ? 'نقدي' : purchase.paymentMethod === 'Card' ? 'بطاقة' : purchase.paymentMethod === 'Transfer' ? 'تحويل بنكي' : 'آجل'}</span></div>
                        </div>
                    </div>

                    <div className="mb-10">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-100 rounded-lg overflow-hidden text-slate-600">
                                <tr>
                                    <th className="text-start py-4 px-4 font-black rounded-r-lg">البيان / Description</th>
                                    <th className="text-center py-4 font-black">الوحدة / Qty</th>
                                    <th className="text-center py-4 font-black">السعر / Price</th>
                                    <th className="text-end py-4 px-4 font-black rounded-l-lg">الإجمالي / Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {purchase.items.map(item => (
                                    <tr key={item.productId}>
                                        <td className="py-4 px-4 font-bold text-slate-800">{item.name}</td>
                                        <td className="py-4 text-center font-mono font-bold">{toArabicIndic(item.quantity)}</td>
                                        <td className="py-4 text-center font-mono">{formatAmount(item.costPrice)}</td>
                                        <td className="py-4 px-4 text-end font-black text-slate-800">{formatAmount((item.costPrice - (item.discount || 0)) * item.quantity)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col md:flex-row justify-end items-end gap-8 pt-4 border-t-2 border-slate-100">
                        <div className="w-full md:w-80 space-y-3 bg-slate-50 p-6 rounded-3xl">
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>الإجمالي الفرعي:</span> 
                                <span className="font-mono">{formatAmount(subTotalBeforeItemDiscounts)}</span>
                            </div>
                            
                            {totalDiscount > 0 && (
                                <div className="flex justify-between text-sm text-emerald-500">
                                    <span>إجمالي الخصومات:</span> 
                                    <span className="font-mono font-bold">-{formatAmount(totalDiscount)}</span>
                                </div>
                            )}
                            
                            <div className="flex justify-between text-xl font-black pt-4 mt-2 border-t border-slate-200" style={{ color: accentColor }}>
                                <span>الإجمالي / Total:</span>
                                <span className="font-mono">{formatCurrency(purchase.total, currency)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 text-center text-slate-500 text-sm font-bold pt-8 border-t border-dashed">
                        {settings.invoiceFooter || 'نشكركم لتعاملكم معنا'}
                    </div>
                </div>
            ) : (
                <div id="printable-purchase-receipt-area" className={`receipt-container bg-white text-black p-8 shadow-sm mx-auto font-sans template-${template}`} style={{ maxWidth: template === 'thermal' ? '80mm' : '210mm' }}>
                
                <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6 border-b pb-6">
                    <div className="flex items-center gap-4">
                        {showLogo && settings.logoUrl && <img src={settings.logoUrl} className="w-20 h-20 object-contain" alt="Logo" />}
                        <div>
                            <h2 className="text-2xl font-black uppercase" style={{ color: accentColor }}>{settings.storeName}</h2>
                            <p className="text-xs text-slate-500 font-bold">فاتورة مشتريات مبسطة</p>
                        </div>
                    </div>
                    <div className="text-end">
                        <div className="bg-slate-100 px-4 py-2 rounded-xl inline-block mb-2">
                            <span className="text-[10px] font-black uppercase block text-slate-400">رقم الطلب</span>
                            <span className="text-lg font-black font-mono">#{purchase.id.toUpperCase()}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-500">{new Date(purchase.date).toLocaleString('ar-EG')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8 border-b pb-6">
                    <div>
                        <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">المورد</h4>
                        <p className="font-bold text-sm">{purchase.supplier.name}</p>
                    </div>
                    <div className="text-end">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">وسيلة الدفع</h4>
                        <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black">
                            {purchase.paymentMethod === 'Cash' ? 'نقدي' : purchase.paymentMethod === 'Card' ? 'بطاقة' : purchase.paymentMethod === 'Transfer' ? 'تحويل بنكي' : 'آجل'}
                        </span>
                    </div>
                </div>

                {renderItemsTable()}

                <div className="flex flex-col md:flex-row justify-end gap-8 pt-6 border-t">
                    <div className="w-full md:w-80 space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="font-bold">الإجمالي قبل الخصم:</span> 
                            <span className="font-bold">{formatAmount(subTotalBeforeItemDiscounts)}</span>
                        </div>
                        
                        {totalDiscount > 0 && (
                            <div className="flex justify-between text-xs text-emerald-600">
                                <span>إجمالي الخصومات:</span> 
                                <span className="font-bold">-{formatAmount(totalDiscount)}</span>
                            </div>
                        )}
                        
                        <div className="flex justify-between text-lg font-black border-t pt-2 mt-2" style={{ color: accentColor }}>
                            <span>المجموع النهائي:</span>
                            <span>{formatCurrency(purchase.total, currency)}</span>
                        </div>

                        <div className="flex justify-between text-xs pt-2 text-emerald-600 font-bold">
                            <span>المبلغ المدفوع:</span>
                            <span>{formatCurrency(purchase.amountPaid, currency)}</span>
                        </div>

                        <div className="flex justify-between text-xs text-rose-600 font-bold border-t border-dashed pt-2">
                            <span>المتبقي / الآجل:</span>
                            <span>{formatCurrency(Math.max(0, purchase.total - purchase.amountPaid), currency)}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-dashed text-center">
                    <p className="text-[9px] text-slate-400 mt-4 font-mono uppercase tracking-widest">Powered by Techno Power POS</p>
                </div>
            </div>
            )}
        </div>

        <style>{`
            @media print {
                body * { visibility: hidden; }
                #printable-purchase-receipt-area, #printable-purchase-receipt-area * { visibility: visible; }
                #printable-purchase-receipt-area { 
                    position: absolute; 
                    left: 0; 
                    top: 0; 
                    width: 100%; 
                    box-shadow: none !important;
                }
            }
        `}</style>
    </Modal>
  );
};

export default PurchaseReceiptModal;