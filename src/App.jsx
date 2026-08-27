import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Home, Calendar, Plus, PieChart, Settings, ChevronLeft, ChevronRight, X,
  Check, SkipForward, Pencil, Trash2, Wallet, TrendingUp, TrendingDown,
  AlertTriangle, Tag, Layers, Undo2, BarChart3, Receipt, ArrowLeft, User,
  Heart, Download, Upload, LogOut, Lock, ShieldCheck, Copy, ExternalLink, HelpCircle,
} from "lucide-react";
import { fetchAboutConfig } from "./aboutConfig.js";
import { pingUsage } from "./usageTracking.js";

/* ============================================================
   บันทึกพารวย — V2 Standard
   Design language: Thai bank passbook (สมุดบัญชีธนาคาร)
   ============================================================ */

const C = {
  cover: "#173F30",
  coverDeep: "#0E2A20",
  gold: "#B8933E",
  goldBright: "#D9B872",
  paper: "#FAF6EC",
  paperLine: "#E3DAC0",
  ink: "#20291F",
  inkSoft: "#66705F",
  income: "#2E6B4F",
  incomeBg: "#E9F2EA",
  expense: "#9C3B2E",
  expenseBg: "#F6E9E5",
  warn: "#B4802B",
  warnBg: "#FBF0DD",
  card: "#FFFFFF",
  sage: "#EEECDD",
};

const DISPLAY_FONT = "'Noto Serif Thai', serif";
const BODY_FONT = "'Noto Sans Thai', sans-serif";
const MONO_FONT = "'IBM Plex Mono', monospace";

const WEEKDAYS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const MONTHS_TH = [
  "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
];

const pad2 = (n) => String(n).padStart(2, "0");
const dstr = (y, m, day) => `${y}-${pad2(m + 1)}-${pad2(day)}`;
const parseYMD = (s) => { const [y, m, d] = s.split("-").map(Number); return { y, m: m - 1, d }; };
const todayObj = new Date();
const todayStr = dstr(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());
const monthKey = (s) => s.slice(0, 7);
const thb = (n) => "฿" + Math.round(n).toLocaleString("th-TH");
const num = (n) => Math.round(n).toLocaleString("th-TH");
const buddhist = (y) => y + 543;
const thaiDateLong = (s) => { const { y, m, d } = parseYMD(s); return `${d} ${MONTHS_TH[m]} ${buddhist(y)}`; };
const uid = (p = "id") => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

/* ---------------- seed data ---------------- */

const SEED_YEAR = todayObj.getFullYear();
const SEED_MONTH = todayObj.getMonth();
const dt = (day) => dstr(SEED_YEAR, SEED_MONTH, Math.min(day, daysInMonth(SEED_YEAR, SEED_MONTH)));

const DEFAULT_EXPENSE_CATEGORIES = [
  "บ้าน","อาหาร","เดินทาง","สาธารณูปโภค","โทรศัพท์","สุขภาพ",
  "ของใช้","ครอบครัว","บันเทิง","หนี้สิน","ธุรกิจ","อื่นๆ",
];
const DEFAULT_INCOME_CATEGORIES = ["เงินเดือน", "รายได้อื่น", "ขายสินค้า", "ธุรกิจ", "อื่นๆ"];
const AVATARS = ["🦉","🐢","🐘","🦁","🐝","🦊","🐧","🐼","🦄","🌱","💰","📘"];

/**
 * ข้อมูลช่องทางรับการสนับสนุน (Donate) — ตั้งเป็นค่าคงที่ในซอร์สโค้ด
 * ไม่ใช่ค่าที่ผู้ใช้แต่ละเครื่องตั้งเอง เพราะแอปนี้เป็น local-only
 * (ข้อมูลแต่ละเครื่องแยกกัน ไม่ sync) การฝังไว้ในโค้ดคือวิธีเดียวที่ทำให้
 * ทุกคนที่ติดตั้งแอปเห็นช่องทางบริจาคเดียวกัน
 *
 * แก้ไขค่าด้านล่างนี้แล้ว build/deploy ใหม่ (git push) — เพราะ PWA มี
 * autoUpdate อยู่แล้ว ผู้ใช้ที่ติดตั้งไปแล้วจะได้ข้อมูลใหม่อัตโนมัติ
 * ในครั้งถัดไปที่เปิดแอปตอนมีเน็ต ไม่ต้องให้เขาลบแล้วลงใหม่
 */
const DONATE_INFO = {
  name: "",       // TODO: ใส่ชื่อผู้รับบริจาค
  promptpay: "",  // TODO: ใส่เบอร์โทร/เลขบัตร ปชช. ที่ผูก PromptPay
  link: "",       // TODO: ลิงก์สนับสนุนอื่น เช่น buymeacoffee (ถ้ามี)
};

/**
 * รหัสเข้าพื้นที่ผู้ดูแลระบบ — ฝังเป็นค่าคงที่เดียวกันทุกเครื่อง (เหตุผลเดียวกับ
 * DONATE_INFO ด้านบน) เพราะแอปเป็น local-only ไม่มีฐานข้อมูลกลางให้เช็ครหัส
 * การให้แต่ละเครื่อง "ตั้งรหัสเอง" จึงไม่มีความหมาย — ใช้รหัสคงที่นี้แทน
 */
const ADMIN_ACCESS_CODE = "546287";

const DEFAULT_ABOUT_TEXT = "แอปนี้พัฒนาขึ้นเพื่อช่วยให้การบันทึกรายรับ-รายจ่ายเป็นเรื่องง่าย เก็บข้อมูลไว้บนเครื่องของคุณเองทั้งหมด ไม่มีการส่งข้อมูลการเงินของคุณไปที่ไหน หากแอปนี้มีประโยชน์กับคุณ สามารถสนับสนุนผู้พัฒนาได้ตามกำลังครับ 🙏";

/**
 * ตัวระบุแอปนี้สำหรับดึงค่า About/Donate จาก Supabase (ตาราง app_config)
 * แต่ละแอปในเครือใช้ app_id ไม่ซ้ำกัน เพื่อให้แอดมินกลางแยกจัดการอิสระต่อกันได้
 * (เช่น แอปอื่นอาจตั้งเป็น "app2", "app3" ใช้ธนาคาร/ช่องทางคนละอย่าง)
 */
const APP_ID = "parauy";

function buildSeed() {
  const todayDay = todayObj.getDate();
  const templates = [
    { id: "t1", name: "ค่าไฟ", category: "สาธารณูปโภค", totalBudget: 1500, plannedCount: 1, type: "once", amountPerOccurrence: 1500 },
    { id: "t2", name: "ค่าอาหาร", category: "อาหาร", totalBudget: 6000, plannedCount: 30, type: "multi", amountPerOccurrence: 200 },
    { id: "t3", name: "ค่าเดินทาง", category: "เดินทาง", totalBudget: 3000, plannedCount: 20, type: "multi", amountPerOccurrence: 150 },
  ];
  const schedules = [];
  const expenseTx = [];
  const addPaid = (templateId, day, amount, category) => {
    const date = dt(day);
    const schedId = `${templateId}-${day}`;
    const txId = uid("tx");
    schedules.push({ id: schedId, templateId, date, amount, status: "paid", txId });
    expenseTx.push({ id: txId, date, category, amount, note: "", templateId, scheduleId: schedId });
  };
  const addPlanned = (templateId, day, amount) => {
    const date = dt(day);
    schedules.push({ id: `${templateId}-${day}`, templateId, date, amount, status: "planned", txId: null });
  };
  [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].forEach((d) => addPaid("t2", d, 200, "อาหาร"));
  addPaid("t2", todayDay, 200, "อาหาร");
  [18,19].forEach((d) => addPaid("t2", d, 200, "อาหาร"));
  [21,22,24,25].forEach((d) => addPlanned("t2", d, 200));
  [2,5,8,11,14].forEach((d) => addPaid("t3", d, 150, "เดินทาง"));
  addPaid("t3", todayDay, 150, "เดินทาง");
  [19,21,23,25].forEach((d) => addPlanned("t3", d, 150));
  addPaid("t1", 5, 1500, "สาธารณูปโภค");

  const manual = [
    { day: todayDay, category: "อาหาร", amount: 80, note: "กาแฟ" },
    { day: 2, category: "บ้าน", amount: 5000, note: "ค่าเช่าบ้าน" },
    { day: 10, category: "โทรศัพท์", amount: 599, note: "ค่ามือถือรายเดือน" },
    { day: 8, category: "ของใช้", amount: 450, note: "ของใช้ในบ้าน" },
    { day: 9, category: "ของใช้", amount: 220, note: "" },
    { day: 12, category: "บันเทิง", amount: 600, note: "ดูหนัง" },
    { day: 14, category: "สุขภาพ", amount: 300, note: "ซื้อยา" },
    { day: 6, category: "อื่นๆ", amount: 350, note: "" },
  ];
  manual.forEach((m) => {
    expenseTx.push({ id: uid("tx"), date: dt(m.day), category: m.category, amount: m.amount, note: m.note, templateId: null, scheduleId: null });
  });

  const incomeTx = [
    { id: uid("inc"), date: dt(1), category: "เงินเดือน", amount: 65000, note: "" },
    { id: uid("inc"), date: todayStr, category: "รายได้อื่น", amount: 500, note: "" },
    { id: uid("inc"), date: todayStr, category: "ขายสินค้า", amount: 2500, note: "ขายของออนไลน์" },
  ];

  const budgets = {
    "อาหาร": 6000, "เดินทาง": 3000, "บ้าน": 5000, "บันเทิง": 1500,
    "ของใช้": 2000, "สาธารณูปโภค": 2500, "โทรศัพท์": 600, "สุขภาพ": 800, "อื่นๆ": 1000,
  };

  return {
    openingBalance: 0,
    expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
    incomeCategories: DEFAULT_INCOME_CATEGORIES,
    inactiveExpenseCategories: [],
    inactiveIncomeCategories: [],
    categoryRecurring: {},
    categoryOnlyMonth: {},
    incomeCategoryRecurring: {},
    incomeCategoryOnlyMonth: {},
    incomeTx, expenseTx, templates, schedules, budgets,
    settings: {},
  };
}

/**
 * ข้อมูลเริ่มต้นจริงสำหรับ user ใหม่ — ว่างเปล่าทั้งหมด ไม่มีรายการตัวอย่างปลอมๆ
 * ใช้เป็นค่า default ตอนเปิดแอปครั้งแรก และตอนกด "ลบข้อมูลทั้งหมด เริ่มต้นใหม่"
 */
function buildEmptyData() {
  return {
    openingBalance: 0,
    expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
    incomeCategories: DEFAULT_INCOME_CATEGORIES,
    inactiveExpenseCategories: [],
    inactiveIncomeCategories: [],
    categoryRecurring: {},
    categoryOnlyMonth: {},
    incomeCategoryRecurring: {},
    incomeCategoryOnlyMonth: {},
    incomeTx: [],
    expenseTx: [],
    templates: [],
    schedules: [],
    budgets: {},
    settings: {},
  };
}

const DATA_KEY = "banthuek-parauy-v1";
const PROFILE_KEY = "banthuek-parauy-profile-v1";

/* ---------------- small UI atoms ---------------- */

