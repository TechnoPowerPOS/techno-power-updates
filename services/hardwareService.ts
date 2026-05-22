
import { StoreSettings } from "../types";

export interface PrinterInfo {
    name: string;
    displayName: string;
    description: string;
    status: number;
    isDefault: boolean;
}

const isElectron = () => {
    return typeof window !== 'undefined' && 'electronAPI' in window;
};

export const hardwareService = {
    isElectron,

    async getPrinters(): Promise<PrinterInfo[]> {
        if (!isElectron()) return [];
        try {
            // @ts-ignore
            return await window.electronAPI.getPrinters();
        } catch (error) {
            console.error("HardwareService: Error listing printers", error);
            return [];
        }
    },

    async print(options: { 
        deviceName?: string, 
        silent?: boolean, 
        printBackground?: boolean,
        color?: boolean,
        margins?: any
    } = {}): Promise<{ success: boolean; error?: string }> {
        if (!isElectron()) {
            window.print();
            return { success: true };
        }

        try {
            // @ts-ignore
            return await window.electronAPI.print({
                silent: options.silent ?? true,
                deviceName: options.deviceName,
                printBackground: options.printBackground ?? true,
                color: options.color ?? true,
                margins: options.margins ?? { marginType: 'default' }
            });
        } catch (error) {
            console.error("HardwareService: Printing failed", error);
            return { success: false, error: String(error) };
        }
    },

    async autoPrintIfEnabled(settings: StoreSettings) {
        if (settings.hardwareSettings?.autoPrintReceipt) {
            await this.print({
                deviceName: settings.hardwareSettings.defaultPrinterName,
                silent: true
            });
        }
    }
};
