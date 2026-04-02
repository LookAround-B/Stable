import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getEmployees } from '../services/employeeService';
import { getStoredTheme, subscribeToThemeChange } from '../lib/theme';
import {
  User, Grip as HorseIcon, ClipboardList, CheckCircle2, FileText, Users,
  HeartPulse, Pill, Archive, Wheat, Package, Hammer, CircleDot, Wrench,
  CalendarDays, Clock, DoorOpen, FileSpreadsheet, File, StickyNote, FilePlus,
  GraduationCap, Search, RefreshCw, Paintbrush,
  ShieldAlert, UserPlus, BookOpen, ShoppingCart,
  DollarSign, Scale, Receipt, CalendarRange, UserCheck, FileCheck,
  Bell, ScrollText, Settings, Lock, Key,
  Hexagon, Link2, ArrowRight, ArrowLeft, X, ChevronDown, ChevronUp,
  Hash, Type, ToggleLeft, Calendar, Image, Database,
  ZoomIn, ZoomOut, Maximize2, RotateCcw,
} from 'lucide-react';

/* ================================================================
   EFM — Entity Relationship Map  v3
   Framer-motion powered · field-detail popups · animated edges
   ================================================================ */

// ── Icon map ────────────────────────────────────────────────────
const ICON_MAP = {
  Employee: User, Horse: HorseIcon, Task: ClipboardList, Approval: CheckCircle2,
  Report: FileText, HorseCareTeam: Users,
  HealthRecord: HeartPulse, MedicineLog: Pill, MedicineInventory: Archive,
  HorseFeed: Wheat, FeedInventory: Package, FarrierShoeing: Hammer,
  TackInventory: CircleDot, FarrierInventory: Wrench,
  Attendance: CalendarDays, AttendanceLog: Clock, GateAttendanceLog: DoorOpen,
  GroomWorkSheet: FileSpreadsheet, WorkSheetEntry: File, WorkRecord: StickyNote,
  WorkRecordEntry: FilePlus, InstructorDailyWorkRecord: GraduationCap,
  InspectionRound: Search, JamedarRoundCheck: RefreshCw, HousekeepingInventory: Paintbrush,
  GateEntry: ShieldAlert, Visitor: UserPlus, VisitorLog: BookOpen,
  GroceriesInventory: ShoppingCart,
  Expense: DollarSign, Fine: Scale, InvoiceGeneration: Receipt,
  Meeting: CalendarRange, MeetingParticipant: UserCheck, MeetingMOM: FileCheck,
  Notification: Bell, AuditLog: ScrollText, SystemSettings: Settings,
  EmployeePermission: Lock, EmployeeTaskPermission: Key,
};

const EntityIcon = ({ id, size = 16, color }) => {
  const Icon = ICON_MAP[id];
  return Icon ? <Icon size={size} color={color} strokeWidth={2} /> : null;
};

// ── Field type inference ────────────────────────────────────────
const inferFieldType = (f) => {
  if (f.endsWith('Id')) return { type: 'FK', icon: Link2, color: '#ff922b' };
  if (/date|Date|time|Time|createdAt|updatedAt/i.test(f)) return { type: 'Date', icon: Calendar, color: '#f783ac' };
  if (/image|Image|photo|Photo|profileImage|evidence/i.test(f)) return { type: 'Media', icon: Image, color: '#b197fc' };
  if (/status|Status|isActive|isRead|isApproved|granted|completed/i.test(f)) return { type: 'Bool', icon: ToggleLeft, color: '#69db7c' };
  if (/amount|price|cost|quantity|stock|total|units|hours|duration/i.test(f)) return { type: 'Num', icon: Hash, color: '#4dabf7' };
  return { type: 'Text', icon: Type, color: '#868e96' };
};

// ── Category palette ────────────────────────────────────────────
const CAT = {
  core:       { color: '#00ffd0', label: 'Core',              bg: 'rgba(0,255,208,.06)' },
  stable:     { color: '#4dabf7', label: 'Stable Operations', bg: 'rgba(77,171,247,.06)' },
  ground:     { color: '#69db7c', label: 'Ground Operations', bg: 'rgba(105,219,124,.06)' },
  finance:    { color: '#ffd43b', label: 'Accounts & Finance',bg: 'rgba(255,212,59,.06)' },
  system:     { color: '#b197fc', label: 'System',            bg: 'rgba(177,151,252,.06)' },
  restaurant: { color: '#ff922b', label: 'Restaurant Ops',    bg: 'rgba(255,146,43,.06)' },
  meeting:    { color: '#f783ac', label: 'Meetings',          bg: 'rgba(247,131,172,.06)' },
  gate:       { color: '#22b8cf', label: 'Gate & Visitors',   bg: 'rgba(34,184,207,.06)' },
};

