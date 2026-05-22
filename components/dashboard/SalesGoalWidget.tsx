import React, { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { Target, TrendingUp, Award, Edit3 } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { formatCurrency, toArabicIndic } from '../../utils/localization';

interface SalesGoalWidgetProps {
  totalSalesThisMonth: number;
}

const SalesGoalWidget: React.FC<SalesGoalWidgetProps> = ({ totalSalesThisMonth }) => {
  const { settings, updateSettings } = useSettings();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [goalInput, setGoalInput] = useState(settings?.monthlySalesGoal?.toString() || '');

  if (!settings) return null;

  const goal = settings.monthlySalesGoal || 0;
  const progress = goal > 0 ? Math.min((totalSalesThisMonth / goal) * 100, 100) : 0;
  const remaining = Math.max(goal - totalSalesThisMonth, 0);
  const isGoalReached = progress >= 100;

  const handleSaveGoal = () => {
    const newGoal = parseFloat(goalInput);
    if (!isNaN(newGoal) && newGoal >= 0) {
      updateSettings({ ...settings, monthlySalesGoal: newGoal });
      setIsModalOpen(false);
    }
  };

  return (
    <>
      <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-800 dark:to-indigo-950 border-none shadow-sm pb-6">
        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-100 dark:bg-indigo-900/50">
          <div 
            className={`h-full transition-all duration-1000 ease-out ${isGoalReached ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
            style={{ width: `${progress}%` }} 
          />
        </div>
        
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isGoalReached ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400'}`}>
              <Target size={24} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 dark:text-white">هدف المبيعات الشهري</h3>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                {goal > 0 ? 'متابعة أداء مبيعاتك لهذا الشهر' : 'لم تقم بتحديد هدف مبيعات بعد'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="تعديل الهدف"
          >
            <Edit3 size={18} />
          </button>
        </div>

        {goal > 0 ? (
          <div className="space-y-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-black text-slate-800 dark:text-white">
                  {formatCurrency(totalSalesThisMonth, settings.currency)}
                </p>
                <p className="text-xs font-bold text-slate-500 mt-1">
                  من أصل {formatCurrency(goal, settings.currency)}
                </p>
              </div>
              <div className="text-left">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black ${isGoalReached ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400'}`}>
                  {isGoalReached ? <Award size={14} /> : <TrendingUp size={14} />}
                  {toArabicIndic(progress.toFixed(1))}%
                </span>
              </div>
            </div>

            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-2.5 rounded-full transition-all duration-1000 ${isGoalReached ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            {!isGoalReached && (
              <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                متبقي {formatCurrency(remaining, settings.currency)} للوصول إلى هدفك!
              </p>
            )}
            
            {isGoalReached && (
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 p-2 rounded-lg">
                <Award size={14} />
                رائع! لقد حققت هدفك المالي لهذا الشهر. التحدي القادم بانتظارك!
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-indigo-300">
              <Target size={32} />
            </div>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-4">
              ضع هدفاً لحجم مبيعاتك وتتبع تقدمك يومياً
            </p>
            <Button onClick={() => setIsModalOpen(true)} size="sm">
              تحديد هدف الآن
            </Button>
          </div>
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="تحديد هدف المبيعات الشهري">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              حجم المبيعات المستهدف ({settings.currency})
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <Target className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="number"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-left font-mono"
                placeholder="مثال: 50000"
                autoFocus
              />
            </div>
            <p className="text-xs font-bold text-slate-500 mt-2">
              أدخل المبلغ الذي تطمح للوصول إليه بنهاية هذا الشهر ليقوم النظام بمساعدتك على تتبعه.
            </p>
          </div>
          <div className="flex gap-2 justify-end mt-6">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
            <Button onClick={handleSaveGoal}>حفظ الهدف</Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default SalesGoalWidget;
