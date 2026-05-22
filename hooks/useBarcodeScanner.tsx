
import { useEffect, useRef } from 'react';
import { useSettings } from './useSettings';

/**
 * A hook that listens for global keyboard events to detect barcode scanner input.
 * Barcode scanners typically act as keyboards, sending characters rapidly ending with 'Enter'.
 */
export const useBarcodeScanner = (onScan: (barcode: string) => void) => {
    const bufferRef = useRef<string>('');
    const lastTimeRef = useRef<number>(0);
    const { settings } = useSettings();

    useEffect(() => {
        // Respect settings flag if available. Default to true if settings aren't loaded yet to avoid regression,
        // but robustly it should wait. If explicitly set to false, do not listen.
        if (settings?.hardwareSettings?.enableScanner === false) {
            return;
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            const currentTime = Date.now();
            
            // If keystrokes are too slow (manual typing), reset buffer
            if (currentTime - lastTimeRef.current > 50) {
                bufferRef.current = '';
            }
            
            lastTimeRef.current = currentTime;

            if (e.key === 'Enter') {
                if (bufferRef.current.length > 2) {
                    onScan(bufferRef.current);
                    bufferRef.current = '';
                    // Prevent default form submission if any
                    e.preventDefault();
                }
            } else if (e.key.length === 1) {
                // Ignore special keys (Shift, Ctrl, etc.)
                // Don't append if user is typing in an input field (optional, depending on UX)
                // For a global scanner, we might want to capture even if focused, or check target.
                const target = e.target as HTMLElement;
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                    // Usually we don't interfere with typing, unless it's very fast (scanner)
                    // But standard logic is: if focused on input, let input handle it.
                    // If focused on body/button, hook handles it.
                    return;
                }
                bufferRef.current += e.key;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onScan, settings?.hardwareSettings?.enableScanner]);
};