// ── Theme tokens ────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg: '#08080a',
    bgGrad1: 'radial-gradient(ellipse 60% 50% at 30% 30%, rgba(0,255,208,.025) 0%, transparent 60%)',
    bgGrad2: 'radial-gradient(ellipse 50% 40% at 70% 60%, rgba(77,171,247,.02) 0%, transparent 50%)',
    surface: 'rgba(14,14,18,.97)',
    surfaceSolid: '#111114',
    border: 'rgba(255,255,255,.06)',
    borderNode: 'rgba(255,255,255,.10)',
    text: '#eee',
    textSec: '#bbb',
    textDim: '#888',
    textFaint: '#555',
    textField: '#999',
    gridLine: 'rgba(255,255,255,.05)',
    gridAccent: 'rgba(255,255,255,.10)',
    handleBorder: '#111114',
    nodeShadow: '0 4px 32px rgba(0,0,0,.55)',
    nodeShadowActive: (c) => `0 0 0 2px ${c}55, 0 0 30px ${c}18, 0 8px 40px rgba(0,0,0,.6)`,
    panelBg: 'rgba(10,10,14,.98)',
    legendActiveBg: 'rgba(255,255,255,.07)',
    countBg: 'rgba(255,255,255,.05)',
    footerBorder: 'rgba(255,255,255,.06)',
    badgeBorder: 'rgba(255,255,255,.08)',
    memberText: '#ccc', 
    dimOpacity: 0.06,
    showAllGrad: 'linear-gradient(135deg,#00ffd0,#ffd43b)',
    sep: 'rgba(255,255,255,.06)',
    fieldRowHover: 'rgba(255,255,255,.03)',
    tooltipBg: '#1a1a1e',
    tooltipBorder: 'rgba(255,255,255,.12)',
    btnBg: 'rgba(255,255,255,.05)',
    popupBg: 'rgba(16,16,20,.98)',
    edgeOpacity: 0.18,
  },
  light: {
    bg: '#eef0f4',
    bgGrad1: 'radial-gradient(ellipse 60% 50% at 30% 30%, rgba(0,200,170,.035) 0%, transparent 60%)',
    bgGrad2: 'radial-gradient(ellipse 50% 40% at 70% 60%, rgba(77,140,247,.025) 0%, transparent 50%)',
    surface: 'rgba(255,255,255,.96)',
    surfaceSolid: '#ffffff',
    border: 'rgba(0,0,0,.07)',
    borderNode: 'rgba(0,0,0,.10)',
    text: '#111',
    textSec: '#444',
    textDim: '#666',
    textFaint: '#999',
    textField: '#555',
    gridLine: 'rgba(0,0,0,.06)',
    gridAccent: 'rgba(0,0,0,.11)',
    handleBorder: '#ffffff',
    nodeShadow: '0 2px 20px rgba(0,0,0,.08)',
    nodeShadowActive: (c) => `0 0 0 2px ${c}33, 0 0 24px ${c}10, 0 4px 28px rgba(0,0,0,.10)`,
    panelBg: 'rgba(255,255,255,.98)',
    legendActiveBg: 'rgba(0,0,0,.04)',
    countBg: 'rgba(0,0,0,.04)',
    footerBorder: 'rgba(0,0,0,.06)',
    badgeBorder: 'rgba(0,0,0,.10)',
    memberText: '#222',
    dimOpacity: 0.10,
    showAllGrad: 'linear-gradient(135deg,#00c9a7,#e6b800)',
    sep: 'rgba(0,0,0,.07)',
    fieldRowHover: 'rgba(0,0,0,.02)',
    tooltipBg: '#fff',
    tooltipBorder: 'rgba(0,0,0,.12)',
    btnBg: 'rgba(0,0,0,.04)',
    popupBg: 'rgba(255,255,255,.99)',
    edgeOpacity: 0.14,
  },
};

const ROLE_COLORS = {
  'Super Admin': '#ff6b6b', 'Director': '#ff6b6b', 'School Administrator': '#ff6b6b',
  'Stable Manager': '#4dabf7', 'Ground Supervisor': '#4dabf7',
  'Groom': '#69db7c', 'Riding Boy': '#69db7c', 'Gardener': '#69db7c',
  'Rider': '#ffd43b', 'Instructor': '#ffd43b',
  'Jamedar': '#b197fc', 'Farrier': '#b197fc',
  'Executive Admin': '#22b8cf', 'Senior Executive Admin': '#22b8cf',
  'Executive Accounts': '#ff922b', 'Senior Executive Accounts': '#ff922b',
  'Guard': '#868e96', 'Electrician': '#868e96', 'Housekeeping': '#f783ac',
};

