import React, { useRef, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Product } from '../../types';
import { useReactToPrint } from 'react-to-print';
import Barcode from 'react-barcode';
import { Printer, Minus, Plus } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { formatCurrency } from '../../utils/localization';

interface BarcodePrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
}

const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({ isOpen, onClose, products }) => {
    const { settings } = useSettings();
    const [copies, setCopies] = useState<Record<string, number>>({});
    
    const printRef = useRef<HTMLDivElement>(null);
    
    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: 'Print_Barcodes',
    });

    const handleCopyChange = (id: string, delta: number) => {
        setCopies(prev => {
            const current = prev[id] || 1;
            const next = Math.max(0, current + delta);
            return { ...prev, [id]: next };
        });
    };

    // Initialize copies to 1 when modal opens
    React.useEffect(() => {
        if (isOpen) {
            const initial: Record<string, number> = {};
            products.forEach(p => {
                initial[p.id] = 1;
            });
            setCopies(initial);
        }
    }, [isOpen, products]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="طباعة باركود المنتجات">
            <div className="space-y-6">
                <div className="max-h-[60vh] overflow-y-auto space-y-4 px-2 custom-scrollbar">
                    {products.map(product => (
                        <div key={product.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white">{product.name}</h4>
                                <p className="text-xs text-slate-500 font-mono mt-1">{product.sku}</p>
                            </div>
                            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                                <button onClick={() => handleCopyChange(product.id, -1)} className="p-1 hover:bg-rose-50 text-rose-500 rounded-md transition-colors"><Minus size={16} /></button>
                                <span className="font-black text-sm w-8 text-center">{copies[product.id] || 0}</span>
                                <button onClick={() => handleCopyChange(product.id, 1)} className="p-1 hover:bg-emerald-50 text-emerald-500 rounded-md transition-colors"><Plus size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-800">
                    <Button onClick={onClose} variant="secondary">إلغاء</Button>
                    <Button onClick={handlePrint} className="bg-indigo-600 flex items-center gap-2">
                        <Printer size={18} /> طباعة الآن
                    </Button>
                </div>

                {/* Hidden Printable Area */}
                <div className="hidden">
                    <div ref={printRef} className="print-container">
                        {products.flatMap(product => 
                            Array.from({ length: copies[product.id] || 0 }).map((_, i) => (
                                <div key={`${product.id}-${i}`} className="barcode-label flex flex-col items-center justify-center p-2 text-center" style={{ width: '50mm', height: '25mm', pageBreakInside: 'avoid', marginBottom: '2mm', overflow: 'hidden' }}>
                                    <div className="text-[10px] font-bold text-black leading-tight max-w-full truncate">{settings?.storeName || 'Store'}</div>
                                    <div className="text-[9px] font-semibold text-black leading-tight max-w-full truncate">{product.name}</div>
                                    <div className="scale-75 origin-top mt-1">
                                        <Barcode value={product.sku} width={1.5} height={30} displayValue={true} fontSize={12} margin={0} />
                                    </div>
                                    <div className="text-[10px] items-center font-black mt-0.5 text-black">{formatCurrency(product.sellPrice, settings?.currency)}</div>
                                </div>
                            ))
                        )}
                        <style type="text/css" media="print">
                            {`
                                @page { size: 50mm 25mm; margin: 0; }
                                body { margin: 0; padding: 0; }
                                .print-container { display: flex; flex-direction: column; align-items: center; width: 100%; }
                            `}
                        </style>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default BarcodePrintModal;
