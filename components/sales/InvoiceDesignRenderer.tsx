import React from 'react';
import { formatCurrency, toArabicIndic, formatAmount } from '../../utils/localization';
import Barcode from 'react-barcode';

interface InvoiceDesignRendererProps {
  sale: {
    id: string;
    date: string | Date;
    customer: {
      name: string;
      phone?: string;
    };
    cashier: {
      name: string;
    };
    paymentMethod: string;
    items: Array<{
      id: string;
      name: string;
      quantity: number;
      sellPrice: number;
      discount?: number;
      discountPercent?: number;
    }>;
    total: number;
    tax?: number;
    vatAmount?: number;
    discountValue: number;
    discount?: number;
  };
  settings: {
    storeName: string;
    currency: string;
    vatRate: number;
    logoUrl?: string;
    taxRegisterNumber?: string;
    storePhone?: string;
    storeEmail?: string;
    storeAddress?: string;
    invoiceFooter?: string;
    invoiceDesign: {
      template: 'modern' | 'classic' | 'minimal' | 'thermal' | 'professional' | 'free';
      showLogo: boolean;
      showQrCode: boolean;
      showBarcode?: boolean;
      accentColor: string;
      customCss?: string;
      customHtml?: string;
      vatNumber?: string;
    };
  };
  isPreview?: boolean; // If true, rendering a small interactive preview in Settings Page
}

const getQrUrl = (data: string) => `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data)}`;

