
import React, { useState } from 'react';
import { useLicense } from '../../hooks/useLicense';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/mockApi';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Gift, PartyPopper, CheckCircle } from 'lucide-react';
import { useToasts } from '../../hooks/useToasts';

interface LicenseActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LicenseActivationModal: React.FC<LicenseActivationModalProps> = ({ isOpen, onClose }) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const { activateLicense } = useLicense();
  const { user } = useAuth();
  const { addToast } = useToasts();

  const handleActivate = () => {
    setIsLoading(true);
    setError('');
    
    setTimeout(async () => {
        const result = await activateLicense(licenseKey, referralCode);
        
        if (result.success) {
            addToast('تم تفعيل الترخيص بنجاح! سيتم الحفاظ على كافة بياناتك الحالية بأمان وتطبيق الميزات الجديدة.', 'success');

            if (result.type === 'Yearly') {
                setIsLoading(false);
                setShowGift(true); // Show gift UI instead of closing
            } else {
                onClose(); 
                // Force stable redirect
                window.location.href = window.location.origin;
            }
        } else {
            setError('كود الترخيص غير صالح. يرجى التحقق مرة أخرى.');
            setIsLoading(false);
        }
    }, 1000);
  };

  const handleClaimGift = () => {
      onClose();
      window.location.href = window.location.origin;
  }

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
        setLicenseKey('');
        setReferralCode('');
        setError('');
        setIsLoading(false);
        setShowGift(false);
    }
  }, [isOpen]);

  if (showGift) {
      return (
        <Modal isOpen={isOpen} onClose={handleClaimGift} title="تهانينا! 🎉">
            <div className="text-center py-6 space-y-6">
                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-yellow-400 blur-xl opacity-50 animate-pulse rounded-full"></div>
                    <Gift size={80} className="text-purple-600 relative z-10 animate-bounce" />
                </div>
                
                <div>
                    <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-2">
                        هدية الاشتراك السنوي!
                    </h3>
                    <p className="text-lg text-slate-600 dark:text-slate-300">
                        لقد حصلت على <span className="font-bold text-purple-600">شهر بريميوم مجاني</span>.
                    </p>
                    <p className="text-sm text-slate-500 mt-2">
                        تم تفعيل جميع الإضافات (AI، شات باور، السمات) بنجاح.
                    </p>
                </div>

                <div className="flex justify-center">
                    <Button onClick={handleClaimGift} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 text-lg shadow-xl hover:scale-105 transition-transform">
                        <PartyPopper className="me-2" /> استلام الهدية
                    </Button>
                </div>
            </div>
        </Modal>
      );
  }

  const footer = (
    <div className="flex justify-end gap-x-2">
      <Button variant="secondary" onClick={onClose}>إلغاء</Button>
      <Button onClick={handleActivate} isLoading={isLoading}>تفعيل</Button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تفعيل الترخيص" footer={footer}>
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-400">
          يرجى إدخال كود الترخيص الذي حصلت عليه لتفعيل نسختك الكاملة من البرنامج.
          <br/>
          <span className="text-xs text-emerald-600 font-bold">ملاحظة: تفعيل الترخيص آمن تماماً، وسيتم الاحتفاظ بكافة فواتيرك ومنتجاتك وبياناتك التشغيلية دون تصفير.</span>
        </p>
        <div>
          <label htmlFor="licenseKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            كود الترخيص
          </label>
          <input
            type="text"
            id="licenseKey"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            className="mt-1 block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-2xl shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-lg dark:bg-gray-800 text-center tracking-widest font-mono"
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="referralCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            كود الإحالة (اختياري)
          </label>
          <input
            type="text"
            id="referralCode"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            placeholder="REF-XXXXXX"
            className="mt-1 block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-2xl shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-lg dark:bg-gray-800 text-center font-mono"
            autoComplete="off"
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
    </Modal>
  );
};

export default LicenseActivationModal;
