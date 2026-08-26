import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const C = {
  cover: "#173F30",
  coverDeep: "#0E2A20",
  gold: "#B8933E",
  goldBright: "#D9B872",
  paper: "#FAF6EC",
  paperLine: "#E3DAC0",
  ink: "#20291F",
  inkSoft: "#66705F",
  expense: "#9C3B2E",
  income: "#2E6B4F",
  card: "#FFFFFF",
};

const font = "system-ui, -apple-system, sans-serif";

const inputStyle = {
  width: "100%",
  border: `1px solid ${C.paperLine}`,
  borderRadius: 10,
  padding: "10px 12px",
  fontFamily: font,
  fontSize: 14,
  color: C.ink,
  background: "#fff",
  outline: "none",
};

function Field({ label, children }) {
  return (
    <label className="block mb-4">
      <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 4, fontFamily: font }}>{label}</div>
      {children}
    </label>
  );
}

const BLANK_FORM = { app_id: "", developer_name: "", about_text: "", promptpay: "", bank_name: "", bank_account_no: "", bank_account_name: "", donate_link: "" };

function ConfigError() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: C.cover, fontFamily: font }}>
      <div className="max-w-sm text-center" style={{ color: "#fff" }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>ยังไม่ได้ตั้งค่า Supabase</div>
        <div style={{ fontSize: 13, opacity: 0.8 }}>
          สร้างไฟล์ .env.local แล้วใส่ VITE_SUPABASE_URL กับ VITE_SUPABASE_ANON_KEY
          ตามตัวอย่างใน .env.example แล้วรัน npm run dev ใหม่
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [apps, setApps] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("list"); // "list" | "edit" | "new"
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState(null);

  // restore/track the Supabase Auth session (real auth, not a hardcoded string)
  useEffect(() => {
    if (!supabase) { setSessionChecked(true); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadApps();
  }, [session]);

  const loadApps = async () => {
    if (!supabase) return;
    const [{ data: configData }, { data: usageData }] = await Promise.all([
      supabase.from("app_config").select("*").order("app_id"),
      supabase.rpc("get_app_usage_counts"),
    ]);
    const usageByApp = {};
    (usageData || []).forEach((u) => { usageByApp[u.app_id] = u; });
    const merged = (configData || []).map((app) => ({
      ...app,
      device_count: usageByApp[app.app_id]?.device_count ?? 0,
      last_active: usageByApp[app.app_id]?.last_active ?? null,
    }));
    setApps(merged);
    setLoaded(true);
  };

  const login = async () => {
    if (!supabase) return;
    if (!email.trim() || !password) { setLoginError("กรอกอีเมลและรหัสผ่าน"); return; }
    setLoggingIn(true);
    setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoggingIn(false);
    if (error) setLoginError("เข้าสู่ระบบไม่สำเร็จ: อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  };

  const logout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setApps([]);
    setLoaded(false);
    setView("list");
  };

  const openEdit = (app) => { setForm(app); setMessage(null); setView("edit"); };
  const openNew = () => { setForm(BLANK_FORM); setMessage(null); setView("new"); };
  const backToList = () => { setView("list"); loadApps(); };

  const save = async () => {
    if (!supabase) return;
    if (!form.app_id.trim()) { setMessage({ kind: "error", text: "กรอก App ID ก่อน (เช่น parauy, app2)" }); return; }
    setSaving(true);
    setMessage(null);
    const { error } = await supabase.from("app_config").upsert({
      app_id: form.app_id.trim(),
      developer_name: form.developer_name || "",
      about_text: form.about_text || "",
      promptpay: form.promptpay || "",
      bank_name: form.bank_name || "",
      bank_account_no: form.bank_account_no || "",
      bank_account_name: form.bank_account_name || "",
      donate_link: form.donate_link || "",
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      setMessage({ kind: "error", text: `บันทึกไม่สำเร็จ: ${error.message}` });
    } else {
      setMessage({ kind: "ok", text: "บันทึกเรียบร้อยแล้ว" });
      loadApps();
    }
  };

  const remove = async () => {
    if (!supabase || !form.app_id) return;
    if (!window.confirm(`ลบข้อมูลของแอป "${form.app_id}" ทิ้งถาวร?`)) return;
    setDeleting(true);
    const { error } = await supabase.from("app_config").delete().eq("app_id", form.app_id);
    setDeleting(false);
    if (error) {
      setMessage({ kind: "error", text: `ลบไม่สำเร็จ: ${error.message}` });
    } else {
      backToList();
    }
  };

  if (!supabase) return <ConfigError />;
  if (!sessionChecked) return null;

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: `linear-gradient(160deg, ${C.cover}, ${C.coverDeep})`, fontFamily: font }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div style={{ fontWeight: 700, fontSize: 20, color: "#fff" }}>Central Admin</div>
            <div style={{ fontSize: 12, color: C.goldBright, marginTop: 4 }}>เข้าสู่ระบบก่อนดู/แก้ไขข้อมูล</div>
          </div>
          <div className="rounded-2xl p-6" style={{ background: C.paper }}>
            <Field label="อีเมล">
              <input
                style={inputStyle}
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setLoginError(""); }}
                placeholder="admin@example.com"
              />
            </Field>
            <Field label="รหัสผ่าน">
              <input
                style={inputStyle}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setLoginError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") login(); }}
                placeholder="••••••••"
              />
            </Field>
            {loginError && <div style={{ fontSize: 12, color: C.expense, marginBottom: 12 }}>{loginError}</div>}
            <button
              onClick={login}
              disabled={loggingIn || !email.trim() || !password}
              className="w-full py-3 rounded-xl font-medium"
              style={{ background: loggingIn || !email.trim() || !password ? "#C9C4B0" : C.cover, color: C.paper, fontSize: 14 }}
            >
              {loggingIn ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
            </button>
            <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 12, lineHeight: 1.6 }}>
              ยังไม่มีบัญชี? สร้างได้จาก Supabase Dashboard → Authentication → Users → Add user
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex justify-center px-4 py-8" style={{ background: `linear-gradient(160deg, ${C.cover}, ${C.coverDeep})`, fontFamily: font }}>
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div style={{ fontWeight: 700, fontSize: 20, color: "#fff" }}>Central Admin</div>
            <div style={{ fontSize: 12, color: C.goldBright }}>จัดการข้อมูล About / Donate ของทุกแอปในเครือ</div>
          </div>
          <button onClick={logout} style={{ fontSize: 12, color: C.goldBright, textDecoration: "underline" }}>
            ออกจากระบบ
          </button>
        </div>

        <div className="rounded-2xl p-5" style={{ background: C.paper }}>
          {view === "list" && (
            <>
              <div className="flex items-center justify-between mb-3">
                <div style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>แอปทั้งหมด ({apps.length})</div>
                <button onClick={openNew} className="px-3 py-1.5 rounded-lg" style={{ background: C.cover, color: "#fff", fontSize: 12 }}>+ เพิ่มแอปใหม่</button>
              </div>
              {!loaded && <div style={{ fontSize: 13, color: C.inkSoft }}>กำลังโหลด...</div>}
              {loaded && apps.length === 0 && (
                <div style={{ fontSize: 13, color: C.inkSoft, textAlign: "center", padding: "20px 0" }}>ยังไม่มีแอปในระบบ กด "+ เพิ่มแอปใหม่" เพื่อเริ่ม</div>
              )}
              <div className="space-y-2">
                {apps.map((app) => {
                  const channel = app.promptpay ? "PromptPay" : app.bank_account_no ? `ธ.${app.bank_name || "-"}` : app.donate_link ? "ลิงก์" : "ยังไม่ตั้งค่า";
                  return (
                    <button key={app.app_id} onClick={() => openEdit(app)} className="w-full text-left p-3 rounded-xl flex items-center justify-between" style={{ border: `1px solid ${C.paperLine}`, background: C.card }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: C.ink, fontFamily: "monospace" }}>{app.app_id}</div>
                        <div style={{ fontSize: 11, color: C.inkSoft }}>{app.developer_name || "(ยังไม่ตั้งชื่อ)"} · {channel}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.income }}>{app.device_count ?? 0}</div>
                          <div style={{ fontSize: 9, color: C.inkSoft }}>เครื่อง</div>
                        </div>
                        <span style={{ color: C.gold }}>›</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {(view === "edit" || view === "new") && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <button onClick={backToList} style={{ color: C.inkSoft, fontSize: 18 }}>←</button>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>{view === "new" ? "เพิ่มแอปใหม่" : `แก้ไข: ${form.app_id}`}</div>
              </div>

              {view === "edit" && (
                <div className="rounded-xl p-3 mb-4" style={{ background: C.paper, border: `1px solid ${C.paperLine}` }}>
                  <div style={{ fontSize: 11, color: C.inkSoft }}>
                    จำนวนเครื่องที่ใช้งาน (นับแบบไม่ระบุตัวตน): <b style={{ color: C.income }}>{form.device_count ?? 0}</b> เครื่อง
                    {form.last_active && <> · ใช้งานล่าสุด {new Date(form.last_active).toLocaleDateString("th-TH")}</>}
                  </div>
                </div>
              )}

              <Field label="App ID (ตัวระบุแอป ไม่ซ้ำกัน เช่น parauy, app2)">
                <input style={inputStyle} value={form.app_id} onChange={(e) => setForm({ ...form, app_id: e.target.value.trim() })} placeholder="เช่น parauy" disabled={view === "edit"} />
              </Field>
              <Field label="ชื่อผู้พัฒนา / ผู้รับบริจาค">
                <input style={inputStyle} value={form.developer_name} onChange={(e) => setForm({ ...form, developer_name: e.target.value })} placeholder="เช่น อาร์ตี้" />
              </Field>
              <Field label="ข้อความหน้า 'เกี่ยวกับแอปนี้'">
                <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={form.about_text} onChange={(e) => setForm({ ...form, about_text: e.target.value })} />
              </Field>

              <div className="h-px my-4" style={{ background: C.paperLine }} />
              <div style={{ fontSize: 11, color: C.inkSoft, marginBottom: 10 }}>ใส่ช่องทางที่ใช้จริงเท่านั้น เว้นว่างช่องที่ไม่ใช้ได้ (แอปนี้แสดงเฉพาะช่องที่มีข้อมูล)</div>

              <Field label="PromptPay ID / ข้อความสำหรับสร้าง QR">
                <input style={inputStyle} value={form.promptpay} onChange={(e) => setForm({ ...form, promptpay: e.target.value })} placeholder="เบอร์โทร / เลขบัตร ปชช." />
              </Field>
              <Field label="ธนาคาร (ถ้าใช้โอนบัญชีแทน PromptPay)">
                <input style={inputStyle} value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} placeholder="เช่น กสิกรไทย, ไทยพาณิชย์" />
              </Field>
              <Field label="เลขบัญชี">
                <input style={inputStyle} value={form.bank_account_no} onChange={(e) => setForm({ ...form, bank_account_no: e.target.value })} placeholder="xxx-x-xxxxx-x" />
              </Field>
              <Field label="ชื่อบัญชี">
                <input style={inputStyle} value={form.bank_account_name} onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })} />
              </Field>
              <Field label="ลิงก์สนับสนุนอื่น (ถ้ามี)">
                <input style={inputStyle} value={form.donate_link} onChange={(e) => setForm({ ...form, donate_link: e.target.value })} placeholder="https://..." />
              </Field>

              {message && (
                <div style={{ fontSize: 12, marginBottom: 12, color: message.kind === "ok" ? C.income : C.expense }}>{message.text}</div>
              )}

              <button
                onClick={save}
                disabled={saving}
                className="w-full py-3 rounded-xl font-medium mb-2"
                style={{ background: saving ? "#C9C4B0" : C.cover, color: C.paper, fontSize: 14 }}
              >
                {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
              </button>

              {view === "edit" && (
                <button
                  onClick={remove}
                  disabled={deleting}
                  className="w-full py-2.5 rounded-xl font-medium"
                  style={{ border: `1px solid ${C.expense}`, color: C.expense, fontSize: 13, background: "transparent" }}
                >
                  {deleting ? "กำลังลบ..." : `ลบแอป "${form.app_id}" ออกจากระบบ`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