function GoldRule() {
  return <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${C.gold}88, transparent)` }} />;
}
function Money({ value, tone = "ink", size = 16, weight = 600 }) {
  const isNeg = value < 0;
  const negTone = tone === "gold" || tone === "ink";
  const color = tone === "income" ? C.income : tone === "expense" ? C.expense : (negTone && isNeg) ? C.expense : tone === "gold" ? C.gold : C.ink;
  const sign = tone === "income" ? "+" : tone === "expense" ? "-" : (negTone && isNeg) ? "-" : "";
  return (
    <span style={{ fontFamily: MONO_FONT, fontVariantNumeric: "tabular-nums", color, fontSize: size, fontWeight: weight }}>
      {sign}{thb(Math.abs(value))}
    </span>
  );
}
function Stamp({ status }) {
  const cfg = {
    planned: { label: "PLANNED", color: C.gold, rot: -4 },
    paid: { label: "PAID", color: C.income, rot: -6 },
    skipped: { label: "SKIPPED", color: C.expense, rot: 3 },
  }[status];
  return (
    <span style={{
      display: "inline-block", border: `2px solid ${cfg.color}`, borderRadius: 6, padding: "2px 8px",
      color: cfg.color, fontFamily: MONO_FONT, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
      transform: `rotate(${cfg.rot}deg)`, background: `${cfg.color}0F`, whiteSpace: "nowrap",
    }}>{cfg.label}</span>
  );
}
function SectionLabel({ children, right }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div style={{ fontFamily: DISPLAY_FONT, color: C.ink, fontSize: 15, fontWeight: 700, letterSpacing: "0.02em" }}>{children}</div>
      {right}
    </div>
  );
}
function Card({ children, style, className = "" }) {
  return (
    <div className={`rounded-2xl ${className}`} style={{ background: C.card, border: `1px solid ${C.paperLine}`, boxShadow: "0 1px 2px rgba(23,63,48,0.06)", ...style }}>
      {children}
    </div>
  );
}
function IconBtn({ icon: Icon, onClick, tone = "ink", size = 16 }) {
  const color = tone === "expense" ? C.expense : tone === "income" ? C.income : C.inkSoft;
  return (
    <button onClick={onClick} className="p-1.5 rounded-lg active:scale-95 transition" style={{ color }}>
      <Icon size={size} />
    </button>
  );
}
function PrimaryBtn({ children, onClick, disabled, style }) {
  return (
    <button onClick={onClick} disabled={disabled} className="w-full py-3 rounded-xl font-medium transition active:scale-[0.98]"
      style={{ background: disabled ? "#C9C4B0" : C.cover, color: C.paper, fontFamily: BODY_FONT, fontWeight: 600, fontSize: 14, ...style }}>
      {children}
    </button>
  );
}
function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <div style={{ fontFamily: BODY_FONT, color: C.inkSoft, fontSize: 12, marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}
const inputStyle = {
  width: "100%", border: `1px solid ${C.paperLine}`, borderRadius: 10, padding: "10px 12px",
  fontFamily: BODY_FONT, fontSize: 14, color: C.ink, background: C.paper, outline: "none",
};
function Sheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0" style={{ background: "rgba(15,30,22,0.45)" }} onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-3xl overflow-hidden" style={{ background: C.paper, maxHeight: "88vh", display: "flex", flexDirection: "column" }}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3" style={{ borderBottom: `1px solid ${C.paperLine}` }}>
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: 17, fontWeight: 700, color: C.ink }}>{title}</div>
          <button onClick={onClose} style={{ color: C.inkSoft }}><X size={20} /></button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
function InstallBanner({ isIOS, onInstallClick, onDismiss }) {
  return (
    <div className="px-4 pt-3">
      <Card style={{ padding: 12, background: C.cover, border: "none" }}>
        <div className="flex items-start gap-2">
          <Download size={16} color={C.goldBright} style={{ marginTop: 2, flexShrink: 0 }} />
          <div className="flex-1">
            <div style={{ fontFamily: BODY_FONT, fontSize: 12, color: C.paper, fontWeight: 600, marginBottom: 2 }}>ติดตั้งแอปลงหน้าจอโฮม</div>
            <div style={{ fontFamily: BODY_FONT, fontSize: 11, color: "#C9D6CC", lineHeight: 1.5 }}>
              {isIOS
                ? 'แตะปุ่มแชร์ (ไอคอนสี่เหลี่ยมมีลูกศรชี้ขึ้น) ด้านล่างจอ Safari แล้วเลือก "เพิ่มไปยังหน้าจอโฮม" — ข้อมูลจะปลอดภัยจากการถูกลบอัตโนมัติด้วย'
                : "ติดตั้งเพื่อเปิดใช้งานเร็วขึ้น ใช้งานได้แม้ไม่มีเน็ต และข้อมูลจะไม่ถูกลบอัตโนมัติ"}
            </div>
            {!isIOS && (
              <button onClick={onInstallClick} className="mt-2 px-3 py-1.5 rounded-lg" style={{ background: C.gold, color: C.coverDeep, fontFamily: BODY_FONT, fontSize: 12, fontWeight: 600 }}>ติดตั้งเลย</button>
            )}
          </div>
          <button onClick={onDismiss} style={{ color: "#C9D6CC", flexShrink: 0 }}><X size={16} /></button>
        </div>
      </Card>
    </div>
  );
}

function ConfirmDialog({ state, onCancel }) {
  if (!state) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div className="absolute inset-0" style={{ background: "rgba(15,30,22,0.5)" }} onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl p-5" style={{ background: C.paper }}>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={18} color={C.expense} />
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: 15, fontWeight: 700, color: C.ink }}>ยืนยันการลบ</div>
        </div>
        <div style={{ fontFamily: BODY_FONT, fontSize: 13, color: C.inkSoft, marginBottom: 16 }}>{state.message}</div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl" style={{ border: `1px solid ${C.paperLine}`, fontFamily: BODY_FONT, fontSize: 13, color: C.inkSoft }}>ยกเลิก</button>
          <button onClick={() => { state.onConfirm(); onCancel(); }} className="flex-1 py-2.5 rounded-xl" style={{ background: C.expense, color: "#fff", fontFamily: BODY_FONT, fontSize: 13, fontWeight: 600 }}>ลบรายการ</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- month grid ---------------- */

function MonthGrid({ year, month, onPrev, onNext, dayMarks, onDayClick, selectedSet }) {
  const total = daysInMonth(year, month);
  const firstDow = new Date(year, month, 1).getDay();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={onPrev} style={{ color: C.gold }}><ChevronLeft size={20} /></button>
        <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, color: C.ink, fontSize: 15 }}>{MONTHS_TH[month]} {buddhist(year)}</div>
        <button onClick={onNext} style={{ color: C.gold }}><ChevronRight size={20} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS_TH.map((w) => <div key={w} className="text-center" style={{ fontFamily: BODY_FONT, fontSize: 11, color: C.inkSoft }}>{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const ds = dstr(year, month, d);
          const marks = dayMarks ? dayMarks[ds] : null;
          const isToday = ds === todayStr;
          const isSelected = selectedSet && selectedSet.has(ds);
          return (
            <button key={i} onClick={() => onDayClick && onDayClick(ds, d)} className="relative aspect-square rounded-lg flex flex-col items-center justify-center"
              style={{ background: isSelected ? `${C.gold}22` : isToday ? C.sage : "transparent", border: isSelected ? `1.5px dashed ${C.gold}` : isToday ? `1px solid ${C.gold}` : "1px solid transparent" }}>
              <span style={{ fontFamily: MONO_FONT, fontSize: 12, color: isToday ? C.gold : C.ink, fontWeight: isToday ? 700 : 500 }}>{d}</span>
              {marks && (
                <div className="flex gap-0.5 mt-0.5">
                  {marks.income && <span style={{ width: 4, height: 4, borderRadius: 4, background: C.income }} />}
                  {marks.paid && <span style={{ width: 4, height: 4, borderRadius: 4, background: C.expense }} />}
                  {marks.planned && <span style={{ width: 4, height: 4, borderRadius: 4, border: `1px solid ${C.gold}` }} />}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthNav({ year, month, onPrev, onNext }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={onPrev} className="p-1.5 rounded-lg" style={{ background: C.card, border: `1px solid ${C.paperLine}` }}><ChevronLeft size={16} color={C.gold} /></button>
      <div style={{ fontFamily: MONO_FONT, fontSize: 13, color: C.ink, minWidth: 96, textAlign: "center" }}>{MONTHS_TH[month]} {buddhist(year)}</div>
      <button onClick={onNext} className="p-1.5 rounded-lg" style={{ background: C.card, border: `1px solid ${C.paperLine}` }}><ChevronRight size={16} color={C.gold} /></button>
    </div>
  );
}

/* ---------------- Auth: Welcome / Login ---------------- */

function WelcomeScreen({ onCreate, isStandalone, isIOS, onInstallClick, canInstall }) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [pin, setPin] = useState("");
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: `linear-gradient(160deg, ${C.cover}, ${C.coverDeep})` }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: 26, fontWeight: 700, color: C.paper }}>บันทึกพารวย</div>
          <div style={{ fontFamily: BODY_FONT, fontSize: 12, color: C.goldBright, marginTop: 4 }}>สมุดบัญชีส่วนตัวของคุณ</div>
        </div>
        {!isStandalone && (
          <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(217,184,114,0.14)", border: `1px solid ${C.goldBright}55` }}>
            <div style={{ fontFamily: BODY_FONT, fontSize: 12, color: C.goldBright, fontWeight: 600, marginBottom: 4 }}>ก่อนเริ่มใช้งาน แนะนำให้ติดตั้งแอปก่อน</div>
            <div style={{ fontFamily: BODY_FONT, fontSize: 11, color: "#DCE8DF", lineHeight: 1.6 }}>
              {isIOS
                ? 'แตะปุ่มแชร์ด้านล่างจอ Safari แล้วเลือก "เพิ่มไปยังหน้าจอโฮม" ก่อน แล้วค่อยเปิดแอปจากหน้าจอโฮมมาสร้างโปรไฟล์ ข้อมูลจะปลอดภัยกว่าและเปิดได้เร็วกว่า'
                : "ติดตั้งแอปลงหน้าจอโฮมก่อนสร้างโปรไฟล์ จะช่วยให้ข้อมูลไม่ถูกลบอัตโนมัติและเปิดใช้งานได้เร็วขึ้น"}
            </div>
            {canInstall && (
              <button onClick={onInstallClick} className="mt-2.5 w-full py-2 rounded-lg" style={{ background: C.gold, color: C.coverDeep, fontFamily: BODY_FONT, fontSize: 12, fontWeight: 600 }}>ติดตั้งแอปตอนนี้</button>
            )}
          </div>
        )}
        <div className="rounded-2xl p-5" style={{ background: C.paper }}>
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 12 }}>สร้างโปรไฟล์ของฉัน</div>
          <Field label="ชื่อที่แสดง">
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="เช่น อาร์ตี้" />
          </Field>
          <Field label="เลือกอวาตาร์">
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map((a) => (
                <button key={a} onClick={() => setAvatar(a)} className="aspect-square rounded-xl text-xl flex items-center justify-center"
                  style={{ background: avatar === a ? C.gold : C.sage, border: avatar === a ? `2px solid ${C.cover}` : "2px solid transparent" }}>
                  {a}
                </button>
              ))}
            </div>
          </Field>
          <Field label="ตั้งรหัส PIN 6 หลัก (ไม่บังคับ)">
            <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} type="password" inputMode="numeric" autoComplete="new-password" style={{ ...inputStyle, letterSpacing: "0.4em" }} placeholder="ว่างไว้หากไม่ต้องการ" />
          </Field>
          <PrimaryBtn disabled={!name.trim()} onClick={() => onCreate({ name: name.trim(), avatar, pin: pin.length === 6 ? pin : "", createdAt: todayStr })}>
            เริ่มใช้งาน
          </PrimaryBtn>
        </div>
        <div style={{ fontFamily: BODY_FONT, fontSize: 11, color: "#B9C7BD", textAlign: "center", marginTop: 12 }}>
          ข้อมูลทั้งหมดเก็บไว้ในอุปกรณ์นี้ของคุณเท่านั้น
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ profile, onLogin }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const tryLogin = () => {
    if (!profile.pin || pin === profile.pin) { onLogin(); return; }
    setError("รหัส PIN ไม่ถูกต้อง");
  };
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: `linear-gradient(160deg, ${C.cover}, ${C.coverDeep})` }}>
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto rounded-full flex items-center justify-center text-3xl mb-4" style={{ width: 72, height: 72, background: C.gold }}>
          {profile.avatar}
        </div>
        <div style={{ fontFamily: DISPLAY_FONT, fontSize: 18, fontWeight: 700, color: C.paper }}>สวัสดี, {profile.name}</div>
        <div style={{ fontFamily: BODY_FONT, fontSize: 12, color: C.goldBright, marginBottom: 20 }}>เข้าสู่บันทึกพารวยของคุณ</div>
        {profile.pin && (
          <input value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }} type="password" inputMode="numeric" autoComplete="current-password" placeholder="กรอกรหัส PIN"
            style={{ ...inputStyle, textAlign: "center", letterSpacing: "0.4em", marginBottom: 8 }} />
        )}
        {error && <div style={{ fontFamily: BODY_FONT, fontSize: 12, color: "#E8A99B", marginBottom: 8 }}>{error}</div>}
        <PrimaryBtn onClick={tryLogin} style={{ background: C.gold, color: C.coverDeep }}>
          <span className="flex items-center justify-center gap-2"><Lock size={14} /> เข้าสู่ระบบ</span>
        </PrimaryBtn>
      </div>
    </div>
  );
}

/* ---------------- Donate sheet ---------------- */

function DonateSheet({ open, onClose, donate, isOwnerView, go, aboutText }) {
  const hasChannel = donate && (donate.promptpay || donate.link || donate.bankAccountNo);
  const [copied, setCopied] = useState("");
  const copy = async (text, key) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 1500); } catch (e) {}
  };
  return (
    <Sheet open={open} onClose={onClose} title="สนับสนุนผู้พัฒนา">
      <div className="text-center mb-4">
        <Heart size={32} color={C.expense} fill={C.expense} className="mx-auto mb-2" />
        <div style={{ fontFamily: BODY_FONT, fontSize: 13, color: C.inkSoft, whiteSpace: "pre-wrap" }}>
          {aboutText || "ถ้าแอปนี้ช่วยให้คุณจัดการเงินได้ง่ายขึ้น สามารถสนับสนุนผู้พัฒนาได้ตามกำลังนะครับ 🙏"}
        </div>
      </div>
      {hasChannel ? (
        <div className="space-y-3">
          {donate.promptpay && (
            <Card style={{ padding: 16, textAlign: "center" }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(donate.promptpay)}`}
                alt="QR สนับสนุน" className="mx-auto mb-2 rounded-lg" width={160} height={160}
              />
              <div style={{ fontFamily: MONO_FONT, fontSize: 13, color: C.ink, marginBottom: 8 }}>{donate.promptpay}</div>
              <button onClick={() => copy(donate.promptpay, "pp")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: C.sage, fontFamily: BODY_FONT, fontSize: 12, color: C.ink }}>
                <Copy size={13} /> {copied === "pp" ? "คัดลอกแล้ว" : "คัดลอกเลข PromptPay"}
              </button>
            </Card>
          )}
          {donate.bankAccountNo && (
            <Card style={{ padding: 16 }}>
              <div style={{ fontFamily: BODY_FONT, fontSize: 11, color: C.inkSoft, marginBottom: 6 }}>โอนผ่านบัญชีธนาคาร</div>
              {donate.bankName && <div style={{ fontFamily: BODY_FONT, fontSize: 13, color: C.ink }}>ธนาคาร{donate.bankName}</div>}
              <div className="flex items-center justify-between mt-1">
                <div style={{ fontFamily: MONO_FONT, fontSize: 14, color: C.ink, fontWeight: 700 }}>{donate.bankAccountNo}</div>
                <button onClick={() => copy(donate.bankAccountNo, "bank")} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: C.sage, fontFamily: BODY_FONT, fontSize: 11, color: C.ink }}>
                  <Copy size={12} /> {copied === "bank" ? "คัดลอกแล้ว" : "คัดลอก"}
                </button>
              </div>
              {donate.bankAccountName && <div style={{ fontFamily: BODY_FONT, fontSize: 12, color: C.inkSoft, marginTop: 2 }}>ชื่อบัญชี: {donate.bankAccountName}</div>}
            </Card>
          )}
          {donate.link && (
            <button onClick={() => window.open(donate.link, "_blank")} className="w-full py-3 rounded-xl flex items-center justify-center gap-2" style={{ background: C.cover, color: C.paper, fontFamily: BODY_FONT, fontSize: 13, fontWeight: 600 }}>
              <ExternalLink size={15} /> เปิดลิงก์สนับสนุน
            </button>
          )}
        </div>
      ) : (
        <Card style={{ padding: 18, textAlign: "center" }}>
          <div style={{ fontFamily: BODY_FONT, fontSize: 13, color: C.inkSoft, marginBottom: isOwnerView ? 10 : 0 }}>
            ยังไม่ได้ตั้งค่าช่องทางสนับสนุน
          </div>
          {isOwnerView && (
            <button onClick={() => { onClose(); go("admin"); }} className="text-sm underline" style={{ color: C.gold, fontFamily: BODY_FONT }}>
              ไปตั้งค่าช่องทางบริจาค
            </button>
          )}
        </Card>
      )}
    </Sheet>
  );
}

/* ---------------- Hidden admin (owner-only) ---------------- */

function AdminGateScreen({ onUnlock, go }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const submitUnlock = () => {
    if (!onUnlock(pin)) setError("รหัสไม่ถูกต้อง");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: `linear-gradient(160deg, ${C.coverDeep}, #081810)` }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-5">
          <ShieldCheck size={30} color={C.goldBright} className="mx-auto mb-2" />
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: 17, fontWeight: 700, color: C.paper }}>พื้นที่ผู้ดูแลระบบ</div>
          <div style={{ fontFamily: BODY_FONT, fontSize: 11, color: C.goldBright }}>สำหรับผู้พัฒนาแอปเท่านั้น</div>
        </div>
        <div className="rounded-2xl p-5" style={{ background: C.paper }}>
          <Field label="รหัสผ่านผู้ดูแล 6 หลัก">
            <input value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }} type="password" inputMode="numeric" autoComplete="off" style={{ ...inputStyle, textAlign: "center", letterSpacing: "0.4em" }} placeholder="••••••" />
          </Field>
          {error && <div style={{ fontFamily: BODY_FONT, fontSize: 12, color: C.expense, marginBottom: 8 }}>{error}</div>}
          <PrimaryBtn onClick={submitUnlock} disabled={pin.length !== 6}>เข้าสู่ระบบผู้ดูแล</PrimaryBtn>
          <button onClick={() => go("dashboard")} className="w-full mt-3 py-2 text-center" style={{ fontFamily: BODY_FONT, fontSize: 12, color: C.inkSoft }}>ยกเลิก กลับหน้าหลัก</button>
        </div>
      </div>
    </div>
  );
}

function AdminScreen({ go, donate, isLive, onOpenPreview, onLockAdmin, onLoadDemo }) {
  const hasChannel = donate.promptpay || donate.link || donate.bankAccountNo;
  return (
    <div className="px-4 pt-5 pb-4 space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => { onLockAdmin(); go("dashboard"); }} style={{ color: C.inkSoft }}><ArrowLeft size={18} /></button>
        <div style={{ fontFamily: DISPLAY_FONT, fontSize: 20, fontWeight: 700, color: C.ink, flex: 1 }}>พื้นที่ผู้ดูแลระบบ</div>
        <ShieldCheck size={18} color={C.gold} />
      </div>
      <Card style={{ padding: 12, background: C.warnBg, border: "none" }}>
        <div style={{ fontFamily: BODY_FONT, fontSize: 11, color: C.warn }}>หน้านี้ผู้ใช้ทั่วไปมองไม่เห็นและเข้าไม่ถึง</div>
      </Card>
      <Card style={{ padding: 16 }}>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel>ช่องทางรับการสนับสนุน (Donate)</SectionLabel>
          <span style={{ fontFamily: BODY_FONT, fontSize: 10, color: isLive ? C.income : C.inkSoft }}>
            {isLive ? "● ข้อมูลสด (Supabase)" : "○ ใช้ค่าสำรอง/แคช"}
          </span>
        </div>
        <div style={{ fontFamily: BODY_FONT, fontSize: 12, color: C.inkSoft, lineHeight: 1.7, marginBottom: 10 }}>
          แก้ไขข้อมูลนี้ผ่าน<b>แอปแยกต่างหาก "central-admin"</b> เท่านั้น (App ID ของแอปนี้คือ <code>{APP_ID}</code>, ใส่รหัส {ADMIN_ACCESS_CODE} ตอนบันทึก)
          ข้อมูลเก็บอยู่บน Supabase กลาง ทุกเครื่องที่เปิดแอปจะดึงค่าล่าสุดไปแสดงอัตโนมัติ ไม่ต้อง build/deploy ใหม่
        </div>
        {hasChannel ? (
          <div className="space-y-1.5" style={{ fontFamily: MONO_FONT, fontSize: 12, color: C.ink }}>
            {donate.name && <div>ชื่อผู้รับ: {donate.name}</div>}
            {donate.promptpay && <div>PromptPay: {donate.promptpay}</div>}
            {donate.bankAccountNo && <div>ธนาคาร{donate.bankName}: {donate.bankAccountNo} ({donate.bankAccountName})</div>}
            {donate.link && <div>ลิงก์: {donate.link}</div>}
          </div>
        ) : (
          <div style={{ fontFamily: BODY_FONT, fontSize: 12, color: C.expense }}>
            ยังไม่ได้ใส่ข้อมูล — เปิดแอป "central-admin" เพื่อกรอกข้อมูลของแอป <code>{APP_ID}</code>
          </div>
        )}
      </Card>
      <button onClick={onOpenPreview} className="w-full py-3 rounded-xl flex items-center justify-center gap-2" style={{ border: `1px solid ${C.paperLine}`, color: C.ink, fontFamily: BODY_FONT, fontSize: 13 }}>
        <Heart size={15} color={C.expense} /> ดูตัวอย่างหน้า Donate ที่ user เห็น
      </button>
      <Card style={{ padding: 16 }}>
        <SectionLabel>เครื่องมือทดสอบ</SectionLabel>
        <div style={{ fontFamily: BODY_FONT, fontSize: 11, color: C.inkSoft, marginBottom: 8 }}>โหลดข้อมูลตัวอย่างทับข้อมูลปัจจุบันบนเครื่องนี้ ใช้สำหรับสาธิต/ทดสอบเท่านั้น ไม่กระทบ user จริง</div>
        <button onClick={onLoadDemo} className="w-full py-2.5 rounded-xl" style={{ border: `1px solid ${C.paperLine}`, color: C.ink, fontFamily: BODY_FONT, fontSize: 13 }}>โหลดข้อมูลตัวอย่าง</button>
      </Card>
      <div style={{ fontFamily: BODY_FONT, fontSize: 10, color: C.inkSoft, textAlign: "center" }}>เข้าถึงหน้านี้โดยแตะชื่อแอป "บันทึกพารวย" บนหน้าหลัก 5 ครั้งติดกัน</div>
    </div>
  );
}