// ── Entities ────────────────────────────────────────────────────
const ENTITIES = [
  { id: 'Employee',        cat: 'core',   fields: ['fullName','email','designation','department','employmentStatus','supervisorId','shiftTiming','profileImage'] },
  { id: 'Horse',           cat: 'core',   fields: ['name','gender','breed','stableNumber','status','discipline','ownerName','supervisorId','passportNumber'] },
  { id: 'Task',            cat: 'core',   fields: ['name','type','status','horseId','assignedEmployeeId','createdById','priority','description'] },
  { id: 'Approval',        cat: 'core',   fields: ['taskId','approverId','approverLevel','status','comments'] },
  { id: 'Report',          cat: 'core',   fields: ['reportedEmployeeId','reporterEmployeeId','reason','category','status'] },
  { id: 'HorseCareTeam',   cat: 'stable', fields: ['horseId','staffId','role','isActive','assignedDate'] },
  { id: 'HealthRecord',       cat: 'stable', fields: ['horseId','healthAdvisorId','recordType','date','nextDueDate','documents'] },
  { id: 'MedicineLog',        cat: 'stable', fields: ['jamiedarId','horseId','medicineName','quantity','approvalStatus','approvedById'] },
  { id: 'MedicineInventory',  cat: 'stable', fields: ['medicineType','month','year','openingStock','unitsLeft','threshold'] },
  { id: 'HorseFeed',          cat: 'stable', fields: ['recordedById','horseId','date','barley','oats','soya','lucerne'] },
  { id: 'FeedInventory',      cat: 'stable', fields: ['feedType','month','year','openingStock','totalUsed','unitsLeft'] },
  { id: 'FarrierShoeing',     cat: 'stable', fields: ['horseId','farrierId','shoeingDate','nextDueDate','notes'] },
  { id: 'TackInventory',      cat: 'stable', fields: ['itemName','category','horseId','riderId','condition','brand'] },
  { id: 'FarrierInventory',   cat: 'stable', fields: ['itemName','category','horseId','farrierId','quantity','condition'] },
  { id: 'Attendance',         cat: 'ground', fields: ['employeeId','date','status','checkInTime','checkOutTime','remarks'] },
  { id: 'AttendanceLog',      cat: 'ground', fields: ['employeeId','date','timeIn','timeOut','shift','isApproved'] },
  { id: 'GateAttendanceLog',  cat: 'ground', fields: ['guardId','personName','personType','entryTime','exitTime'] },
  { id: 'GroomWorkSheet',     cat: 'ground', fields: ['groomId','date','totalAM','totalPM','woodchipsUsed','bichaliUsed'] },
  { id: 'WorkSheetEntry',     cat: 'ground', fields: ['worksheetId','horseId','amHours','pmHours','woodchipsUsed'] },
  { id: 'WorkRecord',         cat: 'ground', fields: ['staffId','date','category','totalAM','totalPM','remarks'] },
  { id: 'WorkRecordEntry',    cat: 'ground', fields: ['recordId','taskDescription','amHours','pmHours','remarks'] },
  { id: 'InstructorDailyWorkRecord', cat: 'ground', fields: ['instructorId','horseId','riderId','workType','duration','date'] },
  { id: 'InspectionRound',    cat: 'ground', fields: ['jamedarId','round','horseId','severityLevel','status','resolvedById'] },
  { id: 'JamedarRoundCheck',  cat: 'ground', fields: ['jamedarId','checkDate','morningCompleted','afternoonCompleted','eveningCompleted'] },
  { id: 'HousekeepingInventory', cat: 'ground', fields: ['itemName','category','quantity','unitType','assignedStaffId','costPerUnit'] },
  { id: 'GateEntry',  cat: 'gate', fields: ['guardId','personType','employeeId','visitorId','vehicleNo','entryTime'] },
  { id: 'Visitor',    cat: 'gate', fields: ['name','purpose','contactNumber'] },
  { id: 'VisitorLog', cat: 'gate', fields: ['visitorName','purpose','checkInTime','checkOutTime'] },
  { id: 'GroceriesInventory', cat: 'restaurant', fields: ['name','quantity','price','totalPrice','employeeId','createdById'] },
  { id: 'Expense',           cat: 'finance', fields: ['type','amount','description','date','horseId','employeeId','createdById'] },
  { id: 'Fine',              cat: 'finance', fields: ['issuedById','issuedToId','reason','amount','evidenceImage','status'] },
  { id: 'InvoiceGeneration', cat: 'finance', fields: ['Reads from EIRS','instructorId','dateRange'] },
  { id: 'Meeting',            cat: 'meeting', fields: ['title','meetingDate','location','createdById','status'] },
  { id: 'MeetingParticipant', cat: 'meeting', fields: ['meetingId','employeeId'] },
  { id: 'MeetingMOM',         cat: 'meeting', fields: ['meetingId','pointsDiscussed','decisions'] },
  { id: 'Notification',            cat: 'system', fields: ['employeeId','type','title','message','isRead'] },
  { id: 'AuditLog',                cat: 'system', fields: ['userId','action','entityType','entityId','changes'] },
  { id: 'SystemSettings',          cat: 'system', fields: ['key','value','description'] },
  { id: 'EmployeePermission',      cat: 'system', fields: ['employeeId','manageEmployees','issueFines','viewPayroll'] },
  { id: 'EmployeeTaskPermission',  cat: 'system', fields: ['employeeId','permission','granted'] },
];

// ── Edges ────────────────────────────────────────────────────────
const EDGES = [
  ['Employee','Task'],['Employee','Approval'],['Employee','Report'],
  ['Employee','Attendance'],['Employee','AttendanceLog'],['Employee','GateAttendanceLog'],
  ['Employee','GateEntry'],['Employee','GroomWorkSheet'],['Employee','WorkRecord'],
  ['Employee','InstructorDailyWorkRecord'],['Employee','HorseFeed'],['Employee','Expense'],
  ['Employee','Fine'],['Employee','Meeting'],['Employee','MeetingParticipant'],
  ['Employee','Notification'],['Employee','AuditLog'],['Employee','EmployeePermission'],
  ['Employee','EmployeeTaskPermission'],['Employee','HorseCareTeam'],
  ['Employee','MedicineLog'],['Employee','InspectionRound'],
  ['Employee','JamedarRoundCheck'],['Employee','FeedInventory'],
  ['Employee','MedicineInventory'],['Employee','GroceriesInventory'],
  ['Employee','TackInventory'],['Employee','HousekeepingInventory'],
  ['Employee','FarrierInventory'],['Employee','FarrierShoeing'],
  ['Employee','HealthRecord'],
  ['Horse','Task'],['Horse','HealthRecord'],['Horse','MedicineLog'],
  ['Horse','HorseCareTeam'],['Horse','WorkSheetEntry'],
  ['Horse','InstructorDailyWorkRecord'],['Horse','HorseFeed'],
  ['Horse','Expense'],['Horse','InspectionRound'],
  ['Horse','FarrierShoeing'],['Horse','TackInventory'],['Horse','FarrierInventory'],
  ['Horse','Employee'],
  ['Task','Approval'],['GateEntry','Visitor'],
  ['GroomWorkSheet','WorkSheetEntry'],['WorkRecord','WorkRecordEntry'],
  ['Meeting','MeetingParticipant'],['Meeting','MeetingMOM'],
  ['InstructorDailyWorkRecord','InvoiceGeneration'],
  ['HorseFeed','FeedInventory'],['MedicineLog','MedicineInventory'],
];

// ── Layout positions ─────────────────────────────────────────────
const POSITIONS = (() => {
  const p = {};
  p['Employee'] = [1800, 1000]; p['Horse'] = [1800, 1600];
  p['Task'] = [2500, 800]; p['Approval'] = [2900, 700]; p['Report'] = [2900, 950];
  p['HorseCareTeam'] = [2500, 1400];
  p['HealthRecord'] = [900, 1500]; p['MedicineLog'] = [900, 1800]; p['MedicineInventory'] = [500, 1900];
  p['HorseFeed'] = [2400, 2000]; p['FeedInventory'] = [2400, 2300]; p['FarrierShoeing'] = [1300, 1600];
  p['TackInventory'] = [2800, 2100]; p['FarrierInventory'] = [1300, 1850];
  p['Attendance'] = [2700, 1500]; p['AttendanceLog'] = [2700, 1700]; p['GateAttendanceLog'] = [3000, 1600];
  p['GroomWorkSheet'] = [1200, 750]; p['WorkSheetEntry'] = [1200, 520]; p['WorkRecord'] = [1500, 520];
  p['WorkRecordEntry'] = [1500, 300]; p['InstructorDailyWorkRecord'] = [2400, 1700];
  p['InspectionRound'] = [1050, 2100]; p['JamedarRoundCheck'] = [1350, 2100];
  p['HousekeepingInventory'] = [3100, 2100];
  p['GateEntry'] = [800, 600]; p['Visitor'] = [450, 450]; p['VisitorLog'] = [450, 700];
  p['GroceriesInventory'] = [3100, 1900];
  p['Expense'] = [500, 1100]; p['Fine'] = [500, 1350]; p['InvoiceGeneration'] = [500, 850];
  p['Meeting'] = [700, 2100]; p['MeetingParticipant'] = [400, 2200]; p['MeetingMOM'] = [400, 2400];
  p['Notification'] = [2600, 500]; p['AuditLog'] = [2900, 400]; p['SystemSettings'] = [3200, 500];
  p['EmployeePermission'] = [2900, 600]; p['EmployeeTaskPermission'] = [3200, 750];
  return p;
})();

