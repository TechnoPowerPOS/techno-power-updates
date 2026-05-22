import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { Product } from '../../types';
import { useSettings } from '../../hooks/useSettings';
import { formatCurrency, toArabicIndic } from '../../utils/localization';
import { hardwareService } from '../../services/hardwareService';

interface BarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

// Simple component to render a "barcode" visually using divs
const BarcodeRenderer: React.FC<{ text: string }> = ({ text }) => {
    if (!text) return null;
    const bars = text.split('').map((char, index) => {
        const code = (char.charCodeAt(0) % 3) + 1; // Get a value 1, 2, or 3
        return (
            <div key={`${char}-${index}`} className={`h-16 bg-black`} style={{ width: `${code}px` }}></div>
        );
    });

    return (
        <div className="flex items-end gap-px h-20" aria-label={`Barcode for ${text}`}>
            {bars}
        </div>
    );
};

const BarcodeModal: React.FC<BarcodeModalProps> = ({ isOpen, onClose, product }) => {
  const { settings } = useSettings();
  if (!product || !settings) return null;

  const handlePrint = () => {
    hardwareService.print({
        deviceName: settings.hardwareSettings?.defaultPrinterName,
        silent: settings.hardwareSettings?.printMode === 'direct'
    });
  };

  const footer = (
    <Button onClick={handlePrint}>طباعة</Button>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`باركود للمنتج: ${product.name}`} footer={footer}>
        <div id="printable-barcode-area" className="flex flex-col items-center justify-center p-8 bg-white text-black">
            <h3 className="text-lg font-semibold">{product.name}</h3>
            <p className="text-sm text-gray-600 mb-4">{formatCurrency(product.sellPrice, settings.currency)}</p>
            <BarcodeRenderer text={product.sku} />
            <p className="font-mono tracking-widest mt-2">{toArabicIndic(product.sku)}</p>
        </div>
    </Modal>
  );
};

export default BarcodeModal;
