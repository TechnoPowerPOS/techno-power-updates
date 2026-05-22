
import React, { useState, useRef } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { Product } from '../../types';
import { useSettings } from '../../hooks/useSettings';
import { Printer, Settings, Type, Barcode as BarcodeIcon } from 'lucide-react';
import { formatCurrency } from '../../utils/localization';

interface LabelDesignerModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
}

const LabelDesignerModal: React.FC<LabelDesignerModalProps> = ({ isOpen, onClose, product }) => {
    const { settings } = useSettings();
    const [config, setConfig] = useState({
        width: 40, // mm
        height: 25, // mm
        showName: true,
        showPrice: true,
        showBarcode: true,
        showSku: true,
        showStoreName: true,
        fontSize: 12,
        copies: 1
    });

    const printRef = useRef<HTMLDivElement>(null);

    if (!product || !settings) return null;

    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;

        const printWindow = window.open('', '', 'width=800,height=600');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Print Labels</title>
                        <style>
                            @page {
                                size: ${config.width}mm ${config.height}mm;
                                margin: 0;
                            }
                            body {
                                margin: 0;
                                padding: 0;
                            }
                            .label-container {
                                width: ${config.width}mm;
                                height: ${config.height}mm;
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                                text-align: center;
                                page-break-after: always;
                                overflow: hidden;
                                font-family: sans-serif;
                                box-sizing: border-box;
                                padding: 2px;
                            }
                            .barcode {
                                width: 90%;
                                height: 30%;
                                display: flex;
                                align-items: flex-end;
                                justify-content: center;
                                gap: 1px;
                            }
                            .bar { background: black; }
                        </style>
                    </head>
                    <body>
                        ${Array(config.copies).fill(content.innerHTML).join('')}
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        }
    };

    // Simple barcode renderer for visual
    const BarcodeVisual = ({ text }: { text: string }) => (
        <div className="flex items-end justify-center h-8 w-full gap-[1px] mt-1 mb-1">
            {text.split('').map((char, i) => (
                <div key={i} className="bg-black" style={{ width: (char.charCodeAt(0) % 3 + 1) + 'px', height: '100%' }}></div>
            ))}
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="مصمم ملصقات الباركود">
            <div className="flex flex-col md:flex-row gap-6 h-[500px]">
                {/* Controls */}
                <div className="w-full md:w-1/3 space-y-4 overflow-y-auto pr-2">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                        <h4 className="font-bold mb-3 flex items-center gap-2"><Settings size={16}/> إعدادات الورق</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs">العرض (mm)</label>
                                <input type="number" value={config.width} onChange={e => setConfig({...config, width: parseInt(e.target.value)})} className="w-full p-1 border rounded text-center"/>
                            </div>
                            <div>
                                <label className="text-xs">الارتفاع (mm)</label>
                                <input type="number" value={config.height} onChange={e => setConfig({...config, height: parseInt(e.target.value)})} className="w-full p-1 border rounded text-center"/>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                        <h4 className="font-bold mb-3 flex items-center gap-2"><Type size={16}/> المحتوى</h4>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox" checked={config.showStoreName} onChange={e => setConfig({...config, showStoreName: e.target.checked})} /> اسم المتجر
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox" checked={config.showName} onChange={e => setConfig({...config, showName: e.target.checked})} /> اسم المنتج
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox" checked={config.showPrice} onChange={e => setConfig({...config, showPrice: e.target.checked})} /> السعر
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox" checked={config.showBarcode} onChange={e => setConfig({...config, showBarcode: e.target.checked})} /> الباركود (رسم)
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox" checked={config.showSku} onChange={e => setConfig({...config, showSku: e.target.checked})} /> رقم SKU
                            </label>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                        <label className="block text-sm font-medium mb-1">عدد النسخ</label>
                        <input type="number" min="1" value={config.copies} onChange={e => setConfig({...config, copies: parseInt(e.target.value)})} className="w-full p-2 border rounded text-center font-bold"/>
                    </div>
                </div>

                {/* Preview */}
                <div className="flex-1 bg-slate-200 dark:bg-slate-900 rounded-xl flex items-center justify-center relative overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-700">
                    <p className="absolute top-2 left-2 text-xs text-slate-500 font-bold bg-white/50 px-2 rounded">معاينة</p>
                    
                    {/* The Label */}
                    <div 
                        ref={printRef}
                        className="bg-white text-black shadow-xl flex flex-col items-center justify-center text-center overflow-hidden"
                        style={{ 
                            width: `${config.width}mm`, 
                            height: `${config.height}mm`,
                            padding: '2mm'
                        }}
                    >
                        <div className="label-content w-full h-full flex flex-col justify-between items-center">
                            {config.showStoreName && <div className="font-bold text-[10px] uppercase truncate w-full">{settings.storeName}</div>}
                            
                            {config.showName && <div className="text-[10px] leading-tight truncate w-full px-1">{product.name}</div>}
                            
                            {config.showPrice && <div className="font-bold text-sm">{formatCurrency(product.sellPrice, settings.currency)}</div>}
                            
                            {config.showBarcode && <BarcodeVisual text={product.sku} />}
                            
                            {config.showSku && <div className="text-[8px] font-mono tracking-widest">{product.sku}</div>}
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-2 border-t pt-4 dark:border-slate-700">
                <Button variant="secondary" onClick={onClose}>إغلاق</Button>
                <Button onClick={handlePrint}>
                    <Printer size={18} className="me-2"/> طباعة الملصقات
                </Button>
            </div>
        </Modal>
    );
};

export default LabelDesignerModal;