const displayName = (id) => id.replace(/([A-Z])/g, ' $1').trim();

// ── Animation variants ──────────────────────────────────────────
const nodeVariants = {
  hidden: { opacity: 0, scale: 0.85, y: 12 },
  visible: (i) => ({
    opacity: 1, scale: 1, y: 0,
    transition: { delay: i * 0.012, duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  }),
};

const panelVariants = {
  hidden: { x: 360, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  exit: { x: 360, opacity: 0, transition: { duration: 0.2 } },
};



const fieldRowVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i) => ({ opacity: 1, x: 0, transition: { delay: i * 0.025, duration: 0.2 } }),
};

// ======================================================================
// EntityNode — standalone animated card with expand/collapse
// ======================================================================
const EntityNode = React.memo(({ ent, cat, isActive, isDimmed, t, onMouseDown, onClick, expandedNode, setExpandedNode }) => {
  const isExpanded = expandedNode === ent.id;
  const relCount = EDGES.filter(([a, b]) => a === ent.id || b === ent.id).length;
  const fkCount = ent.fields.filter(f => f.endsWith('Id')).length;

  return (
    <div
      className="entity-node"
      onMouseDown={onMouseDown}
      onClick={onClick}
      style={{
        minWidth: 230, maxWidth: 280,
        background: t.surfaceSolid,
        border: '1.5px solid ' + (isActive ? cat.color : t.borderNode),
        borderLeft: '4px solid ' + cat.color,
        borderRadius: 14, cursor: 'grab', userSelect: 'none',
        opacity: isDimmed ? t.dimOpacity : 1,
        boxShadow: isActive ? t.nodeShadowActive(cat.color) : t.nodeShadow,
        backdropFilter: 'blur(8px)',
        transition: 'opacity .3s, box-shadow .3s, border-color .3s',
        zIndex: isActive ? 10 : 1,
        position: 'relative',
      }}
    >
      {/* Connection handles */}
      <div style={{ position: 'absolute', left: -6, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, borderRadius: '50%', background: cat.color, border: '2.5px solid ' + t.handleBorder, boxShadow: '0 0 6px ' + cat.color + '44' }} />
      <div style={{ position: 'absolute', right: -6, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, borderRadius: '50%', background: cat.color, border: '2.5px solid ' + t.handleBorder, boxShadow: '0 0 6px ' + cat.color + '44' }} />

      {/* Header */}
      <div style={{ padding: '12px 14px 8px', borderRadius: '14px 14px 0 0', background: cat.bg, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: cat.color + '15', border: '1.5px solid ' + cat.color + '35', flexShrink: 0 }}>
          <EntityIcon id={ent.id} size={18} color={cat.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text, lineHeight: 1.25, letterSpacing: '-0.01em' }}>{displayName(ent.id)}</div>
          <div style={{ fontSize: 10, color: t.textDim, marginTop: 2, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>{cat.label}</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: t.textFaint, flexShrink: 0 }} />
            <span>{relCount} rel</span>
          </div>
        </div>
      </div>

      {/* Fields preview */}
      <div style={{ padding: '8px 14px 4px' }}>
        {ent.fields.slice(0, isExpanded ? ent.fields.length : 3).map((f, i) => {
          const ft = inferFieldType(f);
          const FieldIcon = ft.icon;
          return (
            <div key={f} style={{
              fontSize: 11, padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6,
              color: t.textField,
            }}>
              <FieldIcon size={10} color={ft.color} strokeWidth={2.2} />
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f}</span>
              <span style={{ fontSize: 8, color: ft.color, background: ft.color + '15', padding: '1px 5px', borderRadius: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, flexShrink: 0 }}>{ft.type}</span>
            </div>
          );
        })}
        {ent.fields.length > 3 && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpandedNode(isExpanded ? null : ent.id); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: cat.color, padding: '4px 0 2px', fontWeight: 500 }}
          >
            {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {isExpanded ? 'Collapse' : `+${ent.fields.length - 3} more fields`}
          </button>
        )}
      </div>

      {/* Footer badges */}
      <div style={{ padding: '6px 14px 8px', borderTop: '1px solid ' + t.footerBorder, display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 8, padding: '2px 7px', borderRadius: 5, border: '1px solid ' + cat.color + '33', color: cat.color, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{ent.cat}</span>
        <span style={{ fontSize: 8, padding: '2px 7px', borderRadius: 5, border: '1px solid ' + t.badgeBorder, color: t.textDim, fontWeight: 500 }}>
          <Database size={8} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 3 }} />{ent.fields.length} fields
        </span>
        {fkCount > 0 && (
          <span style={{ fontSize: 8, padding: '2px 7px', borderRadius: 5, border: '1px solid #ff922b33', color: '#ff922b', fontWeight: 500 }}>
            <Link2 size={8} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 3 }} />{fkCount} FK
          </span>
        )}
      </div>
    </div>
  );
});

