import React, { useRef, useState, useEffect, useCallback } from 'react';
import { getEmployees } from '../services/employeeService';

/* ================================================================
   EFM — Entity Relationship Map
   n8n-style interactive node graph · dark canvas · drag/zoom/pan
   Matches EFM design-system: --shell, --glass, Helvetica, 8px grid
   ================================================================ */

// ── Category palette ────────────────────────────────────────────
const CAT = {
  core:       { color: '#00ffd0', label: 'Core',                bg: 'rgba(0,255,208,.08)' },
  stable:     { color: '#4dabf7', label: 'Stable Operations',   bg: 'rgba(77,171,247,.08)' },
  ground:     { color: '#69db7c', label: 'Ground Operations',   bg: 'rgba(105,219,124,.08)' },
  finance:    { color: '#ffd43b', label: 'Accounts & Finance',  bg: 'rgba(255,212,59,.08)' },
  system:     { color: '#b197fc', label: 'System',              bg: 'rgba(177,151,252,.08)' },
  restaurant: { color: '#ff922b', label: 'Restaurant Ops',      bg: 'rgba(255,146,43,.08)' },
  meeting:    { color: '#f783ac', label: 'Meetings',            bg: 'rgba(247,131,172,.08)' },
  gate:       { color: '#22b8cf', label: 'Gate & Visitors',     bg: 'rgba(34,184,207,.08)' },
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
  // Core
  { id: 'Employee',        icon: '👤', cat: 'core',   fields: ['fullName','email','designation','department','employmentStatus','supervisorId','shiftTiming','profileImage'] },
  { id: 'Horse',           icon: '🐴', cat: 'core',   fields: ['name','gender','breed','stableNumber','status','discipline','ownerName','supervisorId','passportNumber'] },

  // Tasks & Approvals
  { id: 'Task',            icon: '📋', cat: 'core',   fields: ['name','type','status','horseId','assignedEmployeeId','createdById','priority','description'] },
  { id: 'Approval',        icon: '✅', cat: 'core',   fields: ['taskId','approverId','approverLevel','status','comments'] },
  { id: 'Report',          icon: '📝', cat: 'core',   fields: ['reportedEmployeeId','reporterEmployeeId','reason','category','status'] },
  { id: 'HorseCareTeam',   icon: '🤝', cat: 'stable', fields: ['horseId','staffId','role','isActive','assignedDate'] },

  // Stable Operations
  { id: 'HealthRecord',       icon: '🏥', cat: 'stable', fields: ['horseId','healthAdvisorId','recordType','date','nextDueDate','documents'] },
  { id: 'MedicineLog',        icon: '💊', cat: 'stable', fields: ['jamiedarId','horseId','medicineName','quantity','approvalStatus','approvedById'] },
  { id: 'MedicineInventory',  icon: '🗄️', cat: 'stable', fields: ['medicineType','month','year','openingStock','unitsLeft','threshold'] },
  { id: 'HorseFeed',          icon: '🌾', cat: 'stable', fields: ['recordedById','horseId','date','barley','oats','soya','lucerne'] },
  { id: 'FeedInventory',      icon: '📦', cat: 'stable', fields: ['feedType','month','year','openingStock','totalUsed','unitsLeft'] },
  { id: 'FarrierShoeing',     icon: '🔨', cat: 'stable', fields: ['horseId','farrierId','shoeingDate','nextDueDate','notes'] },
  { id: 'TackInventory',      icon: '🎠', cat: 'stable', fields: ['itemName','category','horseId','riderId','condition','brand'] },
  { id: 'FarrierInventory',   icon: '🔧', cat: 'stable', fields: ['itemName','category','horseId','farrierId','quantity','condition'] },

  // Ground Operations
  { id: 'Attendance',         icon: '📅', cat: 'ground', fields: ['employeeId','date','status','checkInTime','checkOutTime','remarks'] },
  { id: 'AttendanceLog',      icon: '🕐', cat: 'ground', fields: ['employeeId','date','timeIn','timeOut','shift','isApproved'] },
  { id: 'GateAttendanceLog',  icon: '🚪', cat: 'ground', fields: ['guardId','personName','personType','entryTime','exitTime'] },
  { id: 'GroomWorkSheet',     icon: '📑', cat: 'ground', fields: ['groomId','date','totalAM','totalPM','woodchipsUsed','bichaliUsed'] },
  { id: 'WorkSheetEntry',     icon: '📄', cat: 'ground', fields: ['worksheetId','horseId','amHours','pmHours','woodchipsUsed'] },
  { id: 'WorkRecord',         icon: '📝', cat: 'ground', fields: ['staffId','date','category','totalAM','totalPM','remarks'] },
  { id: 'WorkRecordEntry',    icon: '📃', cat: 'ground', fields: ['recordId','taskDescription','amHours','pmHours','remarks'] },
  { id: 'InstructorDailyWorkRecord', icon: '🎓', cat: 'ground', fields: ['instructorId','horseId','riderId','workType','duration','date'] },
  { id: 'InspectionRound',    icon: '🔍', cat: 'ground', fields: ['jamedarId','round','horseId','severityLevel','status','resolvedById'] },
  { id: 'JamedarRoundCheck',  icon: '🔄', cat: 'ground', fields: ['jamedarId','checkDate','morningCompleted','afternoonCompleted','eveningCompleted'] },
  { id: 'HousekeepingInventory', icon: '🧹', cat: 'ground', fields: ['itemName','category','quantity','unitType','assignedStaffId','costPerUnit'] },

  // Gate & Visitors
  { id: 'GateEntry',  icon: '🚧', cat: 'gate', fields: ['guardId','personType','employeeId','visitorId','vehicleNo','entryTime'] },
  { id: 'Visitor',    icon: '👥', cat: 'gate', fields: ['name','purpose','contactNumber'] },
  { id: 'VisitorLog', icon: '📓', cat: 'gate', fields: ['visitorName','purpose','checkInTime','checkOutTime'] },

  // Restaurant
  { id: 'GroceriesInventory', icon: '🛒', cat: 'restaurant', fields: ['name','quantity','price','totalPrice','employeeId','createdById'] },

  // Finance
  { id: 'Expense',           icon: '💰', cat: 'finance', fields: ['type','amount','description','date','horseId','employeeId','createdById'] },
  { id: 'Fine',              icon: '⚖️', cat: 'finance', fields: ['issuedById','issuedToId','reason','amount','evidenceImage','status'] },
  { id: 'InvoiceGeneration', icon: '🧾', cat: 'finance', fields: ['Reads from EIRS','instructorId','dateRange'] },

  // Meetings
  { id: 'Meeting',            icon: '📆', cat: 'meeting', fields: ['title','meetingDate','location','createdById','status'] },
  { id: 'MeetingParticipant', icon: '👤', cat: 'meeting', fields: ['meetingId','employeeId'] },
  { id: 'MeetingMOM',         icon: '📃', cat: 'meeting', fields: ['meetingId','pointsDiscussed','decisions'] },

  // System
  { id: 'Notification',            icon: '🔔', cat: 'system', fields: ['employeeId','type','title','message','isRead'] },
  { id: 'AuditLog',                icon: '📜', cat: 'system', fields: ['userId','action','entityType','entityId','changes'] },
  { id: 'SystemSettings',          icon: '⚙️', cat: 'system', fields: ['key','value','description'] },
  { id: 'EmployeePermission',      icon: '🔐', cat: 'system', fields: ['employeeId','viewDashboard','manageEmployees','issueFines','viewPayroll'] },
  { id: 'EmployeeTaskPermission',  icon: '🔑', cat: 'system', fields: ['employeeId','permission','granted'] },
];

