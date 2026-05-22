import React from 'react';
import Modal from '../ui/Modal';
import { CHANGELOG_DATA } from '../../changelog';
import type { ChangelogChange } from '../../changelog';

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangeTypeBadge: React.FC<{ type: ChangelogChange['type'] }> = ({ type }) => {
    const styles = {
        new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        improvement: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        fix: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    };
    const text = {
        new: 'جديد',
        improvement: 'تحسين',
        fix: 'إصلاح',
    };
    return (
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[type]}`}>
            {text[type]}
        </span>
    );
};

const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ isOpen, onClose }) => {
  const modalTitle = (
    <div className="flex items-center gap-2">
      <span>ما الجديد في النظام؟</span>
      <span className="px-2 py-1 text-xs font-semibold text-purple-800 bg-purple-100 rounded-full dark:bg-purple-900 dark:text-purple-300">
        BETA
      </span>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
      <div className="space-y-6">
        {CHANGELOG_DATA.map((entry) => (
          <div key={entry.version}>
            <div className="flex items-baseline gap-3 mb-2">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">الإصدار {entry.version}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(entry.date).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <ul className="space-y-2 list-disc list-inside">
              {entry.changes.map((change, index) => (
                <li key={index} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                    <ChangeTypeBadge type={change.type} />
                    <span>{change.description}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Modal>
  );
};

export default WhatsNewModal;