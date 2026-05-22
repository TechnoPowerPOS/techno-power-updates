
import React, { useState, useRef, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Upload, FileText, CheckCircle, AlertTriangle, X, Trash2, Edit2, Database } from 'lucide-react';
import { toArabicIndic } from '../../utils/localization';
import * as XLSX from 'xlsx';
import { api } from '../../services/mockApi';
import type { Warehouse } from '../../types';

interface ExcelImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (products: any[], warehouseId: string) => void;
    isLoading: boolean;
}

const ExcelImportModal: React.FC<ExcelImportModalProps> = ({ isOpen, onClose, onImport, isLoading }) => {
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const load = async () => {
            const wh = await api.getWarehouses();
            setWarehouses(wh);
            if (wh.length > 0) setSelectedWarehouse(wh[0].id);
        };
        if (isOpen) load();
    }, [isOpen]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as any[];

            if (jsonData.length === 0) throw new Error("الملف فارغ أو تنسيقه غير مدعوم.");

            const mappedData = jsonData.map((row: any, i) => {
                const rawName = row.name || row['الاسم'] || row['اسم المنتج'] || row['الصنف'] || row['اسم الصنف'] || row['المنتج'] || row['Product'] || row['Item'] || '';
                return {
                    _id: `temp-${i}`, 
                    name: rawName,
                    category: row.category || row['الفئة'] || row['القسم'] || row['المجموعة'] || row['تصنيف'] || row['Category'] || 'عام',
                    sku: row.sku || row['الباركود'] || row['الكود'] || row['رقم الصنف'] || row['Barcode'] || row['SKU'] || `SKU-${Date.now()}-${i}`,
                    stock: parseFloat(row.stock || row['الكمية'] || row['الرصيد'] || row['المخزون'] || row['Quantity'] || row['Qty'] || '0'),
                    sellPrice: parseFloat(row.sellPrice || row['سعر البيع'] || row['السعر'] || row['Price'] || row['Sell Price'] || '0'),
                    costPrice: parseFloat(row.costPrice || row['سعر التكلفة'] || row['التكلفة'] || row['Cost'] || row['Cost Price'] || '0'),
                    selected: true
                };
            });

            setPreviewData(mappedData.filter(d => !!d.name));
            setError(null);
        } catch (err) {
            setError("فشل في قراءة الملف. يرجى التأكد من اختيار ملف إكسيل صحيح (XLSX, XLS, CSV).");
            setPreviewData([]);
        }
    };

    const handleConfirm = () => {
        const selectedData = previewData.filter(d => d.selected);
        if (selectedData.length > 0) {
            onImport(selectedData, selectedWarehouse);
        } else {
            setError("لم تقم بتحديد أي منتجات للاستيراد.");
        }
    };

    const reset = () => {
        setPreviewData([]);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleUpdateRow = (id: string, field: string, value: any) => {
        setPreviewData(prev => prev.map(row => row._id === id ? { ...row, [field]: value } : row));
    };

    const toggleRowSelection = (id: string) => {
        setPreviewData(prev => prev.map(row => row._id === id ? { ...row, selected: !row.selected } : row));
    };

    const deleteRow = (id: string) => {
        setPreviewData(prev => prev.filter(row => row._id !== id));
    };

    const toggleAll = (select: boolean) => {
        setPreviewData(prev => prev.map(row => ({ ...row, selected: select })));
    };

    const selectedCount = previewData.filter(d => d.selected).length;

    return (
        <div className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn ${isOpen ? '' : 'hidden'}`}>
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-[1400px] m-4 animate-slideDown border dark:border-slate-800 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b dark:border-slate-800 shrink-0">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white">استيراد المنتجات من إكسيل</h3>
                        <p className="text-sm text-slate-500 mt-1 font-bold">قم بتعديل ومراجعة المنتجات والمستودع قبل الحفظ</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-rose-500 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
                    {!previewData.length ? (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-4 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem] p-20 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all group mt-8"
                        >
                            <Upload size={64} className="mx-auto text-slate-300 group-hover:text-indigo-500 mb-6 transition-colors" />
                            <h4 className="font-black text-2xl text-slate-700 dark:text-slate-200">اسحب أو انقر لاختيار ملف (XLSX)</h4>
                            <p className="text-sm font-bold text-slate-400 mt-4 leading-relaxed">
                                البرنامج سيتعرف تلقائياً على الأعمدة:<br/>
                                (الاسم، الفئة، الباركود، الكمية، سعر البيع، سعر التكلفة)
                            </p>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileChange} />
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border dark:border-slate-700">
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                            <CheckCircle size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-500">المنتجات الجاهزة</p>
                                            <p className="font-black text-slate-800 dark:text-white">{toArabicIndic(selectedCount)} <span className="text-xs text-slate-400">من {toArabicIndic(previewData.length)}</span></p>
                                        </div>
                                    </div>
                                    <div className="h-10 w-px bg-slate-200 dark:bg-slate-700"></div>
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="text-xs font-black text-slate-500 mb-1 block">اختر المستودع للكميات المستوردة</label>
                                        <div className="relative">
                                            <select 
                                                value={selectedWarehouse}
                                                onChange={(e) => setSelectedWarehouse(e.target.value)}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 font-bold focus:ring-2 focus:ring-indigo-500 appearance-none"
                                            >
                                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                            </select>
                                            <Database size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                                <button onClick={reset} className="text-sm text-rose-500 font-black hover:underline flex items-center gap-1 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl shadow-sm">
                                    <X size={16} /> تغيير الملف
                                </button>
                            </div>

                            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                                <div className="overflow-x-auto custom-scrollbar max-h-[50vh]">
                                    <table className="w-full text-sm text-start bg-white dark:bg-slate-900">
                                        <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10 font-bold border-b dark:border-slate-700">
                                            <tr>
                                                <th className="p-3 text-center border-l dark:border-slate-700 w-12">
                                                    <input type="checkbox" checked={selectedCount === previewData.length && previewData.length > 0} onChange={(e) => toggleAll(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"/>
                                                </th>
                                                <th className="p-4 border-l dark:border-slate-700">الاسم</th>
                                                <th className="p-4 border-l dark:border-slate-700 w-48">الفئة</th>
                                                <th className="p-4 border-l dark:border-slate-700 w-40">الباركود (SKU)</th>
                                                <th className="p-4 border-l dark:border-slate-700 w-32">الكمية</th>
                                                <th className="p-4 border-l dark:border-slate-700 w-32">سعر التكلفة</th>
                                                <th className="p-4 border-l dark:border-slate-700 w-32">سعر البيع</th>
                                                <th className="p-4 text-center w-16">حذف</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {previewData.map((row) => (
                                                <tr key={row._id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${row.selected ? '' : 'opacity-50 grayscale'}`}>
                                                    <td className="p-3 text-center border-l dark:border-slate-800">
                                                        <input type="checkbox" checked={row.selected} onChange={() => toggleRowSelection(row._id)} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"/>
                                                    </td>
                                                    <td className="p-2 border-l dark:border-slate-800">
                                                        <input type="text" value={row.name} onChange={e => handleUpdateRow(row._id, 'name', e.target.value)} className="w-full p-2 border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 bg-transparent rounded-lg focus:bg-white dark:focus:bg-slate-900 outline-none transition-colors font-bold text-slate-700 dark:text-slate-200" />
                                                    </td>
                                                    <td className="p-2 border-l dark:border-slate-800">
                                                        <input type="text" value={row.category} onChange={e => handleUpdateRow(row._id, 'category', e.target.value)} className="w-full p-2 border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 bg-transparent rounded-lg focus:bg-white dark:focus:bg-slate-900 outline-none transition-colors text-slate-600 dark:text-slate-300" />
                                                    </td>
                                                    <td className="p-2 border-l dark:border-slate-800">
                                                        <input type="text" value={row.sku} onChange={e => handleUpdateRow(row._id, 'sku', e.target.value)} className="w-full p-2 border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 bg-transparent rounded-lg focus:bg-white dark:focus:bg-slate-900 outline-none font-mono text-xs transition-colors text-slate-500 dark:text-slate-400" />
                                                    </td>
                                                    <td className="p-2 border-l dark:border-slate-800">
                                                        <input type="number" value={row.stock} onChange={e => handleUpdateRow(row._id, 'stock', parseFloat(e.target.value) || 0)} className="w-full p-2 border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 bg-transparent rounded-lg focus:bg-white dark:focus:bg-slate-900 outline-none transition-colors font-black text-slate-700 dark:text-white" />
                                                    </td>
                                                    <td className="p-2 border-l dark:border-slate-800">
                                                        <input type="number" step="0.01" value={row.costPrice} onChange={e => handleUpdateRow(row._id, 'costPrice', parseFloat(e.target.value) || 0)} className="w-full p-2 border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 bg-transparent rounded-lg focus:bg-white dark:focus:bg-slate-900 outline-none font-bold text-rose-600 transition-colors" />
                                                    </td>
                                                    <td className="p-2 border-l dark:border-slate-800">
                                                        <input type="number" step="0.01" value={row.sellPrice} onChange={e => handleUpdateRow(row._id, 'sellPrice', parseFloat(e.target.value) || 0)} className="w-full p-2 border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 bg-transparent rounded-lg focus:bg-white dark:focus:bg-slate-900 outline-none font-bold text-indigo-600 transition-colors" />
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <button onClick={() => deleteRow(row._id)} className="p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors"><Trash2 size={18}/></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-sm font-bold flex items-center gap-3 border border-rose-100">
                            <AlertTriangle size={20} /> {error}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 p-6 border-t dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-3xl">
                    <Button variant="secondary" onClick={onClose} className="rounded-xl px-6 h-12">إلغاء</Button>
                    <Button 
                        onClick={handleConfirm} 
                        isLoading={isLoading} 
                        disabled={selectedCount === 0 || !selectedWarehouse}
                        className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-10 h-12 font-black shadow-lg shadow-indigo-500/20 text-lg"
                    >
                        استيراد ({toArabicIndic(selectedCount)})
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ExcelImportModal;
