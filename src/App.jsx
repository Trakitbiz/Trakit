import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

// ── Design tokens ─────────────────────────────────────────────────────────
const C = {
  rose:"#16A34A", roseDark:"#0F6B37", rosePale:"#E8F7EE", roseMid:"#BFE8CE",
  ink:"#0A0A0A", inkMid:"#3A3A3A", muted:"#8A8A8A",
  surface:"#FFFFFF", bg:"#FAFAFA", border:"#E5E5E5",
  green:"#22C55E", greenPale:"#EAFBF0",
  red:"#DC2626", redPale:"#FEF2F2",
  amber:"#CA8A04", amberPale:"#FEFCE8",
  blue:"#2563EB", bluePale:"#EFF6FF",
};
const F_DISPLAY = "'Space Grotesk', -apple-system, sans-serif"; // brand wordmark, greeting name
const F_MONO = "'IBM Plex Mono', monospace"; // currency/stat figures
const TAB_LABELS = {products:"Products",sales:"Sales",customers:"Customers",suppliers:"Suppliers",invoices:"Invoices",debts:"Debts",analytics:"Analytics",alerts:"Alerts",profile:"Profile"};

const sp = s => {
  if(["In Stock","Received","Accepted","Paid"].includes(s)) return {bg:C.greenPale,color:C.green};
  if(["Sold Out","Cancelled","Overdue","Outstanding","Credit"].includes(s)) return {bg:C.redPale,color:C.red};
  if(["Low Stock","In Progress","Pending","Draft","Partially Paid"].includes(s)) return {bg:C.amberPale,color:C.amber};
  if(["Dispatched","Sent"].includes(s)) return {bg:C.bluePale,color:C.blue};
  return {bg:"#F5F5F5",color:"#555"};
};

const today = new Date().toISOString().slice(0,10);
const f = n => `₦${Number(n).toLocaleString()}`;