export const InvoiceDesignRenderer: React.FC<InvoiceDesignRendererProps> = ({ sale, settings, isPreview = false }) => {
  const { template, showLogo, showQrCode, showBarcode, accentColor, customCss, customHtml, vatNumber } = settings.invoiceDesign;

  // Render barcode helper to prevent sizing issue in mini previews
  const renderBarcode = (val: string) => {
    return (
      <div className="flex flex-col items-center justify-center p-2 bg-white rounded border">
        <Barcode 
          value={val} 
          width={isPreview ? 0.8 : 1.2} 
          height={isPreview ? 25 : 40} 
          displayValue={true} 
          fontSize={8} 
          margin={0} 
        />
      </div>
    );
  };

  const renderQrCode = (val: string) => {
    const qrUrl = getQrUrl(val);
    return (
      <div className="p-2 bg-white rounded border flex items-center justify-center">
        <img src={qrUrl} className={`${isPreview ? 'w-16 h-16' : 'w-24 h-24'} object-contain`} alt="QR" />
      </div>
    );
  };

  const formattedDate = new Date(sale.date).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });

  // Calculate totals
  const discountValue = sale.discountValue || sale.discount || 0;
  const subTotal = sale.total - (sale.tax || sale.vatAmount || 0) + discountValue;
  const taxValue = sale.tax || sale.vatAmount || 0;

  // 0) FREE CSS / CUSTOM HTML TEMPLATE
  if (template === 'free') {
    const htmlTemplate = customHtml || `
<div class="custom-invoice-box select-none" style="font-family: 'Inter', sans-serif; direction: rtl; text-align: right; color: #1e293b; line-height: 1.6; padding: 24px; border: 3px solid #6366f1; border-radius: 16px; background-color: #ffffff;">
  <!-- Header -->
  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px;">
    <div>
      {{logo}}
      <h2 style="font-size: 24px; font-weight: 800; color: #4f46e5; margin: 0;">{{storeName}}</h2>
      <p style="font-size: 11px; color: #64748b; margin: 4px 0 0 0;">فاتورة مبيعات ضريبية مميزة</p>
      <p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0;">الرقم الضريبي للمنشأة: {{vatNumber}}</p>
    </div>
    <div style="text-align: left; background-color: #f8fafc; padding: 12px 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
      <span style="font-size: 9px; font-weight: 800; color: #94a3b8; letter-spacing: 2px;">رقم الفاتورة</span>
      <h3 style="font-size: 18px; font-weight: 900; color: #1e293b; margin: 2px 0 4px 0; font-family: monospace;">#{{invoiceNumber}}</h3>
      <span style="font-size: 10px; color: #475569; font-weight: 700;">التاريخ: {{date}}</span>
    </div>
  </div>

  <!-- Meta details -->
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; font-size: 12px;">
    <div style="background-color: #fcfcfd; padding: 12px; border-radius: 10px; border-right: 4px solid #4f46e5;">
      <h4 style="color: #94a3b8; font-size: 9px; font-weight: 800; text-transform: uppercase; margin: 0 0 6px 0;">العميل</h4>
      <strong style="color: #1e293b; font-size: 13px;">{{customerName}}</strong>
      <p style="color: #64748b; margin: 4px 0 0 0; font-family: monospace;">{{customerPhone}}</p>
    </div>
    <div style="background-color: #fcfcfd; padding: 12px; border-radius: 10px; border-right: 4px solid #94a3b8;">
      <h4 style="color: #94a3b8; font-size: 9px; font-weight: 800; text-transform: uppercase; margin: 0 0 6px 0;">تفاصيل الدفع</h4>
      <p style="margin: 0; color: #334155;">الكاشير: <strong>{{cashierName}}</strong></p>
      <p style="margin: 4px 0 0 0; color: #334155;">طريقة الدفع: <strong>{{paymentMethod}}</strong></p>
    </div>
  </div>

  <!-- Items Table Area -->
  <div>
    {{itemsTable}}
  </div>

  <!-- Totals Section -->
  <div style="display: flex; flex-direction: column; align-items: flex-end; margin-top: 24px;">
    <div style="width: 280px; background-color: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #f1f5f9; font-size: 12px;">
      <div style="display: flex; justify-content: space-between; padding-bottom: 8px; color: #64748b;">
        <span>الإجمالي الفرعي:</span>
        <span style="font-family: monospace;">{{subtotal}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding-bottom: 8px; color: #ef4444; font-weight: 700;">
        <span>الخصم:</span>
        <span style="font-family: monospace;">-{{discount}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding-bottom: 8px; color: #64748b;">
        <span>الضريبة ({{vatRate}}%):</span>
        <span style="font-family: monospace;">{{tax}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 15px; color: #4f46e5; border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 4px;">
        <span>الإجمالي النهائي:</span>
        <span style="font-family: monospace;">{{total}}</span>
      </div>
    </div>
  </div>

  <!-- Bottom section codes & footer -->
  <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #e2e8f0; padding-top: 20px; margin-top: 24px;">
    <div style="max-width: 60%; color: #64748b; font-size: 11px; font-weight: 700;">
      <p style="margin: 0 0 6px 0; color: #475569; font-weight: 800;">{{footer}}</p>
      <div style="display: flex; gap: 12px; font-size: 10px; color: #94a3b8; font-family: monospace;">
        <span>هاتف: {{storePhone}}</span>
        <span>العنوان: {{storeAddress}}</span>
      </div>
    </div>
    <div style="display: flex; gap: 8px; align-items: center;">
      {{qrCode}}
      {{barcode}}
    </div>
  </div>
</div>
`;

    // Render HTML components safely
    const itemsTableHtml = `
      <table style="width: 100%; border-collapse: collapse; text-align: right; direction: rtl; font-size: 12px; margin: 15px 0;">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569;">
            <th style="padding: 10px; font-weight: bold; text-align: right;">المنتج</th>
            <th style="padding: 10px; font-weight: bold; text-align: center;">الكمية</th>
            <th style="padding: 10px; font-weight: bold; text-align: center;">السعر</th>
            <th style="padding: 10px; font-weight: bold; text-align: left;">الإجمالي</th>
          </tr>
        </thead>
        <tbody style="color: #334155;">
          ${sale.items.map(item => {
            const disc = item.discount || (item.sellPrice * (item.discountPercent || 0) / 100);
            return `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px; font-weight: bold;">
                  ${item.name}
                  ${disc > 0 ? `<span style="font-size: 10px; color: #ef4444; display: block;">خصم: -${formatAmount(disc)}</span>` : ''}
                </td>
                <td style="padding: 10px; text-align: center; font-family: monospace;">${toArabicIndic(item.quantity)}</td>
                <td style="padding: 10px; text-align: center; font-family: monospace;">${formatAmount(item.sellPrice)}</td>
                <td style="padding: 10px; text-align: left; font-family: monospace; font-weight: bold;">${formatAmount((item.sellPrice - disc) * item.quantity)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    // High resolution barcode generating dynamically
    const barcodeImageHtml = `<img src="https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(sale.id)}&scale=2&rotate=N&includetext" style="max-height: 48px; object-fit: contain; background: white; padding: 4px; border: 1px solid #e2e8f0; border-radius: 6px;" alt="Barcode"/>`;
    const qrImageHtml = `<img src="${getQrUrl(`INV:${sale.id}|TOTAL:${sale.total}|VAT:${settings.taxRegisterNumber || ''}`)}" style="width: ${isPreview ? '64px' : '88px'}; height: ${isPreview ? '64px' : '88px'}; object-fit: contain; background: white; padding: 4px; border: 1px solid #e2e8f0; border-radius: 6px;" alt="QR"/>`;

    const paymentMethodAr = sale.paymentMethod === 'Cash' ? 'نقدي' : sale.paymentMethod === 'Card' ? 'بطاقة دائنة' : sale.paymentMethod === 'Split' ? 'مجزأ' : 'آجل';
    const logoHtml = showLogo && settings.logoUrl ? `<img src="${settings.logoUrl}" style="max-height: 52px; object-fit: contain; margin-bottom: 8px;" alt="Logo"/>` : '';

    const replacements: Record<string, string> = {
      '{{storeName}}': settings.storeName || '',
      '{{logo}}': logoHtml,
      '{{invoiceNumber}}': sale.id.toUpperCase(),
      '{{invoiceId}}': sale.id,
      '{{date}}': toArabicIndic(formattedDate),
      '{{customerName}}': sale.customer.name,
      '{{customerPhone}}': sale.customer.phone || '',
      '{{cashierName}}': sale.cashier.name,
      '{{paymentMethod}}': paymentMethodAr,
      '{{itemsTable}}': itemsTableHtml,
      '{{subtotal}}': formatAmount(subTotal),
      '{{discount}}': formatAmount(discountValue),
      '{{tax}}': formatAmount(taxValue),
      '{{vatRate}}': toArabicIndic(settings.vatRate),
      '{{total}}': formatCurrency(sale.total, settings.currency),
      '{{vatNumber}}': toArabicIndic(vatNumber || ''),
      '{{footer}}': settings.invoiceFooter || '',
      '{{storePhone}}': settings.storePhone || '',
      '{{storeAddress}}': settings.storeAddress || '',
      '{{storeEmail}}': settings.storeEmail || '',
      '{{qrCode}}': showQrCode ? qrImageHtml : '',
      '{{barcode}}': showBarcode ? barcodeImageHtml : ''
    };

    let renderedHtml = htmlTemplate;
    Object.entries(replacements).forEach(([key, val]) => {
      renderedHtml = renderedHtml.split(key).join(val || '');
    });

    return (
      <div 
        className={`receipt-container bg-white text-black mx-auto text-right font-sans rounded-2xl relative border shadow-sm ${isPreview ? 'p-3 md:p-5 text-[10px]' : 'p-6 md:p-10'}`}
        style={{ width: '100%', maxWidth: isPreview ? '460px' : '210mm', direction: 'rtl' }}
      >
        {customCss && <style>{customCss}</style>}
        <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
      </div>
    );
  }

  // 1) THERMAL TEMPLATE (Continuous narrow receipt look)
  if (template === 'thermal') {
    return (
      <div 
        className="receipt-container bg-white text-black p-4 mx-auto font-mono text-xs text-right leading-relaxed"
        style={{ width: '100%', maxWidth: isPreview ? '280px' : '80mm', direction: 'rtl' }}
      >
        <div className="text-center space-y-2 pb-4 border-b border-dashed border-slate-300">
          {showLogo && settings.logoUrl && (
            <img src={settings.logoUrl} className="mx-auto w-16 object-contain mb-1" alt="Logo" />
          )}
          <h2 className="text-lg font-black">{settings.storeName}</h2>
          <p className="text-[10px] font-bold text-slate-500">مبسطة / Simplified Tax Invoice</p>
          {vatNumber && <p className="text-[10px]">الرقم الضريبي: {toArabicIndic(vatNumber)}</p>}
        </div>

        <div className="py-3 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
          <div className="flex justify-between"><span>رقم الفاتورة:</span> <span className="font-bold">#{sale.id.toUpperCase()}</span></div>
          <div className="flex justify-between"><span>التاريخ:</span> <span>{toArabicIndic(formattedDate)}</span></div>
          <div className="flex justify-between"><span>العميل:</span> <span>{sale.customer.name}</span></div>
          <div className="flex justify-between"><span>الكاشير:</span> <span>{sale.cashier.name}</span></div>
        </div>

        <div className="py-3 border-b border-dashed border-slate-300">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-right pb-1 font-bold">المنتج</th>
                <th className="text-center pb-1 font-bold">الكمية</th>
                <th className="text-left pb-1 font-bold font-mono">السعر</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sale.items.map((item) => {
                const disc = item.discount || (item.sellPrice * (item.discountPercent || 0) / 100);
                const finalPrice = item.sellPrice - disc;
                return (
                  <tr key={item.id} className="align-top">
                    <td className="py-2 pl-2">
                      <div className="font-bold">{item.name}</div>
                      {disc > 0 && <span className="text-[9px] text-red-500">خصم: {formatAmount(disc)}</span>}
                    </td>
                    <td className="py-2 text-center font-bold font-mono">{toArabicIndic(item.quantity)}</td>
                    <td className="py-2 text-left font-mono">{formatAmount(finalPrice * item.quantity)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="py-3 border-b border-dashed border-slate-300 space-y-2 text-[11px]">
          <div className="flex justify-between">
            <span>الإجمالي الفرعي:</span>
            <span className="font-mono">{formatAmount(subTotal)}</span>
          </div>
          {discountValue > 0 && (
            <div className="flex justify-between text-red-500 font-bold">
              <span>الخصم:</span>
              <span className="font-mono">-{formatAmount(discountValue)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>الضريبة ({toArabicIndic(settings.vatRate)}%):</span>
            <span className="font-mono">{formatAmount(taxValue)}</span>
          </div>
          <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-200">
            <span>الإجمالي الكلي:</span>
            <span className="font-mono">{formatCurrency(sale.total, settings.currency)}</span>
          </div>
        </div>

        <div className="pt-4 flex flex-col items-center justify-center gap-3">
          <div className="flex gap-2">
            {showQrCode && renderQrCode(`INV:${sale.id}|TOTAL:${sale.total}|VAT:${settings.taxRegisterNumber || ''}`)}
            {showBarcode && renderBarcode(sale.id)}
          </div>
          <p className="text-center text-[10px] text-slate-500 mt-2">
            {settings.invoiceFooter || 'نشكركم لتعاملكم معنا'}
          </p>
        </div>
      </div>
    );
  }

  // 2) MINIMAL TEMPLATE (Ultra lightweight, monochrome vibes, spacious)
  if (template === 'minimal') {
    return (
      <div 
        className={`receipt-container bg-white text-black mx-auto font-sans text-right ${isPreview ? 'p-3 md:p-5 text-[10px]' : 'p-6 md:p-10'}`}
        style={{ width: '100%', maxWidth: isPreview ? '420px' : '210mm', direction: 'rtl' }}
      >
        <div className="flex flex-col md:flex-row justify-between items-start pb-6 border-b border-slate-200 gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-light tracking-wide text-slate-800">{settings.storeName}</h2>
            <p className="text-xs text-slate-400">فاتورة ضريبية / Minimalist Invoice</p>
            {vatNumber && <p className="text-[11px] text-slate-500">الرقم الضريبي: {toArabicIndic(vatNumber)}</p>}
          </div>
          <div className="text-left md:text-right space-y-1 font-mono text-xs text-slate-500">
            <div>رقم: #{sale.id.toUpperCase()}</div>
            <div>التاريخ: {toArabicIndic(formattedDate)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-6 border-b border-slate-100 text-xs text-slate-600">
          <div>
            <div className="text-slate-400 mb-1 font-bold">العميل:</div>
            <div className="font-bold text-slate-800">{sale.customer.name}</div>
            {sale.customer.phone && <div className="font-mono">{sale.customer.phone}</div>}
          </div>
          <div className="text-left">
            <div className="text-slate-400 mb-1 font-bold">الدفع:</div>
            <div className="font-bold text-slate-800">
              {sale.paymentMethod === 'Cash' ? 'نقدي' : sale.paymentMethod === 'Card' ? 'بطاقة' : sale.paymentMethod === 'Split' ? 'مجزأ' : 'آجل'}
            </div>
            <div className="text-slate-500">الكاشير: {sale.cashier.name}</div>
          </div>
        </div>

        <div className="py-6">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 uppercase text-[10px] border-b border-slate-100">
                <th className="text-right py-2 pb-3 font-semibold">بند المنتجات</th>
                <th className="text-center py-2 pb-3 font-semibold">الكمية</th>
                <th className="text-center py-2 pb-3 font-semibold">السعر</th>
                <th className="text-left py-2 pb-3 font-semibold">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sale.items.map((item) => {
                const disc = item.discount || (item.sellPrice * (item.discountPercent || 0) / 100);
                return (
                  <tr key={item.id}>
                    <td className="py-3 text-slate-800 font-medium">
                      {item.name}
                      {disc > 0 && <span className="text-[10px] text-slate-400 block mt-0.5">خصم {formatAmount(disc)}</span>}
                    </td>
                    <td className="py-3 text-center font-mono text-slate-600">{toArabicIndic(item.quantity)}</td>
                    <td className="py-3 text-center font-mono text-slate-600">{formatAmount(item.sellPrice)}</td>
                    <td className="py-3 text-left font-mono font-bold text-slate-800">{formatAmount((item.sellPrice - disc) * item.quantity)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="py-6 border-t border-slate-100 flex flex-col items-end">
          <div className="w-64 space-y-2 text-xs text-slate-500">
            <div className="flex justify-between"><span>الإجمالي الفرعي:</span> <span className="font-mono">{formatAmount(subTotal)}</span></div>
            {discountValue > 0 && <div className="flex justify-between text-slate-400"><span>الخصم:</span> <span className="font-mono">-{formatAmount(discountValue)}</span></div>}
            <div className="flex justify-between"><span>الضريبة المضافة:</span> <span className="font-mono">{formatAmount(taxValue)}</span></div>
            <div className="flex justify-between pt-2 border-t text-sm font-bold text-slate-900">
              <span>الإجمالي الكلي:</span>
              <span className="font-mono">{formatCurrency(sale.total, settings.currency)}</span>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] text-slate-400 text-center md:text-right">
            {settings.invoiceFooter || 'شكرًا لزيارتكم'}
          </p>
          <div className="flex gap-2">
            {showQrCode && renderQrCode(`INV:${sale.id}|TOTAL:${sale.total}|VAT:${settings.taxRegisterNumber || ''}`)}
            {showBarcode && renderBarcode(sale.id)}
          </div>
        </div>
      </div>
    );
  }

  // 3) CLASSIC TEMPLATE (Elegant center header, double borders, retro styled margins)
  if (template === 'classic') {
    return (
      <div 
        className={`receipt-container bg-[#fcfcf9] text-black mx-auto border-4 border-slate-800 text-right font-serif ${isPreview ? 'p-3 md:p-5 text-[10px]' : 'p-6 md:p-10'}`}
        style={{ width: '100%', maxWidth: isPreview ? '420px' : '210mm', direction: 'rtl' }}
      >
        <div className="text-center border-b-4 border-double border-slate-800 pb-6 mb-6">
          {showLogo && settings.logoUrl && (
            <img src={settings.logoUrl} className="mx-auto w-24 object-contain mb-2" alt="Logo" />
          )}
          <h2 className="text-3xl font-black tracking-normal text-slate-900" style={{ color: accentColor }}>{settings.storeName}</h2>
          <p className="text-xs uppercase tracking-widest font-sans text-slate-600 mt-1">فاتورة ضريبية كلاسيكية / Classic Invoice</p>
          {vatNumber && <p className="text-[11px] font-mono mt-1 text-slate-700">الرقم الضريبي المستند: {toArabicIndic(vatNumber)}</p>}
        </div>

        <div className="flex flex-col md:flex-row justify-between pb-6 border-b border-slate-300 gap-4 text-xs font-sans">
          <div className="space-y-1">
            <h4 className="font-bold underline text-slate-700">المرسل إليه (العميل):</h4>
            <p className="font-black text-sm">{sale.customer.name}</p>
            {sale.customer.phone && <p className="font-mono">{sale.customer.phone}</p>}
          </div>
          <div className="md:text-left space-y-1">
            <div><span className="font-bold">رقم الفاتورة:</span> <span className="font-mono">#{sale.id.toUpperCase()}</span></div>
            <div><span className="font-bold">تاريخ المعاملة:</span> <span>{toArabicIndic(formattedDate)}</span></div>
            <div><span className="font-bold">الكاشير المسؤول:</span> <span>{sale.cashier.name}</span></div>
          </div>
        </div>

        <div className="py-6">
          <table className="w-full text-xs font-sans border-collapse">
            <thead>
              <tr className="bg-slate-200 border-t border-b-2 border-slate-800">
                <th className="text-right py-2 px-2 font-bold border-l border-slate-300">البيان والمنتج</th>
                <th className="text-center py-2 font-bold border-l border-slate-300">الكمية</th>
                <th className="text-center py-2 font-bold border-l border-slate-300">سعر الوحدة</th>
                <th className="text-left py-2 px-2 font-bold">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 border-b border-slate-800">
              {sale.items.map((item) => {
                const disc = item.discount || (item.sellPrice * (item.discountPercent || 0) / 100);
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-2 font-bold text-slate-800 border-l border-slate-300">
                      {item.name}
                      {disc > 0 && <span className="text-[10px] text-red-600 block mt-0.5 font-bold">خصم: {formatAmount(disc)}</span>}
                    </td>
                    <td className="py-3 text-center font-mono font-bold border-l border-slate-300">{toArabicIndic(item.quantity)}</td>
                    <td className="py-3 text-center font-mono border-l border-slate-300">{formatAmount(item.sellPrice)}</td>
                    <td className="py-3 px-2 text-left font-mono font-black">{formatAmount((item.sellPrice - disc) * item.quantity)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end pb-6 font-sans">
          <div className="flex gap-2">
            {showQrCode && renderQrCode(`INV:${sale.id}|TOTAL:${sale.total}|VAT:${settings.taxRegisterNumber || ''}`)}
            {showBarcode && renderBarcode(sale.id)}
          </div>
          <div className="space-y-2 text-xs mr-auto w-full md:w-72 border border-slate-800 p-4 rounded bg-slate-50">
            <div className="flex justify-between"><span>الإجمالي الفرعي:</span> <span className="font-mono">{formatAmount(subTotal)}</span></div>
            {discountValue > 0 && <div className="flex justify-between text-red-600 font-bold"><span>خصومات الفاتورة:</span> <span className="font-mono">-{formatAmount(discountValue)}</span></div>}
            <div className="flex justify-between"><span>ضريبة المبيعات ({toArabicIndic(settings.vatRate)}%):</span> <span className="font-mono">{formatAmount(taxValue)}</span></div>
            <div className="flex justify-between pt-2 border-t border-slate-800 text-sm font-black text-slate-900">
              <span>الإجمالي النهائي:</span>
              <span className="font-mono text-base" style={{ color: accentColor }}>{formatCurrency(sale.total, settings.currency)}</span>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t-2 border-dashed border-slate-800 text-center font-sans">
          <p className="text-[11px] font-bold italic text-slate-600">
            {settings.invoiceFooter || 'نشكركم لتعاملكم معنا ويسعدنا خدمتكم دائمًا'}
          </p>
        </div>
      </div>
    );
  }

  // 4) PROFESSIONAL TEMPLATE (Modern elegant enterprise grade design, clean grids, high contrast colored header table)
  if (template === 'professional') {
    return (
      <div 
        className={`receipt-container bg-white text-black mx-auto text-right font-sans rounded-2xl relative overflow-hidden shadow-sm ${isPreview ? 'p-3 md:p-5 text-[10px]' : 'p-6 md:p-10'}`}
        style={{ width: '100%', maxWidth: isPreview ? '420px' : '210mm', direction: 'rtl' }}
      >
        {/* Color stripe */}
        <div className="absolute top-0 left-0 right-0 h-2" style={{ backgroundColor: accentColor }}></div>

        <div className="flex flex-col md:flex-row justify-between items-start gap-6 pb-8 border-b border-slate-100">
          <div className="space-y-2">
            {showLogo && settings.logoUrl && (
              <img src={settings.logoUrl} className="w-28 object-contain mb-1" alt="Logo" />
            )}
            <h2 className="text-3xl font-black tracking-tight" style={{ color: accentColor }}>{settings.storeName}</h2>
            <div className="bg-slate-100 text-[10px] font-black uppercase text-slate-600 tracking-wider inline-block px-3 py-1 rounded-full">
              فاتورة ضريبية رسمية / Tax Invoice
            </div>
            {vatNumber && <p className="text-xs font-mono text-slate-500">الرقم الضريبي للمنشأة: {toArabicIndic(vatNumber)}</p>}
          </div>

          <div className="text-left md:text-right bg-slate-50 p-6 rounded-2xl border border-slate-100 w-full md:w-64">
            <h1 className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">انفويس</h1>
            <p className="text-2xl font-black font-mono text-slate-800">#{sale.id.toUpperCase()}</p>
            <div className="text-xs text-slate-500 mt-2">تاريخ الإصدار: {toArabicIndic(formattedDate)}</div>
            <div className="text-xs text-slate-500 mt-0.5">طريقة السداد: <span className="font-bold text-slate-700">{sale.paymentMethod === 'Cash' ? 'نقدي' : sale.paymentMethod === 'Card' ? 'بطاقة دائنة' : 'آجل'}</span></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
          <div className="p-4 bg-slate-50/50 rounded-2xl border-r-4" style={{ borderColor: accentColor }}>
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">معلومات العميل والمستفيد</h4>
            <p className="font-extrabold text-slate-800 text-base">{sale.customer.name}</p>
            {sale.customer.phone && <p className="text-xs font-mono text-slate-500 mt-1">الهاتف: {sale.customer.phone}</p>}
          </div>
          <div className="p-4 bg-slate-50/50 rounded-2xl border-r-4 border-slate-300">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">محرر المستند والمركز المالي</h4>
            <div className="flex justify-between text-xs my-0.5"><span className="text-slate-500">اسم الكاشير:</span> <span className="font-bold text-slate-800">{sale.cashier.name}</span></div>
            <div className="flex justify-between text-xs my-0.5"><span className="text-slate-500">حالة الفاتورة:</span> <span className="font-bold text-emerald-600">مدفوعة بالكامل</span></div>
          </div>
        </div>

        <div className="mb-8 overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white bg-slate-800" style={{ backgroundColor: accentColor }}>
                <th className="text-right py-3 px-4 font-black">البيان الوصفي للمنتج</th>
                <th className="text-center py-3 font-black">الكمية</th>
                <th className="text-center py-3 font-black">السعر الفردي</th>
                <th className="text-end py-3 px-4 font-black">الإجمالي الصافي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sale.items.map((item) => {
                const disc = item.discount || (item.sellPrice * (item.discountPercent || 0) / 100);
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {item.name}
                      {disc > 0 && <span className="text-[10px] text-rose-500 block font-normal mt-0.5">خصم بند: -{formatAmount(disc)}</span>}
                    </td>
                    <td className="py-3 text-center font-mono font-extrabold text-slate-700">{toArabicIndic(item.quantity)}</td>
                    <td className="py-3 text-center font-mono text-slate-600">{formatAmount(item.sellPrice)}</td>
                    <td className="py-3 px-4 text-end font-mono font-extrabold text-slate-800">{formatAmount((item.sellPrice - disc) * item.quantity)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-end gap-6 pt-4 border-t border-slate-100">
          <div className="flex gap-4 items-center">
            {showQrCode && renderQrCode(`INV:${sale.id}|TOTAL:${sale.total}|VAT:${settings.taxRegisterNumber || ''}`)}
            {showBarcode && renderBarcode(sale.id)}
          </div>
          <div className="w-full md:w-80 space-y-2.5 bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <div className="flex justify-between text-xs text-slate-500">
              <span>الإجمالي الخاضع للضريبة:</span>
              <span className="font-mono">{formatAmount(subTotal)}</span>
            </div>
            {discountValue > 0 && (
              <div className="flex justify-between text-xs text-rose-500 font-bold">
                <span>مجموع الخصومات:</span>
                <span className="font-mono">-{formatAmount(discountValue)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-slate-500">
              <span>ضريبة القيمة المضافة ({toArabicIndic(settings.vatRate)}%):</span>
              <span className="font-mono">{formatAmount(taxValue)}</span>
            </div>
            <div className="flex justify-between text-lg font-black pt-3 mt-2 border-t border-slate-200" style={{ color: accentColor }}>
              <span>إجمالي الفاتورة المطلوب:</span>
              <span className="font-mono">{formatCurrency(sale.total, settings.currency)}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-dashed border-slate-200 text-center text-xs space-y-2">
          <p className="font-bold text-slate-600">{settings.invoiceFooter || 'نشكركم لتعاملكم الراقي معنا!'}</p>
          <div className="flex justify-center gap-4 text-[10px] text-slate-400 font-medium">
            {settings.storePhone && <span className="font-mono">تلفون: {toArabicIndic(settings.storePhone)}</span>}
            {settings.storeAddress && <span>العنوان: {settings.storeAddress}</span>}
          </div>
        </div>
      </div>
    );
  }

  // 5) FREE CSS TEMPLATE OR STANDARD MODERN TEMPLATE (Acts as default backend placeholder fallback)
  return (
    <div 
      className={`receipt-container bg-white text-black mx-auto text-right font-sans rounded-2xl relative border-t-8 shadow-sm ${isPreview ? 'p-3 md:p-5 text-[10px]' : 'p-6 md:p-10'}`}
      style={{ width: '100%', maxWidth: isPreview ? '420px' : '210mm', borderColor: accentColor, direction: 'rtl' }}
    >
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 pb-6 border-b-2 border-slate-100">
        <div className="space-y-1">
          {showLogo && settings.logoUrl && (
            <img src={settings.logoUrl} className="w-24 object-contain mb-1" alt="Logo" />
          )}
          <h2 className="text-2xl font-black" style={{ color: accentColor }}>{settings.storeName}</h2>
          <p className="text-xs text-slate-400 font-bold">فاتورة ضريبية / Standard Invoice</p>
          {vatNumber && <p className="text-xs font-mono text-slate-500">الرقم الضريبي: {toArabicIndic(vatNumber)}</p>}
        </div>
        <div className="text-left md:text-right bg-slate-50 px-4 py-3 rounded-xl border">
          <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black">INVOICE</div>
          <p className="text-lg font-black font-mono text-slate-800">#{sale.id.toUpperCase()}</p>
          <span className="text-[11px] text-slate-500 font-bold">{toArabicIndic(formattedDate)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 my-6">
        <div className="p-3 bg-slate-50 rounded-xl border-l-4" style={{ borderColor: accentColor }}>
          <span className="text-[9px] font-black text-slate-400 block mb-1">المستلم</span>
          <p className="font-bold text-slate-800 text-sm">{sale.customer.name}</p>
          {sale.customer.phone && <p className="text-xs text-slate-500 font-mono">{sale.customer.phone}</p>}
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border-l-4 border-slate-300">
          <span className="text-[9px] font-black text-slate-400 block mb-1">المسؤول عن الدفع</span>
          <div className="text-xs font-bold text-slate-700">{sale.cashier.name}</div>
          <div className="text-xs text-slate-500 mt-0.5">سداد: {sale.paymentMethod === 'Cash' ? 'نقدي' : 'بطاقة'}</div>
        </div>
      </div>

      <div className="my-6">
        <table className="w-full text-xs">
          <thead className="bg-slate-100 rounded-lg text-slate-600">
            <tr>
              <th className="text-right py-3 px-3 font-black rounded-r-lg">البيان</th>
              <th className="text-center py-3 font-black">الكمية</th>
              <th className="text-center py-3 font-black">السعر</th>
              <th className="text-left py-3 px-3 font-black rounded-l-lg">الإجمالي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sale.items.map((item) => {
              const disc = item.discount || (item.sellPrice * (item.discountPercent || 0) / 100);
              return (
                <tr key={item.id}>
                  <td className="py-3 px-3 font-bold text-slate-800">{item.name}</td>
                  <td className="py-3 text-center font-mono font-bold">{toArabicIndic(item.quantity)}</td>
                  <td className="py-3 text-center font-mono">{formatAmount(item.sellPrice)}</td>
                  <td className="py-3 px-3 text-left font-black text-slate-800 font-mono">{formatAmount((item.sellPrice - disc) * item.quantity)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-end gap-6 pt-4 border-t border-slate-100">
        <div className="flex gap-4 items-center">
          {showQrCode && renderQrCode(`INV:${sale.id}|TOTAL:${sale.total}|VAT:${settings.taxRegisterNumber || ''}`)}
          {showBarcode && renderBarcode(sale.id)}
        </div>
        <div className="w-full md:w-72 space-y-2 bg-slate-50 p-4 rounded-xl border">
          <div className="flex justify-between text-xs text-slate-500">
            <span>الإجمالي الفرعي:</span>
            <span className="font-mono">{formatAmount(subTotal)}</span>
          </div>
          {discountValue > 0 && (
            <div className="flex justify-between text-xs text-rose-500 font-bold">
              <span>الخصم:</span>
              <span className="font-mono">-{formatAmount(discountValue)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs text-slate-500">
            <span>ضريبة القيمة المضافة ({toArabicIndic(settings.vatRate)}%):</span>
            <span className="font-mono">{formatAmount(taxValue)}</span>
          </div>
          <div className="flex justify-between text-base font-black pt-2 mt-2 border-t border-slate-200" style={{ color: accentColor }}>
            <span>الإجمالي الكلي:</span>
            <span className="font-mono">{formatCurrency(sale.total, settings.currency)}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-slate-500 text-xs font-bold pt-6 border-t border-dashed">
        {settings.invoiceFooter || 'نشكركم لتعاملكم معنا'}
        <div className="mt-2 text-[10px] text-slate-400 flex justify-center gap-4">
          {settings.storePhone && <span className="font-mono">{toArabicIndic(settings.storePhone)}</span>}
          {settings.storeAddress && <span>{settings.storeAddress}</span>}
        </div>
      </div>
    </div>
  );
};
