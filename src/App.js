/* global __firebase_config, __app_id, __initial_auth_token */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc, collection, addDoc, deleteDoc, serverTimestamp, updateDoc, query, where, documentId } from 'firebase/firestore';
import { ArrowLeft, ArrowRight, Calendar, PlusCircle, User, X, Shield, Save, LogOut, Trash2, Edit, Clock, GanttChartSquare, CheckCircle, BarChart3, Send, Bell, History, ThumbsUp, ThumbsDown, ArrowDown, Users, Copy, Upload, Printer, UserCog } from 'lucide-react';

// --- URL IMMAGINI BRAND ---
const LOGO_URL = 'visonottica-sfondo.png';
const BACKGROUND_ICON_URL = 'logo-vision.png';
const BRAND_COLOR = '#8c1c3e'; // Colore bordeaux del brand
const BRAND_COLOR_LIGHT = '#a84f6d';

// --- INIZIO CONFIGURAZIONE FIREBASE ---
const firebaseConfig = typeof __firebase_config !== 'undefined'
    ? JSON.parse(__firebase_config)
    : {
        apiKey: "AIzaSyBcV68x-YKZYe4Z2e8BQCdOb1R63uROKeE",
        authDomain: "gestioneorari-e9acb.firebaseapp.com",
        projectId: "gestioneorari-e9acb",
        storageBucket: "gestioneorari-e9acb.appspot.com",
        messagingSenderId: "224509420569",
        appId: "1:224509420569:web:6139d3aaf98a6f55a2b688"
    };

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}

const auth = getAuth(app);
const db = getFirestore(app);
// --- FINE CONFIGURAZIONE FIREBASE ---

// --- FUNZIONI UTILITY ---
const calculateHours = (shiftText) => {
    if (!shiftText || typeof shiftText !== 'string' || shiftText.toLowerCase() === 'riposo' || shiftText.toLowerCase() === 'ferie') {
        return 0;
    }
    const timeToMinutes = (time) => { const [h, m] = time.split(':').map(Number); return h * 60 + m; };
    let totalMinutes = 0;
    shiftText.split(',').forEach(range => {
        const times = range.trim().split('-');
        if (times.length === 2) {
            try {
                const start = timeToMinutes(times[0].trim());
                const end = timeToMinutes(times[1].trim());
                totalMinutes += (end - start);
            } catch { /* Ignora errori */ }
        }
    });
    return totalMinutes / 60;
};

const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
    return weekNo;
}

// --- COMPONENTI UI ---

const RotateDevicePrompt = () => {
    return (
        <div id="rotate-prompt" className="fixed inset-0 bg-black bg-opacity-90 flex-col justify-center items-center text-center p-4 z-[9999] hidden">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-sway">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                <line x1="12" y1="18" x2="12.01" y2="18"></line>
            </svg>
            <h3 className="text-white text-2xl font-bold mt-6">Ruota il tuo dispositivo</h3>
            <p className="text-gray-300 mt-2">Per la migliore esperienza, visualizza questa app in modalità orizzontale.</p>
        </div>
    );
};

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FED766', '#8A2BE2', '#FF9F1C', '#3A86FF', '#3DDC97', '#F77F00', '#D62828', '#003049'];