// ── Edges ────────────────────────────────────────────────────────
const EDGES = [
  // Employee hub
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
  // Horse hub
  ['Horse','Task'],['Horse','HealthRecord'],['Horse','MedicineLog'],
  ['Horse','HorseCareTeam'],['Horse','WorkSheetEntry'],
  ['Horse','InstructorDailyWorkRecord'],['Horse','HorseFeed'],
  ['Horse','Expense'],['Horse','InspectionRound'],
  ['Horse','FarrierShoeing'],['Horse','TackInventory'],['Horse','FarrierInventory'],
  ['Horse','Employee'],
  // Other
  ['Task','Approval'],['GateEntry','Visitor'],
  ['GroomWorkSheet','WorkSheetEntry'],['WorkRecord','WorkRecordEntry'],
  ['Meeting','MeetingParticipant'],['Meeting','MeetingMOM'],
  ['InstructorDailyWorkRecord','InvoiceGeneration'],
  ['HorseFeed','FeedInventory'],['MedicineLog','MedicineInventory'],
];

// ── Layout positions (spread across canvas) ─────────────────────
const POSITIONS = (() => {
  const p = {};
  // Hub nodes — center
  p['Employee'] = [1800, 1000];
  p['Horse']    = [1800, 1600];

  // Tasks & Approvals — right of center
  p['Task']          = [2500, 800];
  p['Approval']      = [2900, 700];
  p['Report']        = [2900, 950];
  p['HorseCareTeam'] = [2500, 1400];

  // Stable — left cluster
  p['HealthRecord']      = [900, 1500];
  p['MedicineLog']       = [900, 1800];
  p['MedicineInventory'] = [500, 1900];
  p['HorseFeed']         = [2400, 2000];
  p['FeedInventory']     = [2400, 2300];
  p['FarrierShoeing']    = [1300, 1600];
  p['TackInventory']     = [2800, 2100];
  p['FarrierInventory']  = [1300, 1850];

  // Ground — upper left / lower right
  p['Attendance']        = [2700, 1500];
  p['AttendanceLog']     = [2700, 1700];
  p['GateAttendanceLog'] = [3000, 1600];
  p['GroomWorkSheet']    = [1200, 750];
  p['WorkSheetEntry']    = [1200, 520];
  p['WorkRecord']        = [1500, 520];
  p['WorkRecordEntry']   = [1500, 300];
  p['InstructorDailyWorkRecord'] = [2400, 1700];
  p['InspectionRound']   = [1050, 2100];
  p['JamedarRoundCheck'] = [1350, 2100];
  p['HousekeepingInventory'] = [3100, 2100];

  // Gate
  p['GateEntry']  = [800, 600];
  p['Visitor']    = [450, 450];
  p['VisitorLog'] = [450, 700];

  // Restaurant
  p['GroceriesInventory'] = [3100, 1900];

  // Finance
  p['Expense']           = [500, 1100];
  p['Fine']              = [500, 1350];
  p['InvoiceGeneration'] = [500, 850];

  // Meetings
  p['Meeting']            = [700, 2100];
  p['MeetingParticipant'] = [400, 2200];
  p['MeetingMOM']         = [400, 2400];

  // System
  p['Notification']           = [2600, 500];
  p['AuditLog']               = [2900, 400];
  p['SystemSettings']         = [3200, 500];
  p['EmployeePermission']     = [2900, 600];
  p['EmployeeTaskPermission'] = [3200, 750];

  return p;
})();