/* ---------------- "การใช้งาน" (How-to guide) ---------------- */

function GuideSection({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: 34, height: 34, background: C.cover }}>
          <Icon size={16} color={C.goldBright} />
        </div>
        <div>
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: 14, fontWeight: 700, color: C.ink }}>{title}</div>
          {subtitle && <div style={{ fontFamily: BODY_FONT, fontSize: 10, color: C.inkSoft }}>{subtitle}</div>}
        </div>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function GuideStep({ icon: Icon, title, desc, action, go }) {
  return (
    <Card style={{ padding: 14 }}>
      <div className="flex gap-3">
        <div className="flex-shrink-0 rounded-full flex items-center justify-center" style={{ width: 32, height: 32, background: C.sage }}>
          <Icon size={15} color={C.cover} />
        </div>
        <div className="flex-1 min-w-0">
          <div style={{ fontFamily: BODY_FONT, fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 2 }}>{title}</div>
          <div style={{ fontFamily: BODY_FONT, fontSize: 12, color: C.inkSoft, lineHeight: 1.6 }}>{desc}</div>
          {action && (
            <button onClick={() => go(action.go)} className="mt-2 inline-flex items-center gap-1 text-xs font-medium" style={{ color: C.gold, fontFamily: BODY_FONT }}>
              {action.label} <ChevronRight size={12} />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

function GuideScreen({ go }) {
  return (
    <div className="px-4 pt-5 pb-4">
      <div className="flex items-center gap-2 mb-1">
        <button onClick={() => go("dashboard")} style={{ color: C.inkSoft }}><ArrowLeft size={18} /></button>
        <div style={{ fontFamily: DISPLAY_FONT, fontSize: 20, fontWeight: 700, color: C.ink }}>วิธีการใช้งาน</div>
      </div>
      <div style={{ fontFamily: BODY_FONT, fontSize: 12, color: C.inkSoft, marginBottom: 20, paddingLeft: 26 }}>ไล่ตามหมวดด้านล่างเพื่อใช้งานแอปได้เต็มรูปแบบ</div>

      <GuideSection icon={Wallet} title="1. เริ่มต้นใช้งาน" subtitle="ตั้งค่าพื้นฐานก่อนเริ่มบันทึก">
        <GuideStep icon={Settings} title="ตั้งเงินตั้งต้น" desc="ไปที่ตั้งค่า → กรอกเงินคงเหลือปัจจุบันของคุณ ใช้เป็นฐานคำนวณยอดเงินทั้งหมดในแอป" action={{ label: "ไปตั้งค่า", go: "settings" }} go={go} />
        <GuideStep icon={Tag} title="ตรวจสอบ/เพิ่มหมวดหมู่" desc="มีหมวดพื้นฐานให้แล้ว เพิ่มหมวดของตัวเองได้ทั้งรายรับ-รายจ่าย และเลือกได้ว่าหมวดไหนใช้ต่อเนื่องทุกเดือน หรือใช้แค่เดือนนี้เดือนเดียว" action={{ label: "ไปหมวดหมู่", go: "categories" }} go={go} />
        <GuideStep icon={PieChart} title="ตั้งงบประมาณ (ถ้าต้องการ)" desc="กำหนดวงเงินต่อหมวดต่อเดือน แอปจะแจ้งสถานะ 4 ระดับให้อัตโนมัติ: ปกติ · ใกล้เต็มงบ · เต็มงบ · เกินงบ ข้ามได้ถ้ายังไม่พร้อม" action={{ label: "ไปงบประมาณ", go: "budget" }} go={go} />
      </GuideSection>

      <GuideSection icon={TrendingUp} title="2. บันทึกประจำวัน" subtitle="วิธีเพิ่มรายการเงินเข้า-ออก">
        <GuideStep icon={Plus} title="บันทึกรายรับ / รายจ่าย" desc={'กดปุ่ม + ตรงกลางแถบล่างสุดได้จากทุกหน้า เลือกประเภท กรอกวันที่ หมวดหมู่ จำนวนเงิน แล้วบันทึก — รายจ่ายจะถือว่าจ่ายจริงทันที'} go={go} />
        <GuideStep icon={Calendar} title="ใช้ปฏิทินแก้ไขย้อนหลัง" desc="เลือกวันที่ในปฏิทิน เพิ่ม แก้ไข หรือลบรายการของวันนั้นได้ตรงๆ เหมาะกับตอนนึกรายการที่ลืมบันทึกได้" action={{ label: "ไปปฏิทิน", go: "calendar" }} go={go} />
      </GuideSection>

      <GuideSection icon={Layers} title="3. วางแผนล่วงหน้า" subtitle="สำหรับรายจ่ายที่เกิดซ้ำเป็นประจำ">
        <GuideStep icon={Layers} title="สร้างแผนค่าใช้จ่าย" desc="สำหรับรายจ่ายที่เกิดซ้ำ เช่น ค่าอาหารรายวัน ค่าเดินทาง — ตั้งงบรวมและจำนวนครั้ง ระบบคำนวณเงินต่อครั้งให้อัตโนมัติ" action={{ label: "ไปแผนค่าใช้จ่าย", go: "templates" }} go={go} />
        <GuideStep icon={Check} title="เชื่อมรายจ่ายกับแผนตอนบันทึก" desc={'ตอนบันทึกรายจ่าย ถ้าหมวดนั้นมีแผนอยู่ จะมีตัวเลือก "เชื่อมกับแผนค่าใช้จ่าย" ขึ้นมาให้ ทั้งรายการที่กำหนดวันไว้แล้วและที่ยังไม่กำหนดวันก็เลือกได้ ไม่เลือกก็ได้เช่นกัน แล้วจะเข้างบประมาณตรงๆ'} go={go} />
      </GuideSection>

      <GuideSection icon={BarChart3} title="4. ภาพรวมและรายงาน" subtitle="ดูสรุปการเงินของคุณ">
        <GuideStep icon={Home} title="หน้าหลัก" desc="สรุปเงินคงเหลือ รายรับ-รายจ่ายเดือนนี้ รายการที่ยังต้องจ่าย และแจ้งเตือนงบประมาณ ให้อัตโนมัติทุกครั้งที่เปิดแอป" action={{ label: "ไปหน้าหลัก", go: "dashboard" }} go={go} />
        <GuideStep icon={BarChart3} title="รายงานรายเดือน" desc="เทียบยอดใช้จริงกับงบที่ตั้งไว้ต่อหมวด ย้อนดูเดือนก่อนๆ ได้ด้วยลูกศรเลื่อนเดือน" action={{ label: "ไปรายงาน", go: "report" }} go={go} />
      </GuideSection>

      <GuideSection icon={Settings} title="5. อื่นๆ ที่ควรรู้" subtitle="ความปลอดภัยและการสำรองข้อมูล">
        <GuideStep icon={User} title="โปรไฟล์ของฉัน" desc="แก้ชื่อ อวาตาร์ ตั้ง/เปลี่ยนรหัส PIN ป้องกันการเข้าแอป และดูสถิติการใช้งานของตัวเอง" action={{ label: "ไปโปรไฟล์", go: "profile" }} go={go} />
        <GuideStep icon={Download} title="สำรอง / กู้คืนข้อมูล" desc="ข้อมูลอยู่ในเครื่องนี้เท่านั้น แนะนำส่งออกเป็นไฟล์สำรองเก็บไว้เป็นระยะ โดยเฉพาะก่อนเปลี่ยนเครื่อง" action={{ label: "ไปตั้งค่า", go: "settings" }} go={go} />
        <GuideStep icon={Heart} title="สนับสนุนผู้พัฒนา" desc="กดไอคอนรูปหัวใจที่หน้าหลัก หรือดูรายละเอียดเพิ่มเติมที่หน้าเกี่ยวกับแอปนี้" action={{ label: "ไปหน้าเกี่ยวกับแอปนี้", go: "about" }} go={go} />
      </GuideSection>
    </div>
  );
}

/* ---------------- About / เกี่ยวกับผู้พัฒนา ---------------- */

function AboutScreen({ go, onOpenDonate, aboutText }) {
  return (
    <div className="px-4 pt-5 pb-4 space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => go("settings")} style={{ color: C.inkSoft }}><ArrowLeft size={18} /></button>
        <div style={{ fontFamily: DISPLAY_FONT, fontSize: 20, fontWeight: 700, color: C.ink }}>เกี่ยวกับแอปนี้</div>
      </div>

      <Card style={{ padding: 20, background: `linear-gradient(135deg, ${C.cover}, ${C.coverDeep})`, border: "none", textAlign: "center" }}>
        <div style={{ fontFamily: DISPLAY_FONT, fontSize: 20, fontWeight: 700, color: C.paper }}>บันทึกพารวย</div>
        <div style={{ fontFamily: BODY_FONT, fontSize: 12, color: C.goldBright, marginTop: 4 }}>สมุดบัญชีรายรับ-รายจ่ายส่วนตัว</div>
      </Card>

      <Card style={{ padding: 16 }}>
        <div style={{ fontFamily: BODY_FONT, fontSize: 13, color: C.ink, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
          {aboutText}
        </div>
      </Card>

      <button onClick={onOpenDonate} className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2" style={{ background: C.expenseBg, color: C.expense, fontFamily: BODY_FONT, fontSize: 14, fontWeight: 600 }}>
        <Heart size={16} fill={C.expense} /> สนับสนุนผู้พัฒนา
      </button>

      <div style={{ fontFamily: BODY_FONT, fontSize: 11, color: C.inkSoft, textAlign: "center" }}>บันทึกพารวย v2.5 · Local-only PWA</div>
    </div>
  );
}

function ProfileScreen({ go, profile, onSaveProfile, onLogout, stats }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [avatar, setAvatar] = useState(profile.avatar);

  return (
    <div className="px-4 pt-5 pb-4 space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => go("dashboard")} style={{ color: C.inkSoft }}><ArrowLeft size={18} /></button>
        <div style={{ fontFamily: DISPLAY_FONT, fontSize: 20, fontWeight: 700, color: C.ink }}>โปรไฟล์ของฉัน</div>
      </div>

      <Card style={{ padding: 20, background: `linear-gradient(135deg, ${C.cover}, ${C.coverDeep})`, border: "none" }}>
        {!editing ? (
          <div className="flex items-center gap-4">
            <div className="rounded-full flex items-center justify-center text-3xl" style={{ width: 64, height: 64, background: C.gold }}>{profile.avatar}</div>
            <div className="flex-1">
              <div style={{ fontFamily: DISPLAY_FONT, fontSize: 17, fontWeight: 700, color: C.paper }}>{profile.name}</div>
              <div style={{ fontFamily: BODY_FONT, fontSize: 11, color: C.goldBright }}>สมาชิกตั้งแต่ {thaiDateLong(profile.createdAt)}</div>
            </div>
            <button onClick={() => setEditing(true)} style={{ color: C.goldBright }}><Pencil size={16} /></button>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-6 gap-2 mb-3">
              {AVATARS.map((a) => (
                <button key={a} onClick={() => setAvatar(a)} className="aspect-square rounded-xl text-lg flex items-center justify-center"
                  style={{ background: avatar === a ? C.gold : "rgba(255,255,255,0.12)", border: avatar === a ? `2px solid ${C.paper}` : "2px solid transparent" }}>
                  {a}
                </button>
              ))}
            </div>
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="flex-1 py-2.5 rounded-xl" style={{ border: `1px solid ${C.goldBright}`, color: C.goldBright, fontFamily: BODY_FONT, fontSize: 13 }}>ยกเลิก</button>
              <button onClick={() => { onSaveProfile({ ...profile, name: name.trim() || profile.name, avatar }); setEditing(false); }} className="flex-1 py-2.5 rounded-xl" style={{ background: C.gold, color: C.coverDeep, fontFamily: BODY_FONT, fontSize: 13, fontWeight: 600 }}>บันทึก</button>
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <Card style={{ padding: 12, textAlign: "center" }}>
          <div style={{ fontFamily: MONO_FONT, fontSize: 16, fontWeight: 700, color: C.ink }}>{stats.totalTx}</div>
          <div style={{ fontFamily: BODY_FONT, fontSize: 10, color: C.inkSoft }}>รายการทั้งหมด</div>
        </Card>
        <Card style={{ padding: 12, textAlign: "center" }}>
          <div style={{ fontFamily: MONO_FONT, fontSize: 16, fontWeight: 700, color: C.ink }}>{stats.activeDays}</div>
          <div style={{ fontFamily: BODY_FONT, fontSize: 10, color: C.inkSoft }}>วันที่บันทึก</div>
        </Card>
        <Card style={{ padding: 12, textAlign: "center" }}>
          <div style={{ fontFamily: MONO_FONT, fontSize: 16, fontWeight: 700, color: C.ink }}>{stats.templates}</div>
          <div style={{ fontFamily: BODY_FONT, fontSize: 10, color: C.inkSoft }}>แผนค่าใช้จ่าย</div>
        </Card>
      </div>

      <button onClick={() => go("settings")} className="w-full py-3 rounded-xl flex items-center justify-center gap-2" style={{ border: `1px solid ${C.paperLine}`, color: C.ink, fontFamily: BODY_FONT, fontSize: 13 }}>
        <Settings size={15} /> ตั้งค่าบัญชีและข้อมูล
      </button>

      <button onClick={onLogout} className="w-full py-3 rounded-xl flex items-center justify-center gap-2" style={{ border: `1px solid ${C.expense}`, color: C.expense, fontFamily: BODY_FONT, fontSize: 13, fontWeight: 600 }}>
        <LogOut size={15} /> ออกจากระบบ
      </button>
    </div>
  );
}

/* ---------------- Dashboard ---------------- */

function Dashboard({ data, derived, go, profile, onSecretTap, onOpenDonate }) {
  const tapRef = useRef({ count: 0, timer: null });
  const handleTitleTap = () => {
    const r = tapRef.current;
    r.count += 1;
    if (r.timer) clearTimeout(r.timer);
    r.timer = setTimeout(() => { r.count = 0; }, 2500);
    if (r.count >= 5) { r.count = 0; onSecretTap(); }
  };
  const todayIncomeTx = data.incomeTx.filter((t) => t.date === todayStr);
  const todayExpenseTx = data.expenseTx.filter((t) => t.date === todayStr);
  const alerts = derived.budgetRows.filter((r) => r.tone !== "normal").slice(0, 2);

  const tiles = [
    { key: "income", label: "รายรับ", icon: TrendingUp },
    { key: "expense", label: "รายจ่าย", icon: TrendingDown },
    { key: "templates", label: "แผนค่าใช้จ่าย", icon: Layers },
    { key: "budget", label: "งบประมาณ", icon: PieChart },
    { key: "categories", label: "หมวดหมู่", icon: Tag },
    { key: "guide", label: "การใช้งาน", icon: HelpCircle },
  ];

  return (
    <div className="px-4 pt-5 pb-4 space-y-4">
      <div className="flex items-start justify-between">
        <div onClick={handleTitleTap} className="select-none">
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: 22, fontWeight: 700, color: C.ink }}>บันทึกพารวย</div>
          <div style={{ fontFamily: BODY_FONT, fontSize: 12, color: C.inkSoft }}>{thaiDateLong(todayStr)}</div>
        </div>
        <div className="flex items-start gap-3">
          <button onClick={onOpenDonate} className="flex flex-col items-center gap-1" style={{ marginTop: 4 }} title="สนับสนุนผู้พัฒนา">
            <Heart size={19} color={C.inkSoft} />
          </button>
          <button onClick={() => go("profile")} className="flex flex-col items-center gap-1">
            <span className="rounded-full flex items-center justify-center text-lg" style={{ width: 40, height: 40, background: C.sage }}>
              {profile.avatar}
            </span>
            <span style={{ fontFamily: BODY_FONT, fontSize: 10, color: C.inkSoft, maxWidth: 64, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile.name}</span>
          </button>
        </div>
      </div>

      <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${C.cover}, ${C.coverDeep})`, boxShadow: "0 8px 24px rgba(14,42,32,0.35)" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.06, backgroundImage: `repeating-linear-gradient(0deg, ${C.gold} 0 1px, transparent 1px 22px)` }} />
        <div className="relative flex items-center justify-between mb-1">
          <span style={{ fontFamily: BODY_FONT, fontSize: 12, color: C.goldBright, letterSpacing: "0.08em" }}>เงินคงเหลือปัจจุบัน</span>
          <Wallet size={16} color={C.goldBright} />
        </div>
        <div className="relative" style={{ fontFamily: MONO_FONT, fontSize: 32, fontWeight: 700, color: C.paper, fontVariantNumeric: "tabular-nums" }}>
          {thb(derived.currentBalance)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card style={{ padding: 14, background: C.incomeBg, border: "none" }}>
          <div style={{ fontFamily: BODY_FONT, fontSize: 11, color: C.income }}>รายรับเดือนนี้</div>
          <Money value={derived.monthIncome} tone="income" size={18} />
        </Card>
        <Card style={{ padding: 14, background: C.expenseBg, border: "none" }}>
          <div style={{ fontFamily: BODY_FONT, fontSize: 11, color: C.expense }}>รายจ่ายเดือนนี้</div>
          <Money value={derived.monthExpense} tone="expense" size={18} />
        </Card>
      </div>

      <Card style={{ padding: 16 }}>
        <SectionLabel right={<button onClick={() => go("calendar")} style={{ fontFamily: BODY_FONT, fontSize: 12, color: C.gold }}>ดูปฏิทิน</button>}>วันนี้</SectionLabel>
        {todayIncomeTx.length === 0 && todayExpenseTx.length === 0 && (
          <div style={{ fontFamily: BODY_FONT, fontSize: 13, color: C.inkSoft }}>ยังไม่มีรายการวันนี้</div>
        )}
        <div className="space-y-1.5">
          {todayIncomeTx.map((t) => (
            <div key={t.id} className="flex items-center justify-between">
              <span style={{ fontFamily: BODY_FONT, fontSize: 13, color: C.ink }}>{t.category}</span>
              <Money value={t.amount} tone="income" size={13} />
            </div>
          ))}
          {todayExpenseTx.map((t) => (
            <div key={t.id} className="flex items-center justify-between">
              <span style={{ fontFamily: BODY_FONT, fontSize: 13, color: C.ink }}>{t.category}</span>
              <Money value={t.amount} tone="expense" size={13} />
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ padding: 16, background: C.sage, border: "none" }}>
        <div className="flex justify-between items-center mb-2">
          <span style={{ fontFamily: BODY_FONT, fontSize: 12, color: C.inkSoft }}>ค่าใช้จ่ายที่ยังต้องจ่าย</span>
          <Money value={derived.unpaidPlanned} tone="expense" size={14} />
        </div>
        <GoldRule />
        <div className="flex justify-between items-center mt-2">
          <span style={{ fontFamily: BODY_FONT, fontSize: 13, color: C.ink, fontWeight: 600 }}>เหลือใช้จริง</span>
          <Money value={derived.availableBalance} tone="gold" size={20} weight={700} />
        </div>
      </Card>

      {derived.overdue.length > 0 && (
        <Card style={{ padding: 14, background: C.expenseBg, border: "none" }}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={15} color={C.expense} />
            <span style={{ fontFamily: BODY_FONT, fontSize: 13, color: C.expense, fontWeight: 600 }}>รายการเลยกำหนดจ่าย {derived.overdue.length} รายการ</span>
          </div>
          <div style={{ fontFamily: BODY_FONT, fontSize: 12, color: C.expense }}>รวม {thb(derived.overdueAmount)} — ไปที่แผนค่าใช้จ่ายเพื่อจัดการ</div>
        </Card>
      )}

      {alerts.length > 0 && (
        <Card style={{ padding: 14 }}>
          <SectionLabel>แจ้งเตือนงบประมาณ</SectionLabel>
          <div className="space-y-2">
            {alerts.map((r) => (
              <div key={r.category} className="flex items-center gap-2">
                <AlertTriangle size={14} color={r.tone === "over" ? C.expense : C.warn} />
                <span style={{ fontFamily: BODY_FONT, fontSize: 13, color: C.ink, flex: 1 }}>{r.category}</span>
                <span style={{ fontFamily: MONO_FONT, fontSize: 12, color: r.tone === "over" ? C.expense : C.warn }}>{num(r.actual)}/{num(r.budget)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div>
        <SectionLabel>เมนู</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          {tiles.map((t) => (
            <button key={t.key} onClick={() => go(t.key)} className="flex flex-col items-center gap-1.5 py-3 rounded-xl active:scale-95 transition" style={{ background: C.card, border: `1px solid ${C.paperLine}` }}>
              <t.icon size={17} color={C.cover} />
              <span style={{ fontFamily: BODY_FONT, fontSize: 10, color: C.ink, textAlign: "center" }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Calendar (main) ---------------- */

function CalendarScreen({ data, expenseCategories, incomeCategories, onAddIncome, onAddExpense, onUpdateIncome, onUpdateExpense, onDeleteIncome, onDeleteExpense, pendingSchedules, linkableTemplates }) {
  const [year, setYear] = useState(SEED_YEAR);
  const [month, setMonth] = useState(SEED_MONTH);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [addMode, setAddMode] = useState(null); // null | "pick" | "income" | "expense"
  const [editTx, setEditTx] = useState(null); // { kind, tx }

  const dayMarks = useMemo(() => {
    const m = {};
    data.incomeTx.forEach((t) => { m[t.date] = m[t.date] || {}; m[t.date].income = true; });
    data.expenseTx.forEach((t) => { m[t.date] = m[t.date] || {}; m[t.date].paid = true; });
    data.schedules.forEach((s) => { if (s.status === "planned") { m[s.date] = m[s.date] || {}; m[s.date].planned = true; } });
    return m;
  }, [data]);

  const dayIncome = data.incomeTx.filter((t) => t.date === selectedDate);
  const dayExpense = data.expenseTx.filter((t) => t.date === selectedDate);
  const incSum = dayIncome.reduce((s, t) => s + t.amount, 0);
  const expSum = dayExpense.reduce((s, t) => s + t.amount, 0);

  const closeAdd = () => setAddMode(null);

  return (
    <div className="px-4 pt-5 pb-4 space-y-4">
      <div style={{ fontFamily: DISPLAY_FONT, fontSize: 20, fontWeight: 700, color: C.ink }}>ปฏิทิน</div>
      <Card style={{ padding: 16 }}>
        <MonthGrid year={year} month={month}
          onPrev={() => { const d = new Date(year, month - 1, 1); setYear(d.getFullYear()); setMonth(d.getMonth()); }}
          onNext={() => { const d = new Date(year, month + 1, 1); setYear(d.getFullYear()); setMonth(d.getMonth()); }}
          dayMarks={dayMarks} onDayClick={(ds) => setSelectedDate(ds)} selectedSet={new Set([selectedDate])}
        />
      </Card>
      <Card style={{ padding: 16 }}>
        <div className="flex items-center justify-between mb-2">
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: 15, fontWeight: 700, color: C.ink }}>{thaiDateLong(selectedDate)}</div>
          <button onClick={() => setAddMode("pick")} className="p-1.5 rounded-lg" style={{ background: C.cover }}><Plus size={14} color={C.paper} /></button>
        </div>
        {dayIncome.length > 0 && (
          <div className="mb-3">
            <div style={{ fontFamily: BODY_FONT, fontSize: 11, color: C.inkSoft, marginBottom: 4 }}>รายรับ</div>
            {dayIncome.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-1" style={{ borderTop: `1px dashed ${C.paperLine}` }}>
                <span style={{ fontFamily: BODY_FONT, fontSize: 13 }}>{t.category}{t.note ? ` — ${t.note}` : ""}</span>
                <div className="flex items-center gap-1">
                  <Money value={t.amount} tone="income" size={13} />
                  <IconBtn icon={Pencil} onClick={() => setEditTx({ kind: "income", tx: t })} />
                  <IconBtn icon={Trash2} tone="expense" onClick={() => onDeleteIncome(t)} />
                </div>
              </div>
            ))}
          </div>
        )}
        {dayExpense.length > 0 && (
          <div className="mb-3">
            <div style={{ fontFamily: BODY_FONT, fontSize: 11, color: C.inkSoft, marginBottom: 4 }}>รายจ่าย</div>
            {dayExpense.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-1" style={{ borderTop: `1px dashed ${C.paperLine}` }}>
                <span style={{ fontFamily: BODY_FONT, fontSize: 13 }}>{t.category}{t.note ? ` — ${t.note}` : ""}</span>
                <div className="flex items-center gap-1">
                  <Money value={t.amount} tone="expense" size={13} />
                  <IconBtn icon={Pencil} onClick={() => setEditTx({ kind: "expense", tx: t })} />
                  <IconBtn icon={Trash2} tone="expense" onClick={() => onDeleteExpense(t)} />
                </div>
              </div>
            ))}
          </div>
        )}
        {dayIncome.length === 0 && dayExpense.length === 0 && (
          <div style={{ fontFamily: BODY_FONT, fontSize: 13, color: C.inkSoft }}>ไม่มีรายการในวันนี้ — แตะ + เพื่อเพิ่ม</div>
        )}
        <GoldRule />
        <div className="flex justify-between pt-2">
          <span style={{ fontFamily: BODY_FONT, fontSize: 12, color: C.inkSoft }}>สุทธิ</span>
          <Money value={incSum - expSum} tone={incSum - expSum >= 0 ? "income" : "expense"} size={15} weight={700} />
        </div>
      </Card>

      <Sheet open={!!addMode} onClose={closeAdd} title={addMode === "income" ? "เพิ่มรายรับ" : addMode === "expense" ? "เพิ่มรายจ่าย" : "เพิ่มรายการ"}>
        {addMode === "pick" && (
          <div className="space-y-2">
            <button onClick={() => setAddMode("income")} className="w-full py-4 rounded-xl flex items-center gap-3 px-4" style={{ background: C.incomeBg }}>
              <TrendingUp size={18} color={C.income} /><span style={{ fontFamily: BODY_FONT, fontSize: 14, color: C.income, fontWeight: 600 }}>รายรับ</span>
            </button>
            <button onClick={() => setAddMode("expense")} className="w-full py-4 rounded-xl flex items-center gap-3 px-4" style={{ background: C.expenseBg }}>
              <TrendingDown size={18} color={C.expense} /><span style={{ fontFamily: BODY_FONT, fontSize: 14, color: C.expense, fontWeight: 600 }}>รายจ่าย</span>
            </button>
          </div>
        )}
        {addMode === "income" && (
          <TxForm categories={incomeCategories} initial={{ date: selectedDate, category: incomeCategories[0], amount: "", note: "" }} onCancel={closeAdd} onSave={(v) => { onAddIncome(v); closeAdd(); }} />
        )}
        {addMode === "expense" && (
          <TxForm categories={expenseCategories} initial={{ date: selectedDate, category: expenseCategories[0], amount: "", note: "" }} onCancel={closeAdd} onSave={(v) => { onAddExpense(v); closeAdd(); }} pendingSchedules={pendingSchedules} linkableTemplates={linkableTemplates} />
        )}
      </Sheet>

      <Sheet open={!!editTx} onClose={() => setEditTx(null)} title="แก้ไขรายการ">
        {editTx && (
          <TxForm categories={editTx.kind === "income" ? incomeCategories : expenseCategories} initial={editTx.tx} onCancel={() => setEditTx(null)}
            onSave={(v) => { if (editTx.kind === "income") onUpdateIncome(editTx.tx.id, v); else onUpdateExpense(editTx.tx.id, v); setEditTx(null); }} />
        )}
      </Sheet>

    </div>
  );
}

/* ---------------- Income / Expense list screens ---------------- */

function TxListScreen({ title, tone, txs, categories, onAdd, onEdit, onDelete, go }) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");

  const filtered = useMemo(() => {
    return txs.filter((t) => {
      if (catFilter !== "all" && t.category !== catFilter) return false;
      if (search && !(t.note || "").toLowerCase().includes(search.toLowerCase()) && !t.category.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [txs, search, catFilter]);

  const filteredSum = filtered.reduce((s, t) => s + t.amount, 0);

  const grouped = useMemo(() => {
    const g = {};
    [...filtered].sort((a, b) => b.date.localeCompare(a.date)).forEach((t) => { g[t.date] = g[t.date] || []; g[t.date].push(t); });
    return Object.entries(g);
  }, [filtered]);

  return (
    <div className="px-4 pt-5 pb-4 space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={() => go("dashboard")} style={{ color: C.inkSoft }}><ArrowLeft size={18} /></button>
        <div style={{ fontFamily: DISPLAY_FONT, fontSize: 20, fontWeight: 700, color: C.ink, flex: 1 }}>{title}</div>
        <button onClick={onAdd} className="p-2 rounded-lg" style={{ background: C.cover }}><Plus size={16} color={C.paper} /></button>
      </div>

      <div className="flex gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาหมวดหมู่ / หมายเหตุ" style={{ ...inputStyle, flex: 1 }} />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={{ ...inputStyle, width: 110 }}>
          <option value="all">ทุกหมวด</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {(search || catFilter !== "all") && (
        <div className="flex justify-between items-center px-1">
          <span style={{ fontFamily: BODY_FONT, fontSize: 11, color: C.inkSoft }}>พบ {filtered.length} รายการ</span>
          <Money value={filteredSum} tone={tone} size={12} />
        </div>
      )}

      {grouped.length === 0 && (
        <Card style={{ padding: 24, textAlign: "center" }}><div style={{ fontFamily: BODY_FONT, fontSize: 13, color: C.inkSoft }}>ยังไม่มีรายการ — แตะ + เพื่อเพิ่ม</div></Card>
      )}
      {grouped.map(([date, list]) => {
        const sum = list.reduce((s, t) => s + t.amount, 0);
        return (
          <Card key={date} style={{ padding: 14 }}>
            <div className="flex justify-between items-center mb-2">
              <span style={{ fontFamily: BODY_FONT, fontSize: 12, color: C.inkSoft }}>{thaiDateLong(date)}</span>
              <Money value={sum} tone={tone} size={13} />
            </div>
            <div className="space-y-1">
              {list.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-1" style={{ borderTop: `1px dashed ${C.paperLine}` }}>
                  <div>
                    <div style={{ fontFamily: BODY_FONT, fontSize: 13, color: C.ink }}>{t.category}</div>
                    {t.note && <div style={{ fontFamily: BODY_FONT, fontSize: 11, color: C.inkSoft }}>{t.note}</div>}
                    {t.templateId && <div style={{ fontFamily: BODY_FONT, fontSize: 10, color: C.gold }}>จากแผนค่าใช้จ่าย</div>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Money value={t.amount} tone={tone} size={13} />
                    <IconBtn icon={Pencil} onClick={() => onEdit(t)} />
                    <IconBtn icon={Trash2} tone="expense" onClick={() => onDelete(t)} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function TxForm({ categories, initial, onSave, onCancel, pendingSchedules, linkableTemplates }) {
  const [date, setDate] = useState(initial?.date || todayStr);
  const [category, setCategory] = useState(initial?.category || categories[0]);
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [note, setNote] = useState(initial?.note || "");
  const [linkValue, setLinkValue] = useState(""); // "" | "s:<scheduleId>" | "t:<templateId>"
  const options = initial?.category && !categories.includes(initial.category) ? [initial.category, ...categories] : categories;

  const matchingSchedules = useMemo(() => {
    if (!pendingSchedules) return [];
    return pendingSchedules.filter((p) => p.category === category);
  }, [pendingSchedules, category]);

  const matchingTemplates = useMemo(() => {
    if (!linkableTemplates) return [];
    return linkableTemplates.filter((t) => t.category === category);
  }, [linkableTemplates, category]);

  useEffect(() => { setLinkValue(""); }, [category]);

  const pickLink = (value) => {
    setLinkValue(value);
    if (value.startsWith("s:")) {
      const id = value.slice(2);
      const match = matchingSchedules.find((p) => p.schedule.id === id);
      if (match) { setAmount(String(match.schedule.amount)); setDate(match.schedule.date); }
    } else if (value.startsWith("t:")) {
      const id = value.slice(2);
      const match = matchingTemplates.find((t) => t.id === id);
      if (match) setAmount(String(match.amountPerOccurrence));
    }
  };

  const hasLinkOptions = (matchingSchedules.length > 0 || matchingTemplates.length > 0);

  return (
    <div>
      <Field label="วันที่"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} /></Field>
      <Field label="หมวดหมู่">
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
          {options.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      {!initial?.id && hasLinkOptions && (
        <Field label="เชื่อมกับแผนค่าใช้จ่าย (ถ้ามี)">
          <select value={linkValue} onChange={(e) => pickLink(e.target.value)} style={inputStyle}>
            <option value="">ไม่เชื่อมกับแผน — เข้างบประมาณตรงๆ</option>
            {matchingSchedules.length > 0 && (
              <optgroup label="รายการที่วางแผนวันไว้แล้ว">
                {matchingSchedules.map((p) => (
                  <option key={p.schedule.id} value={`s:${p.schedule.id}`}>
                    {p.templateName} · {thaiDateLong(p.schedule.date)} · {num(p.schedule.amount)} บาท
                  </option>
                ))}
              </optgroup>
            )}
            {matchingTemplates.length > 0 && (
              <optgroup label="แผนค่าใช้จ่าย (ยังไม่ระบุวันที่)">
                {matchingTemplates.map((t) => (
                  <option key={t.id} value={`t:${t.id}`}>
                    {t.name} · {num(t.amountPerOccurrence)} บาท/ครั้ง · เหลือ {t.remaining} ครั้ง
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          {linkValue && (
            <div style={{ fontFamily: BODY_FONT, fontSize: 10, color: C.gold, marginTop: 4 }}>
              {linkValue.startsWith("s:")
                ? 'รายการนี้จะถูกนับเป็นการจ่ายของแผนที่เลือก และจะขึ้นสถานะ "จ่ายแล้ว" ในหน้าแผนค่าใช้จ่ายให้อัตโนมัติ'
                : "รายการนี้จะถูกนับรวมในความคืบหน้าของแผนที่เลือก แม้ไม่ได้กำหนดวันที่ไว้ล่วงหน้า"}
            </div>
          )}
        </Field>
      )}
      <Field label="จำนวนเงิน (บาท)"><input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle} placeholder="0" /></Field>
      <Field label="หมายเหตุ (ถ้ามี)"><input type="text" value={note} onChange={(e) => setNote(e.target.value)} style={inputStyle} /></Field>
      <div className="flex gap-2 mt-2">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl" style={{ border: `1px solid ${C.paperLine}`, fontFamily: BODY_FONT, fontSize: 14, color: C.inkSoft }}>ยกเลิก</button>
        <div className="flex-[2]">
          <PrimaryBtn disabled={!amount || Number(amount) <= 0} onClick={() => {
            const base = { date, category, amount: Number(amount), note };
            if (!pendingSchedules) { onSave(base); return; }
            if (linkValue.startsWith("s:")) onSave({ ...base, linkScheduleId: linkValue.slice(2) });
            else if (linkValue.startsWith("t:")) onSave({ ...base, linkTemplateId: linkValue.slice(2) });
            else onSave({ ...base, linkScheduleId: null });
          }}>บันทึก</PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Templates list + detail ---------------- */

function TemplatesScreen({ templates, schedules, go, setTplDetail, onDelete }) {
  return (
    <div className="px-4 pt-5 pb-4 space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={() => go("dashboard")} style={{ color: C.inkSoft }}><ArrowLeft size={18} /></button>
        <div style={{ fontFamily: DISPLAY_FONT, fontSize: 20, fontWeight: 700, color: C.ink, flex: 1 }}>แผนค่าใช้จ่าย</div>
        <button onClick={() => go("templateNew")} className="p-2 rounded-lg" style={{ background: C.cover }}><Plus size={16} color={C.paper} /></button>
      </div>
      {templates.length === 0 && (
        <Card style={{ padding: 24, textAlign: "center" }}><div style={{ fontFamily: BODY_FONT, fontSize: 13, color: C.inkSoft }}>ยังไม่มีแผนค่าใช้จ่าย</div></Card>
      )}
      {templates.length > 0 && (
        <div style={{ fontFamily: BODY_FONT, fontSize: 11, color: C.inkSoft }}>แตะที่การ์ดแผนด้านล่างเพื่อดูรายละเอียด กำหนดวัน หรือทำเครื่องหมายว่าจ่ายแล้ว</div>
      )}
      {templates.map((tpl) => {
        const sc = schedules.filter((s) => s.templateId === tpl.id);
        const planned = sc.length;
        const paid = sc.filter((s) => s.status === "paid").length;
        const pct = tpl.plannedCount ? Math.min(100, (planned / tpl.plannedCount) * 100) : 0;
        return (
          <Card key={tpl.id} style={{ padding: 16 }} className="active:scale-[0.99] transition">
            <button className="w-full text-left" onClick={() => { setTplDetail(tpl.id); go("templateDetail"); }}>
              <div className="flex justify-between items-start mb-1">
                <div>
                  <div style={{ fontFamily: DISPLAY_FONT, fontSize: 15, fontWeight: 700, color: C.ink }}>{tpl.name}</div>
                  <div style={{ fontFamily: BODY_FONT, fontSize: 11, color: C.inkSoft }}>{tpl.category} • {tpl.type === "once" ? "ครั้งเดียว" : `หลายครั้ง (${tpl.amountPerOccurrence}/ครั้ง)`}</div>
                </div>
                <div className="flex items-center gap-1">
                  <Money value={tpl.totalBudget} tone="gold" size={15} />
                  <ChevronRight size={16} color={C.inkSoft} />
                </div>
              </div>
              <div className="mt-2 h-1.5 rounded-full" style={{ background: C.paperLine }}>
                <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: C.gold }} />
              </div>
              <div className="flex justify-between mt-1" style={{ fontFamily: MONO_FONT, fontSize: 11, color: C.inkSoft }}>
                <span>วางแผน {planned}/{tpl.plannedCount}</span><span>จ่ายแล้ว {paid}</span>
              </div>
            </button>
            <div className="flex justify-end mt-2"><IconBtn icon={Trash2} tone="expense" onClick={() => onDelete(tpl)} /></div>
          </Card>
        );
      })}
    </div>
  );
}

function TemplateForm({ categories, initial, submitLabel, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || "");
  const [category, setCategory] = useState(initial?.category || categories[0]);
  const [type, setType] = useState(initial?.type || "multi");
  const [totalBudget, setTotalBudget] = useState(initial ? String(initial.totalBudget) : "");
  const [plannedCount, setPlannedCount] = useState(initial ? String(initial.plannedCount) : "");
  const [amountPer, setAmountPer] = useState(initial ? String(initial.amountPerOccurrence) : "");
  const [amountTouched, setAmountTouched] = useState(!!initial);

  useEffect(() => { if (type === "once") setPlannedCount("1"); }, [type]);
  useEffect(() => {
    const total = Number(totalBudget), count = Number(plannedCount);
    if (!amountTouched && total > 0 && count > 0) setAmountPer(String(Math.round(total / count)));
  }, [totalBudget, plannedCount, amountTouched]);

  const valid = name && Number(totalBudget) > 0 && Number(plannedCount) > 0 && Number(amountPer) > 0;
  const categoryOptions = category && !categories.includes(category) ? [category, ...categories] : categories;

  return (
    <div>
      <Field label="ชื่อรายการ"><input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="เช่น ค่าอาหาร" /></Field>
      <Field label="หมวดหมู่">
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>{categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}</select>
      </Field>
      <Field label="รูปแบบ">
        <div className="flex gap-2">
          {[["once", "ครั้งเดียว"], ["multi", "หลายครั้ง"]].map(([v, l]) => (
            <button key={v} onClick={() => setType(v)} className="flex-1 py-2.5 rounded-xl" style={{ background: type === v ? C.cover : C.paper, color: type === v ? C.paper : C.ink, border: `1px solid ${type === v ? C.cover : C.paperLine}`, fontFamily: BODY_FONT, fontSize: 13 }}>{l}</button>
          ))}
        </div>
      </Field>
      <Field label="งบทั้งหมด (บาท)"><input type="number" value={totalBudget} onChange={(e) => setTotalBudget(e.target.value)} style={inputStyle} placeholder="0" /></Field>
      {type === "multi" && <Field label="จำนวนครั้ง"><input type="number" value={plannedCount} onChange={(e) => setPlannedCount(e.target.value)} style={inputStyle} placeholder="0" /></Field>}
      <Field label="จำนวนเงินต่อครั้ง (บาท)"><input type="number" value={amountPer} onChange={(e) => { setAmountPer(e.target.value); setAmountTouched(true); }} style={inputStyle} /></Field>
      {initial && <div style={{ fontFamily: BODY_FONT, fontSize: 11, color: C.inkSoft, marginBottom: 10 }}>การแก้ไขนี้มีผลกับรายการที่ยังไม่ได้เลือกวัน/ยังไม่จ่ายเท่านั้น รายการที่จ่ายแล้วจะเก็บยอดเดิมไว้เป็นประวัติ</div>}
      <div className="flex gap-2 mt-2">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl" style={{ border: `1px solid ${C.paperLine}`, fontFamily: BODY_FONT, fontSize: 14, color: C.inkSoft }}>ยกเลิก</button>
        <div className="flex-[2]">
          <PrimaryBtn disabled={!valid} onClick={() => onSave({ name, category, type, totalBudget: Number(totalBudget), plannedCount: Number(plannedCount), amountPerOccurrence: Number(amountPer) })}>{submitLabel || "สร้างแผนและเลือกวัน"}</PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

function TemplateDetail({ template, schedules, go, onToggleDay, onSetStatus, onDeleteSchedule, onUpdateTemplate, categories }) {
  const [year, setYear] = useState(SEED_YEAR);
  const [month, setMonth] = useState(SEED_MONTH);
  const [editing, setEditing] = useState(false);
  const tplSchedules = schedules.filter((s) => s.templateId === template.id).sort((a, b) => a.date.localeCompare(b.date));
  const selectedSet = new Set(tplSchedules.map((s) => s.date));
  const plannedN = tplSchedules.length;
  const paidN = tplSchedules.filter((s) => s.status === "paid").length;
  const remaining = Math.max(0, template.plannedCount - plannedN);
  const atLimit = plannedN >= template.plannedCount;
  const dayMarks = useMemo(() => {
    const m = {};
    tplSchedules.forEach((s) => { m[s.date] = { paid: s.status === "paid", planned: s.status !== "paid" }; });
    return m;
  }, [tplSchedules]);

  return (
    <div className="px-4 pt-5 pb-4 space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => go("templates")} style={{ color: C.inkSoft }}><ArrowLeft size={18} /></button>
        <div style={{ fontFamily: DISPLAY_FONT, fontSize: 18, fontWeight: 700, color: C.ink, flex: 1 }}>{template.name}</div>
        <IconBtn icon={Pencil} onClick={() => setEditing(true)} />
      </div>
      <Card style={{ padding: 16 }}>
        <div className="grid grid-cols-3 gap-2 text-center mb-3">
          <div><div style={{ fontFamily: MONO_FONT, fontSize: 16, fontWeight: 700, color: C.ink }}>{template.plannedCount}</div><div style={{ fontFamily: BODY_FONT, fontSize: 10, color: C.inkSoft }}>กำหนด</div></div>
          <div><div style={{ fontFamily: MONO_FONT, fontSize: 16, fontWeight: 700, color: C.gold }}>{plannedN}</div><div style={{ fontFamily: BODY_FONT, fontSize: 10, color: C.inkSoft }}>วางแผนแล้ว</div></div>
          <div><div style={{ fontFamily: MONO_FONT, fontSize: 16, fontWeight: 700, color: C.income }}>{paidN}</div><div style={{ fontFamily: BODY_FONT, fontSize: 10, color: C.inkSoft }}>จ่ายแล้ว</div></div>
        </div>
        <GoldRule />
        <div className="flex justify-between pt-2 text-sm">
          <span style={{ fontFamily: BODY_FONT, color: C.inkSoft, fontSize: 12 }}>เหลือ {remaining} ครั้ง • {num(template.amountPerOccurrence)} บาท/ครั้ง</span>
          <Money value={template.totalBudget} tone="gold" size={13} />
        </div>
      </Card>
      <Card style={{ padding: 16 }}>
        <SectionLabel>เลือกวันในปฏิทิน</SectionLabel>
        {atLimit && <div style={{ fontFamily: BODY_FONT, fontSize: 11, color: C.warn, marginBottom: 6 }}>เลือกครบ {template.plannedCount} ครั้งแล้ว — ยกเลิกวันเดิมก่อนเลือกวันใหม่</div>}
        <MonthGrid year={year} month={month}
          onPrev={() => { const d = new Date(year, month - 1, 1); setYear(d.getFullYear()); setMonth(d.getMonth()); }}
          onNext={() => { const d = new Date(year, month + 1, 1); setYear(d.getFullYear()); setMonth(d.getMonth()); }}
          dayMarks={dayMarks} selectedSet={selectedSet} onDayClick={(ds) => onToggleDay(template, ds, atLimit)}
        />
      </Card>
      <Card style={{ padding: 16 }}>
        <SectionLabel>รายการที่กำหนดวันแล้ว ({tplSchedules.length})</SectionLabel>
        {tplSchedules.length === 0 && <div style={{ fontFamily: BODY_FONT, fontSize: 13, color: C.inkSoft }}>แตะวันในปฏิทินด้านบนเพื่อกำหนด</div>}
        <div className="space-y-2">
          {tplSchedules.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-1.5" style={{ borderTop: `1px dashed ${C.paperLine}` }}>
              <div>
                <div style={{ fontFamily: BODY_FONT, fontSize: 13, color: C.ink }}>{thaiDateLong(s.date)}</div>
                <Money value={s.amount} tone="expense" size={12} />
                {s.status === "planned" && s.date < todayStr && (
                  <div style={{ fontFamily: BODY_FONT, fontSize: 10, color: C.expense, fontWeight: 600 }}>เลยกำหนดจ่าย</div>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Stamp status={s.status} />
                {s.status === "planned" && (<><IconBtn icon={Check} tone="income" onClick={() => onSetStatus(s, "paid")} /><IconBtn icon={SkipForward} tone="expense" onClick={() => onSetStatus(s, "skipped")} /></>)}
                {s.status !== "planned" && <IconBtn icon={Undo2} onClick={() => onSetStatus(s, "planned")} />}
                <IconBtn icon={Trash2} tone="expense" onClick={() => onDeleteSchedule(s)} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Sheet open={editing} onClose={() => setEditing(false)} title="แก้ไขแผนค่าใช้จ่าย">
        <TemplateForm categories={categories} initial={template} submitLabel="บันทึกการแก้ไข" onCancel={() => setEditing(false)}
          onSave={(v) => { onUpdateTemplate(template.id, v); setEditing(false); }} />
      </Sheet>
    </div>
  );
}

/* ---------------- Budget screen ---------------- */

function BudgetRow({ r, onSetBudget }) {
  const [val, setVal] = useState(String(r.budget));
  useEffect(() => { setVal(String(r.budget)); }, [r.budget]);
  const toneColor = r.tone === "over" ? C.expense : r.tone === "full" ? C.gold : r.tone === "warning" ? C.warn : C.income;
  const badge = r.tone === "over" ? "🔴 เกินงบ" : r.tone === "full" ? "🟡 เต็มงบ" : r.tone === "warning" ? "⚠️ ใกล้เต็มงบ" : "ปกติ";
  return (
    <Card style={{ padding: 14 }}>
      <div className="flex justify-between items-center mb-1.5">
        <span style={{ fontFamily: DISPLAY_FONT, fontSize: 14, fontWeight: 700, color: C.ink }}>{r.category}</span>
        <span style={{ fontFamily: BODY_FONT, fontSize: 11, color: toneColor }}>{badge}</span>
      </div>
      <div className="h-2 rounded-full mb-1.5" style={{ background: C.paperLine }}>
        <div className="h-2 rounded-full" style={{ width: `${Math.min(100, r.pct)}%`, background: toneColor }} />
      </div>
      <div className="flex justify-between items-center">
        <span style={{ fontFamily: MONO_FONT, fontSize: 11, color: C.inkSoft }}>ใช้จริง {num(r.actual)} / {num(r.budget)} ({Math.round(r.pct)}%)</span>
        <input type="number" value={val} onChange={(e) => setVal(e.target.value)} onBlur={(e) => onSetBudget(r.category, Number(e.target.value) || 0)} style={{ width: 88, ...inputStyle, padding: "5px 8px", fontSize: 12, textAlign: "right" }} />
      </div>
      {r.planned > 0 && (
        <div style={{ fontFamily: BODY_FONT, fontSize: 10, color: C.gold, marginTop: 4 }}>+ วางแผนไว้อีก {num(r.planned)} (ยังไม่จ่าย ไม่นับในยอดใช้จริง)</div>
      )}
    </Card>
  );
}

function BudgetScreen({ go, budgetRows, onSetBudget, monthNav }) {
  return (
    <div className="px-4 pt-5 pb-4 space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={() => go("dashboard")} style={{ color: C.inkSoft }}><ArrowLeft size={18} /></button>
        <div style={{ fontFamily: DISPLAY_FONT, fontSize: 20, fontWeight: 700, color: C.ink, flex: 1 }}>งบประมาณรายเดือน</div>
      </div>
      <div className="flex justify-end"><MonthNav {...monthNav} /></div>
      {budgetRows.map((r) => <BudgetRow key={r.category} r={r} onSetBudget={onSetBudget} />)}
    </div>
  );
}

/* ---------------- Report screen ---------------- */

function ReportScreen({ stats, monthNav }) {
  const rows = [...stats.budgetRows].filter((r) => r.actual > 0 || r.budget > 0).sort((a, b) => b.actual - a.actual);
  const maxAmt = Math.max(1, ...rows.map((r) => Math.max(r.actual, r.budget)));
  return (
    <div className="px-4 pt-5 pb-4 space-y-4">
      <div className="flex items-center justify-between">
        <div style={{ fontFamily: DISPLAY_FONT, fontSize: 20, fontWeight: 700, color: C.ink }}>รายงานรายเดือน</div>
        <MonthNav {...monthNav} />
      </div>
      <Card style={{ padding: 16, background: C.cover }}>
        <div className="flex justify-between mb-1"><span style={{ fontFamily: BODY_FONT, color: "#DCE8DF", fontSize: 13 }}>รายรับ</span><span style={{ fontFamily: MONO_FONT, color: "#8FD6AE", fontSize: 14 }}>+{num(stats.monthIncome)}</span></div>
        <div className="flex justify-between mb-1"><span style={{ fontFamily: BODY_FONT, color: "#DCE8DF", fontSize: 13 }}>รายจ่าย</span><span style={{ fontFamily: MONO_FONT, color: "#E8A99B", fontSize: 14 }}>-{num(stats.monthExpense)}</span></div>
        <GoldRule />
        <div className="flex justify-between pt-2"><span style={{ fontFamily: BODY_FONT, color: C.goldBright, fontSize: 13, fontWeight: 600 }}>คงเหลือ</span><span style={{ fontFamily: MONO_FONT, color: C.paper, fontSize: 16, fontWeight: 700 }}>{num(stats.monthIncome - stats.monthExpense)}</span></div>
      </Card>
      <Card style={{ padding: 16 }}>
        <SectionLabel>แยกตามหมวดหมู่ — ใช้จริง เทียบ งบประมาณ</SectionLabel>
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.category}>
              <div className="flex justify-between items-baseline mb-1">
                <span style={{ fontFamily: BODY_FONT, fontSize: 12, color: C.ink }}>{r.category}</span>
                <span style={{ fontFamily: MONO_FONT, fontSize: 12, color: C.ink }}>
                  {num(r.actual)}{r.budget > 0 ? ` / ${num(r.budget)}` : ""}
                </span>
              </div>
              <div className="h-1.5 rounded-full relative" style={{ background: C.paperLine }}>
                <div className="h-1.5 rounded-full" style={{ width: `${(r.actual / maxAmt) * 100}%`, background: r.tone === "over" ? C.expense : C.gold }} />
                {r.budget > 0 && (
                  <div className="absolute top-0" style={{ left: `${Math.min(100, (r.budget / maxAmt) * 100)}%`, width: 2, height: "100%", background: C.ink, opacity: 0.35 }} />
                )}
              </div>
            </div>
          ))}
          {rows.length === 0 && <div style={{ fontFamily: BODY_FONT, fontSize: 13, color: C.inkSoft }}>ไม่มีรายจ่ายในเดือนนี้</div>}
        </div>
        {rows.some((r) => r.budget > 0) && (
          <div style={{ fontFamily: BODY_FONT, fontSize: 10, color: C.inkSoft, marginTop: 10 }}>เส้นแนวตั้งบนแท่ง = จุดงบประมาณที่ตั้งไว้</div>
        )}
      </Card>
    </div>
  );
}

/* ---------------- Category management ---------------- */

function ToggleSwitch({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} className="relative rounded-full transition flex-shrink-0" style={{ width: 38, height: 22, background: checked ? C.income : C.paperLine }}>
      <span className="absolute rounded-full transition-all" style={{ width: 18, height: 18, top: 2, left: checked ? 18 : 2, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.25)" }} />
    </button>
  );
}

function CategoryScreen({ go, expenseCategories, inactiveExpenseCategories, incomeCategories, inactiveIncomeCategories, categoryRecurring, incomeCategoryRecurring, onAddExpense, onDeleteExpense, onToggleExpenseActive, onAddIncome, onDeleteIncome, onToggleIncomeActive, onToggleRecurring, onToggleIncomeRecurring }) {
  const [tab, setTab] = useState("expense");
  const [name, setName] = useState("");
  const defaultsExpense = new Set(DEFAULT_EXPENSE_CATEGORIES);
  const defaultsIncome = new Set(DEFAULT_INCOME_CATEGORIES);
  const inactiveSet = new Set(inactiveExpenseCategories);
  const inactiveIncomeSet = new Set(inactiveIncomeCategories);

  const add = () => {
    if (!name.trim()) return;
    if (tab === "expense") onAddExpense(name.trim()); else onAddIncome(name.trim());
    setName("");
  };

  return (
    <div className="px-4 pt-5 pb-4 space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={() => go("dashboard")} style={{ color: C.inkSoft }}><ArrowLeft size={18} /></button>
        <div style={{ fontFamily: DISPLAY_FONT, fontSize: 20, fontWeight: 700, color: C.ink }}>หมวดหมู่</div>
      </div>
      <div className="flex gap-2">
        {[["expense", "รายจ่าย"], ["income", "รายรับ"]].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} className="flex-1 py-2.5 rounded-xl" style={{ background: tab === v ? C.cover : C.card, color: tab === v ? C.paper : C.ink, border: `1px solid ${tab === v ? C.cover : C.paperLine}`, fontFamily: BODY_FONT, fontSize: 13 }}>{l}</button>
        ))}
      </div>
      <Card style={{ padding: 14 }}>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อหมวดใหม่" style={inputStyle} />
          <button onClick={add} className="px-4 rounded-xl" style={{ background: C.cover, color: C.paper, fontFamily: BODY_FONT, fontSize: 13 }}>เพิ่ม</button>
        </div>
      </Card>

      {tab === "expense" ? (
        <>
          <div style={{ fontFamily: BODY_FONT, fontSize: 11, color: C.inkSoft }}>ปิดสวิตช์หมวดที่ไม่ได้ใช้ เพื่อไม่ให้แสดงในหน้างบประมาณและตัวเลือกตอนบันทึกรายจ่าย · หมวดพื้นฐานต่อเนื่องทุกเดือนเสมอ ส่วนหมวดที่เพิ่มเองเลือกได้ว่าจะให้ต่อเนื่องหรือเฉพาะเดือนนี้</div>
          <Card style={{ padding: 8 }}>
            {expenseCategories.map((c) => {
              const active = !inactiveSet.has(c);
              const isDefault = defaultsExpense.has(c);
              const recurring = isDefault ? true : (categoryRecurring[c] !== false);
              return (
                <div key={c} className="px-3 py-2.5" style={{ borderBottom: `1px solid ${C.paperLine}`, opacity: active ? 1 : 0.5 }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag size={14} color={C.gold} />
                      <span style={{ fontFamily: BODY_FONT, fontSize: 13, color: C.ink }}>{c}</span>
                      {isDefault && <span style={{ fontFamily: BODY_FONT, fontSize: 10, color: C.inkSoft }}>(พื้นฐาน)</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <ToggleSwitch checked={active} onChange={() => onToggleExpenseActive(c)} />
                      {!isDefault && <IconBtn icon={Trash2} tone="expense" onClick={() => onDeleteExpense(c)} />}
                    </div>
                  </div>
                  {!isDefault && (
                    <div className="flex items-center justify-between mt-1.5 pl-6">
                      <span style={{ fontFamily: BODY_FONT, fontSize: 11, color: C.inkSoft }}>{recurring ? "ใช้ต่อเนื่องทุกเดือน" : "เฉพาะเดือนนี้เท่านั้น"}</span>
                      <ToggleSwitch checked={recurring} onChange={() => onToggleRecurring(c)} />
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        </>
      ) : (
        <>
          <div style={{ fontFamily: BODY_FONT, fontSize: 11, color: C.inkSoft }}>ปิดสวิตช์หมวดที่ไม่ได้ใช้ เพื่อไม่ให้แสดงเป็นตัวเลือกตอนบันทึกรายรับ · หมวดพื้นฐานต่อเนื่องทุกเดือนเสมอ ส่วนหมวดที่เพิ่มเองเลือกได้ว่าจะให้ต่อเนื่องหรือเฉพาะเดือนนี้</div>
          <Card style={{ padding: 8 }}>
            {incomeCategories.map((c) => {
              const active = !inactiveIncomeSet.has(c);
              const isDefault = defaultsIncome.has(c);
              const recurring = isDefault ? true : (incomeCategoryRecurring[c] !== false);
              return (
                <div key={c} className="px-3 py-2.5" style={{ borderBottom: `1px solid ${C.paperLine}`, opacity: active ? 1 : 0.5 }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag size={14} color={C.gold} />
                      <span style={{ fontFamily: BODY_FONT, fontSize: 13, color: C.ink }}>{c}</span>
                      {isDefault && <span style={{ fontFamily: BODY_FONT, fontSize: 10, color: C.inkSoft }}>(พื้นฐาน)</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <ToggleSwitch checked={active} onChange={() => onToggleIncomeActive(c)} />
                      {!isDefault && <IconBtn icon={Trash2} tone="expense" onClick={() => onDeleteIncome(c)} />}
                    </div>
                  </div>
                  {!isDefault && (
                    <div className="flex items-center justify-between mt-1.5 pl-6">
                      <span style={{ fontFamily: BODY_FONT, fontSize: 11, color: C.inkSoft }}>{recurring ? "ใช้ต่อเนื่องทุกเดือน" : "เฉพาะเดือนนี้เท่านั้น"}</span>
                      <ToggleSwitch checked={recurring} onChange={() => onToggleIncomeRecurring(c)} />
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        </>
      )}
    </div>
  );
}

/* ---------------- Settings ---------------- */

function SettingsScreen({ go, openingBalance, onSetOpening, onReset, onExport, onImport, profile, onUpdatePin }) {
  const [val, setVal] = useState(String(openingBalance));
  const [pin, setPin] = useState(profile.pin || "");
  const [pinSaved, setPinSaved] = useState(false);
  const fileRef = useRef(null);

  return (
    <div className="px-4 pt-5 pb-4 space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => go("dashboard")} style={{ color: C.inkSoft }}><ArrowLeft size={18} /></button>
        <div style={{ fontFamily: DISPLAY_FONT, fontSize: 20, fontWeight: 700, color: C.ink }}>ตั้งค่า</div>
      </div>

      <Card style={{ padding: 16 }}>
        <Field label="เงินตั้งต้น (Opening Balance)">
          <input type="number" value={val} onChange={(e) => setVal(e.target.value)} onBlur={() => onSetOpening(Number(val) || 0)} style={inputStyle} />
        </Field>
        <div style={{ fontFamily: BODY_FONT, fontSize: 11, color: C.inkSoft }}>ใช้เป็นฐานคำนวณเงินคงเหลือปัจจุบัน</div>
      </Card>

      <Card style={{ padding: 16 }}>
        <SectionLabel>ความปลอดภัย</SectionLabel>
        <Field label="รหัส PIN 6 หลัก (ว่างไว้เพื่อไม่ใช้รหัส)">
          <input value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setPinSaved(false); }} type="password" inputMode="numeric" autoComplete="new-password" style={{ ...inputStyle, letterSpacing: "0.4em" }} placeholder="เช่น 123456" />
        </Field>
        <button
          onClick={() => { onUpdatePin(pin.length === 6 ? pin : ""); setPinSaved(true); setTimeout(() => setPinSaved(false), 1500); }}
          className="w-full py-2.5 rounded-xl flex items-center justify-center gap-1.5"
          style={{ border: `1px solid ${C.paperLine}`, fontFamily: BODY_FONT, fontSize: 13, color: C.ink }}
        >
          <ShieldCheck size={14} /> {pinSaved ? "บันทึกแล้ว" : "บันทึกรหัส PIN"}
        </button>
      </Card>

      <Card style={{ padding: 16 }}>
        <SectionLabel>สำรอง / กู้คืนข้อมูล</SectionLabel>
        <div style={{ fontFamily: BODY_FONT, fontSize: 11, color: C.inkSoft, marginBottom: 10 }}>ข้อมูลถูกเก็บไว้ในอุปกรณ์นี้เท่านั้น แนะนำให้สำรองไฟล์เก็บไว้เป็นระยะ</div>
        <div className="flex gap-2">
          <button onClick={onExport} className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5" style={{ border: `1px solid ${C.paperLine}`, fontFamily: BODY_FONT, fontSize: 13, color: C.ink }}>
            <Download size={14} /> ส่งออกข้อมูล
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5" style={{ border: `1px solid ${C.paperLine}`, fontFamily: BODY_FONT, fontSize: 13, color: C.ink }}>
            <Upload size={14} /> นำเข้าข้อมูล
          </button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { if (e.target.files[0]) onImport(e.target.files[0]); e.target.value = ""; }} />
        </div>
      </Card>

      <button onClick={() => go("about")} className="w-full py-3 rounded-xl flex items-center justify-center gap-2" style={{ border: `1px solid ${C.paperLine}`, color: C.ink, fontFamily: BODY_FONT, fontSize: 13 }}>
        <Heart size={14} color={C.expense} /> เกี่ยวกับแอปนี้ / สนับสนุนผู้พัฒนา
      </button>

      <Card style={{ padding: 16 }}>
        <SectionLabel>ลบข้อมูล</SectionLabel>
        <div style={{ fontFamily: BODY_FONT, fontSize: 12, color: C.inkSoft, marginBottom: 10 }}>
          ลบรายรับ รายจ่าย งบประมาณ และแผนค่าใช้จ่ายทั้งหมด เพื่อเริ่มต้นบันทึกใหม่ตั้งแต่ศูนย์ (โปรไฟล์และ PIN ของคุณจะยังอยู่เหมือนเดิม) — แนะนำให้ส่งออกข้อมูลสำรองไว้ก่อนถ้ายังไม่มั่นใจ การกระทำนี้ย้อนกลับไม่ได้
        </div>
        <button onClick={onReset} className="w-full py-3 rounded-xl" style={{ border: `1px solid ${C.expense}`, color: C.expense, fontFamily: BODY_FONT, fontSize: 13, fontWeight: 600 }}>ลบข้อมูลทั้งหมด เริ่มต้นใหม่</button>
      </Card>

      <div style={{ fontFamily: BODY_FONT, fontSize: 11, color: C.inkSoft, textAlign: "center" }}>บันทึกพารวย v2.5</div>
    </div>
  );
}

/* ---------------- Quick Add sheet ---------------- */

function QuickAddSheet({ open, onClose, expenseCategories, incomeCategories, onSaveIncome, onSaveExpense, onCreateTemplate, pendingSchedules, linkableTemplates }) {
  const [mode, setMode] = useState(null);
  useEffect(() => { if (!open) setMode(null); }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title={mode ? { income: "เพิ่มรายรับ", expense: "เพิ่มรายจ่าย", template: "สร้างแผนค่าใช้จ่าย" }[mode] : "เพิ่มรายการ"}>
      {!mode && (
        <div className="space-y-2">
          <button onClick={() => setMode("income")} className="w-full py-4 rounded-xl flex items-center gap-3 px-4" style={{ background: C.incomeBg }}>
            <TrendingUp size={18} color={C.income} /><span style={{ fontFamily: BODY_FONT, fontSize: 14, color: C.income, fontWeight: 600 }}>รายรับ</span>
          </button>
          <button onClick={() => setMode("expense")} className="w-full py-4 rounded-xl flex items-center gap-3 px-4" style={{ background: C.expenseBg }}>
            <TrendingDown size={18} color={C.expense} /><span style={{ fontFamily: BODY_FONT, fontSize: 14, color: C.expense, fontWeight: 600 }}>รายจ่าย</span>
          </button>
          <button onClick={() => setMode("template")} className="w-full py-4 rounded-xl flex items-center gap-3 px-4" style={{ background: C.sage }}>
            <Layers size={18} color={C.cover} /><span style={{ fontFamily: BODY_FONT, fontSize: 14, color: C.cover, fontWeight: 600 }}>แผนค่าใช้จ่าย</span>
          </button>
        </div>
      )}
      {mode === "income" && <TxForm categories={incomeCategories} onCancel={() => setMode(null)} onSave={(v) => { onSaveIncome(v); onClose(); }} />}
      {mode === "expense" && <TxForm categories={expenseCategories} onCancel={() => setMode(null)} onSave={(v) => { onSaveExpense(v); onClose(); }} pendingSchedules={pendingSchedules} linkableTemplates={linkableTemplates} />}
      {mode === "template" && <TemplateForm categories={expenseCategories} onCancel={() => setMode(null)} onSave={(v) => { onCreateTemplate(v); onClose(); }} />}
    </Sheet>
  );
}

/* ============================================================
   App root
   ============================================================ */

export default function App() {
  const [data, setData] = useState(buildEmptyData);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);

  const [adminUnlocked, setAdminUnlocked] = useState(false);

  const [remoteAbout, setRemoteAbout] = useState(null);
  useEffect(() => {
    fetchAboutConfig(APP_ID).then((cfg) => { if (cfg) setRemoteAbout(cfg); }).catch(() => {});
  }, []);
  useEffect(() => {
    if (sessionActive) pingUsage(APP_ID); // anonymous device count only — no personal data
  }, [sessionActive]);
  const donateInfo = useMemo(() => ({
    name: remoteAbout?.developer_name || DONATE_INFO.name,
    promptpay: remoteAbout?.promptpay || DONATE_INFO.promptpay,
    link: remoteAbout?.donate_link || DONATE_INFO.link,
    bankName: remoteAbout?.bank_name || "",
    bankAccountNo: remoteAbout?.bank_account_no || "",
    bankAccountName: remoteAbout?.bank_account_name || "",
  }), [remoteAbout]);
  const aboutText = remoteAbout?.about_text || DEFAULT_ABOUT_TEXT;

  const [screen, setScreen] = useState("dashboard");
  const [tplDetailId, setTplDetailId] = useState(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [donateOpen, setDonateOpen] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [reportYM, setReportYM] = useState({ y: SEED_YEAR, m: SEED_MONTH });

  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isStandalone, setIsStandalone] = useState(true); // assume installed until checked, avoids a flash of the banner
  const [isIOS, setIsIOS] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
    setIsStandalone(standalone);
    setIsIOS(/iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()));
    const handler = (e) => { e.preventDefault(); setInstallPromptEvent(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (isStandalone) { setShowInstallBanner(false); return; }
    const dismissedAt = localStorage.getItem("parauy:install-dismissed");
    const cooldownPassed = !dismissedAt || Date.now() - Number(dismissedAt) > 3 * 24 * 60 * 60 * 1000;
    if (cooldownPassed && (installPromptEvent || isIOS)) setShowInstallBanner(true);
  }, [isStandalone, installPromptEvent, isIOS]);

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem("parauy:install-dismissed", String(Date.now()));
  };
  const triggerInstall = async () => {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    await installPromptEvent.userChoice;
    setInstallPromptEvent(null);
    setShowInstallBanner(false);
  };

  // fonts
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Noto+Serif+Thai:wght@500;600;700&family=Noto+Sans+Thai:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600;700&display=swap";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  // load persisted data + profile
  useEffect(() => {
    (async () => {
      try {
        if (window.storage) {
          const res = await window.storage.get(DATA_KEY, false);
          if (res && res.value) {
            const loadedData = JSON.parse(res.value);
            const base = buildEmptyData();
            setData({ ...base, ...loadedData });
          } else {
            setData(buildSeed()); // first-time user: show sample data as a working example
          }
        }
      } catch (e) { /* first run */ }
      setDataLoaded(true);
      try {
        if (window.storage) {
          const res = await window.storage.get(PROFILE_KEY, false);
          if (res && res.value) setProfile(JSON.parse(res.value));
        }
      } catch (e) { /* no profile yet */ }
      setProfileLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!dataLoaded) return;
    const t = setTimeout(() => { if (window.storage) window.storage.set(DATA_KEY, JSON.stringify(data), false).catch(() => {}); }, 350);
    return () => clearTimeout(t);
  }, [data, dataLoaded]);

  const go = useCallback((s) => { setScreen(s); window.scrollTo(0, 0); }, []);
  const requestConfirm = (message, onConfirm) => setConfirmState({ message, onConfirm });

  /* ---- profile / auth ---- */
  const createProfile = (p) => {
    setProfile(p);
    setSessionActive(true);
    if (window.storage) window.storage.set(PROFILE_KEY, JSON.stringify(p), false).catch(() => {});
  };
  const saveProfile = (p) => {
    setProfile(p);
    if (window.storage) window.storage.set(PROFILE_KEY, JSON.stringify(p), false).catch(() => {});
  };
  const logout = () => { setSessionActive(false); go("dashboard"); };

  /* ---- hidden admin area ---- */
  const unlockAdmin = (pin) => {
    if (pin === ADMIN_ACCESS_CODE) { setAdminUnlocked(true); go("admin"); return true; }
    return false;
  };
  const lockAdmin = () => setAdminUnlocked(false);

  /* ---- data mutations ---- */
  const addIncome = (tx) => setData((d) => ({ ...d, incomeTx: [...d.incomeTx, { id: uid("inc"), ...tx }] }));
  const updateIncome = (id, patch) => setData((d) => ({ ...d, incomeTx: d.incomeTx.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const deleteIncome = (tx) => requestConfirm(`ลบรายรับ "${tx.category}" ${thb(tx.amount)}?`, () => setData((d) => ({ ...d, incomeTx: d.incomeTx.filter((t) => t.id !== tx.id) })));

  const addExpense = (tx) => setData((d) => ({ ...d, expenseTx: [...d.expenseTx, { id: uid("tx"), templateId: null, scheduleId: null, ...tx }] }));
  const addExpenseWithLink = (v) => {
    const { linkScheduleId, linkTemplateId, ...tx } = v;
    if (linkTemplateId) {
      setData((d) => {
        const template = d.templates.find((t) => t.id === linkTemplateId);
        if (!template) return { ...d, expenseTx: [...d.expenseTx, { id: uid("tx"), templateId: null, scheduleId: null, ...tx }] };
        const txId = uid("tx");
        const schedId = uid("sc");
        const newTx = { id: txId, date: tx.date, category: tx.category, amount: tx.amount, note: tx.note, templateId: template.id, scheduleId: schedId };
        const newSchedule = { id: schedId, templateId: template.id, date: tx.date, amount: tx.amount, status: "paid", txId };
        return { ...d, expenseTx: [...d.expenseTx, newTx], schedules: [...d.schedules, newSchedule] };
      });
      return;
    }
    if (!linkScheduleId) { addExpense(tx); return; }
    setData((d) => {
      const schedule = d.schedules.find((s) => s.id === linkScheduleId);
      if (!schedule || schedule.status === "paid") return { ...d, expenseTx: [...d.expenseTx, { id: uid("tx"), templateId: null, scheduleId: null, ...tx }] };
      const txId = uid("tx");
      const newTx = { id: txId, date: tx.date, category: tx.category, amount: tx.amount, note: tx.note, templateId: schedule.templateId, scheduleId: schedule.id };
      return {
        ...d,
        expenseTx: [...d.expenseTx, newTx],
        schedules: d.schedules.map((s) => (s.id === schedule.id ? { ...s, status: "paid", txId } : s)),
      };
    });
  };
  const updateExpense = (id, patch) => setData((d) => ({ ...d, expenseTx: d.expenseTx.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const deleteExpense = (tx) => requestConfirm(`ลบรายจ่าย "${tx.category}" ${thb(tx.amount)}?`, () => setData((d) => {
    let schedules = d.schedules;
    if (tx.scheduleId) schedules = schedules.map((s) => (s.id === tx.scheduleId ? { ...s, status: "planned", txId: null } : s));
    return { ...d, expenseTx: d.expenseTx.filter((t) => t.id !== tx.id), schedules };
  }));

  const addTemplate = (tpl) => {
    const id = uid("tpl");
    setData((d) => ({ ...d, templates: [...d.templates, { id, ...tpl }] }));
    setTplDetailId(id);
    go("templateDetail");
  };
  const deleteTemplate = (tpl) => requestConfirm(`ลบแผนค่าใช้จ่าย "${tpl.name}" พร้อมกำหนดการทั้งหมด?`, () => setData((d) => {
    const schedIds = new Set(d.schedules.filter((s) => s.templateId === tpl.id).map((s) => s.id));
    return { ...d, templates: d.templates.filter((t) => t.id !== tpl.id), schedules: d.schedules.filter((s) => s.templateId !== tpl.id), expenseTx: d.expenseTx.filter((t) => !schedIds.has(t.scheduleId)) };
  }));
  const updateTemplate = (id, patch) => setData((d) => ({ ...d, templates: d.templates.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));

  const toggleScheduleDay = (template, dateStr, atLimit) => {
    setData((d) => {
      const existing = d.schedules.find((s) => s.templateId === template.id && s.date === dateStr);
      if (existing) {
        const expenseTx = existing.txId ? d.expenseTx.filter((t) => t.id !== existing.txId) : d.expenseTx;
        return { ...d, schedules: d.schedules.filter((s) => s.id !== existing.id), expenseTx };
      }
      if (template.type === "once") {
        const others = d.schedules.filter((s) => s.templateId !== template.id);
        const removedTxIds = new Set(d.schedules.filter((s) => s.templateId === template.id && s.txId).map((s) => s.txId));
        const newSched = { id: uid("sc"), templateId: template.id, date: dateStr, amount: template.amountPerOccurrence, status: "planned", txId: null };
        return { ...d, schedules: [...others, newSched], expenseTx: d.expenseTx.filter((t) => !removedTxIds.has(t.id)) };
      }
      if (atLimit) return d;
      const newSched = { id: uid("sc"), templateId: template.id, date: dateStr, amount: template.amountPerOccurrence, status: "planned", txId: null };
      return { ...d, schedules: [...d.schedules, newSched] };
    });
  };

  const setScheduleStatus = (schedule, status) => {
    setData((d) => {
      const tpl = d.templates.find((t) => t.id === schedule.templateId);
      let expenseTx = d.expenseTx;
      let txId = schedule.txId;
      if (status === "paid" && schedule.status !== "paid") {
        const id = uid("tx");
        expenseTx = [...expenseTx, { id, date: schedule.date, category: tpl?.category || "อื่นๆ", amount: schedule.amount, note: "", templateId: schedule.templateId, scheduleId: schedule.id }];
        txId = id;
      } else if (status !== "paid" && schedule.txId) {
        expenseTx = expenseTx.filter((t) => t.id !== schedule.txId);
        txId = null;
      }
      return { ...d, expenseTx, schedules: d.schedules.map((s) => (s.id === schedule.id ? { ...s, status, txId } : s)) };
    });
  };

  const deleteSchedule = (schedule) => requestConfirm("ลบกำหนดการวันนี้ออกจากแผน?", () => setData((d) => ({
    ...d, schedules: d.schedules.filter((s) => s.id !== schedule.id),
    expenseTx: schedule.txId ? d.expenseTx.filter((t) => t.id !== schedule.txId) : d.expenseTx,
  })));

  const addCategory = (name) => setData((d) => (d.expenseCategories.includes(name) ? d : { ...d, expenseCategories: [...d.expenseCategories, name] }));
  const deleteCategory = (name) => requestConfirm(`ลบหมวดหมู่ "${name}"?`, () => setData((d) => ({ ...d, expenseCategories: d.expenseCategories.filter((c) => c !== name), inactiveExpenseCategories: (d.inactiveExpenseCategories || []).filter((c) => c !== name) })));
  const toggleExpenseCategoryActive = (name) => setData((d) => {
    const inactive = new Set(d.inactiveExpenseCategories || []);
    if (inactive.has(name)) inactive.delete(name); else inactive.add(name);
    return { ...d, inactiveExpenseCategories: Array.from(inactive) };
  });
  const toggleCategoryRecurring = (name) => setData((d) => {
    const recurring = { ...(d.categoryRecurring || {}) };
    const onlyMonth = { ...(d.categoryOnlyMonth || {}) };
    const isRecurring = recurring[name] !== false;
    if (isRecurring) {
      // switching to "this month only" — remember which month
      recurring[name] = false;
      onlyMonth[name] = dstr(todayObj.getFullYear(), todayObj.getMonth(), 1).slice(0, 7);
    } else {
      recurring[name] = true;
      delete onlyMonth[name];
    }
    return { ...d, categoryRecurring: recurring, categoryOnlyMonth: onlyMonth };
  });
  const addIncomeCategory = (name) => setData((d) => (d.incomeCategories.includes(name) ? d : { ...d, incomeCategories: [...d.incomeCategories, name] }));
  const toggleIncomeCategoryRecurring = (name) => setData((d) => {
    const recurring = { ...(d.incomeCategoryRecurring || {}) };
    const onlyMonth = { ...(d.incomeCategoryOnlyMonth || {}) };
    const isRecurring = recurring[name] !== false;
    if (isRecurring) {
      recurring[name] = false;
      onlyMonth[name] = dstr(todayObj.getFullYear(), todayObj.getMonth(), 1).slice(0, 7);
    } else {
      recurring[name] = true;
      delete onlyMonth[name];
    }
    return { ...d, incomeCategoryRecurring: recurring, incomeCategoryOnlyMonth: onlyMonth };
  });
  const toggleIncomeCategoryActive = (name) => setData((d) => {
    const inactive = new Set(d.inactiveIncomeCategories || []);
    if (inactive.has(name)) inactive.delete(name); else inactive.add(name);
    return { ...d, inactiveIncomeCategories: Array.from(inactive) };
  });
  const deleteIncomeCategory = (name) => requestConfirm(`ลบหมวดหมู่ "${name}"?`, () => setData((d) => ({ ...d, incomeCategories: d.incomeCategories.filter((c) => c !== name) })));
  const setBudget = (category, amount) => setData((d) => ({ ...d, budgets: { ...d.budgets, [category]: amount } }));
  const setOpeningBalance = (v) => setData((d) => ({ ...d, openingBalance: v }));
  const resetAll = () => requestConfirm("ลบข้อมูลทั้งหมด (รายรับ รายจ่าย งบประมาณ แผนค่าใช้จ่าย) เพื่อเริ่มต้นใหม่แบบว่างเปล่า? การกระทำนี้ย้อนกลับไม่ได้", () => setData(buildEmptyData()));
  const loadDemoData = () => requestConfirm("โหลดข้อมูลตัวอย่างทับข้อมูลปัจจุบัน? ใช้สำหรับทดสอบ/สาธิตเท่านั้น", () => setData(buildSeed()));

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `banthuek-parauy-backup-${todayStr}.json`; a.click();
    URL.revokeObjectURL(url);
  };
  const importData = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const base = buildEmptyData();
        setData({ ...base, ...parsed });
      } catch (err) { alert("ไฟล์ไม่ถูกต้อง ไม่สามารถนำเข้าข้อมูลได้"); }
    };
    reader.readAsText(file);
  };

  /* ---- derived (current real month, for dashboard) ---- */
  const activeExpenseCategories = useMemo(() => {
    const inactive = new Set(data.inactiveExpenseCategories || []);
    return data.expenseCategories.filter((c) => !inactive.has(c));
  }, [data.expenseCategories, data.inactiveExpenseCategories]);

  const activeIncomeCategories = useMemo(() => {
    const inactive = new Set(data.inactiveIncomeCategories || []);
    const recurringMap = data.incomeCategoryRecurring || {};
    const onlyMonthMap = data.incomeCategoryOnlyMonth || {};
    const defaultSet = new Set(DEFAULT_INCOME_CATEGORIES);
    const thisMonth = dstr(todayObj.getFullYear(), todayObj.getMonth(), 1).slice(0, 7);
    return data.incomeCategories.filter((c) => {
      if (inactive.has(c)) return false;
      if (defaultSet.has(c)) return true; // basic categories always continue
      const recurring = recurringMap[c] !== false;
      if (recurring) return true;
      return onlyMonthMap[c] === thisMonth; // month-limited category: only its own month
    });
  }, [data.incomeCategories, data.inactiveIncomeCategories, data.incomeCategoryRecurring, data.incomeCategoryOnlyMonth]);

  const pendingSchedules = useMemo(() => {
    const tplById = {};
    data.templates.forEach((t) => { tplById[t.id] = t; });
    return data.schedules
      .filter((s) => s.status === "planned" && tplById[s.templateId])
      .map((s) => ({ schedule: s, templateName: tplById[s.templateId].name, category: tplById[s.templateId].category }))
      .sort((a, b) => a.schedule.date.localeCompare(b.schedule.date));
  }, [data.schedules, data.templates]);

  const linkableTemplates = useMemo(() => {
    // Only offer templates that still have room for an undated occurrence —
    // once a template's schedule count reaches its plannedCount (e.g. a
    // "once" template that already has its 1 date set), it must NOT show
    // up in the "not yet dated" group anymore. Multi-occurrence templates
    // with remaining room keep showing as before — unaffected by this.
    const scheduledCountByTpl = {};
    data.schedules.forEach((s) => { scheduledCountByTpl[s.templateId] = (scheduledCountByTpl[s.templateId] || 0) + 1; });
    return data.templates
      .map((t) => ({ ...t, remaining: t.plannedCount - (scheduledCountByTpl[t.id] || 0) }))
      .filter((t) => t.remaining > 0);
  }, [data.templates, data.schedules]);

  const monthStats = useCallback((y, m) => {
    const mk = dstr(y, m, 1).slice(0, 7);
    const monthIncome = data.incomeTx.filter((t) => monthKey(t.date) === mk).reduce((s, t) => s + t.amount, 0);
    const monthExpense = data.expenseTx.filter((t) => monthKey(t.date) === mk).reduce((s, t) => s + t.amount, 0);
    const byCat = {};
    data.expenseTx.filter((t) => monthKey(t.date) === mk).forEach((t) => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
    const breakdown = Object.entries(byCat).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);

    const tplCategoryById = {};
    data.templates.forEach((t) => { tplCategoryById[t.id] = t.category; });
    const plannedByCat = {};
    data.schedules.filter((s) => s.status === "planned" && monthKey(s.date) === mk).forEach((s) => {
      const cat = tplCategoryById[s.templateId];
      if (cat) plannedByCat[cat] = (plannedByCat[cat] || 0) + s.amount;
    });

    const inactive = new Set(data.inactiveExpenseCategories || []);
    const recurringMap = data.categoryRecurring || {};
    const onlyMonthMap = data.categoryOnlyMonth || {};
    const defaultSet = new Set(DEFAULT_EXPENSE_CATEGORIES);
    const monthCats = data.expenseCategories.filter((c) => {
      if (inactive.has(c)) return false;
      if (defaultSet.has(c)) return true; // basic categories always continue
      const recurring = recurringMap[c] !== false;
      if (recurring) return true;
      return onlyMonthMap[c] === mk; // month-limited category: only its own month
    });
    const allCats = new Set(monthCats);
    const budgetRows = Array.from(allCats).map((category) => {
      const budget = data.budgets[category] || 0;
      const actual = byCat[category] || 0;
      const planned = plannedByCat[category] || 0;
      const pct = budget > 0 ? (actual / budget) * 100 : (actual > 0 ? 100 : 0);
      let tone;
      if (budget <= 0) tone = actual > 0 ? "warning" : "normal";
      else if (actual > budget) tone = "over";
      else if (actual === budget) tone = "full";
      else if (pct >= 80) tone = "warning";
      else tone = "normal";
      return { category, budget, actual, planned, pct, tone };
    }).sort((a, b) => b.pct - a.pct);
    return { monthIncome, monthExpense, breakdown, budgetRows };
  }, [data]);

  const derived = useMemo(() => {
    const totalIncome = data.incomeTx.reduce((s, t) => s + t.amount, 0);
    const totalPaidExpense = data.expenseTx.reduce((s, t) => s + t.amount, 0);
    const currentBalance = data.openingBalance + totalIncome - totalPaidExpense;
    const plannedSchedules = data.schedules.filter((s) => s.status === "planned");
    const unpaidPlanned = plannedSchedules.reduce((s, x) => s + x.amount, 0);
    const overdue = plannedSchedules.filter((s) => s.date < todayStr);
    const overdueAmount = overdue.reduce((s, x) => s + x.amount, 0);
    const availableBalance = currentBalance - unpaidPlanned;
    const cur = monthStats(todayObj.getFullYear(), todayObj.getMonth());
    return { currentBalance, unpaidPlanned, availableBalance, overdue, overdueAmount, ...cur };
  }, [data, monthStats]);

  const reportStats = useMemo(() => monthStats(reportYM.y, reportYM.m), [monthStats, reportYM]);

  const profileStats = useMemo(() => ({
    totalTx: data.incomeTx.length + data.expenseTx.length,
    activeDays: new Set([...data.incomeTx.map((t) => t.date), ...data.expenseTx.map((t) => t.date)]).size,
    templates: data.templates.length,
  }), [data]);

  const monthNavProps = {
    year: reportYM.y, month: reportYM.m,
    onPrev: () => { const d = new Date(reportYM.y, reportYM.m - 1, 1); setReportYM({ y: d.getFullYear(), m: d.getMonth() }); },
    onNext: () => { const d = new Date(reportYM.y, reportYM.m + 1, 1); setReportYM({ y: d.getFullYear(), m: d.getMonth() }); },
  };

  const template = tplDetailId ? data.templates.find((t) => t.id === tplDetailId) : null;

  const NAV = [
    { key: "dashboard", label: "หน้าหลัก", icon: Home },
    { key: "calendar", label: "ปฏิทิน", icon: Calendar },
    { key: "__add", label: "เพิ่ม", icon: Plus },
    { key: "report", label: "รายงาน", icon: BarChart3 },
    { key: "settings", label: "ตั้งค่า", icon: Settings },
  ];

  // ---- auth gate ----
  if (!profileLoaded || !dataLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.cover }}>
        <div style={{ fontFamily: DISPLAY_FONT, color: C.goldBright, fontSize: 15 }}>กำลังโหลด...</div>
      </div>
    );
  }
  if (!profile) return <WelcomeScreen onCreate={createProfile} isStandalone={isStandalone} isIOS={isIOS} onInstallClick={triggerInstall} canInstall={!!installPromptEvent} />;
  if (!sessionActive) return <LoginScreen profile={profile} onLogin={() => setSessionActive(true)} />;
  if (screen === "adminGate") return <AdminGateScreen onUnlock={unlockAdmin} go={go} />;
  if (screen === "admin" && !adminUnlocked) return <AdminGateScreen onUnlock={unlockAdmin} go={go} />;
  if (screen === "admin") return (
    <>
      <AdminScreen go={go} donate={donateInfo} isLive={!!remoteAbout} onOpenPreview={() => setDonateOpen(true)} onLockAdmin={lockAdmin} onLoadDemo={loadDemoData} />
      <DonateSheet open={donateOpen} onClose={() => setDonateOpen(false)} donate={donateInfo} isOwnerView={true} go={go} aboutText={aboutText} />
      <ConfirmDialog state={confirmState} onCancel={() => setConfirmState(null)} />
    </>
  );

  let body;
  if (screen === "dashboard") body = <Dashboard data={data} derived={derived} go={go} profile={profile} onSecretTap={() => go("adminGate")} onOpenDonate={() => setDonateOpen(true)} />;
  else if (screen === "calendar") body = (
    <CalendarScreen data={data} expenseCategories={activeExpenseCategories} incomeCategories={activeIncomeCategories}
      onAddIncome={addIncome} onAddExpense={addExpenseWithLink} onUpdateIncome={updateIncome} onUpdateExpense={updateExpense}
      onDeleteIncome={deleteIncome} onDeleteExpense={deleteExpense} pendingSchedules={pendingSchedules} linkableTemplates={linkableTemplates} />
  );
  else if (screen === "income") body = (
    <TxListScreen title="รายรับ" tone="income" txs={data.incomeTx} categories={activeIncomeCategories} go={go}
      onAdd={() => setEditTx({ kind: "income", tx: null })} onEdit={(tx) => setEditTx({ kind: "income", tx })} onDelete={deleteIncome} />
  );
  else if (screen === "expense") body = (
    <TxListScreen title="รายจ่าย" tone="expense" txs={data.expenseTx} categories={activeExpenseCategories} go={go}
      onAdd={() => setEditTx({ kind: "expense", tx: null })} onEdit={(tx) => setEditTx({ kind: "expense", tx })} onDelete={deleteExpense} />
  );
  else if (screen === "templates") body = <TemplatesScreen templates={data.templates} schedules={data.schedules} go={go} setTplDetail={setTplDetailId} onDelete={deleteTemplate} />;
  else if (screen === "templateNew") body = (
    <div className="px-4 pt-5 pb-4">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => go("templates")} style={{ color: C.inkSoft }}><ArrowLeft size={18} /></button>
        <div style={{ fontFamily: DISPLAY_FONT, fontSize: 20, fontWeight: 700, color: C.ink }}>สร้างแผนค่าใช้จ่าย</div>
      </div>
      <Card style={{ padding: 16 }}><TemplateForm categories={activeExpenseCategories} onCancel={() => go("templates")} onSave={addTemplate} /></Card>
    </div>
  );
  else if (screen === "templateDetail" && template) body = (
    <TemplateDetail template={template} schedules={data.schedules} go={go} onToggleDay={toggleScheduleDay} onSetStatus={setScheduleStatus} onDeleteSchedule={deleteSchedule} onUpdateTemplate={updateTemplate} categories={activeExpenseCategories} />
  );
  else if (screen === "budget") body = <BudgetScreen go={go} budgetRows={reportStats.budgetRows} onSetBudget={setBudget} monthNav={monthNavProps} />;
  else if (screen === "report") body = <ReportScreen stats={reportStats} monthNav={monthNavProps} />;
  else if (screen === "categories") body = (
    <CategoryScreen go={go} expenseCategories={data.expenseCategories} inactiveExpenseCategories={data.inactiveExpenseCategories || []} incomeCategories={data.incomeCategories} inactiveIncomeCategories={data.inactiveIncomeCategories || []}
      categoryRecurring={data.categoryRecurring || {}} onToggleRecurring={toggleCategoryRecurring}
      incomeCategoryRecurring={data.incomeCategoryRecurring || {}} onToggleIncomeRecurring={toggleIncomeCategoryRecurring}
      onAddExpense={addCategory} onDeleteExpense={deleteCategory} onToggleExpenseActive={toggleExpenseCategoryActive}
      onAddIncome={addIncomeCategory} onDeleteIncome={deleteIncomeCategory} onToggleIncomeActive={toggleIncomeCategoryActive} />
  );
  else if (screen === "profile") body = (
    <ProfileScreen go={go} profile={profile} onSaveProfile={saveProfile} onLogout={logout} stats={profileStats} />
  );
  else if (screen === "guide") body = <GuideScreen go={go} />;
  else if (screen === "settings") body = (
    <SettingsScreen go={go} openingBalance={data.openingBalance} onSetOpening={setOpeningBalance} onReset={resetAll}
      onExport={exportData} onImport={importData}
      profile={profile} onUpdatePin={(pin) => saveProfile({ ...profile, pin })} />
  );
  else if (screen === "about") body = <AboutScreen go={go} onOpenDonate={() => setDonateOpen(true)} aboutText={aboutText} />;
  else body = <Dashboard data={data} derived={derived} go={go} profile={profile} onSecretTap={() => go("adminGate")} onOpenDonate={() => setDonateOpen(true)} />;

  return (
    <div className="min-h-screen w-full flex justify-center" style={{ background: C.sage, fontFamily: BODY_FONT }}>
      <div className="w-full max-w-md relative" style={{ background: C.paper, minHeight: "100vh" }}>
        {showInstallBanner && <InstallBanner isIOS={isIOS} onInstallClick={triggerInstall} onDismiss={dismissInstallBanner} />}
        <div style={{ paddingBottom: 88 }}>{body}</div>

        <div className="fixed bottom-0 w-full max-w-md" style={{ background: C.cover }}>
          <div className="flex items-center justify-around py-2 px-2" style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
            {NAV.map((n) => {
              if (n.key === "__add") {
                return (
                  <button key="add" onClick={() => setQuickAddOpen(true)} className="flex flex-col items-center -mt-6">
                    <div className="rounded-full p-3.5" style={{ background: C.gold, boxShadow: "0 4px 12px rgba(184,147,62,0.5)" }}><Plus size={20} color={C.coverDeep} /></div>
                  </button>
                );
              }
              const isActive = screen === n.key;
              return (
                <button key={n.key} onClick={() => go(n.key)} className="flex flex-col items-center gap-0.5 py-1 px-3">
                  <n.icon size={19} color={isActive ? C.goldBright : "#9FB3A6"} />
                  <span style={{ fontFamily: BODY_FONT, fontSize: 10, color: isActive ? C.goldBright : "#9FB3A6" }}>{n.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <QuickAddSheet open={quickAddOpen} onClose={() => setQuickAddOpen(false)} expenseCategories={activeExpenseCategories} incomeCategories={activeIncomeCategories} onSaveIncome={addIncome} onSaveExpense={addExpenseWithLink} onCreateTemplate={addTemplate} pendingSchedules={pendingSchedules} linkableTemplates={linkableTemplates} />

        <Sheet open={!!editTx} onClose={() => setEditTx(null)} title={editTx?.tx ? "แก้ไขรายการ" : "เพิ่มรายการ"}>
          {editTx && (
            <TxForm categories={editTx.kind === "income" ? activeIncomeCategories : activeExpenseCategories} initial={editTx.tx} onCancel={() => setEditTx(null)} pendingSchedules={pendingSchedules} linkableTemplates={linkableTemplates}
              onSave={(v) => {
                if (editTx.kind === "income") { if (editTx.tx) updateIncome(editTx.tx.id, v); else addIncome(v); }
                else { if (editTx.tx) updateExpense(editTx.tx.id, v); else addExpenseWithLink(v); }
                setEditTx(null);
              }} />
          )}
        </Sheet>

        <DonateSheet open={donateOpen} onClose={() => setDonateOpen(false)} donate={donateInfo} isOwnerView={false} go={go} aboutText={aboutText} />
        <ConfirmDialog state={confirmState} onCancel={() => setConfirmState(null)} />
      </div>
    </div>
  );
}