const EmployeeModal = ({ isOpen, onClose, onSave, employeeToEdit }) => {
    const [name, setName] = useState('');
    const [color, setColor] = useState(COLORS[0]);
    const [weeklyHours, setWeeklyHours] = useState('');
    const [preferredDay, setPreferredDay] = useState('Nessuno');
    const weekdays = ['Nessuno', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];

    useEffect(() => {
        if (employeeToEdit) {
            setName(employeeToEdit.name);
            setColor(employeeToEdit.color);
            setWeeklyHours(employeeToEdit.weeklyHours || '');
            setPreferredDay(employeeToEdit.preferredDay || 'Nessuno');
        } else {
            setName('');
            setColor(COLORS[0]);
            setWeeklyHours('');
            setPreferredDay('Nessuno');
        }
    }, [employeeToEdit, isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (name.trim()) {
            onSave({
                id: employeeToEdit?.id,
                name: name.trim(),
                color,
                weeklyHours: weeklyHours ? parseInt(weeklyHours, 10) : 0,
                preferredDay
            });
        }
    };
    const title = employeeToEdit ? "Modifica Dipendente" : "Aggiungi Dipendente";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[80] p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="employeeName" className="block text-sm font-medium text-gray-700 mb-1">Nome Dipendente</label>
                        <input id="employeeName" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Es: Mario Rossi" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1" style={{'--tw-ring-color': BRAND_COLOR}}/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="weeklyHours" className="block text-sm font-medium text-gray-700 mb-1">Ore Settimanali</label>
                            <input id="weeklyHours" type="number" value={weeklyHours} onChange={(e) => setWeeklyHours(e.target.value)} placeholder="Es: 40" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1" style={{'--tw-ring-color': BRAND_COLOR}}/>
                        </div>
                        <div>
                            <label htmlFor="preferredDay" className="block text-sm font-medium text-gray-700 mb-1">Giorno Preferito</label>
                            <select id="preferredDay" value={preferredDay} onChange={(e) => setPreferredDay(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 bg-white" style={{'--tw-ring-color': BRAND_COLOR}}>
                                {weekdays.map(day => <option key={day} value={day}>{day}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Colore</label>
                        <div className="flex flex-wrap gap-2">{COLORS.map(c => (<button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full transition-transform transform ${color === c ? 'ring-2 ring-offset-2' : ''}`} style={{ backgroundColor: c, '--tw-ring-color': BRAND_COLOR }}></button>))}</div>
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">Annulla</button>
                    <button onClick={handleSave} className="px-4 py-2 text-white rounded-md hover:opacity-90 transition flex items-center space-x-2" style={{backgroundColor: BRAND_COLOR}}><Save size={16} /><span>Salva</span></button>
                </div>
            </div>
        </div>
    );
};

const EmployeeManagementModal = ({ isOpen, onClose, employees, onEdit, onDelete, onAddNew }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Gestisci Dipendenti</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X size={20} /></button>
                </div>
                <button onClick={onAddNew} className="w-full mb-4 px-4 py-2 text-white rounded-md hover:opacity-90 transition flex items-center justify-center space-x-2" style={{backgroundColor: BRAND_COLOR}}>
                    <PlusCircle size={16} />
                    <span>Aggiungi Nuovo Dipendente</span>
                </button>
                <ul className="space-y-2 max-h-96 overflow-y-auto">
                    {employees.map(emp => (
                        <li key={emp.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100">
                            <div className="flex items-center space-x-3">
                                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: emp.color }}></span>
                                <span className="font-medium">{emp.name}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => onEdit(emp)} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full"><Edit size={16}/></button>
                                <button onClick={() => onDelete(emp.id)} className="p-2 text-gray-500 hover:text-red-600 rounded-full"><Trash2 size={16}/></button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};


const EditShiftModal = ({ isOpen, onClose, onSave, date, currentShift, employee }) => {
    const [selectedSlots, setSelectedSlots] = useState(new Set());
    const [specialShift, setSpecialShift] = useState('');

    const timeSlots = useMemo(() => {
        const slots = [];
        for (let totalMinutes = 9 * 60 + 30; totalMinutes < 21 * 60; totalMinutes += 30) {
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            slots.push(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
        }
        return slots;
    }, []);

    const parseShiftToSlots = useCallback((shift) => {
        const slots = new Set();
        if (!shift || typeof shift !== 'string') return slots;
        const timeToMinutes = (time) => { const [h, m] = time.split(':').map(Number); return h * 60 + m; };
        const minutesToTime = (minutes) => { const h = Math.floor(minutes / 60); const m = minutes % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; };
        shift.split(',').forEach(range => {
            const times = range.trim().split('-');
            if (times.length === 2) {
                try {
                    const start = timeToMinutes(times[0].trim()); const end = timeToMinutes(times[1].trim());
                    for (let m = start; m < end; m += 30) { slots.add(minutesToTime(m)); }
                } catch (e) { console.warn("Cannot parse time range:", range); }
            }
        });
        return slots;
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const lowerShift = currentShift.toLowerCase();
        if (lowerShift === 'riposo' || lowerShift === 'ferie') { setSpecialShift(currentShift); setSelectedSlots(new Set()); }
        else { setSpecialShift(''); setSelectedSlots(parseShiftToSlots(currentShift)); }
    }, [currentShift, isOpen, parseShiftToSlots]);

    const handleSlotClick = (slot) => { setSpecialShift(''); setSelectedSlots(prev => { const newSlots = new Set(prev); if (newSlots.has(slot)) { newSlots.delete(slot); } else { newSlots.add(slot); } return newSlots; }); };
    const handleSpecialClick = (type) => { setSelectedSlots(new Set()); setSpecialShift(type); };

    const generatedShiftString = useMemo(() => {
        if (specialShift) return specialShift;
        if (selectedSlots.size === 0) return "";
        const timeToMinutes = (time) => { const [h, m] = time.split(':').map(Number); return h * 60 + m; };
        const minutesToTime = (minutes) => { const h = Math.floor(minutes / 60); const m = minutes % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; };
        const sortedMinutes = Array.from(selectedSlots).map(timeToMinutes).sort((a, b) => a - b);
        const ranges = [];
        if (sortedMinutes.length > 0) {
            let start = sortedMinutes[0]; let end = sortedMinutes[0];
            for (let i = 1; i < sortedMinutes.length; i++) {
                if (sortedMinutes[i] === end + 30) { end = sortedMinutes[i]; }
                else { ranges.push({ start, end }); start = sortedMinutes[i]; end = sortedMinutes[i]; }
            }
            ranges.push({ start, end });
        }
        return ranges.map(r => `${minutesToTime(r.start)}-${minutesToTime(r.end + 30)}`).join(', ');
    }, [selectedSlots, specialShift]);

    const handleSave = () => {
        const finalShift = specialShift || (selectedSlots.size > 0 ? generatedShiftString : '');
        onSave(employee.id, date, finalShift);
    };

    if (!isOpen) return null;
    const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Modifica / Richiedi Turno</h3>
                        <p className="text-gray-600 capitalize">{formattedDate}</p>
                        <div className="flex items-center space-x-2 text-sm mt-1"><span className="w-3 h-3 rounded-full" style={{backgroundColor: employee.color}}></span><span>{employee.name}</span></div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X size={20} /></button>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg"><span className="font-medium text-gray-700">Turno Proposto:</span><span className="font-bold" style={{color: BRAND_COLOR}}>{generatedShiftString || "Nessun turno"}</span></div>
                    <div className="flex space-x-2">
                        <button onClick={() => handleSpecialClick('Riposo')} className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${specialShift === 'Riposo' ? 'bg-green-500 text-white' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}>Riposo</button>
                        <button onClick={() => handleSpecialClick('Ferie')} className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${specialShift === 'Ferie' ? 'bg-yellow-500 text-white' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}`}>Ferie</button>
                    </div>
                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1">{timeSlots.map(slot => (<button key={slot} onClick={() => handleSlotClick(slot)} className={`h-10 rounded-md text-xs font-mono transition ${selectedSlots.has(slot) ? 'text-white transform scale-105' : 'bg-gray-200 hover:bg-gray-300'}`} style={{backgroundColor: selectedSlots.has(slot) ? BRAND_COLOR : undefined}}>{slot}</button>))}</div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">Annulla</button>
                    <button onClick={handleSave} className="px-4 py-2 text-white rounded-md hover:opacity-90 transition flex items-center space-x-2" style={{backgroundColor: BRAND_COLOR}}><Save size={16} /><span>Salva Proposta</span></button>
                </div>
            </div>
        </div>
    );
};

const DayDetailModal = ({ isOpen, onClose, onEditRequest, date, employees, allSchedules }) => {
    if (!isOpen) return null;
    const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
                 <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold text-gray-800 capitalize">Modifica Turno - {formattedDate}</h3><button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X size={20} /></button></div>
                <ul className="space-y-2 max-h-96 overflow-y-auto">
                    {employees.map(emp => {
                        const shiftText = allSchedules[emp.id]?.[date] || 'Nessun turno';
                        return (
                            <li key={emp.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100">
                                <div className="flex items-center space-x-3"><span className="w-4 h-4 rounded-full" style={{ backgroundColor: emp.color }}></span><span className="font-medium">{emp.name}</span><span className="text-gray-600">{shiftText}</span></div>
                                <button onClick={() => {onEditRequest(emp, date); onClose();}} className="p-1 text-gray-500" style={{'--hover-color': BRAND_COLOR}}><Edit size={16}/></button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
};

const AdminDayCell = ({ dayInfo, onClick }) => {
    const { day, isCurrentMonth, isToday, shifts, tgtData } = dayInfo;

    const workingShifts = shifts.filter(s => s.text.toLowerCase() !== 'riposo' && s.text.toLowerCase() !== 'ferie');
    const offShifts = shifts.filter(s => s.text.toLowerCase() === 'riposo' || s.text.toLowerCase() === 'ferie');

    let tooltipText = '';
    if (isCurrentMonth && tgtData) {
        tooltipText += `Saldato TGT: € ${Number(tgtData.saldatoTGT || 0).toFixed(2)}\n`;
        tooltipText += `WO TGT: € ${Number(tgtData.woTGT || 0).toFixed(2)}`;
    }

    const cellClasses = `relative flex flex-col h-36 md:h-52 bg-white rounded-lg transition-all duration-200 ease-in-out border ${isCurrentMonth ? 'border-gray-200' : 'bg-gray-50 border-gray-100 text-gray-400'} ${isCurrentMonth ? 'cursor-pointer hover:bg-red-50' : ''}`;
    const dayNumberClasses = `flex items-center justify-center h-7 w-7 rounded-full text-sm font-semibold ${isToday ? 'text-white' : 'text-gray-600'}`;

    return (
        <div className={cellClasses} onClick={() => isCurrentMonth && onClick(dayInfo.dateString)} title={tooltipText} style={{'--hover-bg-color': `${BRAND_COLOR}10`, '--hover-border-color': `${BRAND_COLOR}30`}}>
            <div className="flex justify-between items-center p-2">
                {isCurrentMonth && workingShifts.length > 0 ? (
                    <div className="flex items-center space-x-1 text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                        <User size={12}/>
                        <span>{workingShifts.length}</span>
                    </div>
                ) : <div />}
                <span className={dayNumberClasses} style={{backgroundColor: isToday ? BRAND_COLOR : undefined}}>{day}</span>
            </div>

            {isCurrentMonth && (
                 <div className="px-2 pb-2 space-y-2 overflow-y-auto flex-grow">
                    {workingShifts.map((shift, index) => (
                        <div key={`work-${index}`} className="text-xs rounded-md p-1.5" style={{ backgroundColor: `${shift.employee.color}20` }}>
                            <div className="font-bold" style={{ color: shift.employee.color }}>{shift.employee.name}</div>
                            <div className="text-gray-800 font-medium">
                                {shift.text.split(',').map((part, i) => (
                                    <span key={i} className="block">{part.trim()}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                    {offShifts.length > 0 && (
                        <div className="pt-2 mt-2 border-t border-gray-100">
                            {offShifts.map((shift, index) => (
                                <div key={`off-${index}`} className="text-xs text-gray-500 flex items-center space-x-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: shift.employee.color }}></span>
                                    <span>{shift.employee.name.split(' ')[0]}:</span>
                                    <span className={`font-semibold capitalize ${shift.text.toLowerCase() === 'riposo' ? 'text-green-600' : 'text-yellow-600'}`}>{shift.text}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const HeadcountChart = ({ headcountData, timelineSlots }) => {
    if (!headcountData || headcountData.length === 0 || !timelineSlots) {
        return null;
    }
    const maxHeadcount = Math.max(...headcountData, 4);

    const getEndTime = (startTime) => {
        const [h, m] = startTime.split(':').map(Number);
        const totalMinutes = h * 60 + m + 30;
        const endH = Math.floor(totalMinutes / 60);
        const endM = totalMinutes % 60;
        return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    };

    return (
        <div className="w-full h-10 flex items-end border border-gray-200 bg-gray-50 rounded p-1" style={{ columnGap: '1px' }}>
            {headcountData.map((count, index) => {
                const heightPercentage = count > 0 ? Math.max((count / maxHeadcount) * 100, 15) : 0;

                let barColor;
                let textColor = 'text-white';

                if (count === 0) {
                    barColor = BRAND_COLOR;
                } else if (count === 1) {
                    barColor = '#F5A623'; // Orange
                } else if (count === 2) {
                    barColor = '#7ED321'; // Light Green
                } else if (count === 3) {
                    barColor = '#50E3C2'; // Teal
                } else {
                    barColor = '#4A90E2'; // Blue
                }

                const startTime = timelineSlots[index].time;
                const endTime = getEndTime(startTime);
                const tooltipTitle = `${startTime} - ${endTime}`;

                return (
                    <div key={index} className="flex-grow relative flex justify-center items-end" title={tooltipTitle}>
                        <div
                            className={`w-full rounded-t-sm transition-all duration-200 flex items-center justify-center overflow-hidden`}
                            style={{ height: `${heightPercentage}%`, backgroundColor: barColor }}
                        >
                             <span className={`text-xs font-bold ${textColor}`} style={{ textShadow: '0px 0px 3px rgba(0,0,0,0.8)' }}>
                                {count}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const PrintModal = ({ isOpen, onClose, onConfirmPrint, currentWeek }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
        if(isOpen) {
            setSelectedDate(currentWeek);
        }
    }, [isOpen, currentWeek]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        const date = new Date(selectedDate);
        onConfirmPrint(date);
    };
    
    const formatDateForInput = (date) => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[80] p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Stampa Settimana</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Scegli una data qualsiasi per stampare la settimana corrispondente.
                </p>
                <div>
                    <label htmlFor="week-date-picker" className="block text-sm font-medium text-gray-700 mb-1">
                        Seleziona una data
                    </label>
                    <input
                        id="week-date-picker"
                        type="date"
                        value={formatDateForInput(selectedDate)}
                        onChange={(e) => setSelectedDate(new Date(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1"
                        style={{'--tw-ring-color': BRAND_COLOR}}
                    />
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">
                        Annulla
                    </button>
                    <button onClick={handleConfirm} className="px-4 py-2 text-white rounded-md hover:opacity-90 transition flex items-center space-x-2" style={{backgroundColor: BRAND_COLOR}}>
                        <Printer size={16} />
                        <span>Stampa Ora</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

const WeeklyTimelineView = ({ employees, allSchedules, onEditRequest, onCopyPreviousWeek, onPreparePrint, currentWeek, setCurrentWeek }) => {
    const [isCopying, setIsCopying] = useState(false);

    const timeToMinutes = useCallback((time) => { const [h, m] = time.split(':').map(Number); return h * 60 + m; }, []);

    const weekDays = useMemo(() => {
        const startOfWeek = new Date(currentWeek);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);

        return Array.from({ length: 7 }).map((_, i) => {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            return date;
        });
    }, [currentWeek]);

    const weekNumber = useMemo(() => getWeekNumber(currentWeek), [currentWeek]);

    const timelineSlots = useMemo(() => {
        const slots = [];
        for (let totalMinutes = 9 * 60 + 30; totalMinutes < 21 * 60; totalMinutes += 30) {
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            slots.push({ time: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`, isHour: minutes === 0 });
        }
        return slots;
    }, []);

    const dailyHeadcounts = useMemo(() => {
        const headcounts = {};
        if (employees.length === 0) return headcounts;
        const timeSlotsInMinutes = timelineSlots.map(slot => timeToMinutes(slot.time));
        weekDays.forEach(date => {
            const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const headcountForDay = new Array(timelineSlots.length).fill(0);
            employees.forEach(emp => {
                const shiftText = allSchedules[emp.id]?.[dateString];
                if (!shiftText || typeof shiftText !== 'string' || shiftText.toLowerCase() === 'riposo' || shiftText.toLowerCase() === 'ferie') return;
                shiftText.split(',').forEach(range => {
                    const times = range.trim().split('-');
                    if (times.length === 2) {
                        try {
                            const start = timeToMinutes(times[0].trim());
                            const end = timeToMinutes(times[1].trim());
                            for (let i = 0; i < timeSlotsInMinutes.length; i++) {
                                const slotStart = timeSlotsInMinutes[i];
                                const slotEnd = slotStart + 30;
                                if (start < slotEnd && end > slotStart) headcountForDay[i]++;
                            }
                        } catch (e) { /* ignora errori */ }
                    }
                });
            });
            headcounts[dateString] = headcountForDay;
        });
        return headcounts;
    }, [employees, allSchedules, weekDays, timelineSlots, timeToMinutes]);

    const weeklyTotals = useMemo(() => {
        const totals = {};
        employees.forEach(emp => {
            const totalHours = weekDays.reduce((total, date) => {
                const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                const shift = allSchedules[emp.id]?.[dateString] || '';
                return total + calculateHours(shift);
            }, 0);
            totals[emp.id] = totalHours;
        });
        return totals;
    }, [employees, weekDays, allSchedules]);

    const timelineStartMinutes = timeToMinutes("09:30");
    const totalTimelineMinutes = timeToMinutes("21:00") - timelineStartMinutes;

    const handleCopyClick = async () => {
        setIsCopying(true);
        const startOfWeek = new Date(currentWeek);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        await onCopyPreviousWeek(startOfWeek);
        setIsCopying(false);
    };

    const parseShiftToBars = useCallback((shiftText, employee) => {
        if (!shiftText || typeof shiftText !== 'string' || shiftText.toLowerCase() === 'riposo' || shiftText.toLowerCase() === 'ferie') return [];
        return shiftText.split(',').map(range => {
            const times = range.trim().split('-');
            if (times.length !== 2) return null;
            try {
                const startMinutes = timeToMinutes(times[0].trim());
                const endMinutes = timeToMinutes(times[1].trim());
                const left = ((startMinutes - timelineStartMinutes) / totalTimelineMinutes) * 100;
                const width = ((endMinutes - startMinutes) / totalTimelineMinutes) * 100;
                if (left < 0 || width <= 0 || left > 100) return null;
                return { left: `${left}%`, width: `${width}%`, employee, text: range.trim() };
            } catch { return null; }
        }).filter(Boolean);
    }, [timeToMinutes, timelineStartMinutes, totalTimelineMinutes]);

    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg printable-section">
            <div className="no-print flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
                    <button onClick={() => setCurrentWeek(d => new Date(d.setDate(d.getDate() - 7)))} className="p-2 rounded-full hover:bg-gray-200"><ArrowLeft size={20} /></button>
                     <button onClick={handleCopyClick} disabled={isCopying} className="flex items-center space-x-2 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 px-3 py-2 rounded-md transition-shadow shadow-md hover:shadow-lg disabled:bg-blue-300 disabled:cursor-not-allowed">
                        {isCopying ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Copy size={14} />}
                        <span>{isCopying ? 'Copia...' : 'Copia Sett. Prec.'}</span>
                    </button>
                    <button onClick={onPreparePrint} className="flex items-center space-x-2 text-xs font-semibold text-white bg-gray-600 hover:bg-gray-700 px-3 py-2 rounded-md transition-shadow shadow-md hover:shadow-lg">
                        <Printer size={14} />
                        <span>Stampa</span>
                    </button>
                </div>
                <h3 className="text-lg font-bold text-gray-800 text-center">
                    Settimana del {weekDays[0].toLocaleDateString('it-IT', {day: '2-digit', month: 'long'})}
                    <span className="text-sm font-normal text-gray-500 ml-2">- Week {weekNumber}</span>
                </h3>
                 <button onClick={() => setCurrentWeek(d => new Date(d.setDate(d.getDate() + 7)))} className="p-2 rounded-full hover:bg-gray-200"><ArrowRight size={20} /></button>
            </div>

            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                <h4 className="font-bold text-md mb-3 flex items-center space-x-2" style={{color: BRAND_COLOR}}><BarChart3 size={20} /><span>Riepilogo Ore Settimanali</span></h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2">
                    {employees.map(emp => (
                        <div key={emp.id} className="flex items-center space-x-2 text-sm">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: emp.color }}></span>
                            <span className="font-medium text-gray-700">{emp.name}:</span>
                            <span className="font-bold text-gray-900">{weeklyTotals[emp.id].toFixed(2)}h</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-6">
                {weekDays.map(date => {
                    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    const dayHasShifts = employees.some(emp => {
                        const shift = allSchedules[emp.id]?.[dateString];
                        return shift && shift.toLowerCase() !== 'riposo' && shift.toLowerCase() !== 'ferie';
                    });

                    return (
                        <div key={dateString}>
                            <h4 className="font-bold text-md mb-2 capitalize" style={{color: date.toDateString() === new Date().toDateString() ? BRAND_COLOR : 'inherit'}}>{date.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: '2-digit' })}</h4>
                            <div className="flex">
                                <div className="w-24 flex-shrink-0">
                                    <div className="h-6"></div>
                                    {employees.map(emp => <div key={emp.id} className="h-10 flex items-center text-sm font-medium truncate pr-2" style={{color: emp.color}}>{emp.name}</div>)}
                                    {dayHasShifts && <div className="h-12 flex items-center text-xs font-bold text-gray-500 truncate pr-2"><Users size={14} className="mr-1" /> Presenze</div>}
                                </div>
                                <div className="w-24 flex-shrink-0 text-right pr-4">
                                     <div className="h-6 flex items-end justify-end pb-1"><span className="text-xs font-bold text-gray-500">Ore</span></div>
                                     {employees.map(emp => {
                                        const shiftText = allSchedules[emp.id]?.[dateString] || '';
                                        const lowerShiftText = shiftText.toLowerCase();
                                        const dailyHours = calculateHours(shiftText);
                                        let displayContent;
                                        let textColor = '#9ca3af';

                                        if (lowerShiftText === 'riposo' || lowerShiftText === 'ferie') {
                                            displayContent = <span className="capitalize font-bold">{lowerShiftText}</span>;
                                            textColor = lowerShiftText === 'riposo' ? '#16a34a' : '#d97706';
                                        } else if (dailyHours > 0) {
                                            displayContent = dailyHours.toFixed(2);
                                            textColor = emp.color;
                                        } else {
                                            displayContent = '-';
                                        }
                                        return (<div key={emp.id} className="h-10 flex items-center justify-end text-sm font-semibold" style={{color: textColor}}>{displayContent}</div>)
                                     })}
                                     {dayHasShifts && <div className="h-12"></div>}
                                </div>
                                <div className="flex-grow">
                                    <div className="relative h-6">
                                        {timelineSlots.map((slot, i) => (
                                            <div key={i} className="absolute top-0 -translate-x-1/2" style={{ left: `${(i / (timelineSlots.length - 1)) * 100}%` }}>
                                                {slot.isHour && <span className="text-xs font-semibold text-gray-700">{slot.time}</span>}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-0">
                                            {timelineSlots.map((slot, i) => (
                                                <div key={i} className={`absolute top-0 bottom-0 w-px ${slot.isHour ? 'bg-gray-200' : 'bg-gray-100'}`} style={{ left: `${(i / (timelineSlots.length - 1)) * 100}%` }}></div>
                                            ))}
                                        </div>
                                        {employees.map((emp) => {
                                            const shiftText = allSchedules[emp.id]?.[dateString];
                                            const shiftBars = parseShiftToBars(shiftText, emp);
                                            return (
                                                <div key={emp.id} className="h-10 relative">
                                                    <div className="absolute top-0 w-full h-px bg-gray-200"></div>
                                                    {shiftBars.map((bar, barIndex) => (
                                                        <div key={barIndex} onClick={() => onEditRequest(emp, dateString)} className="absolute top-1/2 -translate-y-1/2 h-6 rounded-md cursor-pointer flex items-center justify-center px-2 shadow" style={{ left: bar.left, width: bar.width, backgroundColor: bar.employee.color }}>
                                                            <span className="text-white text-xs font-bold truncate">{bar.text}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })}
                                        {dayHasShifts &&
                                            <div className="h-12 relative pt-1">
                                                <div className="absolute top-0 w-full h-px bg-gray-200"></div>
                                                <HeadcountChart headcountData={dailyHeadcounts[dateString]} timelineSlots={timelineSlots}/>
                                            </div>
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const RequestDayTimeline = ({ date, employees, allSchedules, employeeIdToHighlight }) => {
    const timeToMinutes = useCallback((time) => { const [h, m] = time.split(':').map(Number); return h * 60 + m; }, []);

    const timelineSlots = useMemo(() => {
        const slots = [];
        for (let totalMinutes = 9 * 60 + 30; totalMinutes < 21 * 60; totalMinutes += 30) {
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            slots.push({ time: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`, isHour: minutes === 0 });
        }
        return slots;
    }, []);

    const timelineStartMinutes = timeToMinutes("09:30");
    const totalTimelineMinutes = timeToMinutes("21:00") - timelineStartMinutes;

    const parseShiftToBars = useCallback((shiftText, employee) => {
        if (!shiftText || typeof shiftText !== 'string' || shiftText.toLowerCase() === 'riposo' || shiftText.toLowerCase() === 'ferie') return [];

        return shiftText.split(',').map(range => {
            const times = range.trim().split('-');
            if (times.length !== 2) return null;
            try {
                const startMinutes = timeToMinutes(times[0].trim());
                const endMinutes = timeToMinutes(times[1].trim());
                const left = ((startMinutes - timelineStartMinutes) / totalTimelineMinutes) * 100;
                const width = ((endMinutes - startMinutes) / totalTimelineMinutes) * 100;
                if (left < 0 || width <= 0 || left > 100) return null;
                return { left: `${left}%`, width: `${width}%`, employee, text: range.trim() };
            } catch { return null; }
        }).filter(Boolean);
    }, [timeToMinutes, timelineStartMinutes, totalTimelineMinutes]);

    return (
        <div className="mt-3 pt-3 border-t">
             <h4 className="text-sm font-bold text-gray-700 mb-2">Orario del Giorno</h4>
             <div className="flex text-xs">
                <div className="w-24 flex-shrink-0 pr-2">
                     <div className="h-6"></div>
                     {employees.map(emp => (
                         <div key={emp.id} className={`h-8 flex items-center font-medium truncate ${emp.id === employeeIdToHighlight ? 'font-extrabold' : ''}`} style={{color: emp.color}}>
                             {emp.name}
                         </div>
                     ))}
                </div>
                <div className="flex-grow">
                    <div className="relative h-6">
                        {timelineSlots.map((slot, i) => (
                            <div key={i} className="absolute top-0 -translate-x-1/2" style={{ left: `${(i / (timelineSlots.length - 1)) * 100}%` }}>
                                {slot.isHour && <span className="font-semibold text-gray-500">{slot.time.substring(0,2)}</span>}
                            </div>
                        ))}
                    </div>
                    <div className="relative">
                        <div className="absolute inset-0">
                            {timelineSlots.map((slot, i) => (
                                <div key={i} className={`absolute top-0 bottom-0 w-px ${slot.isHour ? 'bg-gray-200' : 'bg-gray-100'}`} style={{ left: `${(i / (timelineSlots.length - 1)) * 100}%` }}></div>
                            ))}
                        </div>
                        {employees.map((emp) => {
                            const shiftText = allSchedules[emp.id]?.[date];
                            const shiftBars = parseShiftToBars(shiftText, emp);
                            return (
                                <div key={emp.id} className={`h-8 relative rounded ${emp.id === employeeIdToHighlight ? 'bg-yellow-100/50' : ''}`}>
                                    <div className="absolute top-0 w-full h-px bg-gray-200/70"></div>
                                    {shiftBars.map((bar, barIndex) => (
                                        <div key={barIndex} className="absolute top-1/2 -translate-y-1/2 h-5 rounded-sm flex items-center justify-center px-1 shadow-sm" style={{ left: bar.left, width: bar.width, backgroundColor: bar.employee.color }}>
                                            <span className="text-white text-[10px] font-bold truncate">{bar.text}</span>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>
             </div>
        </div>
    );
};

const RequestsView = ({ requests, onApprove, onReject, employees, allSchedules }) => {
    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Richieste in Sospeso</h3>
            {requests.length === 0 ? <p className="text-gray-500">Nessuna richiesta in sospeso.</p> : (
                <div className="space-y-3">
                    {requests.map(req => (
                        <div key={req.id} className="p-3 border rounded-lg bg-gray-50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <span className="w-3 h-3 rounded-full" style={{backgroundColor: req.employeeColor}}></span>
                                        <span className="font-bold">{req.employeeName}</span>
                                    </div>
                                    <p className="text-sm text-gray-500">{new Date(req.date.split('-').join('/')).toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
                                </div>
                                <div className="text-xs text-gray-400">{req.createdAt?.toDate().toLocaleTimeString('it-IT')}</div>
                            </div>
                            <div className="mt-2 p-3 bg-white rounded-lg border">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-semibold text-gray-500">Turno Attuale:</span>
                                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">{req.originalShift || 'Nessuno'}</span>
                                    </div>
                                    <div className="flex items-center justify-center my-1">
                                        <ArrowDown size={16} style={{color: BRAND_COLOR}}/>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-semibold" style={{color: BRAND_COLOR}}>Nuova Proposta:</span>
                                        <span className="font-mono px-2 py-1 rounded text-white" style={{backgroundColor: BRAND_COLOR_LIGHT}}>{req.details || 'Nessuno'}</span>
                                    </div>
                                    {req.notes && (
                                        <div className="pt-2 border-t mt-2">
                                            <p className="text-sm"><span className="font-semibold">Note:</span> {req.notes}</p>
                                        </div>
                                    )}
                                </div>
                                <RequestDayTimeline
                                    date={req.date}
                                    employees={employees}
                                    allSchedules={allSchedules}
                                    employeeIdToHighlight={req.employeeId}
                                />
                            </div>
                            <div className="flex justify-end space-x-2 mt-2">
                                <button onClick={() => onReject(req.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full"><ThumbsDown size={18}/></button>
                                <button onClick={() => onApprove(req)} className="p-2 text-green-600 hover:bg-green-100 rounded-full"><ThumbsUp size={18}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

const AdminView = ({ onExit, isXlsxReady, employees, allSchedules }) => {
    const [requests, setRequests] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('calendar');

    const [timelineWeek, setTimelineWeek] = useState(new Date());
    const [isPrinting, setIsPrinting] = useState(false);
    const [originalWeek, setOriginalWeek] = useState(new Date());

    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
    const [isDayDetailModalOpen, setIsDayDetailModalOpen] = useState(false);
    const [isEmployeeManagementModalOpen, setIsEmployeeManagementModalOpen] = useState(false);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    const [employeeToEdit, setEmployeeToEdit] = useState(null);
    const [editingDate, setEditingDate] = useState(null);
    const [saldatoTGT, setSaldatoTGT] = useState(null);
    const [woTGT, setWoTGT] = useState(null);
    const fileInputRef = useRef(null);
    const [uploadMessage, setUploadMessage] = useState(null);
    const [monthlyTGTData, setMonthlyTGTData] = useState({});

    useEffect(() => {
        if (isPrinting) {
            window.print();
            setTimelineWeek(originalWeek);
            setIsPrinting(false);
        }
    }, [isPrinting, originalWeek]);


    useEffect(() => {
        if (uploadMessage) {
            const timer = setTimeout(() => setUploadMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [uploadMessage]);

    useEffect(() => {
        const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        const docRef = doc(db, `/artifacts/${appId}/public/data/dailyData/${dateString}`);
        const unsub = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setSaldatoTGT(data.saldatoTGT);
                setWoTGT(data.woTGT);
            } else {
                setSaldatoTGT(null);
                setWoTGT(null);
            }
        });
        return () => unsub();
    }, [currentDate]);

     useEffect(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);
        const startString = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-01`;
        const endString = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
        const q = query(collection(db, `/artifacts/${appId}/public/data/dailyData`), where(documentId(), ">=", startString), where(documentId(), "<=", endString));
        const unsub = onSnapshot(q, (snapshot) => {
            const data = {};
            snapshot.docs.forEach(doc => { data[doc.id] = doc.data(); });
            setMonthlyTGTData(data);
        });
        return () => unsub();
    }, [currentDate]);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setUploadMessage(null);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                if (typeof window.XLSX === 'undefined') {
                    setUploadMessage({ type: 'error', text: 'Libreria di lettura file non ancora pronta. Riprova tra poco.' });
                    return;
                }
                const workbook = window.XLSX.read(data, { type: 'array', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                if (json.length < 2) {
                    setUploadMessage({ type: 'error', text: 'Formato file non valido.' });
                    return;
                }
                const headerRow = json.find(row => row.some(cell => cell instanceof Date));
                if (!headerRow) {
                    setUploadMessage({ type: 'error', text: 'Nessuna riga con date trovata.' });
                    return;
                }
                const findDataRow = (targetLabel) => json.find(row => row.some(cell => typeof cell === 'string' && cell.trim().toUpperCase() === targetLabel.toUpperCase()));
                const saldatoRow = findDataRow('SALDATO TGT');
                const woRow = findDataRow('WO TGT');
                if (!saldatoRow || !woRow) {
                    setUploadMessage({ type: 'error', text: "Etichette 'SALDATO TGT' o 'WO TGT' non trovate." });
                    return;
                }
                const promises = [];
                for (let i = 0; i < headerRow.length; i++) {
                    const cellValue = headerRow[i];
                    if (cellValue instanceof Date) {
                        const dateString = `${cellValue.getFullYear()}-${String(cellValue.getMonth() + 1).padStart(2, '0')}-${String(cellValue.getDate()).padStart(2, '0')}`;
                        const docRef = doc(db, `/artifacts/${appId}/public/data/dailyData/${dateString}`);
                        promises.push(setDoc(docRef, { saldatoTGT: saldatoRow[i] ?? null, woTGT: woRow[i] ?? null }, { merge: true }));
                    }
                }
                await Promise.all(promises);
                setUploadMessage({ type: 'success', text: `Dati di ${promises.length} giorni caricati!` });
            } catch (error) {
                console.error("Errore lettura file:", error);
                setUploadMessage({ type: 'error', text: 'Errore durante la lettura.' });
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    useEffect(() => {
        const q = query(collection(db, `/artifacts/${appId}/public/data/requests`), where("status", "==", "pending"));
        const unsubRequests = onSnapshot(q, (snapshot) => {
            const pendingRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            pendingRequests.sort((a,b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
            setRequests(pendingRequests);
        });
        return () => unsubRequests();
    }, []);
    
    const handleConfirmPrint = (dateToPrint) => {
        setOriginalWeek(timelineWeek);
        setTimelineWeek(dateToPrint);
        setIsPrinting(true);
        setIsPrintModalOpen(false);
    };


    const handleDayClick = (date) => { setEditingDate(date); setIsDayDetailModalOpen(true); };
    const handleEditRequest = (employee, date) => { setEmployeeToEdit(employee); setEditingDate(date); setIsShiftModalOpen(true); };

    const handleSaveShift = async (employeeId, date, newShift) => {
        const docRef = doc(db, `/artifacts/${appId}/public/data/schedules/${employeeId}`);
        const currentSchedule = allSchedules[employeeId] || {};
        const updatedShifts = { ...currentSchedule, [date]: newShift };
        if (!newShift) delete updatedShifts[date];
        try { await setDoc(docRef, { shifts: updatedShifts }, { merge: true }); }
        catch (err) { console.error("Salvataggio fallito:", err); }
        finally { setIsShiftModalOpen(false); }
    };

    const handleSaveOrUpdateEmployee = async (employeeData) => {
        const { id, ...data } = employeeData;
        try {
            if (id) await updateDoc(doc(db, `/artifacts/${appId}/public/data/employees`, id), data);
            else await addDoc(collection(db, `/artifacts/${appId}/public/data/employees`), data);
        } catch (err) { console.error("Impossibile salvare il dipendente:", err); }
        finally { setIsEmployeeModalOpen(false); setEmployeeToEdit(null); }
    };

    const handleDeleteEmployee = async (employeeId) => {
        if (window.confirm("Sei sicuro di voler eliminare questo dipendente? Verranno rimossi anche tutti i suoi orari.")) {
            try {
                await deleteDoc(doc(db, `/artifacts/${appId}/public/data/employees`, employeeId));
                await deleteDoc(doc(db, `/artifacts/${appId}/public/data/schedules`, employeeId));
            } catch (err) { console.error("Impossibile eliminare il dipendente:", err); }
        }
    };

    const handleStartAddNewEmployee = () => {
        setEmployeeToEdit(null);
        setIsEmployeeManagementModalOpen(false);
        setIsEmployeeModalOpen(true);
    };

    const handleStartEditEmployee = (employee) => {
        setEmployeeToEdit(employee);
        setIsEmployeeManagementModalOpen(false);
        setIsEmployeeModalOpen(true);
    };

    const handleApproveRequest = async (req) => {
        if (req.type === 'cambio') await handleSaveShift(req.employeeId, req.date, req.details);
        await updateDoc(doc(db, `/artifacts/${appId}/public/data/requests/${req.id}`), { status: 'approved' });
    };

    const handleRejectRequest = async (reqId) => {
        await updateDoc(doc(db, `/artifacts/${appId}/public/data/requests/${reqId}`), { status: 'rejected' });
    };

    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear(); const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startDayIndex = (firstDayOfMonth === 0) ? 6 : firstDayOfMonth - 1;
        const days = [];
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        for (let i = startDayIndex - 1; i >= 0; i--) days.push({ day: daysInPrevMonth - i, isCurrentMonth: false, shifts: [] });
        const today = new Date();
        for (let i = 1; i <= daysInMonth; i++) {
            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dayShifts = employees.map(emp => { const shiftText = allSchedules[emp.id]?.[dateString]; return shiftText ? { text: shiftText, employee: emp } : null; }).filter(Boolean);
            const tgtDataForDay = monthlyTGTData[dateString];
            days.push({ day: i, isCurrentMonth: true, isToday: year === today.getFullYear() && month === today.getMonth() && i === today.getDate(), shifts: dayShifts, dateString, tgtData: tgtDataForDay });
        }
        const remainingCells = 42 - days.length;
        for (let i = 1; i <= remainingCells; i++) days.push({ day: i, isCurrentMonth: false, shifts: [] });
        return days;
    }, [currentDate, allSchedules, employees, monthlyTGTData]);

    const monthName = currentDate.toLocaleString('it-IT', { month: 'long' });
    const year = currentDate.getFullYear();

    const handleCopyPreviousWeek = async (weekStartDate) => {
        try {
            for (const employee of employees) {
                const docRef = doc(db, `/artifacts/${appId}/public/data/schedules/${employee.id}`);
                const currentShifts = allSchedules[employee.id] || {};
                const updatedShifts = { ...currentShifts };
                for (let i = 0; i < 7; i++) {
                    const dayOffset = new Date(weekStartDate);
                    dayOffset.setDate(dayOffset.getDate() + i);
                    const prevWeekDay = new Date(dayOffset);
                    prevWeekDay.setDate(prevWeekDay.getDate() - 7);
                    const currentDateString = `${dayOffset.getFullYear()}-${String(dayOffset.getMonth() + 1).padStart(2, '0')}-${String(dayOffset.getDate()).padStart(2, '0')}`;
                    const prevDateString = `${prevWeekDay.getFullYear()}-${String(prevWeekDay.getMonth() + 1).padStart(2, '0')}-${String(prevWeekDay.getDate()).padStart(2, '0')}`;
                    const previousShift = allSchedules[employee.id]?.[prevDateString];
                    if (previousShift) updatedShifts[currentDateString] = previousShift;
                    else delete updatedShifts[currentDateString];
                }
                await setDoc(docRef, { shifts: updatedShifts });
            }
        } catch (error) { console.error("Errore durante la copia:", error); }
    };

    return (
        <>
            <DayDetailModal isOpen={isDayDetailModalOpen} onClose={() => setIsDayDetailModalOpen(false)} onEditRequest={handleEditRequest} date={editingDate} employees={employees} allSchedules={allSchedules} />
            <EditShiftModal isOpen={isShiftModalOpen} onClose={() => setIsShiftModalOpen(false)} onSave={handleSaveShift} date={editingDate} currentShift={employeeToEdit ? allSchedules[employeeToEdit.id]?.[editingDate] || '' : ''} employee={employeeToEdit} />
            <EmployeeModal isOpen={isEmployeeModalOpen} onClose={() => {setIsEmployeeModalOpen(false); setEmployeeToEdit(null);}} onSave={handleSaveOrUpdateEmployee} employeeToEdit={employeeToEdit} />
            <EmployeeManagementModal isOpen={isEmployeeManagementModalOpen} onClose={() => setIsEmployeeManagementModalOpen(false)} employees={employees} onEdit={handleStartEditEmployee} onDelete={handleDeleteEmployee} onAddNew={handleStartAddNewEmployee} />
            <PrintModal isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} onConfirmPrint={handleConfirmPrint} currentWeek={timelineWeek} />

            <div className="bg-white p-4 rounded-xl shadow-lg mb-4 flex flex-col md:flex-row justify-center items-center text-center space-y-4 md:space-y-0 md:space-x-8">
                <div className="flex items-center space-x-4">
                    <div>
                        <p className="text-sm text-gray-500">Saldato TGT</p>
                        <p className="text-2xl font-bold text-green-600">{saldatoTGT !== null ? `€ ${Number(saldatoTGT).toFixed(2)}` : 'N/D'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">WO TGT</p>
                        <p className="text-2xl font-bold text-blue-600">{woTGT !== null ? `€ ${Number(woTGT).toFixed(2)}` : 'N/D'}</p>
                    </div>
                </div>
                <div className="text-center">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".xlsx, .xls"/>
                    <button onClick={() => fileInputRef.current.click()} disabled={!isXlsxReady} className="flex items-center space-x-2 text-sm font-semibold text-white bg-gray-700 hover:bg-gray-800 px-4 py-2 rounded-md transition-shadow shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed">
                        <Upload size={16} />
                        <span>{isXlsxReady ? 'Carica Dati Mese' : 'Caricamento...'}</span>
                    </button>
                    {uploadMessage && <div className={`mt-2 text-xs ${uploadMessage.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{uploadMessage.text}</div>}
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 bg-white p-4 rounded-xl shadow-lg">
                <div className="flex items-center space-x-2 flex-wrap justify-center">
                    <button onClick={() => setViewMode('calendar')} className={`flex items-center space-x-2 text-sm font-semibold px-4 py-2 rounded-md transition shadow-md hover:shadow-lg ${viewMode === 'calendar' ? 'text-white' : 'bg-gray-200 text-gray-800'}`} style={{backgroundColor: viewMode === 'calendar' ? BRAND_COLOR : undefined}}><Calendar size={16} /><span>Calendario</span></button>
                    <button onClick={() => setViewMode('timeline')} className={`flex items-center space-x-2 text-sm font-semibold px-4 py-2 rounded-md transition shadow-md hover:shadow-lg ${viewMode === 'timeline' ? 'text-white' : 'bg-gray-200 text-gray-800'}`} style={{backgroundColor: viewMode === 'timeline' ? BRAND_COLOR : undefined}}><GanttChartSquare size={16} /><span>Timeline</span></button>
                    <button onClick={() => setViewMode('requests')} className={`relative flex items-center space-x-2 text-sm font-semibold px-4 py-2 rounded-md transition shadow-md hover:shadow-lg ${viewMode === 'requests' ? 'text-white' : 'bg-gray-200 text-gray-800'}`} style={{backgroundColor: viewMode === 'requests' ? BRAND_COLOR : undefined}}>
                        <Bell size={16} />
                        <span>Richieste</span>
                        {requests.length > 0 && <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full text-xs text-white" style={{backgroundColor: BRAND_COLOR_LIGHT}}>{requests.length}</span>}
                    </button>
                    <button onClick={() => setIsEmployeeManagementModalOpen(true)} className="flex items-center space-x-2 text-sm font-semibold text-white px-4 py-2 rounded-md transition shadow-md hover:shadow-lg" style={{backgroundColor: BRAND_COLOR}}><UserCog size={16} /><span>Dipendenti</span></button>
                </div>
                <button onClick={onExit} className="flex items-center space-x-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md mt-2 sm:mt-0"><User size={16} /><span>Vista Dipendente</span></button>
            </div>

            {viewMode === 'calendar' ? (
                <div className="bg-white p-2 sm:p-3 rounded-xl shadow-lg">
                    <div className="flex justify-between items-center mb-4 px-2">
                        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-2 rounded-full hover:bg-gray-200"><ArrowLeft size={20} /></button>
                        <h2 className="text-xl font-bold text-gray-800 capitalize">{monthName} {year}</h2>
                        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 rounded-full hover:bg-gray-200"><ArrowRight size={20} /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1.5">{calendarDays.map((dayInfo, index) => <AdminDayCell key={index} dayInfo={dayInfo} onClick={handleDayClick} />)}</div>
                </div>
            ) : viewMode === 'timeline' ? (
                <WeeklyTimelineView
                    employees={employees}
                    allSchedules={allSchedules}
                    onEditRequest={handleEditRequest}
                    onCopyPreviousWeek={handleCopyPreviousWeek}
                    onPreparePrint={() => setIsPrintModalOpen(true)}
                    currentWeek={timelineWeek}
                    setCurrentWeek={setTimelineWeek}
                 />
            ) : (
                <RequestsView requests={requests} onApprove={handleApproveRequest} onReject={handleRejectRequest} employees={employees} allSchedules={allSchedules} />
            )}
        </>
    );
};

const DailyColleaguesTimelineModal = ({ isOpen, onClose, date, employees, allSchedules, currentEmployeeId }) => {

    const timeToMinutes = useCallback((time) => { const [h, m] = time.split(':').map(Number); return h * 60 + m; }, []);
    const timelineSlots = useMemo(() => {
        const slots = [];
        for (let h = 9.5; h < 21; h+= 0.5) {
            const hours = Math.floor(h);
            const minutes = (h % 1) * 60;
            slots.push({ time: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`, isHour: minutes === 0 });
        }
        return slots;
    }, []);
    const timelineStartMinutes = useMemo(() => timeToMinutes("09:30"), [timeToMinutes]);
    const totalTimelineMinutes = useMemo(() => timeToMinutes("21:00") - timelineStartMinutes, [timeToMinutes, timelineStartMinutes]);

    const parseShiftToBars = useCallback((shiftText, employee) => {
        if (!shiftText || typeof shiftText !== 'string' || shiftText.toLowerCase() === 'riposo' || shiftText.toLowerCase() === 'ferie') return [];
        return shiftText.split(',').map(range => {
            const times = range.trim().split('-');
            if (times.length !== 2) return null;
            try {
                const startMinutes = timeToMinutes(times[0].trim());
                const endMinutes = timeToMinutes(times[1].trim());
                const left = ((startMinutes - timelineStartMinutes) / totalTimelineMinutes) * 100;
                const width = ((endMinutes - startMinutes) / totalTimelineMinutes) * 100;
                if (left < 0 || width <= 0 || left > 100) return null;
                return { left: `${left}%`, width: `${width}%`, employee, text: range.trim() };
            } catch { return null; }
        }).filter(Boolean);
    }, [timeToMinutes, timelineStartMinutes, totalTimelineMinutes]);

    if (!isOpen) return null;
    const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const colleagues = employees.filter(emp => emp.id !== currentEmployeeId);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[70] p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Orario Colleghi - {formattedDate}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X size={20} /></button>
                </div>
                <div className="flex text-xs">
                    <div className="w-24 flex-shrink-0 pr-2">
                         <div className="h-6"></div>
                         {colleagues.map(emp => <div key={emp.id} className="h-8 flex items-center font-medium truncate" style={{color: emp.color}}>{emp.name}</div>)}
                    </div>
                    <div className="flex-grow">
                        <div className="relative h-6">
                            {timelineSlots.map((slot, i) => (
                                <div key={i} className="absolute top-0 -translate-x-1/2" style={{ left: `${(i / (timelineSlots.length - 1)) * 100}%` }}>
                                    {slot.isHour && <span className="font-semibold text-gray-500">{slot.time.substring(0,2)}</span>}
                                </div>
                            ))}
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0">
                                {timelineSlots.map((slot, i) => <div key={i} className={`absolute top-0 bottom-0 w-px ${slot.isHour ? 'bg-gray-200' : 'bg-gray-100'}`} style={{ left: `${(i / (timelineSlots.length - 1)) * 100}%` }}></div>)}
                            </div>
                            {colleagues.map((emp) => {
                                const shiftText = allSchedules[emp.id]?.[date];
                                const shiftBars = parseShiftToBars(shiftText, emp);
                                return (
                                    <div key={emp.id} className="h-8 relative rounded">
                                        <div className="absolute top-0 w-full h-px bg-gray-200/70"></div>
                                        {shiftBars.map((bar, barIndex) => (
                                            <div key={barIndex} className="absolute top-1/2 -translate-y-1/2 h-5 rounded-sm flex items-center justify-center px-1 shadow-sm" style={{ left: bar.left, width: bar.width, backgroundColor: bar.employee.color }}>
                                                <span className="text-white text-[10px] font-bold truncate">{bar.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                 <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">Chiudi</button>
                </div>
            </div>
        </div>
    );
};

const EmployeeView = ({ employee, onLogout, allEmployees, allSchedules }) => {
    const [currentWeek, setCurrentWeek] = useState(new Date());
    const [schedule, setSchedule] = useState({});
    const [requests, setRequests] = useState({});
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingDate, setEditingDate] = useState(null);
    const [isColleaguesModalOpen, setIsColleaguesModalOpen] = useState(false);
    const [viewingDate, setViewingDate] = useState(null);
    const [weeklyTGTData, setWeeklyTGTData] = useState({});

    useEffect(() => {
        if (!employee) return;
        const unsubSchedule = onSnapshot(doc(db, `/artifacts/${appId}/public/data/schedules/${employee.id}`), (docSnap) => {
            setSchedule(docSnap.exists() ? docSnap.data().shifts || {} : {});
        });
        const q = query(collection(db, `/artifacts/${appId}/public/data/requests`), where("employeeId", "==", employee.id));
        const unsubRequests = onSnapshot(q, (snapshot) => {
            const reqsByDate = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                reqsByDate[data.date] = { id: doc.id, ...data };
            });
            setRequests(reqsByDate);
        });
        return () => { unsubSchedule(); unsubRequests(); };
    }, [employee]);

    const weekDays = useMemo(() => {
        const startOfWeek = new Date(currentWeek);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        return Array.from({ length: 7 }).map((_, i) => {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            return date;
        });
    }, [currentWeek]);

    useEffect(() => {
        if (weekDays.length === 0) return;
        const startString = `${weekDays[0].getFullYear()}-${String(weekDays[0].getMonth() + 1).padStart(2, '0')}-${String(weekDays[0].getDate()).padStart(2, '0')}`;
        const endString = `${weekDays[6].getFullYear()}-${String(weekDays[6].getMonth() + 1).padStart(2, '0')}-${String(weekDays[6].getDate()).padStart(2, '0')}`;
        const q = query(collection(db, `/artifacts/${appId}/public/data/dailyData`), where(documentId(), ">=", startString), where(documentId(), "<=", endString));
        const unsub = onSnapshot(q, (snapshot) => {
            const data = {};
            snapshot.docs.forEach(doc => { data[doc.id] = doc.data(); });
            setWeeklyTGTData(data);
        });
        return () => unsub();
    }, [weekDays]);

    const weekNumber = useMemo(() => getWeekNumber(currentWeek), [currentWeek]);

    const weeklyTotalHours = useMemo(() => {
        return weekDays.reduce((total, date) => {
            const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            return total + calculateHours(schedule[dateString] || '');
        }, 0);
    }, [weekDays, schedule]);

    const handleRequestSave = async (employeeId, date, newShift) => {
        const currentShift = schedule[date] || 'Nessun turno';
        if (newShift === currentShift) {
            setIsEditModalOpen(false);
            return;
        }
        await addDoc(collection(db, `/artifacts/${appId}/public/data/requests`), {
            type: 'cambio', details: newShift, notes: '', employeeId: employee.id, employeeName: employee.name,
            employeeColor: employee.color, date: date, originalShift: currentShift, status: 'pending', createdAt: serverTimestamp()
        });
        setIsEditModalOpen(false);
    };

    const getStatusBadge = (status) => {
        switch(status) {
            case 'pending': return <div className="flex items-center space-x-1 text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full"><History size={12}/><span>In Attesa</span></div>;
            case 'approved': return <div className="flex items-center space-x-1 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full"><ThumbsUp size={12}/><span>Approvata</span></div>;
            case 'rejected': return <div className="flex items-center space-x-1 text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full"><ThumbsDown size={12}/><span>Rifiutata</span></div>;
            default: return null;
        }
    }

    return (
        <>
            {isEditModalOpen && <EditShiftModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSave={handleRequestSave} date={editingDate} currentShift={editingDate ? schedule[editingDate] || '' : ''} employee={employee} />}
            <DailyColleaguesTimelineModal isOpen={isColleaguesModalOpen} onClose={() => setIsColleaguesModalOpen(false)} date={viewingDate} employees={allEmployees} allSchedules={allSchedules} currentEmployeeId={employee.id} />
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-center space-x-2">
                        <button onClick={() => setCurrentWeek(d => new Date(d.setDate(d.getDate() - 7)))} className="p-2 rounded-full hover:bg-gray-200"><ArrowLeft size={20} /></button>
                        <button onClick={() => setCurrentWeek(d => new Date(d.setDate(d.getDate() + 7)))} className="p-2 rounded-full hover:bg-gray-200"><ArrowRight size={20} /></button>
                        <button onClick={() => setCurrentWeek(new Date())} className="hidden sm:block text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md">Questa Settimana</button>
                    </div>
                    <div className="text-center my-3 sm:my-0">
                        <h2 className="text-xl font-bold text-gray-800">
                            Settimana del {weekDays[0].toLocaleDateString('it-IT', {day: '2-digit', month: 'long'})}
                            <span className="text-base font-normal text-gray-500 ml-2">- Week {weekNumber}</span>
                        </h2>
                    </div>
                    <button onClick={onLogout} className="flex items-center space-x-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md"><LogOut size={16} /><span>Cambia Utente</span></button>
                </div>

                <div style={{backgroundColor: `${BRAND_COLOR}15`, borderColor: `${BRAND_COLOR}30`}} className="border-2 rounded-lg p-4 mb-6 text-center">
                    <p className="text-md" style={{color: BRAND_COLOR}}>Totale Ore Settimanali</p>
                    <p className="text-4xl font-bold" style={{color: BRAND_COLOR}}>{weeklyTotalHours.toFixed(2)}</p>
                </div>

                <div className="space-y-4">
                    {weekDays.map(date => {
                        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                        const shift = schedule[dateString] || 'Nessun turno';
                        const dailyHours = calculateHours(shift);
                        const isToday = date.toDateString() === new Date().toDateString();
                        const request = requests[dateString];
                        const workingEmployeesOnDay = allEmployees.filter(emp => calculateHours(allSchedules[emp.id]?.[dateString] || '') > 0);
                        const totalContractualHoursOfWorkingEmployees = workingEmployeesOnDay.reduce((total, emp) => total + (emp.weeklyHours || 0), 0);
                        const dayTGTData = weeklyTGTData[dateString];
                        let individualWoTGT = 0;
                        if (dayTGTData?.woTGT && totalContractualHoursOfWorkingEmployees > 0 && dailyHours > 0) {
                            individualWoTGT = (dayTGTData.woTGT / totalContractualHoursOfWorkingEmployees) * (employee.weeklyHours || 0);
                        }

                        return (
                            <div key={dateString} className={`p-4 rounded-lg transition`} style={{backgroundColor: isToday ? `${BRAND_COLOR}10` : '#f9fafb', borderColor: isToday ? `${BRAND_COLOR}20` : 'transparent', borderWidth: isToday ? '2px' : '0px'}}>
                                <div className="flex flex-col sm:flex-row justify-between items-center">
                                    <div className="flex-1 mb-2 sm:mb-0">
                                        <p className={`font-bold capitalize`} style={{color: isToday ? BRAND_COLOR : '#1f2937'}}>{date.toLocaleDateString('it-IT', { weekday: 'long' })}</p>
                                        <p className="text-sm text-gray-500">{date.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                        {dailyHours > 0 && individualWoTGT > 0 && (
                                            <div className="mt-1 text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full inline-block">
                                                WO TGT: € {individualWoTGT.toFixed(2)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 text-center font-mono text-lg font-semibold">{shift}</div>
                                    <div className="flex-1 text-right">
                                        {dailyHours > 0 && (
                                            <div className="inline-flex items-center space-x-2 bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm font-semibold">
                                                <Clock size={14} />
                                                <span>{dailyHours.toFixed(2)} ore</span>
                                            </div>
                                        )}
                                        {shift.toLowerCase() === 'riposo' && <CheckCircle size={20} className="text-green-500 inline-block" />}
                                    </div>
                                </div>
                                <div className="flex justify-end items-center mt-2 pt-2 border-t border-gray-200/50 space-x-4">
                                    <button onClick={() => { setViewingDate(dateString); setIsColleaguesModalOpen(true); }} className="flex items-center space-x-1.5 text-sm text-gray-500 font-semibold hover:text-indigo-600">
                                        <Users size={14}/>
                                        <span>Vedi Colleghi</span>
                                    </button>
                                    {request ? getStatusBadge(request.status) : <button onClick={() => { setEditingDate(dateString); setIsEditModalOpen(true); }} className="flex items-center space-x-1.5 text-sm font-semibold hover:opacity-80" style={{color: BRAND_COLOR}}><Send size={14}/><span>Richiedi Modifica</span></button>}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </>
    );
};

const SelectEmployeeView = ({ onSelectEmployee, employees }) => {
    return (
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg mx-auto text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Chi sei?</h2>
            <p className="text-gray-600 mb-6">Seleziona il tuo nome per vedere il tuo orario.</p>
            {employees.length === 0 ? <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{borderColor: BRAND_COLOR}}></div> :
                <div className="space-y-3">{employees.map(emp => <button key={emp.id} onClick={() => onSelectEmployee(emp)} className="w-full text-lg font-semibold p-4 rounded-lg transition-transform transform hover:scale-105" style={{ backgroundColor: emp.color, color: 'white' }}>{emp.name}</button>)}</div>
            }
        </div>
    );
};

const App = () => {
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isAdminView, setIsAdminView] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isXlsxReady, setIsXlsxReady] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [allSchedules, setAllSchedules] = useState({});

    useEffect(() => {
        const scriptId = 'xlsx-script';
        let script = document.getElementById(scriptId);
        const onScriptLoad = () => setIsXlsxReady(true);
        if (!script) {
            script = document.createElement('script');
            script.id = scriptId;
            script.src = "https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js";
            script.async = true;
            script.onload = onScriptLoad;
            document.body.appendChild(script);
        } else if (window.XLSX) onScriptLoad();
        else script.addEventListener('load', onScriptLoad);

        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) setIsAuthReady(true);
            else {
                try {
                    if (initialAuthToken) await signInWithCustomToken(auth, initialAuthToken);
                    else await signInAnonymously(auth);
                } catch (err) { console.error("Auth Error:", err); }
            }
        });
        return () => {
            unsubscribeAuth();
            if (script) script.removeEventListener('load', onScriptLoad);
        };
    }, []);

    useEffect(() => {
        if (!isAuthReady) return;
        const unsub = onSnapshot(collection(db, `/artifacts/${appId}/public/data/employees`), (snapshot) => {
            const emps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setEmployees(emps);
            setIsLoading(false);
        }, (error) => {
            console.error("Errore caricamento dipendenti:", error);
            setIsLoading(false);
        });
        return () => unsub();
    }, [isAuthReady]);

    useEffect(() => {
        if (employees.length === 0 || !isAuthReady) return;
        const unsubscribers = employees.map(emp =>
            onSnapshot(doc(db, `/artifacts/${appId}/public/data/schedules/${emp.id}`), (docSnap) => {
                const shifts = docSnap.exists() ? docSnap.data().shifts || {} : {};
                setAllSchedules(prev => ({ ...prev, [emp.id]: shifts }));
            })
        );
        return () => unsubscribers.forEach(unsub => unsub());
    }, [employees, isAuthReady]);

    useEffect(() => {
        if (!isAuthReady) return;
        try {
            const storedEmployee = localStorage.getItem('selectedEmployee');
            if (storedEmployee) {
                const parsedEmployee = JSON.parse(storedEmployee);
                if(employees.find(e => e.id === parsedEmployee.id)) setSelectedEmployee(parsedEmployee);
                else localStorage.removeItem('selectedEmployee');
            }
        } catch (e) { localStorage.removeItem('selectedEmployee'); }
        setIsLoading(false);
    }, [isAuthReady, employees]);

    const handleSelectEmployee = (employee) => { setSelectedEmployee(employee); localStorage.setItem('selectedEmployee', JSON.stringify(employee)); };
    const handleLogout = () => { setSelectedEmployee(null); localStorage.removeItem('selectedEmployee'); };

    const renderContent = () => {
        if (isLoading || !isAuthReady) return <div className="flex justify-center items-center h-96"><div className="animate-spin rounded-full h-16 w-16 border-b-2" style={{borderColor: BRAND_COLOR}}></div></div>;
        if (isAdminView) return <AdminView onExit={() => setIsAdminView(false)} isXlsxReady={isXlsxReady} employees={employees} allSchedules={allSchedules} />;
        if (selectedEmployee) return <EmployeeView employee={selectedEmployee} onLogout={handleLogout} allEmployees={employees} allSchedules={allSchedules} />;
        return <SelectEmployeeView onSelectEmployee={handleSelectEmployee} employees={employees} />;
    };

    return (
        <div className="bg-gray-100 min-h-screen font-sans p-4 md:p-8 relative">
            <style>
                {`
                body {
                    background-color: #f9fafb;
                }
                .main-app-container::before {
                    content: "";
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background-image: url(${BACKGROUND_ICON_URL});
                    background-position: center;
                    background-repeat: repeat;
                    background-size: 300px;
                    opacity: 0.03;
                    z-index: 0;
                    pointer-events: none;
                }
                @media print {
                    @page {
                        size: landscape;
                        margin: 15px;
                    }

                    body, html {
                        background: #fff;
                    }

                    body * {
                        visibility: hidden;
                    }

                    .printable-section, .printable-section * {
                        visibility: visible;
                    }

                    .printable-section {
                        position: static;
                        width: 100%;
                        height: auto;
                        box-shadow: none;
                        border: none;
                        padding: 0;
                        margin: 0;
                    }
                    
                    .printable-section .space-y-6 > div {
                        page-break-inside: avoid;
                    }

                    .no-print {
                        display: none !important;
                    }
                }
                @media (orientation: portrait) and (max-width: 1023px) {
                    #rotate-prompt {
                        display: flex;
                    }
                }
                @keyframes sway {
                    0% { transform: rotate(0deg); }
                    25% { transform: rotate(90deg); }
                    50% { transform: rotate(90deg); }
                    75% { transform: rotate(0deg); }
                    100% { transform: rotate(0deg); }
                }
                .animate-sway {
                    animation: sway 3s ease-in-out infinite;
                }
                `}
            </style>
            <RotateDevicePrompt />
            <div id="printable-area" className="max-w-7xl mx-auto relative z-10 main-app-container">
                <header className="no-print mb-6 md:mb-8">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="flex items-center space-x-3 mb-4 md:mb-0">
                            <img src={LOGO_URL} alt="Logo VisionOttica" className="h-16" />
                        </div>
                        <button onClick={() => setIsAdminView(!isAdminView)} className="flex items-center space-x-2 text-sm font-semibold text-white px-4 py-2 rounded-md transition-shadow shadow-md hover:shadow-lg" style={{backgroundColor: '#6b7280'}}>
                            {isAdminView ? <User size={16} /> : <Shield size={16} />}
                            <span>{isAdminView ? 'Vista Dipendente' : 'Vista Admin'}</span>
                        </button>
                    </div>
                </header>
                {renderContent()}
            </div>
        </div>
    );
};

export default App;