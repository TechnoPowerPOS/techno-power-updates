
import React, { useState, useEffect, useCallback } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { PlusCircle, Trash2, Edit, Save, PenTool } from 'lucide-react';
import { useToasts } from '../hooks/useToasts';

interface Note {
    id: string;
    title: string;
    content: string;
    date: string;
}

const NotesPage: React.FC = () => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const { addToast } = useToasts();

    useEffect(() => {
        const savedNotes = localStorage.getItem('techno_power_notes');
        if (savedNotes) {
            try {
                setNotes(JSON.parse(savedNotes));
            } catch (e) {
                console.error("Failed to parse notes", e);
                setNotes([]);
            }
        }
    }, []);

    const saveToLocal = useCallback((newNotes: Note[]) => {
        localStorage.setItem('techno_power_notes', JSON.stringify(newNotes));
        setNotes([...newNotes]);
    }, []);

    const handleSaveNote = () => {
        if (!title.trim() || !content.trim()) return;

        if (editingId) {
            const updated = notes.map(n => n.id === editingId ? { ...n, title, content, date: new Date().toISOString() } : n);
            saveToLocal(updated);
            addToast('تم تحديث الملاحظة', 'success');
            setEditingId(null);
        } else {
            const newNote: Note = {
                id: `note-${Date.now()}`,
                title,
                content,
                date: new Date().toISOString()
            };
            saveToLocal([newNote, ...notes]);
            addToast('تمت إضافة الملاحظة', 'success');
        }
        setTitle('');
        setContent('');
    };

    const handleDelete = (id: string) => {
        const filtered = notes.filter(n => n.id !== id);
        saveToLocal(filtered);
        addToast('تم الحذف بنجاح', 'info');
    };

    const handleEdit = (note: Note) => {
        setEditingId(note.id);
        setTitle(note.title);
        setContent(note.content);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="animate-fadeIn max-w-4xl mx-auto pb-10">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-lg">
                    <PenTool size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white">ملاحظاتي</h1>
                    <p className="text-sm text-slate-500 font-bold">دوّن مهامك أو ملاحظات العمل الخاصة بك</p>
                </div>
            </div>

            <Card className="mb-8 p-6 border-indigo-100 shadow-xl">
                <div className="space-y-4">
                    <input 
                        type="text" 
                        value={title} 
                        onChange={e => setTitle(e.target.value)}
                        placeholder="عنوان الملاحظة..." 
                        className="w-full p-3 text-lg font-black bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <textarea 
                        value={content} 
                        onChange={e => setContent(e.target.value)}
                        placeholder="اكتب ملاحظاتك هنا..." 
                        rows={5}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm leading-relaxed"
                    />
                    <div className="flex justify-end gap-2">
                        {editingId && <Button variant="secondary" onClick={() => { setEditingId(null); setTitle(''); setContent(''); }} className="rounded-xl">إلغاء</Button>}
                        <Button onClick={handleSaveNote} className="rounded-xl px-10 font-black bg-indigo-600 shadow-lg shadow-indigo-500/20">
                            {editingId ? <Save size={18} className="me-2"/> : <PlusCircle size={18} className="me-2"/>}
                            {editingId ? 'حفظ التعديلات' : 'إضافة ملاحظة'}
                        </Button>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {notes.map(note => (
                    <Card key={note.id} className="relative group overflow-hidden border-none shadow-premium hover:animate-subtle-lift">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-black text-slate-800 dark:text-white text-lg">{note.title}</h3>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(note)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg"><Edit size={16}/></button>
                                <button onClick={() => handleDelete(note.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={16}/></button>
                            </div>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium whitespace-pre-wrap leading-relaxed mb-6">
                            {note.content}
                        </p>
                        <div className="mt-auto pt-4 border-t dark:border-slate-800 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <span>{new Date(note.date).toLocaleDateString('ar-EG')}</span>
                            <span>{new Date(note.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </Card>
                ))}
                {notes.length === 0 && (
                    <div className="col-span-full py-20 text-center text-slate-400">
                        <PenTool size={48} className="mx-auto mb-4 opacity-20"/>
                        <p className="font-black text-lg">لا يوجد ملاحظات بعد</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotesPage;
