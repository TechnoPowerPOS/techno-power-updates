import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import StarRating from '../ui/StarRating';
import { api } from '../../services/mockApi';
import { Send, ThumbsUp } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0) {
            alert('يرجى اختيار تقييم بالنجوم أولاً.');
            return;
        }
        setIsSubmitting(true);
        try {
            await api.submitFeedback({ rating, comment });
            setIsSubmitted(true);
        } catch (error) {
            alert('فشل إرسال التقييم. يرجى المحاولة مرة أخرى.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // Reset state when modal is closed
    React.useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setRating(0);
                setComment('');
                setIsSubmitted(false);
                setIsSubmitting(false);
            }, 300); // delay to allow modal close animation
        }
    }, [isOpen]);

    const footer = (
        <>
            <Button variant="secondary" onClick={onClose}>إغلاق</Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting} disabled={rating === 0}>
                <Send size={16} /> إرسال التقييم
            </Button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="تقييم البرنامج"
            footer={!isSubmitted ? footer : undefined}
        >
            {isSubmitted ? (
                <div className="text-center py-10">
                    <ThumbsUp size={48} className="mx-auto text-green-500 mb-4" />
                    <h3 className="text-xl font-bold">شكراً لك!</h3>
                    <p className="text-slate-600 dark:text-slate-300 mt-2">
                        تقييمك يساعدنا على تحسين البرنامج.
                    </p>
                    <Button onClick={onClose} className="mt-6">حسنًا</Button>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="text-center">
                        <h4 className="font-semibold mb-3">ما هو تقييمك العام للبرنامج؟</h4>
                        <StarRating value={rating} onChange={setRating} size={36} />
                    </div>
                    <div>
                        <label htmlFor="comment" className="block text-sm font-medium mb-1">
                            هل لديك أي تعليقات أو اقتراحات؟ (اختياري)
                        </label>
                        <textarea
                            id="comment"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={4}
                            placeholder="أخبرنا عن رأيك..."
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default FeedbackModal;