// ── Helpers ──────────────────────────────────────────────────────
const displayName = (id) => id.replace(/([A-Z])/g, ' $1').trim();

// ======================================================================
// COMPONENT
// ======================================================================
const EntityMapPage = () => {
  const canvasRef  = useRef(null);
  const svgRef     = useRef(null);
  const nodesRef   = useRef({});

  // Transform state
  const [scale, setScale]   = useState(0.55);
  const [panX, setPanX]     = useState(-400);
  const [panY, setPanY]     = useState(-100);
  const panRef = useRef({ x: -400, y: -100 });
  const scaleRef = useRef(0.55);

  // Interaction state
  const [activeNode, setActiveNode]       = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [panelData, setPanelData]         = useState(null);
  const [positions, setPositions]         = useState(() => JSON.parse(JSON.stringify(POSITIONS)));

  // For drag
  const dragRef = useRef(null);

  // For pan
  const panDragRef = useRef(null);

  // Team members (dynamic)
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    getEmployees().then(res => {
      const list = res.data?.data || res.data || [];
      setEmployees(list.filter(e => e.employmentStatus === 'Active'));
    }).catch(() => {});
  }, []);

  // Keep refs in sync
  useEffect(() => { panRef.current = { x: panX, y: panY }; }, [panX, panY]);
  useEffect(() => { scaleRef.current = scale; }, [scale]);

  // ── Draw edges ──────────────────────────────────────────────
  const drawEdges = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.innerHTML = '';

    EDGES.forEach(([fromId, toId]) => {
      const fromPos = positions[fromId];
      const toPos   = positions[toId];
      if (!fromPos || !toPos) return;
      if (fromId === toId) return;

      const fromEl = nodesRef.current[fromId];
      const toEl   = nodesRef.current[toId];
      const fw = fromEl?.offsetWidth || 190;
      const fh = fromEl?.offsetHeight || 90;
      const tw = toEl?.offsetWidth || 190;
      const th = toEl?.offsetHeight || 90;

      const fx = fromPos[0] + fw / 2;
      const fy = fromPos[1] + fh / 2;
      const tx = toPos[0] + tw / 2;
      const ty = toPos[1] + th / 2;

      let x1, y1, x2, y2;
      if (fx < tx) {
        x1 = fromPos[0] + fw; y1 = fy;
        x2 = toPos[0];        y2 = ty;
      } else {
        x1 = fromPos[0];      y1 = fy;
        x2 = toPos[0] + tw;   y2 = ty;
      }

      const dx = Math.abs(x2 - x1) * 0.5;
      const fromEnt = ENTITIES.find(e => e.id === fromId);

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`);
      path.setAttribute('stroke', CAT[fromEnt?.cat]?.color || '#444');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-width', '1.5');
      path.style.opacity = '0.2';
      path.style.transition = 'opacity .25s, stroke-width .25s';

      // Highlight logic
      if (activeNode) {
        if (fromId === activeNode || toId === activeNode) {
          path.style.opacity = '0.7';
          path.setAttribute('stroke-width', '2.5');
          path.setAttribute('stroke-dasharray', '6 4');
          path.style.animation = 'edgeDash 1.2s linear infinite';
        }
      }
      if (activeCategory) {
        const fCat = ENTITIES.find(e => e.id === fromId)?.cat;
        const tCat = ENTITIES.find(e => e.id === toId)?.cat;
        if (fCat === activeCategory || tCat === activeCategory) {
          path.style.opacity = '0.6';
          path.setAttribute('stroke-width', '2');
        }
      }

      svg.appendChild(path);
    });
  }, [positions, activeNode, activeCategory]);

  useEffect(() => { drawEdges(); }, [drawEdges]);

  // ── Pan handlers ────────────────────────────────────────────
  const handleCanvasMouseDown = (e) => {
    if (e.target.closest('.entity-node') || e.target.closest('.entity-panel')) return;
    panDragRef.current = { startX: e.clientX - panRef.current.x, startY: e.clientY - panRef.current.y };
  };

  const handleMouseMove = useCallback((e) => {
    // Pan
    if (panDragRef.current) {
      const nx = e.clientX - panDragRef.current.startX;
      const ny = e.clientY - panDragRef.current.startY;
      setPanX(nx); setPanY(ny);
    }
    // Drag node
    if (dragRef.current) {
      const { id, offX, offY } = dragRef.current;
      const nx = (e.clientX - panRef.current.x) / scaleRef.current - offX;
      const ny = (e.clientY - panRef.current.y) / scaleRef.current - offY;
      setPositions(prev => ({ ...prev, [id]: [nx, ny] }));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    panDragRef.current = null;
    dragRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // ── Zoom ────────────────────────────────────────────────────
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    const ns = Math.min(2, Math.max(0.2, scaleRef.current + delta));
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    setPanX(prev => cx - (cx - prev) * (ns / scaleRef.current));
    setPanY(prev => cy - (cy - prev) * (ns / scaleRef.current));
    setScale(ns);
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (el) el.addEventListener('wheel', handleWheel, { passive: false });
    return () => { if (el) el.removeEventListener('wheel', handleWheel); };
  }, [handleWheel]);

  // ── Node click ──────────────────────────────────────────────
  const handleNodeClick = (ent) => {
    if (activeNode === ent.id) {
      setActiveNode(null); setActiveCategory(null); setPanelData(null);
    } else {
      setActiveNode(ent.id); setActiveCategory(null);
      const rels = EDGES.filter(([a, b]) => a === ent.id || b === ent.id)
        .map(([a, b]) => {
          const otherId = a === ent.id ? b : a;
          const other = ENTITIES.find(e => e.id === otherId);
          return { id: otherId, icon: other?.icon || '', dir: a === ent.id ? '→' : '←' };
        });
      setPanelData({ ...ent, displayName: displayName(ent.id), rels });
    }
  };

  // ── Node drag ───────────────────────────────────────────────
  const handleNodeMouseDown = (e, ent) => {
    e.stopPropagation();
    const pos = positions[ent.id];
    const offX = (e.clientX - panRef.current.x) / scaleRef.current - pos[0];
    const offY = (e.clientY - panRef.current.y) / scaleRef.current - pos[1];
    dragRef.current = { id: ent.id, offX, offY };
  };

  // ── Category filter ─────────────────────────────────────────
  const toggleCategory = (cat) => {
    if (activeCategory === cat) { setActiveCategory(null); setActiveNode(null); }
    else { setActiveCategory(cat); setActiveNode(null); setPanelData(null); }
  };

  // ── Connected set ───────────────────────────────────────────
  const connectedSet = new Set();
  if (activeNode) {
    connectedSet.add(activeNode);
    EDGES.forEach(([a, b]) => {
      if (a === activeNode) connectedSet.add(b);
      if (b === activeNode) connectedSet.add(a);
    });
  }

  // ── Fit ─────────────────────────────────────────────────────
  const fitAll = () => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    Object.values(positions).forEach(([x, y]) => {
      if (x < minX) minX = x; if (y < minY) minY = y;
      if (x + 200 > maxX) maxX = x + 200; if (y + 100 > maxY) maxY = y + 100;
    });
    const w = maxX - minX, h = maxY - minY;
    const el = canvasRef.current;
    const vw = el?.clientWidth || 1200, vh = el?.clientHeight || 800;
    const ns = Math.min(vw / (w + 200), vh / (h + 200), 1);
    setScale(ns);
    setPanX((vw - w * ns) / 2 - minX * ns);
    setPanY((vh - h * ns) / 2 - minY * ns);
  };

  // ── Reset ───────────────────────────────────────────────────
  const resetView = () => { setScale(0.55); setPanX(-400); setPanY(-100); };

  // ── Clear selection on canvas click ─────────────────────────
  const handleCanvasClick = (e) => {
    if (!e.target.closest('.entity-node') && !e.target.closest('.entity-panel') && !e.target.closest('.entity-legend') && !e.target.closest('.entity-toolbar')) {
      setActiveNode(null); setActiveCategory(null); setPanelData(null);
    }
  };

  // Count by category
  const catCounts = {};
  ENTITIES.forEach(e => { catCounts[e.cat] = (catCounts[e.cat] || 0) + 1; });

  return (
    <div style={styles.wrapper}>
      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div className="entity-toolbar" style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          <span style={styles.toolbarIcon}>⬡</span>
          <div>
            <div style={styles.toolbarTitle}>Entity Relationship Map</div>
            <div style={styles.toolbarSub}>{ENTITIES.length} entities · {EDGES.length} relationships · Drag, zoom, click to explore</div>
          </div>
        </div>
        <div style={styles.toolbarRight}>
          <button style={styles.btn} onClick={resetView}>Reset</button>
          <button style={styles.btn} onClick={fitAll}>Fit All</button>
          <span style={styles.zoomBadge}>{Math.round(scale * 100)}%</span>
        </div>
      </div>

      {/* ── Legend ────────────────────────────────────────────── */}
      <div className="entity-legend" style={styles.legend}>
        <div style={styles.legendTitle}>Categories</div>
        {Object.entries(CAT).map(([key, val]) => (
          <div key={key} style={{ ...styles.legendItem, background: activeCategory === key ? 'rgba(255,255,255,.08)' : 'transparent' }}
            onClick={() => toggleCategory(key)}>
            <span style={{ ...styles.legendDot, background: val.color }} />
            <span style={styles.legendLabel}>{val.label}</span>
            <span style={styles.legendCount}>{catCounts[key] || 0}</span>
          </div>
        ))}
        <div style={{ ...styles.legendItem, marginTop: 8, borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: 8 }}
          onClick={() => { setActiveCategory(null); setActiveNode(null); }}>
          <span style={{ ...styles.legendDot, background: 'linear-gradient(135deg,#00ffd0,#ffd43b)' }} />
          <span style={styles.legendLabel}>Show All</span>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────── */}
      <div style={styles.stats}>
        <div style={styles.statBlock}><div style={styles.statVal}>{ENTITIES.length}</div><div style={styles.statLbl}>Entities</div></div>
        <div style={styles.statBlock}><div style={styles.statVal}>{EDGES.length}</div><div style={styles.statLbl}>Relations</div></div>
        <div style={styles.statBlock}><div style={styles.statVal}>2</div><div style={styles.statLbl}>Hubs</div></div>
      </div>

      {/* ── Canvas ───────────────────────────────────────────── */}
      <div ref={canvasRef} style={styles.canvasOuter}
        onMouseDown={handleCanvasMouseDown} onClick={handleCanvasClick}>
        <div style={{ ...styles.canvasInner, transform: `translate(${panX}px,${panY}px) scale(${scale})` }}>
          {/* Grid */}
          <div style={styles.grid} />

          {/* SVG edges */}
          <svg ref={svgRef} style={styles.svg}>
            <style>{`@keyframes edgeDash { to { stroke-dashoffset: -20; } }`}</style>
          </svg>

          {/* Nodes */}
          {ENTITIES.map(ent => {
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
              <div key={ent.id} className="entity-node"
                ref={el => { nodesRef.current[ent.id] = el; }}
                onMouseDown={(e) => handleNodeMouseDown(e, ent)}
                onClick={(e) => { e.stopPropagation(); handleNodeClick(ent); }}
                style={{
                  ...styles.node,
                  left: pos[0], top: pos[1],
                  borderLeftColor: cat.color,
                  opacity: isDimmed ? 0.12 : 1,
                  borderColor: isActive ? cat.color : 'rgba(255,255,255,.08)',
                  boxShadow: isActive
                    ? `0 0 0 2px ${cat.color}33, 0 8px 32px rgba(0,0,0,.5)`
                    : '0 4px 20px rgba(0,0,0,.4)',
                }}>
                {/* Left handle */}
                <div style={{ ...styles.handle, left: -5, top: '50%', transform: 'translateY(-50%)', background: cat.color + '66' }} />
                {/* Right handle */}
                <div style={{ ...styles.handle, right: -5, top: '50%', transform: 'translateY(-50%)', background: cat.color + '66' }} />

                <div style={{ ...styles.nodeHeader, background: cat.bg }}>
                  <span style={{ ...styles.nodeIcon, background: cat.bg, color: cat.color }}>{ent.icon}</span>
                  <div>
                    <div style={styles.nodeTitle}>{displayName(ent.id)}</div>
                    <div style={styles.nodeSub}>{cat.label}</div>
                  </div>
                </div>
                <div style={styles.nodeBody}>
                  {ent.fields.slice(0, 3).map(f => (
                    <div key={f} style={styles.nodeField}>
                      <span style={{ color: f.endsWith('Id') ? cat.color : '#555', marginRight: 4, fontSize: 10 }}>
                        {f.endsWith('Id') ? '→' : '•'}
                      </span>
                      {f}
                    </div>
                  ))}
                  {ent.fields.length > 3 && <div style={styles.nodeMore}>+{ent.fields.length - 3} more</div>}
                </div>
                <div style={styles.nodeFooter}>
                  <span style={{ ...styles.badge, borderColor: cat.color + '33', color: cat.color }}>{ent.cat}</span>
                  <span style={styles.badge}>{ent.fields.length} fields</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Side Panel ───────────────────────────────────────── */}
      {panelData && (
        <div className="entity-panel" style={styles.panel}>
          <button style={styles.panelClose} onClick={() => { setActiveNode(null); setPanelData(null); }}>✕</button>

          {/* Header */}
          <div style={styles.panelHeader}>
            <span style={{ ...styles.panelIcon, background: CAT[panelData.cat]?.bg, color: CAT[panelData.cat]?.color }}>{panelData.icon}</span>
            <div>
              <div style={styles.panelName}>{panelData.displayName}</div>
              <div style={styles.panelCat}>{CAT[panelData.cat]?.label}</div>
            </div>
          </div>

          {/* Fields */}
          <div style={styles.panelSection}>
            <div style={styles.panelSectionTitle}>Fields ({panelData.fields.length})</div>
            {panelData.fields.map(f => (
              <div key={f} style={styles.panelFieldRow}>
                <span>{f.endsWith('Id') ? '🔗 ' : ''}{f}</span>
                <span style={{ color: '#555', fontSize: 11 }}>{f.endsWith('Id') ? 'FK' : 'field'}</span>
              </div>
            ))}
          </div>

          {/* Relationships */}
          <div style={styles.panelSection}>
            <div style={styles.panelSectionTitle}>Relationships ({panelData.rels.length})</div>
            {panelData.rels.map(r => (
              <div key={r.id} style={styles.panelRelRow}
                onClick={() => { const e = ENTITIES.find(en => en.id === r.id); if (e) handleNodeClick(e); }}>
                <span style={{ color: '#00ffd0', marginRight: 6 }}>{r.dir}</span>
                <span style={{ marginRight: 6 }}>{r.icon}</span>
                <span>{displayName(r.id)}</span>
              </div>
            ))}
          </div>

          {/* Team Members (dynamic from API) */}
          {panelData.id === 'Employee' && (
            <div style={styles.panelSection}>
              <div style={styles.panelSectionTitle}>Team Members ({employees.length})</div>
              {employees.map(emp => (
                <div key={emp.id} style={styles.memberRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ ...styles.memberDot, background: ROLE_COLORS[emp.designation] || '#666' }} />
                    <span style={{ fontSize: 13, color: '#ccc' }}>{emp.fullName}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: ROLE_COLORS[emp.designation] || '#666' }}>{emp.designation}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ======================================================================
// STYLES — matching EFM design system tokens
// ======================================================================
const styles = {
  wrapper: {
    position: 'relative',
    width: '100%',
    height: 'calc(100vh - 56px)', // account for nav-h
    background: '#0f0e0c',
    overflow: 'hidden',
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  },

  // Toolbar
  toolbar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50,
    background: 'rgba(17,17,16,.95)', backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255,255,255,.07)',
    padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  toolbarLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  toolbarIcon: { fontSize: 22, color: '#00ffd0' },
  toolbarTitle: { fontSize: 15, fontWeight: 600, color: '#fff' },
  toolbarSub: { fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 1 },
  toolbarRight: { display: 'flex', alignItems: 'center', gap: 8 },
  btn: {
    background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)',
    color: '#aaa', padding: '5px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
  },
  zoomBadge: {
    fontSize: 11, color: '#666', background: 'rgba(255,255,255,.04)',
    padding: '4px 10px', borderRadius: 6,
  },

  // Legend
  legend: {
    position: 'absolute', bottom: 16, left: 16, zIndex: 50,
    background: 'rgba(17,17,16,.95)', backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,.07)', borderRadius: 12,
    padding: '14px 16px', minWidth: 190,
  },
  legendTitle: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#555', marginBottom: 8 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 6, cursor: 'pointer', marginBottom: 2, transition: 'background .2s' },
  legendDot: { width: 10, height: 10, borderRadius: 3, flexShrink: 0 },
  legendLabel: { fontSize: 12, color: '#999' },
  legendCount: { marginLeft: 'auto', fontSize: 10, color: '#555', background: 'rgba(255,255,255,.04)', padding: '1px 6px', borderRadius: 8 },

  // Stats
  stats: {
    position: 'absolute', bottom: 16, right: 16, zIndex: 50,
    background: 'rgba(17,17,16,.95)', backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,.07)', borderRadius: 12,
    padding: '12px 18px', display: 'flex', gap: 20,
  },
  statBlock: { textAlign: 'center' },
  statVal: { fontSize: 20, fontWeight: 700, color: '#fff' },
  statLbl: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: '#555', marginTop: 2 },

  // Canvas
  canvasOuter: {
    width: '100%', height: '100%', position: 'relative',
    cursor: 'grab', overflow: 'hidden',
  },
  canvasInner: { position: 'absolute', top: 0, left: 0, transformOrigin: '0 0' },
  grid: {
    position: 'absolute', top: 0, left: 0, width: 8000, height: 5000,
    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.025) 1px, transparent 1px)',
    backgroundSize: '30px 30px', pointerEvents: 'none',
  },
  svg: { position: 'absolute', top: 0, left: 0, width: 8000, height: 5000, pointerEvents: 'none' },

  // Node
  node: {
    position: 'absolute', minWidth: 180, maxWidth: 210,
    background: '#181818', border: '1.5px solid rgba(255,255,255,.08)',
    borderLeft: '4px solid',
    borderRadius: 12, cursor: 'grab', userSelect: 'none',
    transition: 'opacity .25s, box-shadow .25s, border-color .25s',
  },
  handle: {
    position: 'absolute', width: 8, height: 8, borderRadius: '50%',
    border: '2px solid #181818',
  },
  nodeHeader: {
    padding: '10px 12px 6px', borderRadius: '12px 12px 0 0',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  nodeIcon: {
    width: 26, height: 26, borderRadius: 7,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0,
  },
  nodeTitle: { fontSize: 12, fontWeight: 600, color: '#fff', lineHeight: 1.2 },
  nodeSub: { fontSize: 9, color: '#666', marginTop: 1 },
  nodeBody: { padding: '4px 12px 6px' },
  nodeField: {
    fontSize: 10, color: '#777', padding: '1.5px 0',
    display: 'flex', alignItems: 'center',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  nodeMore: { fontSize: 9, color: '#444', fontStyle: 'italic', marginTop: 2 },
  nodeFooter: {
    padding: '5px 12px 7px', borderTop: '1px solid rgba(255,255,255,.04)',
    display: 'flex', gap: 5,
  },
  badge: {
    fontSize: 8, padding: '1.5px 6px', borderRadius: 5,
    border: '1px solid rgba(255,255,255,.06)', color: '#666',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  // Panel
  panel: {
    position: 'absolute', right: 0, top: 0, width: 320, height: '100%',
    background: 'rgba(17,17,16,.97)', backdropFilter: 'blur(16px)',
    borderLeft: '1px solid rgba(255,255,255,.07)',
    padding: '56px 18px 18px', overflowY: 'auto', zIndex: 60,
  },
  panelClose: {
    position: 'absolute', top: 14, right: 14, background: 'none', border: 'none',
    color: '#555', fontSize: 16, cursor: 'pointer', padding: '4px 8px', borderRadius: 6,
  },
  panelHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 },
  panelIcon: {
    width: 38, height: 38, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
  },
  panelName: { fontSize: 18, fontWeight: 700, color: '#fff' },
  panelCat: { fontSize: 11, color: '#666' },
  panelSection: { marginTop: 16 },
  panelSectionTitle: {
    fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#555', marginBottom: 8,
    paddingBottom: 4, borderBottom: '1px solid rgba(255,255,255,.05)',
  },
  panelFieldRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '4px 0', fontSize: 12, color: '#bbb',
  },
  panelRelRow: {
    display: 'flex', alignItems: 'center', padding: '5px 6px', fontSize: 12,
    color: '#bbb', cursor: 'pointer', borderRadius: 6, transition: 'background .2s',
  },
  memberRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,.04)',
  },
  memberDot: { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
};

export default EntityMapPage;