// ======================================================================
// MAIN COMPONENT
// ======================================================================
const EntityMapPage = () => {
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const nodesRef = useRef({});
  const transformLayerRef = useRef(null);
  const rafRef = useRef(null);

  const [theme, setTheme] = useState(() => getStoredTheme());
  useEffect(() => subscribeToThemeChange(setTheme), []);
  const t = THEMES[theme] || THEMES.dark;

  const [scale, setScale] = useState(0.55);
  const [panX, setPanX] = useState(-400);
  const [panY, setPanY] = useState(-100);
  const panRef = useRef({ x: -400, y: -100 });
  const scaleRef = useRef(0.55);

  const [activeNode, setActiveNode] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [panelData, setPanelData] = useState(null);
  const [expandedNode, setExpandedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [positions, setPositions] = useState(() => JSON.parse(JSON.stringify(POSITIONS)));
  const [nodesReady, setNodesReady] = useState(false);

  const dragRef = useRef(null);
  const panDragRef = useRef(null);

  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    getEmployees().then(res => {
      const list = res.data?.data || res.data || [];
      setEmployees(list.filter(e => e.employmentStatus === 'Active'));
    }).catch(() => {});
  }, []);

  useEffect(() => { const id = setTimeout(() => setNodesReady(true), 50); return () => clearTimeout(id); }, []);
  useEffect(() => { panRef.current = { x: panX, y: panY }; }, [panX, panY]);
  useEffect(() => { scaleRef.current = scale; }, [scale]);

  // Fullscreen — strip layout chrome while this page is mounted
  useEffect(() => {
    const main = document.querySelector('.lovable-main-content');
    const inner = document.querySelector('.main-content-inner');
    if (main) main.classList.add('entity-map-fullscreen');
    if (inner) inner.classList.add('entity-map-fullscreen-inner');
    return () => {
      if (main) main.classList.remove('entity-map-fullscreen');
      if (inner) inner.classList.remove('entity-map-fullscreen-inner');
    };
  }, []);

  // ── Draw edges ──────────────────────────────────────────────
  const drawEdges = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // Defs for animated dash
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = '@keyframes edgeDash{to{stroke-dashoffset:-20}}@keyframes edgePulse{0%,100%{opacity:.6}50%{opacity:1}}';
    defs.appendChild(style);
    svg.appendChild(defs);

    EDGES.forEach(([fromId, toId]) => {
      const fromPos = positions[fromId];
      const toPos = positions[toId];
      if (!fromPos || !toPos || fromId === toId) return;

      const fromEl = nodesRef.current[fromId];
      const toEl = nodesRef.current[toId];
      const fw = fromEl?.offsetWidth || 230;
      const fh = fromEl?.offsetHeight || 120;
      const tw = toEl?.offsetWidth || 230;
      const th = toEl?.offsetHeight || 120;

      const fx = fromPos[0] + fw / 2, fy = fromPos[1] + fh / 2;
      const tx = toPos[0] + tw / 2, ty = toPos[1] + th / 2;

      let x1, y1, x2, y2;
      if (fx < tx) {
        x1 = fromPos[0] + fw; y1 = fy; x2 = toPos[0]; y2 = ty;
      } else {
        x1 = fromPos[0]; y1 = fy; x2 = toPos[0] + tw; y2 = ty;
      }

      const dx = Math.abs(x2 - x1) * 0.45;
      const fromEnt = ENTITIES.find(e => e.id === fromId);
      const edgeColor = CAT[fromEnt?.cat]?.color || '#444';

      const isHighlighted = activeNode && (fromId === activeNode || toId === activeNode);
      const isCatHighlighted = activeCategory && (
        ENTITIES.find(e => e.id === fromId)?.cat === activeCategory ||
        ENTITIES.find(e => e.id === toId)?.cat === activeCategory
      );
      const isHoverHighlighted = hoveredNode && (fromId === hoveredNode || toId === hoveredNode);

      // Main path
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', edgeColor);
      path.setAttribute('stroke-linecap', 'round');

      if (isHighlighted) {
        path.setAttribute('stroke-width', '2.5');
        path.style.opacity = '0.8';
        path.setAttribute('stroke-dasharray', '8 5');
        path.style.animation = 'edgeDash 1s linear infinite, edgePulse 2s ease-in-out infinite';
      } else if (isHoverHighlighted) {
        path.setAttribute('stroke-width', '2');
        path.style.opacity = '0.5';
      } else if (isCatHighlighted) {
        path.setAttribute('stroke-width', '1.8');
        path.style.opacity = '0.45';
      } else {
        path.setAttribute('stroke-width', '1.2');
        path.style.opacity = String(t.edgeOpacity);
      }

      path.style.transition = 'opacity .3s, stroke-width .3s';
      svg.appendChild(path);

      // Endpoint dots for highlighted edges
      if (isHighlighted) {
        [{ cx: x1, cy: y1 }, { cx: x2, cy: y2 }].forEach(({ cx, cy }) => {
          const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          dot.setAttribute('cx', cx);
          dot.setAttribute('cy', cy);
          dot.setAttribute('r', '3');
          dot.setAttribute('fill', edgeColor);
          dot.style.opacity = '0.6';
          svg.appendChild(dot);
        });
      }
    });
  }, [positions, activeNode, activeCategory, hoveredNode, t.edgeOpacity]);

  useEffect(() => { drawEdges(); }, [drawEdges]);

  // Helper to apply transform directly to DOM (no React re-render)
  const applyTransform = useCallback(() => {
    if (transformLayerRef.current) {
      transformLayerRef.current.style.transform = `translate(${panRef.current.x}px,${panRef.current.y}px) scale(${scaleRef.current})`;
    }
  }, []);

  // ── Pan / drag / zoom (optimized — direct DOM during drag) ──
  const handleCanvasMouseDown = (e) => {
    if (e.target.closest('.entity-node') || e.target.closest('.entity-panel')) return;
    panDragRef.current = { startX: e.clientX - panRef.current.x, startY: e.clientY - panRef.current.y };
  };

  const handleMouseMove = useCallback((e) => {
    if (panDragRef.current) {
      panRef.current.x = e.clientX - panDragRef.current.startX;
      panRef.current.y = e.clientY - panDragRef.current.startY;
      applyTransform();
    }
    if (dragRef.current) {
      const { id, offX, offY } = dragRef.current;
      const newX = (e.clientX - panRef.current.x) / scaleRef.current - offX;
      const newY = (e.clientY - panRef.current.y) / scaleRef.current - offY;
      // Move node DOM directly
      const nodeEl = nodesRef.current[id];
      if (nodeEl) {
        nodeEl.style.left = newX + 'px';
        nodeEl.style.top = newY + 'px';
      }
      dragRef.current.lastPos = [newX, newY];
    }
  }, [applyTransform]);

  const handleMouseUp = useCallback(() => {
    if (panDragRef.current) {
      // Sync state once on release
      setPanX(panRef.current.x);
      setPanY(panRef.current.y);
      panDragRef.current = null;
    }
    if (dragRef.current) {
      const { id, lastPos } = dragRef.current;
      if (lastPos) {
        setPositions(prev => ({ ...prev, [id]: lastPos }));
      }
      dragRef.current = null;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    const ns = Math.min(2, Math.max(0.15, scaleRef.current + delta));
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    const newPx = cx - (cx - panRef.current.x) * (ns / scaleRef.current);
    const newPy = cy - (cy - panRef.current.y) * (ns / scaleRef.current);
    panRef.current.x = newPx;
    panRef.current.y = newPy;
    scaleRef.current = ns;
    applyTransform();
    // Debounced state sync so React picks up final value
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setPanX(panRef.current.x);
      setPanY(panRef.current.y);
      setScale(scaleRef.current);
    });
  }, [applyTransform]);

  useEffect(() => {
    const el = canvasRef.current;
    if (el) el.addEventListener('wheel', handleWheel, { passive: false });
    return () => { if (el) el.removeEventListener('wheel', handleWheel); };
  }, [handleWheel]);

  const handleNodeClick = (ent) => {
    if (activeNode === ent.id) {
      setActiveNode(null); setActiveCategory(null); setPanelData(null);
    } else {
      setActiveNode(ent.id); setActiveCategory(null);
      const rels = EDGES.filter(([a, b]) => a === ent.id || b === ent.id)
        .map(([a, b]) => {
          const otherId = a === ent.id ? b : a;
          return { id: otherId, dir: a === ent.id ? 'out' : 'in' };
        });
      setPanelData({ ...ent, displayName: displayName(ent.id), rels });
    }
  };

  const handleNodeMouseDown = (e, ent) => {
    e.stopPropagation();
    const pos = positions[ent.id];
    dragRef.current = {
      id: ent.id,
      offX: (e.clientX - panRef.current.x) / scaleRef.current - pos[0],
      offY: (e.clientY - panRef.current.y) / scaleRef.current - pos[1],
    };
  };

  const toggleCategory = (cat) => {
    if (activeCategory === cat) { setActiveCategory(null); setActiveNode(null); }
    else { setActiveCategory(cat); setActiveNode(null); setPanelData(null); }
  };

  const connectedSet = useMemo(() => {
    const s = new Set();
    if (activeNode) {
      s.add(activeNode);
      EDGES.forEach(([a, b]) => { if (a === activeNode) s.add(b); if (b === activeNode) s.add(a); });
    }
    return s;
  }, [activeNode]);

  const fitAll = () => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    Object.values(positions).forEach(([x, y]) => {
      if (x < minX) minX = x; if (y < minY) minY = y;
      if (x + 260 > maxX) maxX = x + 260; if (y + 140 > maxY) maxY = y + 140;
    });
    const w = maxX - minX, h = maxY - minY;
    const el = canvasRef.current;
    const vw = el?.clientWidth || 1200, vh = el?.clientHeight || 800;
    const ns = Math.min(vw / (w + 200), vh / (h + 200), 1);
    setScale(ns);
    setPanX((vw - w * ns) / 2 - minX * ns);
    setPanY((vh - h * ns) / 2 - minY * ns);
  };

  const resetView = () => { setScale(0.55); setPanX(-400); setPanY(-100); };

  const zoomIn = () => {
    const ns = Math.min(2, scaleRef.current + 0.15);
    setScale(ns);
  };
  const zoomOut = () => {
    const ns = Math.max(0.15, scaleRef.current - 0.15);
    setScale(ns);
  };

  const handleCanvasClick = (e) => {
    if (!e.target.closest('.entity-node') && !e.target.closest('.entity-panel') &&
        !e.target.closest('.entity-legend') && !e.target.closest('.entity-toolbar') &&
        !e.target.closest('.entity-zoom')) {
      setActiveNode(null); setActiveCategory(null); setPanelData(null); setExpandedNode(null);
    }
  };

  const catCounts = useMemo(() => {
    const c = {};
    ENTITIES.forEach(e => { c[e.cat] = (c[e.cat] || 0) + 1; });
    return c;
  }, []);

  // ================================================================
  // RENDER
  // ================================================================
  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: t.bg, fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      {/* Gradient overlays */}
      <div style={{ position: 'absolute', inset: 0, background: t.bgGrad1, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', inset: 0, background: t.bgGrad2, pointerEvents: 'none', zIndex: 0 }} />

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <motion.div
        className="entity-toolbar"
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50, background: t.surface, backdropFilter: 'blur(16px)', borderBottom: '1px solid ' + t.border, padding: '8px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,255,208,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Hexagon size={18} color="#00ffd0" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text, letterSpacing: '-0.02em' }}>Entity Relationship Map</div>
            <div style={{ fontSize: 11, color: t.textFaint, marginTop: 1 }}>
              {ENTITIES.length} entities · {EDGES.length} relationships · Drag, zoom, click to explore
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={resetView} style={{ ...btnStyle, background: t.btnBg, border: '1px solid ' + t.border, color: t.textDim }}>
            <RotateCcw size={12} style={{ marginRight: 4 }} />Reset
          </button>
          <button onClick={fitAll} style={{ ...btnStyle, background: t.btnBg, border: '1px solid ' + t.border, color: t.textDim }}>
            <Maximize2 size={12} style={{ marginRight: 4 }} />Fit All
          </button>
          <span style={{ fontSize: 11, color: t.textFaint, background: t.btnBg, padding: '4px 10px', borderRadius: 6, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(scale * 100)}%
          </span>
        </div>
      </motion.div>

      {/* ── Zoom Controls (right side) ───────────────────────── */}
      <motion.div
        className="entity-zoom"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', zIndex: 50, display: 'flex', flexDirection: 'column', gap: 2, background: t.surface, border: '1px solid ' + t.border, borderRadius: 10, padding: 4, backdropFilter: 'blur(12px)' }}
      >
        <button onClick={zoomIn} style={zoomBtnStyle(t)} title="Zoom In"><ZoomIn size={16} /></button>
        <div style={{ height: 1, background: t.sep, margin: '2px 4px' }} />
        <button onClick={zoomOut} style={zoomBtnStyle(t)} title="Zoom Out"><ZoomOut size={16} /></button>
      </motion.div>

      {/* ── Legend ───────────────────────────────────────────── */}
      <motion.div
        className="entity-legend"
        initial={{ x: -200, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.15, ease: 'easeOut' }}
        style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 50, background: t.surface, backdropFilter: 'blur(16px)', border: '1px solid ' + t.border, borderRadius: 14, padding: '14px 16px', minWidth: 200 }}
      >
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.2, color: t.textFaint, marginBottom: 10, fontWeight: 600 }}>Categories</div>
        {Object.entries(CAT).map(([key, val]) => (
          <motion.div
            key={key}
            whileHover={{ x: 2 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 7, cursor: 'pointer', marginBottom: 1, background: activeCategory === key ? t.legendActiveBg : 'transparent', transition: 'background .2s' }}
            onClick={() => toggleCategory(key)}
          >
            <span style={{ width: 10, height: 10, borderRadius: 3, background: val.color, flexShrink: 0, boxShadow: '0 0 6px ' + val.color + '33' }} />
            <span style={{ fontSize: 12, color: activeCategory === key ? t.text : t.textDim, fontWeight: activeCategory === key ? 600 : 400, flex: 1 }}>{val.label}</span>
            <span style={{ fontSize: 9, color: t.textFaint, background: t.countBg, padding: '2px 7px', borderRadius: 8, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{catCounts[key] || 0}</span>
          </motion.div>
        ))}
        <div style={{ borderTop: '1px solid ' + t.sep, marginTop: 8, paddingTop: 8 }}>
          <motion.div
            whileHover={{ x: 2 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 7, cursor: 'pointer' }}
            onClick={() => { setActiveCategory(null); setActiveNode(null); }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 3, background: t.showAllGrad, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: t.textDim }}>Show All</span>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Stats ───────────────────────────────────────────── */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 50, background: t.surface, backdropFilter: 'blur(16px)', border: '1px solid ' + t.border, borderRadius: 14, padding: '12px 20px', display: 'flex', gap: 24 }}
      >
        {[
          { val: ENTITIES.length, label: 'Entities' },
          { val: EDGES.length, label: 'Relations' },
          { val: Object.keys(CAT).length, label: 'Categories' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: t.text, fontVariantNumeric: 'tabular-nums' }}>{s.val}</div>
            <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: 1.2, color: t.textFaint, marginTop: 2, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </motion.div>

      {/* ── Canvas ──────────────────────────────────────────── */}
      <div ref={canvasRef} style={{ width: '100%', height: '100%', position: 'relative', cursor: 'grab', overflow: 'hidden' }}
        onMouseDown={handleCanvasMouseDown} onClick={handleCanvasClick}>
        <div ref={transformLayerRef} style={{ position: 'absolute', top: 0, left: 0, transformOrigin: '0 0', transform: `translate(${panX}px,${panY}px) scale(${scale})` }}>
          {/* Grid — minor + major */}
          <div style={{
            position: 'absolute', top: 0, left: 0, width: 8000, height: 5000, pointerEvents: 'none',
            backgroundImage:
              `linear-gradient(${t.gridLine} 1px, transparent 1px), ` +
              `linear-gradient(90deg, ${t.gridLine} 1px, transparent 1px), ` +
              `linear-gradient(${t.gridAccent} 1px, transparent 1px), ` +
              `linear-gradient(90deg, ${t.gridAccent} 1px, transparent 1px)`,
            backgroundSize: '24px 24px, 24px 24px, 120px 120px, 120px 120px',
          }} />

          {/* Cross-hair at origin */}
          <div style={{ position: 'absolute', left: -1, top: 0, width: 2, height: 5000, background: t.gridAccent, pointerEvents: 'none', opacity: 0.3 }} />
          <div style={{ position: 'absolute', left: 0, top: -1, width: 8000, height: 2, background: t.gridAccent, pointerEvents: 'none', opacity: 0.3 }} />

          {/* SVG edges */}
          <svg ref={svgRef} style={{ position: 'absolute', top: 0, left: 0, width: 8000, height: 5000, pointerEvents: 'none' }} />

          {/* Nodes */}
          {nodesReady && ENTITIES.map((ent, i) => {
            const pos = positions[ent.id];
            if (!pos) return null;
            const cat = CAT[ent.cat];
            const isActive = activeNode === ent.id;
            const isDimmed = (activeNode && !connectedSet.has(ent.id)) ||
              (activeCategory && ent.cat !== activeCategory && !EDGES.some(([a, b]) =>
                (a === ent.id && ENTITIES.find(e => e.id === b)?.cat === activeCategory) ||
                (b === ent.id && ENTITIES.find(e => e.id === a)?.cat === activeCategory)
              ));

            return (
              <motion.div
                key={ent.id}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={nodeVariants}
                whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}
                onHoverStart={() => setHoveredNode(ent.id)}
                onHoverEnd={() => setHoveredNode(null)}
                ref={el => { nodesRef.current[ent.id] = el; }}
                style={{ position: 'absolute', left: pos[0], top: pos[1] }}
              >
                <EntityNode
                  ent={ent}
                  cat={cat}
                  isActive={isActive}
                  isDimmed={isDimmed}
                  t={t}
                  onMouseDown={(e) => handleNodeMouseDown(e, ent)}
                  onClick={(e) => { e.stopPropagation(); handleNodeClick(ent); }}
                  expandedNode={expandedNode}
                  setExpandedNode={setExpandedNode}
                />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Side Panel ──────────────────────────────────────── */}
      <AnimatePresence>
        {panelData && (
          <motion.div
            className="entity-panel"
            key="panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              position: 'absolute', right: 0, top: 0, width: 360, height: '100%',
              background: t.panelBg, backdropFilter: 'blur(24px)',
              borderLeft: '1px solid ' + t.border,
              padding: '56px 20px 20px', overflowY: 'auto', zIndex: 60,
            }}
          >
            <motion.button
              whileHover={{ scale: 1.15, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => { setActiveNode(null); setPanelData(null); }}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: t.textFaint, cursor: 'pointer', padding: 6, borderRadius: 8 }}
            >
              <X size={16} />
            </motion.button>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
                style={{ width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: (CAT[panelData.cat]?.color || '#555') + '15', border: '1.5px solid ' + (CAT[panelData.cat]?.color || '#555') + '35' }}
              >
                <EntityIcon id={panelData.id} size={24} color={CAT[panelData.cat]?.color} />
              </motion.div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: t.text, letterSpacing: '-0.02em' }}>{panelData.displayName}</div>
                <div style={{ fontSize: 12, color: t.textDim, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 3, background: CAT[panelData.cat]?.color }} />
                  {CAT[panelData.cat]?.label}
                </div>
              </div>
            </div>

            {/* Summary chips */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {[
                { label: `${panelData.fields.length} Fields`, icon: Database, color: '#4dabf7' },
                { label: `${panelData.rels.length} Relations`, icon: Link2, color: '#00ffd0' },
                { label: `${panelData.fields.filter(f => f.endsWith('Id')).length} FK`, icon: ArrowRight, color: '#ff922b' },
              ].map((chip, ci) => (
                <motion.span
                  key={chip.label}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + ci * 0.05 }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: chip.color, background: chip.color + '12', border: '1px solid ' + chip.color + '25', padding: '4px 10px', borderRadius: 8, fontWeight: 600 }}
                >
                  <chip.icon size={12} />{chip.label}
                </motion.span>
              ))}
            </div>

            {/* Fields */}
            <div>
              <div style={sectionTitleStyle(t)}>Schema Fields</div>
              {panelData.fields.map((f, i) => {
                const ft = inferFieldType(f);
                const FieldIcon = ft.icon;
                return (
                  <motion.div
                    key={f}
                    custom={i}
                    initial="hidden"
                    animate="visible"
                    variants={fieldRowVariants}
                    whileHover={{ x: 2, background: t.fieldRowHover }}
                    style={{ display: 'flex', alignItems: 'center', padding: '7px 8px', borderRadius: 7, gap: 8, cursor: 'default', transition: 'background .15s' }}
                  >
                    <div style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: ft.color + '12', flexShrink: 0 }}>
                      <FieldIcon size={12} color={ft.color} strokeWidth={2.2} />
                    </div>
                    <span style={{ flex: 1, fontSize: 13, color: t.textSec, fontWeight: 500 }}>{f}</span>
                    <span style={{ fontSize: 9, color: ft.color, background: ft.color + '12', padding: '2px 7px', borderRadius: 5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{ft.type}</span>
                  </motion.div>
                );
              })}
            </div>

            {/* Relationships */}
            <div style={{ marginTop: 20 }}>
              <div style={sectionTitleStyle(t)}>Relationships</div>
              {panelData.rels.map((r, i) => {
                const relEnt = ENTITIES.find(e => e.id === r.id);
                const relCat = CAT[relEnt?.cat];
                return (
                  <motion.div
                    key={r.id}
                    custom={i}
                    initial="hidden"
                    animate="visible"
                    variants={fieldRowVariants}
                    whileHover={{ x: 3, background: t.fieldRowHover }}
                    onClick={() => { if (relEnt) handleNodeClick(relEnt); }}
                    style={{ display: 'flex', alignItems: 'center', padding: '7px 8px', borderRadius: 7, gap: 8, cursor: 'pointer', transition: 'background .15s' }}
                  >
                    <div style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: (relCat?.color || '#666') + '12', flexShrink: 0 }}>
                      <EntityIcon id={r.id} size={13} color={relCat?.color || t.textDim} />
                    </div>
                    <span style={{ flex: 1, fontSize: 13, color: t.textSec, fontWeight: 500 }}>{displayName(r.id)}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: r.dir === 'out' ? '#00ffd0' : '#f783ac' }}>
                      {r.dir === 'out' ? <ArrowRight size={11} /> : <ArrowLeft size={11} />}
                      {r.dir === 'out' ? 'has' : 'belongs'}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Team Members */}
            {panelData.id === 'Employee' && employees.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={sectionTitleStyle(t)}>Team Members ({employees.length})</div>
                {employees.map((emp, i) => (
                  <motion.div
                    key={emp.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.015 }}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 4px', borderBottom: '1px solid ' + t.sep }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: ROLE_COLORS[emp.designation] || '#666', flexShrink: 0, boxShadow: '0 0 4px ' + (ROLE_COLORS[emp.designation] || '#666') + '44' }} />
                      <span style={{ fontSize: 13, color: t.memberText, fontWeight: 500 }}>{emp.fullName}</span>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: ROLE_COLORS[emp.designation] || '#666' }}>{emp.designation}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Shared style helpers ────────────────────────────────────────
const btnStyle = {
  padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
  display: 'inline-flex', alignItems: 'center', fontWeight: 500,
};

const zoomBtnStyle = (t) => ({
  background: 'none', border: 'none', color: t.textDim, cursor: 'pointer',
  padding: 8, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
});

const sectionTitleStyle = (t) => ({
  fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.2, color: t.textFaint, marginBottom: 10,
  paddingBottom: 6, borderBottom: '1px solid ' + t.sep, fontWeight: 700,
});

export default EntityMapPage;