// ── Base UI ───────────────────────────────────────────────────────────────
const Badge = ({l}) => { const p=sp(l); return <span style={{background:p.bg,color:p.color,padding:"2px 9px",borderRadius:20,fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>{l}</span>; };

const Btn = ({children,v="primary",sm,full,loading,onClick,style:st,disabled}) => {
  const s={primary:{bg:C.rose,col:"#fff",b:"none"},dark:{bg:C.ink,col:"#fff",b:"none"},ghost:{bg:"transparent",col:C.inkMid,b:`1px solid ${C.border}`},success:{bg:C.green,col:"#fff",b:"none"},outline:{bg:"transparent",col:C.roseDark,b:`1px solid ${C.roseDark}`},danger:{bg:C.red,col:"#fff",b:"none"}}[v]||{};
  return <button onClick={onClick} disabled={loading||disabled} style={{background:s.bg,color:s.col,border:s.b,padding:sm?"5px 12px":"10px 22px",borderRadius:8,fontWeight:700,fontSize:sm?11:14,cursor:"pointer",width:full?"100%":"auto",fontFamily:"inherit",opacity:(loading||disabled)?0.6:1,...st}}>{loading?"Please wait…":children}</button>;
};

const Card = ({children,style:st}) => <div style={{background:C.surface,borderRadius:12,padding:16,boxShadow:"0 1px 6px rgba(0,0,0,0.06)",border:`1px solid ${C.border}`,...st}}>{children}</div>;

const Inp = ({label,error,...p}) => (
  <div style={{marginBottom:14}}>
    {label&&<label style={{display:"block",fontSize:12,fontWeight:700,color:C.inkMid,marginBottom:4}}>{label}</label>}
    <input {...p} style={{width:"100%",padding:"10px 13px",borderRadius:9,border:`1.5px solid ${error?C.red:C.border}`,fontSize:14,boxSizing:"border-box",fontFamily:"inherit",outline:"none",...p.style}}
      onFocus={e=>{e.target.style.borderColor=C.rose;e.target.style.boxShadow=`0 0 0 3px ${C.rosePale}`;}}
      onBlur={e=>{e.target.style.borderColor=error?C.red:C.border;e.target.style.boxShadow="none";}}/>
    {error&&<div style={{fontSize:11,color:C.red,marginTop:3}}>{error}</div>}
  </div>
);

const Sel = ({label,children,...p}) => (
  <div style={{marginBottom:14}}>
    {label&&<label style={{display:"block",fontSize:12,fontWeight:700,color:C.inkMid,marginBottom:4}}>{label}</label>}
    <select {...p} style={{width:"100%",padding:"10px 13px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:14,boxSizing:"border-box",background:"#fff",fontFamily:"inherit",...p.style}}>{children}</select>
  </div>
);

const Modal = ({title,onClose,children,wide}) => (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:999,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"14px 10px",overflowY:"auto"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:wide?520:420,overflow:"hidden",marginTop:14}}>
      <div style={{padding:"13px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${C.border}`}}>
        <span style={{fontWeight:800,fontSize:15,color:C.ink}}>{title}</span>
        <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:C.muted,lineHeight:1}}>×</button>
      </div>
      <div style={{padding:"18px",maxHeight:"75vh",overflowY:"auto"}}>{children}</div>
    </div>
  </div>
);

const Toast = ({msg,type}) => <div style={{position:"fixed",bottom:72,left:"50%",transform:"translateX(-50%)",background:type==="error"?C.red:C.green,color:"#fff",padding:"10px 20px",borderRadius:24,fontSize:12,fontWeight:700,zIndex:9999,whiteSpace:"nowrap"}}>{type==="error"?"⚠️":"✅"} {msg}</div>;

const DelBtn = ({onDelete}) => (
  <button onClick={onDelete} style={{background:C.redPale,color:C.red,border:"none",borderRadius:7,padding:"4px 12px",fontSize:11,cursor:"pointer",fontWeight:700,fontFamily:"inherit"}}>Delete</button>
);

const downloadInvoice = (inv) => {
  const html=`<html><head><title>${inv.no}</title><style>body{font-family:Arial,sans-serif;padding:40px;color:#111;max-width:600px;margin:0 auto}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;border-bottom:2px solid #16A34A;padding-bottom:20px}.biz{font-size:24px;font-weight:900}.badge{background:#EAFBF0;color:#0F6B37;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px}.label{font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}.val{font-size:14px;font-weight:600}table{width:100%;border-collapse:collapse;margin-bottom:20px}th{text-align:left;font-size:10px;font-weight:700;color:#888;text-transform:uppercase;padding:8px 0;border-bottom:2px solid #eee}td{padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:13px}.total{font-size:20px;font-weight:900;text-align:right;margin-top:12px}.note{margin-top:24px;padding:14px;background:#E8F7EE;border-radius:8px;font-size:13px;font-style:italic}.footer{margin-top:32px;text-align:center;font-size:11px;color:#aaa}</style></head><body><div class="header"><div><div class="biz">${inv.biz}</div><div style="font-size:13px;color:#888;margin-top:4px">${inv.no}</div></div><div class="badge">${inv.status}</div></div><div class="grid"><div><div class="label">Bill To</div><div class="val">${inv.customer_name||""}</div><div style="font-size:12px;color:#888">${inv.customer_phone||""}</div></div><div style="text-align:right"><div class="label">Date</div><div class="val">${inv.date}</div>${inv.due?`<div class="label" style="margin-top:8px">Due</div><div style="font-size:12px;color:#c0392b">${inv.due}</div>`:""}</div></div><table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th style="text-align:right">Total</th></tr></thead><tbody>${inv.items.map(i=>`<tr><td>${i.name}</td><td>${i.qty}</td><td>₦${Number(i.price).toLocaleString()}</td><td style="text-align:right;font-weight:700">₦${(i.qty*i.price).toLocaleString()}</td></tr>`).join("")}</tbody></table><div class="total">Total: ₦${inv.total.toLocaleString()}</div>${inv.note?`<div class="note">${inv.note}</div>`:""}<div class="footer">Generated by Trakit</div></body></html>`;
  const w=window.open("","_blank");
  w.document.write(html);
  w.document.close();
  setTimeout(()=>w.print(),400);
};

// ══════════════════════════════════════════════════════════════════════════
// RESET PASSWORD SCREEN — handles the link from Supabase password reset email
// ══════════════════════════════════════════════════════════════════════════
const ResetPasswordScreen = ({ onDone }) => {
  const [pass,setPass]       = useState("");
  const [confirm,setConfirm] = useState("");
  const [loading,setLoading] = useState(false);
  const [errors,setErrors]   = useState({});
  const [err,setErr]         = useState("");
  const [done,setDone]       = useState(false);

  const handleReset = async () => {
    const e = {};
    if(pass.length < 6)          e.pass    = "Password must be at least 6 characters";
    if(pass !== confirm)         e.confirm  = "Passwords do not match";
    setErrors(e);
    if(Object.keys(e).length) return;

    setLoading(true); setErr("");
    try {
      const { error } = await supabase.auth.updateUser({ password: pass });
      if(error) { setErr(error.message); return; }
      setDone(true);
      setTimeout(() => onDone(), 2000);
    } catch {
      setErr("Something went wrong. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:60,height:60,borderRadius:17,background:C.rose,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:28,marginBottom:12}}>🔑</div>
          <div style={{fontWeight:900,fontSize:24,color:C.ink,letterSpacing:-0.5}}>Set new password</div>
          <div style={{fontSize:13,color:C.muted,marginTop:4}}>Choose a strong password for your account</div>
        </div>

        <Card style={{padding:28}}>
          {done ? (
            <div style={{textAlign:"center",padding:"10px 0"}}>
              <div style={{fontSize:36,marginBottom:12}}>✅</div>
              <div style={{fontWeight:800,fontSize:16,color:C.ink,marginBottom:6}}>Password updated!</div>
              <div style={{fontSize:13,color:C.muted}}>Taking you to the app…</div>
            </div>
          ) : (<>
            <div style={{fontWeight:800,fontSize:17,color:C.ink,marginBottom:18}}>Create new password</div>

            <Inp
              label="New Password"
              type="password"
              placeholder="Min. 6 characters"
              value={pass}
              onChange={e=>setPass(e.target.value)}
              error={errors.pass}
            />
            <Inp
              label="Confirm Password"
              type="password"
              placeholder="Type it again"
              value={confirm}
              onChange={e=>setConfirm(e.target.value)}
              error={errors.confirm}
              onKeyDown={e=>e.key==="Enter"&&handleReset()}
            />

            {err && <div style={{background:C.redPale,color:C.red,borderRadius:8,padding:"10px 14px",fontSize:13,marginBottom:14,fontWeight:600}}>{err}</div>}

            <Btn full loading={loading} onClick={handleReset}>Update Password →</Btn>
          </>)}
        </Card>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// AUTH SCREEN — Login + Forgot Password only
// Signup is handled on the landing page (with payment)
// ══════════════════════════════════════════════════════════════════════════
const LANDING_URL = process.env.REACT_APP_LANDING_URL || "https://usetrakit.store/";

const AuthScreen = ({onAuth}) => {
  const [mode,setMode]       = useState("login");   // "login" | "forgot"
  const [email,setEmail]     = useState("");
  const [pass,setPass]       = useState("");
  const [loading,setLoading] = useState(false);
  const [errors,setErrors]   = useState({});
  const [msg,setMsg]         = useState("");
  const [err,setErr]         = useState("");

  const clearState = (nextMode) => {
    setMode(nextMode); setErr(""); setMsg(""); setErrors({});
    setEmail(""); setPass("");
  };

  // ── Login ──────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    const e = {};
    if(!email.trim()) e.email = "Email is required";
    else if(!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
    if(!pass || pass.length < 6) e.pass = "Password must be at least 6 characters";
    setErrors(e);
    if(Object.keys(e).length) return;

    setLoading(true); setErr("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });
      if(error) { setErr(error.message); return; }
      onAuth(data.user, data.session);
    } catch {
      setErr("Something went wrong. Please try again.");
    } finally { setLoading(false); }
  };

  // ── Forgot password ────────────────────────────────────────────────────
  const handleForgot = async () => {
    const e = {};
    if(!email.trim()) e.email = "Email is required";
    else if(!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
    setErrors(e);
    if(Object.keys(e).length) return;

    setLoading(true); setErr("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      if(error) { setErr(error.message); return; }
      setMsg("✅ Password reset email sent! Check your inbox and follow the link.");
    } catch {
      setErr("Something went wrong. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:400}}>

        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:60,height:60,borderRadius:17,background:C.ink,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:12,color:C.green}}>
            <svg viewBox="0 0 24 24" width="52%" height="52%"><rect x="4" y="6" width="16" height="3.6" rx="1.2" fill="currentColor"/><rect x="10.3" y="9" width="3.4" height="9" rx="1.2" fill="currentColor"/></svg>
          </div>
          <div style={{fontWeight:700,fontSize:26,color:C.ink,letterSpacing:-0.5,fontFamily:F_DISPLAY}}>Trakit</div>
          <div style={{fontSize:13,color:C.muted,marginTop:4}}>Track stock, sales & purchases</div>
        </div>

        <Card style={{padding:28}}>

          {/* ── LOGIN MODE ── */}
          {mode === "login" && <>
            <div style={{fontWeight:800,fontSize:17,color:C.ink,marginBottom:18}}>Welcome back</div>

            <Inp
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e=>setEmail(e.target.value)}
              error={errors.email}
            />
            <Inp
              label="Password"
              type="password"
              placeholder="Your password"
              value={pass}
              onChange={e=>setPass(e.target.value)}
              error={errors.pass}
              onKeyDown={e=>e.key==="Enter"&&handleLogin()}
            />

            {/* Forgot password link */}
            <div style={{textAlign:"right",marginTop:-8,marginBottom:14}}>
              <span
                style={{fontSize:12,color:C.rose,cursor:"pointer",fontWeight:700}}
                onClick={()=>clearState("forgot")}
              >
                Forgot password?
              </span>
            </div>

            {err && <div style={{background:C.redPale,color:C.red,borderRadius:8,padding:"10px 14px",fontSize:13,marginBottom:14,fontWeight:600}}>{err}</div>}

            <Btn full loading={loading} onClick={handleLogin}>Log In →</Btn>

            {/* Bottom links */}
            <div style={{textAlign:"center",marginTop:18,fontSize:13,color:C.muted}}>
              Don't have an account?{" "}
              <a
                href="https://usetrakit.store/"
                style={{color:C.rose,fontWeight:700,textDecoration:"none"}}
                target="_self"
              >
                Get Access
              </a>
            </div>
          </>}

          {/* ── FORGOT PASSWORD MODE ── */}
          {mode === "forgot" && <>
            <div style={{fontWeight:800,fontSize:17,color:C.ink,marginBottom:6}}>Reset your password</div>
            <div style={{fontSize:13,color:C.muted,marginBottom:18,lineHeight:1.5}}>
              Enter your email and we'll send you a link to reset your password.
            </div>

            <Inp
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e=>setEmail(e.target.value)}
              error={errors.email}
              onKeyDown={e=>e.key==="Enter"&&handleForgot()}
            />

            {err && <div style={{background:C.redPale,color:C.red,borderRadius:8,padding:"10px 14px",fontSize:13,marginBottom:14,fontWeight:600}}>{err}</div>}
            {msg && <div style={{background:C.greenPale,color:C.green,borderRadius:8,padding:"10px 14px",fontSize:13,marginBottom:14,fontWeight:600}}>{msg}</div>}

            <Btn full loading={loading} onClick={handleForgot}>Send Reset Link →</Btn>

            <div style={{textAlign:"center",marginTop:16,fontSize:13,color:C.muted}}>
              <span
                style={{color:C.rose,cursor:"pointer",fontWeight:700}}
                onClick={()=>clearState("login")}
              >
                ← Back to Login
              </span>
            </div>
          </>}

        </Card>
      </div>
    </div>
  );
};

// MAIN APP
// ══════════════════════════════════════════════════════════════════════════
const MainApp = ({user,profile:initProfile,onSignOut}) => {
  const [profile,setProfile] = useState(initProfile);
  const [tab,setTab] = useState("home");

  const [products,setProducts]   = useState([]);
  const [sales,setSales]         = useState([]);
  const [purchases,setPurchases] = useState([]);
  const [customers,setCustomers] = useState([]);
  const [suppliers,setSuppliers] = useState([]);
  const [invoices,setInvoices]   = useState([]);
  const [debtPayments,setDebtPayments] = useState([]);
  const [dataLoading,setDataLoading] = useState(true);

  const [modal,setModal]   = useState(null);
  const [selected,setSel]  = useState(null);
  const [toast,setToast]   = useState(null);
  const [bizName,setBizName] = useState(profile?.business_name||"My Store");
  const [profileForm,setProfileForm] = useState({
    business_name: profile?.business_name||"",
    owner_name: profile?.owner_name||"",
    phone: profile?.phone||"",
    city: profile?.city||"",
  });

  const showToast = (msg,type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),2500); };
  const confirmDelete = (msg,fn) => { if(window.confirm(msg)) fn(); };

  // ── Load all data from Supabase ─────────────────────────────────────────
  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [p,s,pu,c,su,inv,dp] = await Promise.all([
        supabase.from("products").select("*").eq("user_id",user.id).order("created_at",{ascending:false}),
        supabase.from("sales").select("*").eq("user_id",user.id).order("created_at",{ascending:false}),
        supabase.from("purchases").select("*").eq("user_id",user.id).order("created_at",{ascending:false}),
        supabase.from("customers").select("*").eq("user_id",user.id).order("created_at",{ascending:false}),
        supabase.from("suppliers").select("*").eq("user_id",user.id).order("created_at",{ascending:false}),
        supabase.from("invoices").select("*").eq("user_id",user.id).order("created_at",{ascending:false}),
        supabase.from("debt_payments").select("*").eq("user_id",user.id).order("created_at",{ascending:false}),
      ]);
      setProducts(p.data||[]);
      setSales(s.data||[]);
      setPurchases(pu.data||[]);
      setCustomers(c.data||[]);
      setSuppliers(su.data||[]);
      setInvoices(inv.data||[]);
      setDebtPayments(dp.data||[]);
    } catch(e) {
      showToast("Failed to load data","error");
    } finally { setDataLoading(false); }
  },[user.id]);

  useEffect(()=>{ loadData(); },[loadData]);

  // ── Computed ────────────────────────────────────────────────────────────
  const todaySales = sales.filter(s=>s.sale_date===today);
  const todayRev   = todaySales.reduce((s,r)=>s+r.qty*r.unit_price,0);

  // ── Revenue Breakdown: actual money received today, by method ──────────
  // Counts money received at sale time today (each sale's ORIGINAL payment only —
  // amount_paid grows later as debt payments come in via other methods, so we use
  // initial_amount_paid, frozen at creation, to avoid re-attributing that money)
  // PLUS debt payments collected today against older credit/partial sales, each
  // stored with its own individual amount and method.
  // A credit sale itself contributes ₦0 here until it's actually paid down —
  // that's what keeps this from double-counting revenue.
  const revenueByMethod = { Cash:0, Transfer:0, POS:0 };
  todaySales.forEach(s => {
    const initial = s.initial_amount_paid!=null ? Number(s.initial_amount_paid) : Number(s.amount_paid)||0;
    if(s.payment_method && initial>0) revenueByMethod[s.payment_method] = (revenueByMethod[s.payment_method]||0) + initial;
  });
  debtPayments.filter(dp=>dp.payment_date===today).forEach(dp => {
    revenueByMethod[dp.payment_method] = (revenueByMethod[dp.payment_method]||0) + Number(dp.amount);
  });
  const totalRevenueToday = revenueByMethod.Cash + revenueByMethod.Transfer + revenueByMethod.POS;

  // ── Debt tracking: one row per customer with any currently-open sale ───
  const openSales = sales.filter(s=>Number(s.outstanding_amount)>0);
  const debtByCustomer = {};
  openSales.forEach(s => {
    const key = s.customer_id;
    if(!key) return; // shouldn't happen — partial/credit sales require a customer
    if(!debtByCustomer[key]) debtByCustomer[key] = { customer_id:key, name:s.customer_name, original:0, paid:0, outstanding:0, dueDate:null, sales:[] };
    const d = debtByCustomer[key];
    d.original += s.qty*s.unit_price;
    d.paid += Number(s.amount_paid)||0;
    d.outstanding += Number(s.outstanding_amount)||0;
    d.sales.push(s);
    if(s.due_date && (!d.dueDate || s.due_date<d.dueDate)) d.dueDate = s.due_date;
  });
  const debtRows = Object.values(debtByCustomer).sort((a,b)=>b.outstanding-a.outstanding);
  const totalOutstanding = debtRows.reduce((s,r)=>s+r.outstanding,0);
  const totalCollected = debtPayments.reduce((s,r)=>s+Number(r.amount),0);
  const [analyticsPeriod,setAnalyticsPeriod] = useState("all"); // "day" | "month" | "all"
  const [analyticsDay,setAnalyticsDay] = useState(today); // "YYYY-MM-DD" — user can pick any day, e.g. yesterday
  const [analyticsMonth,setAnalyticsMonth] = useState(today.slice(0,7)); // "YYYY-MM" — user can pick any month, not just current
  const analyticsSales = analyticsPeriod==="day" ? sales.filter(s=>s.sale_date===analyticsDay)
    : analyticsPeriod==="month" ? sales.filter(s=>s.sale_date && s.sale_date.slice(0,7)===analyticsMonth)
    : sales;
  const analyticsDebtPayments = analyticsPeriod==="day" ? debtPayments.filter(d=>d.payment_date===analyticsDay)
    : analyticsPeriod==="month" ? debtPayments.filter(d=>d.payment_date && d.payment_date.slice(0,7)===analyticsMonth)
    : debtPayments;
  const collectedThisPeriod = analyticsDebtPayments.reduce((s,r)=>s+Number(r.amount),0);
  // Debt still outstanding from sales that originated in the selected period — "of what I sold in
  // this window, how much is still owed" — separate from totalOutstanding, which is the all-time snapshot.
  const debtFromPeriodSales = analyticsSales.reduce((s,r)=>s+(Number(r.outstanding_amount)||0),0);
  // Same frozen-initial-payment logic as the Home card's revenueByMethod — avoids the
  // Cash/POS double-count bug when a sale's remaining balance is later paid via a
  // different method than the original payment.
  const analyticsRevenueByMethod = { Cash:0, Transfer:0, POS:0 };
  analyticsSales.forEach(s => {
    const initial = s.initial_amount_paid!=null ? Number(s.initial_amount_paid) : Number(s.amount_paid)||0;
    if(s.payment_method && initial>0) analyticsRevenueByMethod[s.payment_method] = (analyticsRevenueByMethod[s.payment_method]||0) + initial;
  });
  analyticsDebtPayments.forEach(dp => {
    analyticsRevenueByMethod[dp.payment_method] = (analyticsRevenueByMethod[dp.payment_method]||0) + Number(dp.amount);
  });
  const totalRev   = analyticsSales.reduce((s,r)=>s+r.qty*r.unit_price,0);
  const totalProfit= analyticsSales.reduce((s,r)=>s+(r.unit_price-(r.cost_price||0))*r.qty,0);
  const lowStock   = products.filter(p=>p.current_stock>0&&p.current_stock<=p.min_stock).length;
  const outStock   = products.filter(p=>p.current_stock===0).length;
  const channelMap = {};
  analyticsSales.forEach(s=>{ channelMap[s.channel]=(channelMap[s.channel]||0)+s.qty*s.unit_price; });

  // ── Forms ───────────────────────────────────────────────────────────────
  const [sf,setSf] = useState({product_id:"",customer_id:"",qty:1,unit_price:"",status:"Accepted",sale_date:today,channel:"Whatsapp",note:"",payment_status:"Paid",payment_method:"Cash",amount_paid:"",due_date:""});
  const [df,setDf] = useState({customer_id:"",amount:"",payment_method:"Cash",payment_date:today});
  const [supplierView,setSupplierView] = useState("suppliers"); // "suppliers" | "purchases"
  const [debtView,setDebtView] = useState("outstanding"); // "outstanding" | "history"
  const [productSearch,setProductSearch] = useState("");
  const [salesSearch,setSalesSearch] = useState("");
  const [customerSearch,setCustomerSearch] = useState("");
  const [supplierSearch,setSupplierSearch] = useState("");
  const [purchaseSearch,setPurchaseSearch] = useState("");
  const [invoiceSearch,setInvoiceSearch] = useState("");
  const match = (text,q) => (text||"").toLowerCase().includes(q.trim().toLowerCase());
  const [pf,setPf] = useState({name:"",category:"",cost:"",price:"",current_stock:"",min_stock:5});
  const [cf,setCf] = useState({name:"",phone:"",email:"",city:"",note:""});
  const [suf,setSuf] = useState({name:"",contact:"",phone:"",email:"",city:"",category:""});
  const [puf,setPuf] = useState({product_id:"",supplier_id:"",qty:1,cost:"",purchase_date:today,status:"Pending"});
  const [inf,setInf] = useState({customer_id:"",items:[{name:"",qty:1,price:""}],note:"",date:today,due:""});

  // ── Submit sale ─────────────────────────────────────────────────────────
  const sendLowStockAlert = (productName, currentStock, minStock) => {
    // Fire-and-forget — a failed email should never block or error out a sale.
    fetch("/api/send-low-stock-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toEmail: user.email, bizName, productName, currentStock, minStock }),
    }).catch(()=>{});
  };

  const submitSale = async () => {
    if(!sf.product_id||!sf.unit_price) return showToast("Select product and price","error");
    const p = products.find(x=>x.id===sf.product_id);
    const c = customers.find(x=>x.id===sf.customer_id);
    const total = Number(sf.qty)*Number(sf.unit_price);

    if(modal!=="editSale" && p) {
      if(p.current_stock<=0) return showToast(`${p.name} is out of stock`,"error");
      if(Number(sf.qty)>p.current_stock) return showToast(`Only ${p.current_stock} ${p.name} left in stock`,"error");
    }

    // ── Payment validation ──────────────────────────────────────────────
    if((sf.payment_status==="Partially Paid"||sf.payment_status==="Credit") && !sf.customer_id) {
      return showToast("Select a customer for a partial or credit sale, so the debt can be tracked","error");
    }
    let amountPaid, outstanding, paymentMethod, dueDate;
    if(sf.payment_status==="Paid") {
      if(!sf.payment_method) return showToast("Select a payment method","error");
      amountPaid = total; outstanding = 0; paymentMethod = sf.payment_method; dueDate = null;
    } else if(sf.payment_status==="Partially Paid") {
      const paid = Number(sf.amount_paid);
      if(!paid||paid<=0) return showToast("Enter the amount paid","error");
      if(paid>total) return showToast("Amount paid can't be more than the sale total","error");
      if(!sf.payment_method) return showToast("Select a payment method","error");
      amountPaid = paid; outstanding = total-paid; paymentMethod = sf.payment_method; dueDate = sf.due_date||null;
    } else { // Credit
      amountPaid = 0; outstanding = total; paymentMethod = null; dueDate = sf.due_date||null;
    }

    const row = {
      user_id: user.id,
      sale_code: "S"+String(sales.length+1).padStart(3,"0"),
      product_id: sf.product_id, product_name: p?.name||"",
      customer_id: sf.customer_id||null, customer_name: c?.name||"Walk-in",
      qty: Number(sf.qty), unit_price: Number(sf.unit_price),
      cost_price: p?.cost||0,
      status: sf.status, sale_date: sf.sale_date,
      channel: sf.channel, note: sf.note,
      payment_status: sf.payment_status, payment_method: paymentMethod,
      amount_paid: amountPaid, outstanding_amount: outstanding, due_date: dueDate,
    };

    if(modal==="editSale") {
      // Only reset the frozen initial-payment portion if this sale has no debt
      // payments recorded against it yet — otherwise editing it would silently
      // corrupt the Cash/Transfer/POS split already logged in debt_payments.
      const hasDebtPayments = debtPayments.some(dp=>dp.sale_id===selected);
      if(!hasDebtPayments) row.initial_amount_paid = amountPaid;
      await supabase.from("sales").update(row).eq("id",selected);
      showToast("Sale updated!");
    } else {
      row.initial_amount_paid = amountPaid;
      await supabase.from("sales").insert(row);
      if(p) {
        const newStock = Math.max(0,p.current_stock-Number(sf.qty));
        await supabase.from("products").update({current_stock:newStock}).eq("id",p.id);
        // Only fire once, right as stock crosses from above the threshold to at/below it —
        // avoids sending a repeat email on every subsequent sale while still low.
        if(newStock<=p.min_stock && p.current_stock>p.min_stock) {
          sendLowStockAlert(p.name, newStock, p.min_stock);
        }
      }
      showToast("Sale recorded!");
    }
    await loadData();
    setSf({product_id:"",customer_id:"",qty:1,unit_price:"",status:"Accepted",sale_date:today,channel:"Whatsapp",note:"",payment_status:"Paid",payment_method:"Cash",amount_paid:"",due_date:""});
    setModal(null);
  };

  // ── Record a debt payment — applied oldest-open-sale-first ─────────────
  const submitDebtPayment = async () => {
    const amount = Number(df.amount);
    if(!amount||amount<=0) return showToast("Enter a valid amount","error");
    if(!df.payment_method) return showToast("Select a payment method","error");
    const debt = debtRows.find(d=>d.customer_id===df.customer_id);
    if(!debt) return showToast("Customer not found","error");
    if(amount>debt.outstanding) return showToast(`Payment can't exceed the outstanding balance of ${f(debt.outstanding)}`,"error");

    let remaining = amount;
    const openForCustomer = [...debt.sales].sort((a,b)=>a.sale_date.localeCompare(b.sale_date));
    for(const s of openForCustomer) {
      if(remaining<=0) break;
      const applied = Math.min(remaining, Number(s.outstanding_amount));
      if(applied<=0) continue;
      const newPaid = Number(s.amount_paid)+applied;
      const newOutstanding = Number(s.outstanding_amount)-applied;
      await supabase.from("sales").update({
        amount_paid: newPaid,
        outstanding_amount: newOutstanding,
        payment_status: newOutstanding<=0 ? "Paid" : "Partially Paid",
      }).eq("id",s.id);
      await supabase.from("debt_payments").insert({
        user_id: user.id, customer_id: df.customer_id, sale_id: s.id,
        amount: applied, payment_method: df.payment_method, payment_date: df.payment_date,
      });
      remaining -= applied;
    }
    await loadData();
    setDf({customer_id:"",amount:"",payment_method:"Cash",payment_date:today});
    setModal(null);
    showToast("Payment recorded!");
  };

  // ── Submit product ──────────────────────────────────────────────────────
  const submitProduct = async () => {
    if(!pf.name||!pf.price) return showToast("Name and price required","error");
    const row = {
      user_id: user.id,
      product_code: selected?"":("P"+String(products.length+1).padStart(3,"0")),
      name: pf.name, category: pf.category,
      cost: Number(pf.cost)||0, price: Number(pf.price),
      current_stock: Number(pf.current_stock)||0,
      min_stock: Number(pf.min_stock)||5,
    };
    if(selected) {
      delete row.product_code; delete row.user_id;
      await supabase.from("products").update(row).eq("id",selected);
      showToast("Product updated!");
    } else {
      await supabase.from("products").insert(row);
      showToast("Product added!");
    }
    await loadData(); setModal(null);
  };

  // ── Submit customer ─────────────────────────────────────────────────────
  const submitCustomer = async () => {
    if(!cf.name) return showToast("Name required","error");
    const row = { user_id:user.id, name:cf.name, phone:cf.phone, email:cf.email, city:cf.city, note:cf.note };
    if(selected) { await supabase.from("customers").update(row).eq("id",selected); showToast("Updated!"); }
    else { await supabase.from("customers").insert(row); showToast("Customer added!"); }
    await loadData(); setModal(null);
  };

  // ── Submit supplier ─────────────────────────────────────────────────────
  const submitSupplier = async () => {
    if(!suf.name) return showToast("Name required","error");
    const row = { user_id:user.id, name:suf.name, contact:suf.contact, phone:suf.phone, email:suf.email, city:suf.city, category:suf.category };
    if(selected) { await supabase.from("suppliers").update(row).eq("id",selected); showToast("Updated!"); }
    else { await supabase.from("suppliers").insert(row); showToast("Supplier added!"); }
    await loadData(); setModal(null);
  };

  // ── Submit purchase ─────────────────────────────────────────────────────
  const submitPurchase = async () => {
    if(!puf.product_id||!puf.cost) return showToast("Product and cost required","error");
    const p = products.find(x=>x.id===puf.product_id);
    const s = suppliers.find(x=>x.id===puf.supplier_id);
    const row = {
      user_id: user.id,
      purchase_code: "PUR"+String(purchases.length+1).padStart(3,"0"),
      product_id: puf.product_id, product_name: p?.name||"",
      supplier_id: puf.supplier_id||null, supplier_name: s?.name||"",
      qty: Number(puf.qty), cost: Number(puf.cost),
      total_cost: Number(puf.qty)*Number(puf.cost),
      purchase_date: puf.purchase_date, status: puf.status,
    };
    await supabase.from("purchases").insert(row);
    if(puf.status==="Received"&&p) await supabase.from("products").update({current_stock:p.current_stock+Number(puf.qty)}).eq("id",p.id);
    await loadData();
    setPuf({product_id:"",supplier_id:"",qty:1,cost:"",purchase_date:today,status:"Pending"});
    setModal(null); showToast("Purchase logged!");
  };

  // ── Submit invoice ──────────────────────────────────────────────────────
  const submitInvoice = async () => {
    const c = customers.find(x=>x.id===inf.customer_id);
    if(!c) return showToast("Select a customer","error");
    if(!inf.items.some(i=>i.name&&i.price)) return showToast("Add at least one item","error");
    const total = inf.items.reduce((s,i)=>s+(Number(i.price)*Number(i.qty)||0),0);
    const row = {
      user_id: user.id,
      invoice_no: "INV-"+String(invoices.length+1).padStart(3,"0"),
      biz: bizName,
      customer_id: c.id, customer_name: c.name, customer_phone: c.phone,
      items: inf.items.filter(i=>i.name&&i.price).map(i=>({...i,qty:Number(i.qty),price:Number(i.price)})),
      total, status: "Draft",
      invoice_date: inf.date, due_date: inf.due||null, note: inf.note,
    };
    await supabase.from("invoices").insert(row);
    await loadData(); setModal(null); showToast("Invoice created!");
  };

  // ── Update statuses ─────────────────────────────────────────────────────
  const updateSaleStatus = async (id,status) => {
    await supabase.from("sales").update({status}).eq("id",id);
    setSales(prev=>prev.map(s=>s.id===id?{...s,status}:s));
  };

  const updatePurStatus = async (id,status,productId,qty) => {
    const prev = purchases.find(x=>x.id===id);
    await supabase.from("purchases").update({status}).eq("id",id);
    if(status==="Received"&&prev?.status!=="Received") {
      const p = products.find(x=>x.id===productId);
      if(p) await supabase.from("products").update({current_stock:p.current_stock+qty}).eq("id",productId);
    }
    await loadData();
  };

  const updateInvStatus = async (id,status) => {
    await supabase.from("invoices").update({status}).eq("id",id);
    setInvoices(prev=>prev.map(i=>i.id===id?{...i,status}:i));
  };

  // ── Save profile ────────────────────────────────────────────────────────
  const saveProfile = async () => {
    if(!profileForm.business_name.trim()) return showToast("Business name required","error");
    await supabase.from("profiles").update({
      business_name: profileForm.business_name,
      owner_name: profileForm.owner_name,
      phone: profileForm.phone,
      city: profileForm.city,
      updated_at: new Date().toISOString(),
    }).eq("id",user.id);
    setBizName(profileForm.business_name);
    showToast("Profile saved!");
  };

  // ── Open forms ──────────────────────────────────────────────────────────
  const openProd = (p) => { setSel(p?p.id:null); setPf(p?{name:p.name,category:p.category||"",cost:p.cost,price:p.price,current_stock:p.current_stock,min_stock:p.min_stock}:{name:"",category:"",cost:"",price:"",current_stock:"",min_stock:5}); setModal("product"); };
  const openCust = (c) => { setSel(c?c.id:null); setCf(c?{name:c.name,phone:c.phone||"",email:c.email||"",city:c.city||"",note:c.note||""}:{name:"",phone:"",email:"",city:"",note:""}); setModal("customer"); };
  const openSup  = (s) => { setSel(s?s.id:null); setSuf(s?{name:s.name,contact:s.contact||"",phone:s.phone||"",email:s.email||"",city:s.city||"",category:s.category||""}:{name:"",contact:"",phone:"",email:"",city:"",category:""}); setModal("supplier"); };
  const openEditSale = (s) => { setSel(s.id); setSf({product_id:s.product_id,customer_id:s.customer_id||"",qty:s.qty,unit_price:s.unit_price,status:s.status,sale_date:s.sale_date,channel:s.channel,note:s.note||"",payment_status:s.payment_status||"Paid",payment_method:s.payment_method||"Cash",amount_paid:s.amount_paid!=null?String(s.amount_paid):"",due_date:s.due_date||""}); setModal("editSale"); };

  const TABS = [{id:"home",icon:"🏠",l:"Home"},{id:"products",icon:"📦",l:"Products"},{id:"sales",icon:"🛒",l:"Sales"},{id:"profile",icon:"👤",l:"Profile"}];
  const ALL_PAGES = [
    {id:"products",icon:"📦",l:"Products",chip:C.greenPale},
    {id:"sales",icon:"🛒",l:"Sales",chip:C.bluePale},
    {id:"customers",icon:"👥",l:"Customers",chip:"#F3E8FF"},
    {id:"suppliers",icon:"🏭",l:"Suppliers",chip:C.border},
    {id:"invoices",icon:"🧾",l:"Invoices",chip:C.rosePale},
    {id:"debts",icon:"💳",l:"Debts",chip:C.redPale},
    {id:"analytics",icon:"📈",l:"Analytics",chip:"#F3E8FF"},
    {id:"alerts",icon:"🔔",l:"Alerts",chip:C.amberPale},
  ];

  const NavIcon = ({t}) => (
    <div onClick={()=>setTab(t.id)} style={{background:C.surface,borderRadius:14,padding:"13px 4px",textAlign:"center",cursor:"pointer",border:`1px solid ${C.border}`,display:"flex",flexDirection:"column",alignItems:"center",gap:7}}>
      <span style={{width:34,height:34,borderRadius:10,background:t.chip,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{t.icon}</span>
      <span style={{fontSize:9.5,fontWeight:700,color:C.inkMid}}>{t.l}</span>
    </div>
  );

  const CATS = ["Beauty","Makeup","Health","Electronics","Clothing","Food","Home","Fashion","Other"];
  const CHANNELS = ["Whatsapp","Instagram","Facebook","Tiktok","In Store","Other"];

  if(dataLoading) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:52,height:52,borderRadius:14,background:C.ink,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:12,color:C.green}}>
          <svg viewBox="0 0 24 24" width="52%" height="52%"><rect x="4" y="6" width="16" height="3.6" rx="1.2" fill="currentColor"/><rect x="10.3" y="9" width="3.4" height="9" rx="1.2" fill="currentColor"/></svg>
        </div>
        <div style={{color:C.muted,fontWeight:600}}>Loading your data…</div>
      </div>
    </div>
  );

  return (
    <div style={{fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",background:C.bg,minHeight:"100vh",paddingBottom:68}}>
      {toast&&<Toast msg={toast.msg} type={toast.type}/>}

      {/* Header */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"11px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100}}>
        {tab==="home"?(
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{width:30,height:30,borderRadius:8,background:C.ink,display:"flex",alignItems:"center",justifyContent:"center",color:C.green,flexShrink:0}}>
              <svg viewBox="0 0 24 24" width="60%" height="60%"><rect x="4" y="6" width="16" height="3.6" rx="1.2" fill="currentColor"/><rect x="10.3" y="9" width="3.4" height="9" rx="1.2" fill="currentColor"/></svg>
            </span>
            <div style={{fontWeight:700,fontSize:15,color:C.ink,fontFamily:F_DISPLAY}}>Trakit</div>
          </div>
        ):(
          <button onClick={()=>setTab("home")} style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:"inherit"}}>
            <span style={{fontSize:20,color:C.ink,lineHeight:1}}>←</span>
            <span style={{fontWeight:700,fontSize:16,color:C.ink,fontFamily:F_DISPLAY,textTransform:"capitalize"}}>{TAB_LABELS[tab]||tab}</span>
          </button>
        )}
        <button onClick={()=>setTab("profile")} style={{width:34,height:34,borderRadius:9,background:C.rosePale,border:`1px solid ${C.roseMid}`,cursor:"pointer",fontWeight:700,color:C.roseDark,fontSize:13,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center"}}>
          {bizName.charAt(0).toUpperCase()}
        </button>
      </div>

      {/* Bottom nav */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:C.surface,borderTop:`1px solid ${C.border}`,display:"flex",zIndex:100}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"8px 0 6px",border:"none",background:"none",cursor:"pointer",fontSize:10,fontWeight:tab===t.id?800:500,color:tab===t.id?C.roseDark:C.muted,display:"flex",flexDirection:"column",alignItems:"center",gap:3,fontFamily:"inherit",borderTop:`2.5px solid ${tab===t.id?C.roseDark:"transparent"}`}}>
            <span style={{fontSize:20}}>{t.icon}</span>{t.l}
          </button>
        ))}
      </div>

      <div style={{padding:14,maxWidth:720,margin:"0 auto"}}>

        {/* HOME */}
        {tab==="home"&&<div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:10.5,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:0.6}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}</div>
            <div style={{fontWeight:700,fontSize:20,color:C.ink,fontFamily:F_DISPLAY,marginTop:2}}>{bizName}</div>
          </div>
          <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:0.8,marginBottom:8}}>Today's Summary</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:16}}>
            <div style={{background:C.surface,borderRadius:11,padding:"13px 14px",border:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:28,height:28,borderRadius:8,background:C.rosePale,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>💵</div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:9.5,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>Sales Revenue</div>
                <div style={{fontSize:17,fontWeight:600,color:C.ink,fontFamily:F_MONO,whiteSpace:"nowrap"}}>{f(todayRev)}</div>
              </div>
            </div>
            <div style={{background:C.surface,borderRadius:11,padding:"13px 14px",border:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:28,height:28,borderRadius:8,background:C.bluePale,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>📦</div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:9.5,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>Units Sold</div>
                <div style={{fontSize:17,fontWeight:600,color:C.ink,fontFamily:F_MONO}}>{todaySales.reduce((s,r)=>s+r.qty,0)}</div>
              </div>
            </div>
            <div style={{background:C.surface,borderRadius:11,padding:"13px 14px",border:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:28,height:28,borderRadius:8,background:C.purplePale||"#F3E8FF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>🧾</div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:9.5,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>Orders</div>
                <div style={{fontSize:17,fontWeight:600,color:C.ink,fontFamily:F_MONO}}>{todaySales.length}</div>
              </div>
            </div>
            <div style={{background:C.surface,borderRadius:11,padding:"13px 14px",border:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:28,height:28,borderRadius:8,background:C.redPale,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>💳</div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:9.5,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>Debt</div>
                <div style={{fontSize:17,fontWeight:600,color:C.red,fontFamily:F_MONO,whiteSpace:"nowrap"}}>{f(totalOutstanding)}</div>
              </div>
            </div>
          </div>

          <Card style={{marginBottom:18}}>
            <div style={{fontWeight:700,fontSize:14,color:C.ink,marginBottom:2}}>Revenue Breakdown</div>
            <div style={{fontSize:10.5,color:C.muted,marginBottom:12}}>Actual cash received today — includes debt collected today from older sales, so this can differ from Sales Revenue above.</div>
            {[
              {label:"Cash",icon:"💵",val:revenueByMethod.Cash},
              {label:"Transfer",icon:"🏦",val:revenueByMethod.Transfer},
              {label:"POS",icon:"💳",val:revenueByMethod.POS},
            ].map(row=>(
              <div key={row.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                <span style={{fontSize:13,color:C.inkMid,display:"flex",alignItems:"center",gap:8}}>{row.icon} {row.label}</span>
                <span style={{fontFamily:F_MONO,fontWeight:600,fontSize:13,color:C.ink}}>{f(row.val)}</span>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:10}}>
              <span style={{fontSize:13,fontWeight:700,color:C.ink}}>Total Revenue</span>
              <span style={{fontFamily:F_MONO,fontWeight:700,fontSize:15,color:C.rose}}>{f(totalRevenueToday)}</span>
            </div>
          </Card>

          <Card style={{marginBottom:18}}>
            <div style={{fontWeight:700,fontSize:14,color:C.ink,marginBottom:12}}>Quick Actions</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              <button onClick={()=>{setSf({product_id:"",customer_id:"",qty:1,unit_price:"",status:"Accepted",sale_date:today,channel:"Whatsapp",note:"",payment_status:"Paid",payment_method:"Cash",amount_paid:"",due_date:""});setSel(null);setModal("sale");}} style={{background:C.rose,color:"#fff",border:"none",borderRadius:12,padding:"14px 6px",cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                <span style={{width:18,height:18}}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="100%" height="100%"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></span>
                <span style={{fontSize:11.5,fontWeight:700}}>Record Sale</span>
              </button>
              <button onClick={()=>openProd(null)} style={{background:C.ink,color:"#fff",border:"none",borderRadius:12,padding:"14px 6px",cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                <span style={{fontSize:18}}>📦</span>
                <span style={{fontSize:11.5,fontWeight:700}}>Add Product</span>
              </button>
              <button onClick={()=>{setInf({customer_id:"",items:[{name:"",qty:1,price:""}],note:"",date:today,due:""});setModal("invoice");}} style={{background:C.surface,color:C.roseDark,border:`1.5px solid ${C.border}`,borderRadius:12,padding:"14px 6px",cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                <span style={{fontSize:18}}>🧾</span>
                <span style={{fontSize:11.5,fontWeight:700}}>New Invoice</span>
              </button>
            </div>
          </Card>

          <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:0.8,marginBottom:8}}>Navigate</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:18}}>
            {ALL_PAGES.map(t=><NavIcon key={t.id} t={t}/>)}
          </div>

          {todaySales.length>0?<div style={{marginBottom:18}}>
            <div style={{background:C.surface,borderRadius:"12px 12px 0 0",padding:"16px 16px 2px",border:`1px solid ${C.border}`,borderBottom:"none"}}>
              <div style={{fontWeight:700,fontSize:13,color:C.ink,marginBottom:12}}>Today's Sales</div>
              {todaySales.map((s,i)=>(
                <div key={s.id} style={{borderBottom:i<todaySales.length-1?`1px dashed ${C.border}`:"none",paddingBottom:12,marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:13,color:C.ink}}>{s.product_name}</div>
                      <div style={{fontSize:10,color:C.muted,marginTop:2}}>👤 {s.customer_name} · {s.channel} · Qty {s.qty}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontWeight:600,color:C.ink,fontSize:13,fontFamily:F_MONO}}>{f(s.qty*s.unit_price)}</div>
                      <Badge l={s.status}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{height:10,background:C.surface,clipPath:"polygon(0% 0%,100% 0%,100% 40%,90% 100%,80% 40%,70% 100%,60% 40%,50% 100%,40% 40%,30% 100%,20% 40%,10% 100%,0% 40%)"}}/>
          </div>:<Card style={{textAlign:"center",padding:"24px 16px"}}>
            <div style={{fontSize:28,marginBottom:8}}>🛒</div>
            <div style={{color:C.muted,fontSize:13}}>No sales recorded today yet</div>
            <Btn sm style={{marginTop:12}} onClick={()=>{setSf({product_id:"",customer_id:"",qty:1,unit_price:"",status:"Accepted",sale_date:today,channel:"Whatsapp",note:"",payment_status:"Paid",payment_method:"Cash",amount_paid:"",due_date:""});setSel(null);setModal("sale");}}>Record First Sale</Btn>
          </Card>}
        </div>}

        {/* PRODUCTS */}
        {tab==="products"&&<div>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <input placeholder="Search products…" value={productSearch} onChange={e=>setProductSearch(e.target.value)} style={{flex:1,padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
            <Btn sm onClick={()=>openProd(null)}>+ Add</Btn>
          </div>
          <div style={{fontSize:11,color:C.muted,marginBottom:8}}>{products.length} products</div>
          {products.length===0&&<Card style={{textAlign:"center",padding:"32px 16px"}}><div style={{fontSize:32,marginBottom:8}}>📦</div><div style={{color:C.muted,fontSize:13}}>No products yet</div><Btn sm style={{marginTop:12}} onClick={()=>openProd(null)}>Add First Product</Btn></Card>}
          {products.filter(p=>match(p.name,productSearch)).map(p=>{
            const st=p.current_stock===0?"Sold Out":p.current_stock<=p.min_stock?"Low Stock":"In Stock";
            return <Card key={p.id} style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",cursor:"pointer"}} onClick={()=>openProd(p)}>
                <div style={{flex:1,minWidth:0,marginRight:8}}>
                  <div style={{fontWeight:700,fontSize:13,color:C.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
                  <div style={{fontSize:10,color:C.muted,marginTop:2}}>{p.product_code} · {p.category}</div>
                </div>
                <Badge l={st}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginTop:10}}>
                {[{l:"Cost",v:f(p.cost)},{l:"Price",v:f(p.price),c:C.rose},{l:"Margin",v:f(p.price-p.cost)},{l:"Stock",v:p.current_stock,c:p.current_stock<=p.min_stock?C.red:C.green}].map(it=>(
                  <div key={it.l} style={{textAlign:"center",background:C.bg,borderRadius:7,padding:"5px 0"}}>
                    <div style={{fontSize:9,color:C.muted,fontWeight:700,textTransform:"uppercase"}}>{it.l}</div>
                    <div style={{fontWeight:800,fontSize:12,color:it.c||C.ink,marginTop:1}}>{it.v}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",gap:6,marginTop:8}}>
                <Btn sm v="ghost" onClick={()=>openProd(p)}>Edit</Btn>
                <DelBtn onDelete={()=>confirmDelete("Delete this product?",async()=>{await supabase.from("products").delete().eq("id",p.id);await loadData();showToast("Deleted!");})}/>
              </div>
            </Card>;
          })}
        </div>}

        {/* SALES */}
        {tab==="sales"&&<div>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <input placeholder="Search sales…" value={salesSearch} onChange={e=>setSalesSearch(e.target.value)} style={{flex:1,padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
            <Btn sm onClick={()=>{setSf({product_id:"",customer_id:"",qty:1,unit_price:"",status:"Accepted",sale_date:today,channel:"Whatsapp",note:"",payment_status:"Paid",payment_method:"Cash",amount_paid:"",due_date:""});setSel(null);setModal("sale");}}>+ Add</Btn>
          </div>
          <div style={{fontSize:11,color:C.muted,marginBottom:8}}>{sales.length} records · {f(sales.reduce((s,r)=>s+r.qty*r.unit_price,0))}</div>
          {sales.length===0&&<Card style={{textAlign:"center",padding:"32px 16px"}}><div style={{fontSize:32,marginBottom:8}}>🛒</div><div style={{color:C.muted,fontSize:13}}>No sales yet</div><Btn sm style={{marginTop:12}} onClick={()=>{setSf({product_id:"",customer_id:"",qty:1,unit_price:"",status:"Accepted",sale_date:today,channel:"Whatsapp",note:"",payment_status:"Paid",payment_method:"Cash",amount_paid:"",due_date:""});setSel(null);setModal("sale");}}>Record First Sale</Btn></Card>}
          {sales.filter(s=>match(s.product_name,salesSearch)||match(s.customer_name,salesSearch)).map(s=>(
            <Card key={s.id} style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:13,color:C.ink}}>{s.product_name}</div>
                  <div style={{fontSize:10,color:C.muted,marginTop:2}}>{s.sale_code} · {s.sale_date} · {s.channel}</div>
                  <div style={{fontSize:10,color:C.muted}}>👤 {s.customer_name} · Qty {s.qty} × {f(s.unit_price)}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontWeight:900,fontSize:13,color:C.ink}}>{f(s.qty*s.unit_price)}</div>
                  <div style={{fontSize:10,color:C.green,fontWeight:700}}>+{f((s.unit_price-(s.cost_price||0))*s.qty)}</div>
                  <div style={{marginTop:3,display:"flex",gap:4,justifyContent:"flex-end"}}><Badge l={s.status}/>{s.payment_status&&s.payment_status!=="Paid"&&<Badge l={s.payment_status}/>}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:8}}>
                {["Accepted","In Progress","Dispatched","Received"].map(st=>{const pal=sp(st);const active=s.status===st;return(
                  <button key={st} onClick={()=>updateSaleStatus(s.id,st)} style={{padding:"3px 8px",borderRadius:20,border:`1px solid ${active?pal.color:C.border}`,background:active?pal.bg:"transparent",color:active?pal.color:C.muted,fontSize:10,cursor:"pointer",fontWeight:700,fontFamily:"inherit"}}>{st}</button>
                );})}
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",gap:6,marginTop:8}}>
                <Btn sm v="ghost" onClick={()=>openEditSale(s)}>Edit</Btn>
                <DelBtn onDelete={()=>confirmDelete("Delete this sale?",async()=>{await supabase.from("sales").delete().eq("id",s.id);await loadData();showToast("Deleted!");})}/>
              </div>
            </Card>
          ))}
        </div>}

        {/* PURCHASES */}
        {/* CUSTOMERS */}
        {tab==="customers"&&<div>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <input placeholder="Search customers…" value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)} style={{flex:1,padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
            <Btn sm onClick={()=>openCust(null)}>+ Add</Btn>
          </div>
          <div style={{fontSize:11,color:C.muted,marginBottom:8}}>{customers.length} customers</div>
          {customers.length===0&&<Card style={{textAlign:"center",padding:"32px 16px"}}><div style={{fontSize:32,marginBottom:8}}>👥</div><div style={{color:C.muted,fontSize:13}}>No customers yet</div><Btn sm style={{marginTop:12}} onClick={()=>openCust(null)}>Add First Customer</Btn></Card>}
          {customers.filter(c=>match(c.name,customerSearch)||match(c.phone,customerSearch)).map(c=>(
            <Card key={c.id} style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <div style={{width:36,height:36,borderRadius:10,background:C.rosePale,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:900,color:C.rose,flexShrink:0}}>{c.name.charAt(0)}</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:13,color:C.ink}}>{c.name}</div>
                    <div style={{fontSize:10,color:C.muted,marginTop:2}}>{c.phone}{c.city?` · ${c.city}`:""}</div>
                  </div>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",gap:6,marginTop:8}}>
                <Btn sm v="ghost" onClick={()=>openCust(c)}>Edit</Btn>
                <DelBtn onDelete={()=>confirmDelete("Delete this customer?",async()=>{await supabase.from("customers").delete().eq("id",c.id);await loadData();showToast("Deleted!");})}/>
              </div>
            </Card>
          ))}
        </div>}

        {/* DEBTS */}
        {tab==="debts"&&<div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div style={{background:C.surface,borderRadius:12,padding:14,border:`1px solid ${C.border}`,gridColumn:"1 / -1"}}>
              <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>Total Outstanding</div>
              <div style={{fontSize:22,fontWeight:600,color:C.red,marginTop:4,fontFamily:F_MONO}}>{f(totalOutstanding)}</div>
            </div>
            <div style={{background:C.surface,borderRadius:12,padding:14,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>Customers With Debt</div>
              <div style={{fontSize:18,fontWeight:600,color:C.ink,marginTop:4,fontFamily:F_MONO}}>{debtRows.length}</div>
            </div>
            <div style={{background:C.surface,borderRadius:12,padding:14,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>Amount Collected</div>
              <div style={{fontSize:18,fontWeight:600,color:C.green,marginTop:4,fontFamily:F_MONO}}>{f(totalCollected)}</div>
            </div>
          </div>

          <div style={{display:"flex",gap:6,marginBottom:12,background:C.bg,padding:4,borderRadius:10}}>
            <button onClick={()=>setDebtView("outstanding")} style={{flex:1,padding:"8px 4px",borderRadius:8,border:"none",background:debtView==="outstanding"?C.surface:"transparent",color:debtView==="outstanding"?C.ink:C.muted,fontWeight:700,fontSize:12.5,cursor:"pointer",fontFamily:"inherit",boxShadow:debtView==="outstanding"?"0 1px 4px rgba(0,0,0,0.08)":"none"}}>Outstanding</button>
            <button onClick={()=>setDebtView("history")} style={{flex:1,padding:"8px 4px",borderRadius:8,border:"none",background:debtView==="history"?C.surface:"transparent",color:debtView==="history"?C.ink:C.muted,fontWeight:700,fontSize:12.5,cursor:"pointer",fontFamily:"inherit",boxShadow:debtView==="history"?"0 1px 4px rgba(0,0,0,0.08)":"none"}}>Payment History</button>
          </div>

          {debtView==="outstanding"&&<>
          {debtRows.length===0&&<Card style={{textAlign:"center",padding:"32px 16px"}}><div style={{fontSize:32,marginBottom:8}}>💳</div><div style={{color:C.muted,fontSize:13}}>No outstanding debt right now</div></Card>}

          {debtRows.map(d=>(
            <Card key={d.customer_id} style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:13,color:C.ink}}>{d.name}</div>
                  <div style={{fontSize:10,color:C.muted,marginTop:2}}>
                    Original {f(d.original)} · Paid {f(d.paid)}{d.dueDate?` · Due ${d.dueDate}`:""}
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:F_MONO,fontWeight:600,fontSize:14,color:C.red}}>{f(d.outstanding)}</div>
                  <Badge l="Outstanding"/>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
                <Btn sm onClick={()=>{setDf({customer_id:d.customer_id,amount:"",payment_method:"Cash",payment_date:today});setModal("debtPayment");}}>Record Payment</Btn>
              </div>
            </Card>
          ))}
          </>}

          {debtView==="history"&&<>
            {debtPayments.length===0&&<Card style={{textAlign:"center",padding:"32px 16px"}}><div style={{fontSize:32,marginBottom:8}}>🧾</div><div style={{color:C.muted,fontSize:13}}>No payments recorded yet</div></Card>}
            {[...debtPayments].sort((a,b)=>(b.payment_date||"").localeCompare(a.payment_date||"")).map(dp=>{
              const cust = customers.find(c=>c.id===dp.customer_id);
              return (
                <Card key={dp.id} style={{marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:13,color:C.ink}}>{cust?cust.name:"Unknown customer"}</div>
                      <div style={{fontSize:10,color:C.muted,marginTop:2}}>{dp.payment_date} · {dp.payment_method}</div>
                    </div>
                    <div style={{fontFamily:F_MONO,fontWeight:600,fontSize:14,color:C.green}}>+{f(dp.amount)}</div>
                  </div>
                </Card>
              );
            })}
          </>}
        </div>}
        {tab==="suppliers"&&<div>
          <div style={{display:"flex",gap:6,marginBottom:12,background:C.bg,padding:4,borderRadius:10}}>
            <button onClick={()=>setSupplierView("suppliers")} style={{flex:1,padding:"8px 4px",borderRadius:8,border:"none",background:supplierView==="suppliers"?C.surface:"transparent",color:supplierView==="suppliers"?C.ink:C.muted,fontWeight:700,fontSize:12.5,cursor:"pointer",fontFamily:"inherit",boxShadow:supplierView==="suppliers"?"0 1px 4px rgba(0,0,0,0.08)":"none"}}>Suppliers</button>
            <button onClick={()=>setSupplierView("purchases")} style={{flex:1,padding:"8px 4px",borderRadius:8,border:"none",background:supplierView==="purchases"?C.surface:"transparent",color:supplierView==="purchases"?C.ink:C.muted,fontWeight:700,fontSize:12.5,cursor:"pointer",fontFamily:"inherit",boxShadow:supplierView==="purchases"?"0 1px 4px rgba(0,0,0,0.08)":"none"}}>Purchase History</button>
          </div>

          {supplierView==="suppliers"&&<>
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              <input placeholder="Search suppliers…" value={supplierSearch} onChange={e=>setSupplierSearch(e.target.value)} style={{flex:1,padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              <Btn sm onClick={()=>openSup(null)}>+ Add</Btn>
            </div>
            <div style={{fontSize:11,color:C.muted,marginBottom:8}}>{suppliers.length} suppliers</div>
            {suppliers.length===0&&<Card style={{textAlign:"center",padding:"32px 16px"}}><div style={{fontSize:32,marginBottom:8}}>🏭</div><div style={{color:C.muted,fontSize:13}}>No suppliers yet</div><Btn sm style={{marginTop:12}} onClick={()=>openSup(null)}>Add First Supplier</Btn></Card>}
            {suppliers.filter(s=>match(s.name,supplierSearch)).map(s=>(
              <Card key={s.id} style={{marginBottom:8}}>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <div style={{width:36,height:36,borderRadius:10,background:C.bluePale,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:900,color:C.blue,flexShrink:0}}>{s.name.charAt(0)}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13,color:C.ink}}>{s.name}</div>
                    <div style={{fontSize:10,color:C.muted,marginTop:2}}>{s.contact?`Contact: ${s.contact} · `:""}{s.phone}</div>
                    <div style={{fontSize:10,color:C.muted}}>{s.category}{s.city?` · ${s.city}`:""}</div>
                  </div>
                </div>
                <div style={{display:"flex",justifyContent:"flex-end",gap:6,marginTop:8}}>
                  <Btn sm v="ghost" onClick={()=>openSup(s)}>Edit</Btn>
                  <DelBtn onDelete={()=>confirmDelete("Delete this supplier?",async()=>{await supabase.from("suppliers").delete().eq("id",s.id);await loadData();showToast("Deleted!");})}/>
                </div>
              </Card>
            ))}
          </>}

          {supplierView==="purchases"&&<>
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              <input placeholder="Search purchases…" value={purchaseSearch} onChange={e=>setPurchaseSearch(e.target.value)} style={{flex:1,padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              <Btn sm onClick={()=>{setPuf({product_id:"",supplier_id:"",qty:1,cost:"",purchase_date:today,status:"Pending"});setModal("purchase");}}>+ Add</Btn>
            </div>
            <div style={{fontSize:11,color:C.muted,marginBottom:8}}>{purchases.length} records</div>
            {purchases.length===0&&<Card style={{textAlign:"center",padding:"32px 16px"}}><div style={{fontSize:32,marginBottom:8}}>🏷️</div><div style={{color:C.muted,fontSize:13}}>No purchases yet</div><Btn sm style={{marginTop:12}} onClick={()=>{setPuf({product_id:"",supplier_id:"",qty:1,cost:"",purchase_date:today,status:"Pending"});setModal("purchase");}}>Log First Purchase</Btn></Card>}
            {purchases.filter(p=>match(p.product_name,purchaseSearch)||match(p.supplier_name,purchaseSearch)).map(p=>(
              <Card key={p.id} style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:13,color:C.ink}}>{p.product_name}</div>
                    <div style={{fontSize:10,color:C.muted,marginTop:2}}>{p.purchase_code} · {p.purchase_date}</div>
                    {p.supplier_name&&<div style={{fontSize:10,color:C.muted}}>🏭 {p.supplier_name} · Qty {p.qty} × {f(p.cost)}</div>}
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontWeight:900,fontSize:13,color:C.ink}}>{f(p.total_cost)}</div>
                    <div style={{marginTop:3}}><Badge l={p.status}/></div>
                  </div>
                </div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:8}}>
                  {["Pending","Received","Partial","Cancelled"].map(st=>{const pal=sp(st);const active=p.status===st;return(
                    <button key={st} onClick={()=>updatePurStatus(p.id,st,p.product_id,p.qty)} style={{padding:"3px 8px",borderRadius:20,border:`1px solid ${active?pal.color:C.border}`,background:active?pal.bg:"transparent",color:active?pal.color:C.muted,fontSize:10,cursor:"pointer",fontWeight:700,fontFamily:"inherit"}}>{st}</button>
                  );})}
                </div>
                <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
                  <DelBtn onDelete={()=>confirmDelete("Delete this purchase?",async()=>{await supabase.from("purchases").delete().eq("id",p.id);await loadData();showToast("Deleted!");})}/>
                </div>
              </Card>
            ))}
          </>}
        </div>}

        {/* INVOICES */}
        {tab==="invoices"&&<div>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <input placeholder="Search invoices…" value={invoiceSearch} onChange={e=>setInvoiceSearch(e.target.value)} style={{flex:1,padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
            <Btn sm onClick={()=>{setInf({customer_id:"",items:[{name:"",qty:1,price:""}],note:"",date:today,due:""});setModal("invoice");}}>+ New</Btn>
          </div>
          <div style={{fontSize:11,color:C.muted,marginBottom:8}}>{invoices.length} invoices</div>
          {invoices.length===0&&<Card style={{textAlign:"center",padding:"32px 16px"}}><div style={{fontSize:32,marginBottom:8}}>🧾</div><div style={{color:C.muted,fontSize:13}}>No invoices yet</div><Btn sm style={{marginTop:12}} onClick={()=>{setInf({customer_id:"",items:[{name:"",qty:1,price:""}],note:"",date:today,due:""});setModal("invoice");}}>Create First Invoice</Btn></Card>}
          {invoices.filter(inv=>match(inv.customer_name,invoiceSearch)||match(inv.invoice_no,invoiceSearch)).map(inv=>(
            <Card key={inv.id} style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontWeight:800,fontSize:13,color:C.ink}}>{inv.invoice_no}</div>
                  <div style={{fontSize:12,fontWeight:600,color:C.inkMid,marginTop:2}}>{inv.customer_name}</div>
                  <div style={{fontSize:10,color:C.muted,marginTop:2}}>{inv.invoice_date} · {inv.items?.length||0} item(s)</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontWeight:900,fontSize:14,color:C.ink}}>{f(inv.total)}</div>
                  <div style={{marginTop:3}}><Badge l={inv.status}/></div>
                </div>
              </div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:8}}>
                {["Draft","Sent","Paid","Overdue"].map(st=>{const pal=sp(st);const active=inv.status===st;return(
                  <button key={st} onClick={()=>updateInvStatus(inv.id,st)} style={{padding:"3px 8px",borderRadius:20,border:`1px solid ${active?pal.color:C.border}`,background:active?pal.bg:"transparent",color:active?pal.color:C.muted,fontSize:10,cursor:"pointer",fontWeight:700,fontFamily:"inherit"}}>{st}</button>
                );})}
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",gap:6,marginTop:8}}>
                <Btn sm v="outline" onClick={()=>downloadInvoice({...inv,no:inv.invoice_no,date:inv.invoice_date,due:inv.due_date})}>⬇ Download</Btn>
                <DelBtn onDelete={()=>confirmDelete("Delete this invoice?",async()=>{await supabase.from("invoices").delete().eq("id",inv.id);await loadData();showToast("Deleted!");})}/>
              </div>
            </Card>
          ))}
        </div>}

        {/* ANALYTICS */}
        {tab==="analytics"&&<div>
          <div style={{fontWeight:900,fontSize:16,color:C.ink,marginBottom:12}}>Analytics</div>

          <div style={{display:"flex",gap:6,marginBottom:(analyticsPeriod==="month"||analyticsPeriod==="day")?8:14,background:C.bg,padding:4,borderRadius:10}}>
            {[{k:"day",l:"Day"},{k:"month",l:"Month"},{k:"all",l:"All Time"}].map(p=>(
              <button key={p.k} onClick={()=>setAnalyticsPeriod(p.k)} style={{flex:1,padding:"8px 4px",borderRadius:8,border:"none",background:analyticsPeriod===p.k?C.surface:"transparent",color:analyticsPeriod===p.k?C.ink:C.muted,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",boxShadow:analyticsPeriod===p.k?"0 1px 4px rgba(0,0,0,0.08)":"none"}}>{p.l}</button>
            ))}
          </div>
          {analyticsPeriod==="day"&&<input type="date" value={analyticsDay} max={today} onChange={e=>setAnalyticsDay(e.target.value)} style={{width:"100%",padding:"9px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,marginBottom:14,fontFamily:"inherit",background:C.surface}}/>}
          {analyticsPeriod==="month"&&<input type="month" value={analyticsMonth} onChange={e=>setAnalyticsMonth(e.target.value)} style={{width:"100%",padding:"9px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,marginBottom:14,fontFamily:"inherit",background:C.surface}}/>}

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            {[{l:"Total Revenue",v:f(totalRev),a:C.rose},{l:"Total Profit",v:f(totalProfit),a:C.green},{l:"Total Orders",v:analyticsSales.length,a:C.blue},{l:"Avg Order",v:f(analyticsSales.length?Math.round(totalRev/analyticsSales.length):0),a:"#9C27B0"}].map(s=>(
              <div key={s.l} style={{background:C.surface,borderRadius:12,padding:"12px",border:`1px solid ${C.border}`,borderTop:`3px solid ${s.a}`}}>
                <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase"}}>{s.l}</div>
                <div style={{fontSize:20,fontWeight:900,color:C.ink,marginTop:4}}>{s.v}</div>
              </div>
            ))}
          </div>

          <Card style={{marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:13,color:C.ink,marginBottom:2}}>Revenue Breakdown</div>
            <div style={{fontSize:10,color:C.muted,marginBottom:10}}>Actual cash received in this period, by method.</div>
            {[
              {label:"Cash",icon:"💵",val:analyticsRevenueByMethod.Cash},
              {label:"Transfer",icon:"🏦",val:analyticsRevenueByMethod.Transfer},
              {label:"POS",icon:"💳",val:analyticsRevenueByMethod.POS},
            ].map((row,i)=>(
              <div key={row.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:i<2?`1px solid ${C.border}`:"none",fontSize:12.5}}>
                <span style={{color:C.inkMid,display:"flex",alignItems:"center",gap:7}}>{row.icon} {row.label}</span>
                <span style={{fontFamily:F_MONO,fontWeight:600,color:C.ink}}>{f(row.val)}</span>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:8}}>
              <span style={{fontSize:12.5,fontWeight:700,color:C.ink}}>Total</span>
              <span style={{fontFamily:F_MONO,fontWeight:700,fontSize:14,color:C.rose}}>{f(analyticsRevenueByMethod.Cash+analyticsRevenueByMethod.Transfer+analyticsRevenueByMethod.POS)}</span>
            </div>
          </Card>

          <Card style={{marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:13,color:C.ink,marginBottom:12}}>Debt</div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`,fontSize:12.5}}>
              <span style={{color:C.inkMid}}>Total Outstanding (All Time)</span>
              <span style={{fontFamily:F_MONO,fontWeight:700,color:C.red}}>{f(totalOutstanding)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`,fontSize:12.5}}>
              <span style={{color:C.inkMid}}>Outstanding — {analyticsPeriod==="day"?analyticsDay:analyticsPeriod==="month"?`${analyticsMonth}`:"All Sales"}</span>
              <span style={{fontFamily:F_MONO,fontWeight:700,color:C.red}}>{f(debtFromPeriodSales)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`,fontSize:12.5}}>
              <span style={{color:C.inkMid}}>Customers With Debt</span>
              <span style={{fontFamily:F_MONO,fontWeight:700,color:C.ink}}>{debtRows.length}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",fontSize:12.5}}>
              <span style={{color:C.inkMid}}>Collected ({analyticsPeriod==="day"?analyticsDay:analyticsPeriod==="month"?analyticsMonth:"All Time"})</span>
              <span style={{fontFamily:F_MONO,fontWeight:700,color:C.green}}>{f(collectedThisPeriod)}</span>
            </div>
          </Card>

          {Object.keys(channelMap).length>0&&<Card style={{marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:13,color:C.ink,marginBottom:12}}>Sales by Channel</div>
            {Object.entries(channelMap).sort((a,b)=>b[1]-a[1]).map(([ch,rev])=>(
              <div key={ch} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                  <span style={{fontWeight:600,color:C.ink}}>{ch}</span>
                  <span style={{color:C.rose,fontWeight:700}}>{f(rev)}</span>
                </div>
                <div style={{background:C.bg,borderRadius:99,height:6}}>
                  <div style={{background:C.rose,height:6,borderRadius:99,width:`${Math.min(100,(rev/totalRev)*100)}%`}}/>
                </div>
              </div>
            ))}
          </Card>}
          {analyticsSales.length===0&&<Card style={{textAlign:"center",padding:"32px 16px"}}><div style={{fontSize:32,marginBottom:8}}>📈</div><div style={{color:C.muted,fontSize:13}}>No sales in this period yet</div></Card>}
        </div>}

        {/* ALERTS */}
        {tab==="alerts"&&<div>
          <div style={{fontWeight:900,fontSize:16,color:C.ink,marginBottom:14}}>Stock Alerts</div>
          {outStock>0&&<Card style={{marginBottom:10,border:`1px solid ${C.red}`}}>
            <div style={{fontWeight:800,color:C.red,marginBottom:8,fontSize:13}}>🚫 Out of Stock ({outStock})</div>
            {products.filter(p=>p.current_stock===0).map(p=>(
              <div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.redPale}`,fontSize:12}}>
                <span style={{fontWeight:600}}>{p.name}</span><span style={{color:C.red,fontWeight:700}}>0 left</span>
              </div>
            ))}
          </Card>}
          {lowStock>0&&<Card style={{marginBottom:10,border:`1px solid #FFCC80`}}>
            <div style={{fontWeight:800,color:C.amber,marginBottom:8,fontSize:13}}>⚠️ Low Stock ({lowStock})</div>
            {products.filter(p=>p.current_stock>0&&p.current_stock<=p.min_stock).map(p=>(
              <div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.amberPale}`,fontSize:12}}>
                <span style={{fontWeight:600}}>{p.name}</span><span style={{color:C.amber,fontWeight:700}}>{p.current_stock} left</span>
              </div>
            ))}
          </Card>}
          {products.filter(p=>p.current_stock>p.min_stock).length>0&&<Card style={{border:`1px solid #A5D6A7`}}>
            <div style={{fontWeight:800,color:C.green,marginBottom:8,fontSize:13}}>✅ In Stock ({products.filter(p=>p.current_stock>p.min_stock).length})</div>
            {products.filter(p=>p.current_stock>p.min_stock).map(p=>(
              <div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.greenPale}`,fontSize:12}}>
                <span>{p.name}</span><span style={{color:C.green,fontWeight:700}}>{p.current_stock}</span>
              </div>
            ))}
          </Card>}
          {products.length===0&&<Card style={{textAlign:"center",padding:"32px 16px"}}><div style={{fontSize:32,marginBottom:8}}>🔔</div><div style={{color:C.muted,fontSize:13}}>Add products to see stock alerts</div></Card>}
        </div>}

        {/* PROFILE */}
        {tab==="profile"&&<div>
          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{width:64,height:64,borderRadius:18,background:C.rosePale,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:26,fontWeight:900,color:C.rose,border:`2px solid ${C.roseMid}`,marginBottom:8}}>
              {bizName.charAt(0).toUpperCase()}
            </div>
            <div style={{fontWeight:800,fontSize:16,color:C.ink}}>{bizName}</div>
          </div>
          <Card style={{padding:20,marginBottom:12}}>
            <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:12}}>Business Details</div>
            <Inp label="Business Name *" value={profileForm.business_name} onChange={e=>setProfileForm(f=>({...f,business_name:e.target.value}))} placeholder="e.g. Glow Store"/>
            <Inp label="Your Name" value={profileForm.owner_name} onChange={e=>setProfileForm(f=>({...f,owner_name:e.target.value}))} placeholder="e.g. Amara Johnson"/>
            <Inp label="Phone" type="tel" value={profileForm.phone} onChange={e=>setProfileForm(f=>({...f,phone:e.target.value}))} placeholder="08012345678"/>
            <Inp label="City" value={profileForm.city} onChange={e=>setProfileForm(f=>({...f,city:e.target.value}))} placeholder="Lagos"/>
            <div style={{background:C.bg,borderRadius:8,padding:"10px 12px",marginBottom:12}}>
              <div style={{fontSize:10,color:C.muted,marginBottom:2}}>Email</div>
              <div style={{fontSize:13,fontWeight:600,color:C.inkMid}}>{user.email}</div>
            </div>
            <div style={{background:C.greenPale,borderRadius:8,padding:"10px 12px",marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
              <span>✅</span>
              <div style={{fontSize:12,fontWeight:700,color:C.green}}>Account Active</div>
            </div>
            <Btn full onClick={saveProfile}>Save Changes</Btn>
          </Card>
          <Card>
            <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:12}}>Account</div>
            <Btn full v="ghost" onClick={onSignOut}>Sign Out</Btn>
          </Card>
        </div>}
      </div>

      {/* MODALS */}
      {(modal==="sale"||modal==="editSale")&&<Modal title={modal==="editSale"?"Edit Sale":"Record Sale"} onClose={()=>setModal(null)}>
        <Sel label="Product *" value={sf.product_id} onChange={e=>{const p=products.find(x=>x.id===e.target.value);setSf(f=>({...f,product_id:e.target.value,unit_price:p?p.price:""}));}}>
          <option value="">— Choose product —</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} (Stock:{p.current_stock})</option>)}
        </Sel>
        <Sel label="Customer" value={sf.customer_id} onChange={e=>setSf(f=>({...f,customer_id:e.target.value}))}>
          <option value="">Walk-in / Unknown</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </Sel>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Inp label="Quantity *" type="number" min={1} value={sf.qty} onChange={e=>setSf(f=>({...f,qty:e.target.value}))}/>
          <Inp label="Price (₦) *" type="number" value={sf.unit_price} onChange={e=>setSf(f=>({...f,unit_price:e.target.value}))}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Inp label="Date" type="date" value={sf.sale_date} onChange={e=>setSf(f=>({...f,sale_date:e.target.value}))}/>
          <Sel label="Channel" value={sf.channel} onChange={e=>setSf(f=>({...f,channel:e.target.value}))}>
            {CHANNELS.map(c=><option key={c}>{c}</option>)}
          </Sel>
        </div>
        <Sel label="Status" value={sf.status} onChange={e=>setSf(f=>({...f,status:e.target.value}))}>
          {["Accepted","In Progress","Dispatched","Received"].map(s=><option key={s}>{s}</option>)}
        </Sel>
        <Inp label="Note (optional)" value={sf.note} onChange={e=>setSf(f=>({...f,note:e.target.value}))} placeholder="Customer note…"/>
        {sf.product_id&&sf.unit_price&&<div style={{background:C.bg,borderRadius:8,padding:"9px 12px",marginBottom:12,fontSize:12,display:"flex",gap:14}}>
          <span><strong>Total:</strong> {f(Number(sf.qty)*Number(sf.unit_price))}</span>
          {(()=>{const p=products.find(x=>x.id===sf.product_id);return p?<span style={{color:C.green,fontWeight:700}}>Profit: {f((Number(sf.unit_price)-p.cost)*Number(sf.qty))}</span>:null;})()}
        </div>}

        {/* PAYMENT */}
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:12,marginTop:4,marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:C.inkMid,marginBottom:6}}>Payment Status</div>
          <div style={{display:"flex",gap:6,marginBottom:12}}>
            {["Paid","Partially Paid","Credit"].map(st=>(
              <button key={st} onClick={()=>setSf(f=>({...f,payment_status:st}))} style={{flex:1,padding:"9px 4px",borderRadius:8,border:`1.5px solid ${sf.payment_status===st?C.rose:C.border}`,background:sf.payment_status===st?C.rosePale:"#fff",color:sf.payment_status===st?C.roseDark:C.inkMid,fontWeight:700,fontSize:11.5,cursor:"pointer",fontFamily:"inherit"}}>{st}</button>
            ))}
          </div>

          {sf.payment_status!=="Credit"&&<>
            {sf.payment_status==="Partially Paid"&&<Inp label="Amount Paid (₦) *" type="number" value={sf.amount_paid} onChange={e=>setSf(f=>({...f,amount_paid:e.target.value}))} placeholder="e.g. 100000"/>}
            <div style={{fontSize:12,fontWeight:700,color:C.inkMid,marginBottom:6}}>Payment Method</div>
            <div style={{display:"flex",gap:6,marginBottom:10}}>
              {["Cash","Transfer","POS"].map(m=>(
                <button key={m} onClick={()=>setSf(f=>({...f,payment_method:m}))} style={{flex:1,padding:"9px 4px",borderRadius:8,border:`1.5px solid ${sf.payment_method===m?C.rose:C.border}`,background:sf.payment_method===m?C.rosePale:"#fff",color:sf.payment_method===m?C.roseDark:C.inkMid,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{m}</button>
              ))}
            </div>
          </>}

          {sf.payment_status==="Credit"&&<Inp label="Due Date (optional)" type="date" value={sf.due_date} onChange={e=>setSf(f=>({...f,due_date:e.target.value}))}/>}
          {sf.payment_status==="Partially Paid"&&<Inp label="Due Date (optional)" type="date" value={sf.due_date} onChange={e=>setSf(f=>({...f,due_date:e.target.value}))}/>}

          {sf.product_id&&sf.unit_price&&sf.payment_status!=="Paid"&&(()=>{
            const total = Number(sf.qty)*Number(sf.unit_price);
            const paid = sf.payment_status==="Credit"?0:Number(sf.amount_paid)||0;
            const outstanding = Math.max(0,total-paid);
            return <div style={{background:C.amberPale,color:C.amber,borderRadius:8,padding:"8px 12px",fontSize:12,fontWeight:700,marginTop:4}}>Outstanding: {f(outstanding)}</div>;
          })()}
        </div>

        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn v="ghost" sm onClick={()=>setModal(null)}>Cancel</Btn>
          <Btn v="success" sm onClick={submitSale}>{modal==="editSale"?"Save Changes":"Save Sale"}</Btn>
        </div>
      </Modal>}

      {modal==="debtPayment"&&<Modal title="Record Payment" onClose={()=>setModal(null)}>
        {(()=>{const d=debtRows.find(x=>x.customer_id===df.customer_id);return d?(
          <div style={{background:C.redPale,color:C.red,borderRadius:8,padding:"10px 12px",fontSize:13,fontWeight:700,marginBottom:14}}>
            {d.name} owes {f(d.outstanding)}
          </div>
        ):null;})()}
        <Inp label="Amount (₦) *" type="number" value={df.amount} onChange={e=>setDf(f=>({...f,amount:e.target.value}))} placeholder="e.g. 50000"/>
        <div style={{fontSize:12,fontWeight:700,color:C.inkMid,marginBottom:6}}>Payment Method</div>
        <div style={{display:"flex",gap:6,marginBottom:12}}>
          {["Cash","Transfer","POS"].map(m=>(
            <button key={m} onClick={()=>setDf(f=>({...f,payment_method:m}))} style={{flex:1,padding:"9px 4px",borderRadius:8,border:`1.5px solid ${df.payment_method===m?C.rose:C.border}`,background:df.payment_method===m?C.rosePale:"#fff",color:df.payment_method===m?C.roseDark:C.inkMid,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{m}</button>
          ))}
        </div>
        <Inp label="Date" type="date" value={df.payment_date} onChange={e=>setDf(f=>({...f,payment_date:e.target.value}))}/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn v="ghost" sm onClick={()=>setModal(null)}>Cancel</Btn>
          <Btn v="success" sm onClick={submitDebtPayment}>Save Payment</Btn>
        </div>
      </Modal>}

      {modal==="purchase"&&<Modal title="Log Purchase" onClose={()=>setModal(null)}>
        <Sel label="Product *" value={puf.product_id} onChange={e=>{const p=products.find(x=>x.id===e.target.value);setPuf(f=>({...f,product_id:e.target.value,cost:p?p.cost:""}));}}>
          <option value="">— Choose product —</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </Sel>
        <Sel label="Supplier (optional)" value={puf.supplier_id} onChange={e=>setPuf(f=>({...f,supplier_id:e.target.value}))}>
          <option value="">— Select supplier —</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
        </Sel>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Inp label="Quantity *" type="number" min={1} value={puf.qty} onChange={e=>setPuf(f=>({...f,qty:e.target.value}))}/>
          <Inp label="Cost (₦) *" type="number" value={puf.cost} onChange={e=>setPuf(f=>({...f,cost:e.target.value}))}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Inp label="Date" type="date" value={puf.purchase_date} onChange={e=>setPuf(f=>({...f,purchase_date:e.target.value}))}/>
          <Sel label="Status" value={puf.status} onChange={e=>setPuf(f=>({...f,status:e.target.value}))}>
            {["Pending","Received","Partial","Cancelled"].map(s=><option key={s}>{s}</option>)}
          </Sel>
        </div>
        {puf.qty&&puf.cost&&<div style={{background:C.bg,borderRadius:8,padding:"9px 12px",marginBottom:12,fontSize:12,fontWeight:700}}>Total: {f(Number(puf.qty)*Number(puf.cost))}</div>}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn v="ghost" sm onClick={()=>setModal(null)}>Cancel</Btn>
          <Btn sm onClick={submitPurchase}>Save</Btn>
        </div>
      </Modal>}

      {modal==="product"&&<Modal title={selected?"Edit Product":"Add Product"} onClose={()=>setModal(null)}>
        <Inp label="Name *" value={pf.name} onChange={e=>setPf(f=>({...f,name:e.target.value}))} placeholder="e.g. Vitamin C Serum"/>
        <Sel label="Category" value={pf.category} onChange={e=>setPf(f=>({...f,category:e.target.value}))}>
          <option value="">— Select —</option>{CATS.map(c=><option key={c}>{c}</option>)}
        </Sel>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Inp label="Cost (₦)" type="number" value={pf.cost} onChange={e=>setPf(f=>({...f,cost:e.target.value}))}/>
          <Inp label="Selling Price (₦) *" type="number" value={pf.price} onChange={e=>setPf(f=>({...f,price:e.target.value}))}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Inp label="Current Stock" type="number" value={pf.current_stock} onChange={e=>setPf(f=>({...f,current_stock:e.target.value}))}/>
          <Inp label="Min Alert" type="number" value={pf.min_stock} onChange={e=>setPf(f=>({...f,min_stock:e.target.value}))}/>
        </div>
        {pf.cost&&pf.price&&<div style={{background:C.bg,borderRadius:8,padding:"9px 12px",marginBottom:12,fontSize:12}}>
          Margin: {f(Number(pf.price)-Number(pf.cost))} <span style={{color:C.rose,fontWeight:700}}>({Math.round((Number(pf.price)-Number(pf.cost))/Number(pf.price)*100)}%)</span>
        </div>}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn v="ghost" sm onClick={()=>setModal(null)}>Cancel</Btn>
          <Btn sm onClick={submitProduct}>{selected?"Update":"Add"}</Btn>
        </div>
      </Modal>}

      {modal==="customer"&&<Modal title={selected?"Edit Customer":"Add Customer"} onClose={()=>setModal(null)}>
        <Inp label="Full Name *" value={cf.name} onChange={e=>setCf(f=>({...f,name:e.target.value}))} placeholder="e.g. Amara Okafor"/>
        <Inp label="Phone" type="tel" value={cf.phone} onChange={e=>setCf(f=>({...f,phone:e.target.value}))} placeholder="08012345678"/>
        <Inp label="Email" type="email" value={cf.email} onChange={e=>setCf(f=>({...f,email:e.target.value}))} placeholder="amara@email.com"/>
        <Inp label="City" value={cf.city} onChange={e=>setCf(f=>({...f,city:e.target.value}))} placeholder="Lagos"/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn v="ghost" sm onClick={()=>setModal(null)}>Cancel</Btn>
          <Btn sm onClick={submitCustomer}>{selected?"Update":"Add"}</Btn>
        </div>
      </Modal>}

      {modal==="supplier"&&<Modal title={selected?"Edit Supplier":"Add Supplier"} onClose={()=>setModal(null)}>
        <Inp label="Business Name *" value={suf.name} onChange={e=>setSuf(f=>({...f,name:e.target.value}))} placeholder="e.g. GlowMart Wholesale"/>
        <Inp label="Contact Person" value={suf.contact} onChange={e=>setSuf(f=>({...f,contact:e.target.value}))} placeholder="e.g. Emeka"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Inp label="Phone" type="tel" value={suf.phone} onChange={e=>setSuf(f=>({...f,phone:e.target.value}))} placeholder="08012345678"/>
          <Inp label="City" value={suf.city} onChange={e=>setSuf(f=>({...f,city:e.target.value}))} placeholder="Lagos"/>
        </div>
        <Sel label="Category" value={suf.category} onChange={e=>setSuf(f=>({...f,category:e.target.value}))}>
          <option value="">— Select —</option>{CATS.map(c=><option key={c}>{c}</option>)}
        </Sel>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn v="ghost" sm onClick={()=>setModal(null)}>Cancel</Btn>
          <Btn sm onClick={submitSupplier}>{selected?"Update":"Add"}</Btn>
        </div>
      </Modal>}

      {modal==="invoice"&&<Modal title="New Invoice" onClose={()=>setModal(null)} wide>
        <Sel label="Customer *" value={inf.customer_id} onChange={e=>setInf(f=>({...f,customer_id:e.target.value}))}>
          <option value="">— Select customer —</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
        </Sel>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Inp label="Invoice Date" type="date" value={inf.date} onChange={e=>setInf(f=>({...f,date:e.target.value}))}/>
          <Inp label="Due Date" type="date" value={inf.due} onChange={e=>setInf(f=>({...f,due:e.target.value}))}/>
        </div>
        <div style={{fontSize:11,fontWeight:700,color:C.inkMid,marginBottom:6}}>ITEMS</div>
        {inf.items.map((item,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 50px 70px 26px",gap:6,marginBottom:6,alignItems:"center"}}>
            <Inp placeholder="Item name" value={item.name} onChange={e=>{const items=[...inf.items];items[i]={...items[i],name:e.target.value};setInf(f=>({...f,items}));}} style={{marginBottom:0}}/>
            <Inp type="number" placeholder="Qty" value={item.qty} onChange={e=>{const items=[...inf.items];items[i]={...items[i],qty:e.target.value};setInf(f=>({...f,items}));}} style={{marginBottom:0}}/>
            <Inp type="number" placeholder="₦" value={item.price} onChange={e=>{const items=[...inf.items];items[i]={...items[i],price:e.target.value};setInf(f=>({...f,items}));}} style={{marginBottom:0}}/>
            <button onClick={()=>{const items=inf.items.filter((_,j)=>j!==i);setInf(f=>({...f,items:items.length?items:[{name:"",qty:1,price:""}]}));}} style={{background:C.redPale,border:"none",borderRadius:6,color:C.red,fontSize:14,cursor:"pointer",height:34,width:26}}>×</button>
          </div>
        ))}
        <Btn sm v="ghost" onClick={()=>setInf(f=>({...f,items:[...f.items,{name:"",qty:1,price:""}]}))} style={{marginBottom:12}}>+ Add Item</Btn>
        <Inp label="Note (optional)" value={inf.note} onChange={e=>setInf(f=>({...f,note:e.target.value}))} placeholder="e.g. Thank you for your order!"/>
        <div style={{background:C.bg,borderRadius:8,padding:"9px 12px",marginBottom:12,fontSize:13,display:"flex",justifyContent:"space-between"}}>
          <span style={{color:C.muted}}>Total</span>
          <strong>{f(inf.items.reduce((s,i)=>s+(Number(i.price)*Number(i.qty)||0),0))}</strong>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn v="ghost" sm onClick={()=>setModal(null)}>Cancel</Btn>
          <Btn sm onClick={submitInvoice}>Create Invoice</Btn>
        </div>
      </Modal>}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [screen,setScreen]   = useState("loading");
  const [user,setUser]       = useState(null);
  const [profile,setProfile] = useState(null);

  const loadProfile = useCallback(async (userId) => {
    const { data } = await supabase.from("profiles").select("*").eq("id",userId).single();
    return data;
  },[]);

  const handleAuth = useCallback(async (authUser) => {
    const prof = await loadProfile(authUser.id);
    setUser(authUser);
    setProfile(prof);
    setScreen("app");
  },[loadProfile]);

  useEffect(()=>{
    // Detect password reset token in URL hash — Supabase puts #access_token=...&type=recovery
    const hash = window.location.hash;
    if(hash.includes("type=recovery")) {
      // Let Supabase process the token from the URL automatically
      setScreen("reset");
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if(session?.user) {
        await handleAuth(session.user);
      } else {
        setScreen("auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if(event==="PASSWORD_RECOVERY") {
        // Supabase fired the recovery event — show reset screen
        setScreen("reset");
      } else if((event==="SIGNED_IN"||event==="TOKEN_REFRESHED"||event==="USER_UPDATED") && session?.user) {
        // USER_UPDATED fires after a successful password reset
        if(screen !== "reset") await handleAuth(session.user);
      } else if(event==="SIGNED_OUT") {
        setUser(null); setProfile(null); setScreen("auth");
      }
    });

    return () => subscription.unsubscribe();
  },[handleAuth]);

  const handleSignOut = async () => { await supabase.auth.signOut(); };

  const handleResetDone = async () => {
    // After password update, load the session and go to app
    const { data: { session } } = await supabase.auth.getSession();
    if(session?.user) {
      await handleAuth(session.user);
    } else {
      setScreen("auth");
    }
    // Clean the URL hash so the token doesn't persist
    window.history.replaceState(null, "", window.location.pathname);
  };

  if(screen==="loading") return (
    <div style={{minHeight:"100vh",background:"#FAFAF8",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:12}}>📦</div>
        <div style={{color:"#9898A8",fontWeight:600,fontFamily:"-apple-system,sans-serif"}}>Loading Trakit…</div>
      </div>
    </div>
  );

  if(screen==="reset")  return <ResetPasswordScreen onDone={handleResetDone}/>;
  if(screen==="auth")   return <AuthScreen onAuth={handleAuth}/>;

  return <MainApp user={user} profile={profile} onSignOut={handleSignOut}/>;
}
