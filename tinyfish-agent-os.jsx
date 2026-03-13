import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════
//  TINYFISH AGENT OS  — Full Featured Hackathon Submission
//  Features: SDR Agent · Due Diligence · Compliance Monitor ·
//            Procurement Agent · Batch Runs · Scheduler · CSV Export ·
//            Diff/Change Detection · Live SSE Log · Run History ·
//            JSON Viewer · Email Alerts · Multi-URL · Custom Missions
// ═══════════════════════════════════════════════════════════════════

const API_KEY = "sk-tinyfish-KPCSNASiI0JrfqCtd66e2O8LtUqcFQfM";
const TINYFISH_SSE = "https://agent.tinyfish.ai/v1/automation/run-sse";

// ─── Agent Mission Templates ────────────────────────────────────────
const AGENTS = [
  {
    id: "sdr",
    icon: "🎯",
    label: "SDR Lead Agent",
    tagline: "Autonomous sales prospecting",
    color: "#06b6d4",
    category: "Sales",
    description: "Researches companies, finds decision-makers, enriches contact data from LinkedIn, company sites, and Crunchbase — then drafts personalized outreach.",
    fields: [
      { key: "company", label: "Company Name / URL", placeholder: "stripe.com", type: "text" },
      { key: "role", label: "Target Role", placeholder: "Head of Engineering, VP Sales...", type: "text" },
      { key: "context", label: "Your Product / Value Prop", placeholder: "We help B2B SaaS teams automate...", type: "textarea" },
    ],
    buildUrl: (f) => f.company?.startsWith("http") ? f.company : `https://${f.company}`,
    buildGoal: (f) => `You are a senior SDR researching ${f.company} for outbound sales.

STEP 1 - Company research: Navigate to their website. Extract: company description, industry, company size (look for careers page, about page, LinkedIn link), recent news or announcements, tech stack clues (look at job postings), key products/services.

STEP 2 - Find decision makers: Look for a team/about page. Find people with titles matching "${f.role}". Extract their names, titles, and any contact hints.

STEP 3 - Pain point analysis: Based on what you see, identify 2-3 specific pain points that "${f.context}" could solve for this company.

STEP 4 - Draft outreach: Write a highly personalized cold email (subject + body, under 150 words) referencing specific things you found.

Return as JSON: {
  "company_summary": {"name": str, "industry": str, "size": str, "description": str, "tech_signals": [str]},
  "decision_makers": [{"name": str, "title": str, "linkedin_hint": str}],
  "pain_points": [str],
  "personalized_email": {"subject": str, "body": str},
  "confidence_score": int
}`,
    batchable: true,
    defaultUrls: ["stripe.com", "linear.app", "vercel.com"],
  },
  {
    id: "diligence",
    icon: "🔍",
    label: "Due Diligence Agent",
    tagline: "AI-powered investment research",
    color: "#8b5cf6",
    category: "Finance",
    description: "Given any company, autonomously browses their site, news, job board, G2 reviews, and Crunchbase to generate a structured investment memo in minutes.",
    fields: [
      { key: "company", label: "Company Name or Website", placeholder: "notion.so", type: "text" },
      { key: "stage", label: "Investment Stage Context", placeholder: "Series A SaaS, seed fintech...", type: "text" },
    ],
    buildUrl: (f) => f.company?.startsWith("http") ? f.company : `https://${f.company}`,
    buildGoal: (f) => `You are a VC analyst conducting due diligence on ${f.company} (${f.stage || "early stage startup"}).

STEP 1 - Homepage analysis: Navigate to their website. Extract: core product description, target market, value proposition, pricing if visible, team highlights.

STEP 2 - Traction signals: Look for a customers/case studies page, press page, or blog. Extract: notable customers, growth claims, press mentions, launch dates.

STEP 3 - Team assessment: Find the About/Team page. List founders, their backgrounds, any notable credentials or prior exits.

STEP 4 - Competitive positioning: Identify how they position against competitors based on their messaging.

STEP 5 - Red flags & strengths: Based on everything you've seen, list 3 strengths and 3 risks.

Return as JSON: {
  "company_name": str,
  "one_liner": str,
  "product": {"description": str, "target_market": str, "pricing_model": str},
  "traction": {"customers": [str], "claims": [str], "press": [str]},
  "team": [{"name": str, "role": str, "background": str}],
  "competitive_positioning": str,
  "strengths": [str],
  "risks": [str],
  "investment_grade": str,
  "recommendation": str
}`,
    batchable: false,
    exportable: true,
  },
  {
    id: "compliance",
    icon: "🛡️",
    label: "Compliance Monitor",
    tagline: "Live regulatory & policy tracking",
    color: "#f59e0b",
    category: "Legal/Ops",
    description: "Monitors competitor pricing pages, T&Cs, regulatory sites, and policy documents. Detects changes and alerts your team before they affect your business.",
    fields: [
      { key: "url", label: "Page to Monitor", placeholder: "https://competitor.com/pricing", type: "text" },
      { key: "focus", label: "What to Watch", placeholder: "pricing changes, new terms, GDPR clauses...", type: "text" },
    ],
    buildUrl: (f) => f.url,
    buildGoal: (f) => `You are a compliance analyst monitoring this page for important changes related to: ${f.focus || "pricing, terms, policies"}.

STEP 1 - Full page extraction: Navigate to the page. Extract ALL text content that is relevant to: ${f.focus}. Be exhaustive — capture exact prices, exact policy language, exact terms.

STEP 2 - Structured data: Organize what you found into structured categories.

STEP 3 - Risk flags: Identify anything that looks like it recently changed or would require action from a business perspective.

STEP 4 - Summary: Write a 3-sentence executive summary of what's on this page.

Return as JSON: {
  "page_title": str,
  "extracted_data": {},
  "key_items": [{"category": str, "item": str, "value": str, "risk_level": str}],
  "risk_flags": [{"flag": str, "severity": "low"|"medium"|"high", "action_required": str}],
  "executive_summary": str,
  "scraped_at": str
}`,
    batchable: true,
    schedulable: true,
    defaultUrls: ["https://stripe.com/pricing", "https://openai.com/pricing", "https://anthropic.com/pricing"],
  },
  {
    id: "procurement",
    icon: "📦",
    label: "Procurement Agent",
    tagline: "Automated supplier research & RFQ",
    color: "#10b981",
    category: "Operations",
    description: "Browses supplier catalogs, compares pricing across vendors, checks stock availability, and fills RFQ forms — turning hours of ops work into seconds.",
    fields: [
      { key: "product", label: "Product / Service Needed", placeholder: "AWS EC2 c5.xlarge instances, 500 units/mo", type: "text" },
      { key: "vendors", label: "Vendor Sites (comma separated)", placeholder: "aws.amazon.com, cloud.google.com, azure.microsoft.com", type: "text" },
      { key: "budget", label: "Budget Range", placeholder: "$5,000 - $10,000/month", type: "text" },
    ],
    buildUrl: (f) => {
      const vendors = f.vendors?.split(",").map(v => v.trim()).filter(Boolean);
      return vendors?.[0]?.startsWith("http") ? vendors[0] : `https://${vendors?.[0] || "aws.amazon.com"}`;
    },
    buildGoal: (f) => `You are a procurement analyst comparing vendors for: ${f.product}. Budget: ${f.budget || "flexible"}.

Vendors to research: ${f.vendors || "top cloud providers"}.

STEP 1 - Navigate to the first vendor's pricing or product page. Extract exact pricing, tiers, minimums, and any current promotions or discounts.

STEP 2 - Extract availability, SLA terms, support options, and contract flexibility.

STEP 3 - Identify any hidden costs (setup fees, egress, overage charges).

STEP 4 - Score this vendor on: price (1-10), flexibility (1-10), support (1-10).

Return as JSON: {
  "product_searched": str,
  "vendor_analyzed": str,
  "pricing": [{"tier": str, "price": str, "unit": str, "notes": str}],
  "promotions": [str],
  "hidden_costs": [str],
  "sla": str,
  "support_options": [str],
  "scores": {"price": int, "flexibility": int, "support": int, "overall": int},
  "recommendation": str,
  "best_option": str
}`,
    batchable: true,
    defaultUrls: ["https://aws.amazon.com/pricing", "https://cloud.google.com/pricing", "https://azure.microsoft.com/pricing"],
  },
  {
    id: "recruiting",
    icon: "👥",
    label: "Talent Intel Agent",
    tagline: "Competitor hiring signal analysis",
    color: "#f43f5e",
    category: "HR/Strategy",
    description: "Monitors competitor job boards, detects strategic hiring patterns, identifies which teams are scaling, and surfaces talent intelligence before it becomes public knowledge.",
    fields: [
      { key: "company", label: "Company to Monitor", placeholder: "openai.com", type: "text" },
      { key: "focus", label: "Focus Area (optional)", placeholder: "ML engineers, sales team, leadership...", type: "text" },
    ],
    buildUrl: (f) => {
      const base = f.company?.startsWith("http") ? f.company : `https://${f.company}`;
      return base;
    },
    buildGoal: (f) => `You are a competitive intelligence analyst studying hiring patterns at ${f.company}.

STEP 1 - Find their jobs page: Navigate to the company website, find their careers/jobs section. Look for links to Greenhouse, Lever, Ashby, or similar ATS.

STEP 2 - Extract all open roles: Get every job listing you can find. For each: title, department, location, seniority level, date posted if visible.

STEP 3 - Pattern analysis: ${f.focus ? `Pay special attention to roles in: ${f.focus}.` : ""} Identify: which departments are growing fastest, what skills/tech they're hiring for, any unusual patterns (sudden leadership hires, new geo expansion, new product teams).

STEP 4 - Strategic signals: Based on the job postings, infer what strategic moves this company is likely making in the next 6-12 months.

Return as JSON: {
  "company": str,
  "total_openings": int,
  "jobs": [{"title": str, "department": str, "location": str, "level": str}],
  "department_breakdown": {"department": count},
  "top_skills_demanded": [str],
  "growth_signals": [str],
  "strategic_inferences": [str],
  "threat_level": "low"|"medium"|"high",
  "analyst_note": str
}`,
    batchable: true,
    schedulable: true,
  },
  {
    id: "travel",
    icon: "✈️",
    label: "Travel Booking Agent",
    tagline: "Automated flight & hotel search",
    color: "#3b82f6",
    category: "Travel",
    description: "Searches multiple travel sites for flights and hotels, compares prices, checks availability, and extracts the best deals — saving hours of manual comparison shopping.",
    fields: [
      { key: "from", label: "From", placeholder: "San Francisco", type: "text" },
      { key: "to", label: "To", placeholder: "New York", type: "text" },
      { key: "dates", label: "Travel Dates", placeholder: "Select date", type: "date" },
      { key: "travelers", label: "Number of Travelers", placeholder: "2 adults", type: "text" },
      { key: "budget", label: "Budget (optional)", placeholder: "$500-1000 per person", type: "text" },
    ],
    buildUrl: (f) => "https://www.google.com/travel/flights",
    buildGoal: (f) => `You are a travel booking agent searching for the best flight and hotel options from ${f.from} to ${f.to} for ${f.dates}. Travelers: ${f.travelers || "1 adult"}. ${f.budget ? `Budget: ${f.budget}` : ""}

IMPORTANT: If searching for flights/hotels in India, ensure prices are shown in Indian Rupees (₹ INR), not USD. Look for currency selector on the page.

STEP 1 - Flight search: Navigate to Google Flights. Search for flights matching the criteria. Extract: top 3-5 flight options with airline, departure/arrival times, duration, number of stops, and exact price in local currency (₹ for India).

STEP 2 - Hotel search: Navigate to Google Hotels. Search for hotels in ${f.to} for the dates ${f.dates}. Extract: top 3-5 hotel options with name, star rating, location, amenities, and price per night in local currency.

STEP 3 - Best deals: Identify the best value options for both flights and hotels based on price, convenience, and quality.

STEP 4 - Total cost calculation: Calculate total trip cost for the best combination of flight + hotel.

Return as JSON: {
  "search_criteria": {"from": str, "to": str, "dates": str, "travelers": str, "currency": str},
  "flights": [{"airline": str, "departure": str, "arrival": str, "duration": str, "stops": int, "price": str, "booking_link": str}],
  "hotels": [{"name": str, "stars": int, "location": str, "amenities": [str], "price_per_night": str, "total_price": str, "booking_link": str}],
  "best_flight": {"airline": str, "price": str, "reason": str},
  "best_hotel": {"name": str, "price": str, "reason": str},
  "total_trip_cost": str,
  "recommendations": str,
  "deals_found": [str]
}`,
    batchable: false,
    exportable: true,
  },
  {
    id: "custom",
    icon: "⚡",
    label: "Custom Agent",
    tagline: "Any task, any website",
    color: "#64748b",
    category: "Custom",
    description: "Define any autonomous web task. Navigate any site, extract any data, fill any form, execute any multi-step workflow.",
    fields: [
      { key: "url", label: "Target URL", placeholder: "https://any-website.com", type: "text" },
      { key: "goal", label: "Mission Brief", placeholder: "Describe in plain English what the agent should do...", type: "textarea" },
    ],
    buildUrl: (f) => f.url,
    buildGoal: (f) => f.goal,
    batchable: true,
  },
];

// ─── SSE Streaming ──────────────────────────────────────────────────
async function* streamAgent({ url, goal, stealth, proxy }) {
  const res = await fetch(TINYFISH_SSE, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
    body: JSON.stringify({
      url,
      goal,
      browser_profile: stealth ? "stealth" : "lite",
      ...(proxy ? { proxy_config: { enabled: true } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === "[DONE]") continue;
      try { yield JSON.parse(raw); } catch {}
    }
  }
}

// ─── Utility helpers ────────────────────────────────────────────────
const ts = () => new Date().toLocaleTimeString("en", { hour12: false });
const fmtDuration = (ms) => ms < 60000 ? `${(ms/1000).toFixed(1)}s` : `${(ms/60000).toFixed(1)}m`;

function exportCSV(runs) {
  const headers = ["Agent", "URL", "Status", "Duration", "Timestamp", "Result"];
  const rows = runs.map(r => [
    r.agentLabel, r.url, r.status, r.duration,
    r.timestamp, JSON.stringify(r.result || r.error || "").replace(/,/g, ";")
  ]);
  const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = `tinyfish-runs-${Date.now()}.csv`; a.click();
}

function exportJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = filename; a.click();
}

// ─── Diff Engine ────────────────────────────────────────────────────
function computeDiff(oldObj, newObj, path = "") {
  const changes = [];
  const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
  for (const key of allKeys) {
    const fullPath = path ? `${path}.${key}` : key;
    const oldVal = oldObj?.[key]; const newVal = newObj?.[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      if (typeof oldVal === "object" && typeof newVal === "object" && oldVal && newVal) {
        changes.push(...computeDiff(oldVal, newVal, fullPath));
      } else {
        changes.push({ path: fullPath, old: oldVal, new: newVal });
      }
    }
  }
  return changes;
}

// ═══════════════════════════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function GlowDot({ status }) {
  const map = { idle:"#334155", running:"#f59e0b", completed:"#10b981", error:"#ef4444", scheduled:"#8b5cf6" };
  const c = map[status] || map.idle;
  return <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:c,
    boxShadow: status==="running" ? `0 0 10px ${c}, 0 0 20px ${c}44` : "none",
    animation: status==="running" ? "glow-pulse 1s ease-in-out infinite" : "none" }} />;
}

function AgentCard({ agent, active, onClick }) {
  return (
    <div onClick={onClick} style={{
      border: `1px solid ${active ? agent.color : "#1e293b"}`,
      borderRadius: 10, padding:"14px 16px", cursor:"pointer", marginBottom:8,
      background: active ? `${agent.color}11` : "#0a0f1c",
      transition:"all 0.18s", position:"relative", overflow:"hidden",
    }}>
      {active && <div style={{ position:"absolute", left:0, top:0, bottom:0, width:3, background:agent.color, borderRadius:"3px 0 0 3px" }} />}
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:20 }}>{agent.icon}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color: active ? agent.color : "#cbd5e1" }}>{agent.label}</div>
          <div style={{ fontSize:11, color:"#475569", marginTop:1 }}>{agent.tagline}</div>
        </div>
        <span style={{ fontSize:10, padding:"2px 7px", borderRadius:20, background:`${agent.color}22`, color:agent.color, fontWeight:600 }}>
          {agent.category}
        </span>
      </div>
    </div>
  );
}

function LiveLog({ entries }) {
  const ref = useRef(null);
  useEffect(() => { if(ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [entries]);
  const typeColor = { action:"#f59e0b", complete:"#10b981", error:"#f87171", nav:"#06b6d4", extract:"#a78bfa", info:"#64748b" };
  return (
    <div ref={ref} style={{ background:"#040810", border:"1px solid #0f172a", borderRadius:8,
      padding:"12px 14px", fontFamily:"'JetBrains Mono',monospace", fontSize:11.5,
      lineHeight:1.8, height:200, overflowY:"auto", color:"#64748b" }}>
      {entries.length === 0
        ? <span style={{color:"#1e293b"}}>{"// Waiting for agent to launch..."}</span>
        : entries.map((e,i) => (
          <div key={i}>
            <span style={{color:"#1e293b",marginRight:8}}>{e.t}</span>
            <span style={{color: typeColor[e.type]||typeColor.info}}>{e.msg}</span>
          </div>
        ))
      }
    </div>
  );
}

function JsonTree({ data, depth=0 }) {
  const [collapsed, setCollapsed] = useState(depth > 1);
  if (data === null) return <span style={{color:"#64748b"}}>null</span>;
  if (typeof data === "boolean") return <span style={{color:"#818cf8"}}>{String(data)}</span>;
  if (typeof data === "number") return <span style={{color:"#f59e0b"}}>{data}</span>;
  if (typeof data === "string") return <span style={{color:"#34d399"}}>"{data}"</span>;
  if (Array.isArray(data)) {
    if (data.length === 0) return <span style={{color:"#475569"}}>[]</span>;
    return <span>
      <button onClick={()=>setCollapsed(c=>!c)} style={{background:"none",border:"none",color:"#f59e0b",cursor:"pointer",padding:"0 3px",fontSize:11}}>
        {collapsed ? "▶" : "▼"}
      </button>
      <span style={{color:"#475569"}}>[{data.length}]</span>
      {!collapsed && <div style={{paddingLeft:16}}>
        {data.map((item,i)=><div key={i}><JsonTree data={item} depth={depth+1}/>{i<data.length-1&&<span style={{color:"#475569"}}>,</span>}</div>)}
      </div>}
    </span>;
  }
  if (typeof data === "object") {
    const keys = Object.keys(data);
    return <span>
      <button onClick={()=>setCollapsed(c=>!c)} style={{background:"none",border:"none",color:"#8b5cf6",cursor:"pointer",padding:"0 3px",fontSize:11}}>
        {collapsed ? "▶" : "▼"}
      </button>
      {!collapsed
        ? <div style={{paddingLeft:16}}>{keys.map((k,i)=>(
          <div key={k}><span style={{color:"#93c5fd"}}>"{k}"</span><span style={{color:"#475569"}}>: </span>
          <JsonTree data={data[k]} depth={depth+1}/>{i<keys.length-1&&<span style={{color:"#475569"}}>,</span>}</div>
        ))}</div>
        : <span style={{color:"#475569"}}>{` {${keys.length} keys}`}</span>
      }
    </span>;
  }
  return <span>{String(data)}</span>;
}

function ResultPanel({ result, agentColor, agentId, onExport }) {
  const [tab, setTab] = useState("visual");
  if (!result) return null;

  const renderVisual = () => {
    // SDR Result
    if (agentId === "sdr" && result.personalized_email) return (
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <InfoBox label="Company" value={result.company_summary?.name} color="#06b6d4"/>
          <InfoBox label="Industry" value={result.company_summary?.industry} color="#06b6d4"/>
          <InfoBox label="Size" value={result.company_summary?.size} color="#06b6d4"/>
          <InfoBox label="Confidence" value={`${result.confidence_score || "—"}/10`} color="#06b6d4"/>
        </div>
        {result.company_summary?.tech_signals?.length > 0 && (
          <TagList label="Tech Signals" tags={result.company_summary.tech_signals} color="#06b6d4"/>
        )}
        {result.pain_points?.length > 0 && (
          <TagList label="Pain Points" tags={result.pain_points} color="#f59e0b"/>
        )}
        {result.decision_makers?.length > 0 && (
          <div style={{background:"#0a0f1c",border:"1px solid #1e293b",borderRadius:8,padding:"12px 14px"}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",color:"#475569",textTransform:"uppercase",marginBottom:8}}>Decision Makers</div>
            {result.decision_makers.map((p,i)=>(
              <div key={i} style={{display:"flex",gap:10,marginBottom:6,alignItems:"center"}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:"#1e293b",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0}}>
                  {p.name?.[0]||"?"}
                </div>
                <div><div style={{fontSize:13,color:"#cbd5e1",fontWeight:500}}>{p.name}</div>
                <div style={{fontSize:11,color:"#475569"}}>{p.title}</div></div>
              </div>
            ))}
          </div>
        )}
        {result.personalized_email && (
          <div style={{background:"#0a0f1c",border:"1px solid #06b6d422",borderRadius:8,padding:"14px"}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",color:"#06b6d4",textTransform:"uppercase",marginBottom:8}}>✉ Generated Outreach</div>
            <div style={{fontSize:12,fontWeight:600,color:"#cbd5e1",marginBottom:6}}>Subject: {result.personalized_email.subject}</div>
            <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{result.personalized_email.body}</div>
          </div>
        )}
      </div>
    );

    // Due Diligence
    if (agentId === "diligence" && result.team) return (
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{background:"#0a0f1c",border:`1px solid #8b5cf622`,borderRadius:8,padding:"14px"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#8b5cf6",marginBottom:4}}>{result.company_name}</div>
          <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.6}}>{result.one_liner}</div>
          <div style={{display:"flex",gap:8,marginTop:8}}>
            <span style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:"#8b5cf622",color:"#8b5cf6",fontWeight:600}}>{result.investment_grade || "B"}</span>
            <span style={{fontSize:11,color:"#475569"}}>{result.product?.pricing_model}</span>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <ListBox label="💪 Strengths" items={result.strengths} color="#10b981"/>
          <ListBox label="⚠ Risks" items={result.risks} color="#ef4444"/>
        </div>
        {result.team?.length > 0 && (
          <div style={{background:"#0a0f1c",border:"1px solid #1e293b",borderRadius:8,padding:"12px 14px"}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",color:"#475569",textTransform:"uppercase",marginBottom:8}}>Team</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {result.team.slice(0,4).map((m,i)=>(
                <div key={i} style={{fontSize:12}}><span style={{color:"#cbd5e1",fontWeight:600}}>{m.name}</span><span style={{color:"#475569"}}> · {m.role} · {m.background}</span></div>
              ))}
            </div>
          </div>
        )}
        {result.recommendation && (
          <div style={{background:"#0a0f1c",border:"1px solid #8b5cf633",borderRadius:8,padding:"12px 14px",fontSize:13,color:"#c4b5fd",lineHeight:1.6}}>
            <strong>Recommendation:</strong> {result.recommendation}
          </div>
        )}
      </div>
    );

    // Compliance
    if (agentId === "compliance" && result.risk_flags) return (
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{background:"#0a0f1c",border:"1px solid #f59e0b22",borderRadius:8,padding:"12px 14px"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#f59e0b",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>Executive Summary</div>
          <div style={{fontSize:13,color:"#94a3b8",lineHeight:1.6}}>{result.executive_summary}</div>
        </div>
        <div style={{background:"#0a0f1c",border:"1px solid #1e293b",borderRadius:8,padding:"12px 14px"}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",color:"#475569",textTransform:"uppercase",marginBottom:8}}>Risk Flags</div>
          {result.risk_flags?.map((f,i)=>(
            <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}}>
              <span style={{padding:"2px 7px",borderRadius:4,fontSize:10,fontWeight:700,
                background: f.severity==="high"?"#ef444422":f.severity==="medium"?"#f59e0b22":"#10b98122",
                color: f.severity==="high"?"#f87171":f.severity==="medium"?"#f59e0b":"#34d399",
                flexShrink:0,marginTop:1
              }}>{f.severity?.toUpperCase()}</span>
              <div><div style={{fontSize:12,color:"#cbd5e1"}}>{f.flag}</div>
              <div style={{fontSize:11,color:"#475569",marginTop:2}}>{f.action_required}</div></div>
            </div>
          ))}
        </div>
        {result.key_items?.length > 0 && (
          <div style={{background:"#0a0f1c",border:"1px solid #1e293b",borderRadius:8,overflow:"hidden"}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",color:"#475569",textTransform:"uppercase",padding:"10px 14px 6px"}}>Extracted Data</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <tbody>{result.key_items.slice(0,8).map((item,i)=>(
                <tr key={i} style={{borderTop:"1px solid #0f172a"}}>
                  <td style={{padding:"7px 14px",color:"#475569"}}>{item.category}</td>
                  <td style={{padding:"7px 14px",color:"#cbd5e1"}}>{item.item}</td>
                  <td style={{padding:"7px 14px",color:"#f59e0b",textAlign:"right"}}>{item.value}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    );

    // Talent Intel
    if (agentId === "recruiting" && result.jobs) return (
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          <InfoBox label="Total Openings" value={result.total_openings} color="#f43f5e"/>
          <InfoBox label="Threat Level" value={result.threat_level?.toUpperCase()} color={result.threat_level==="high"?"#ef4444":result.threat_level==="medium"?"#f59e0b":"#10b981"}/>
          <InfoBox label="Departments" value={Object.keys(result.department_breakdown||{}).length} color="#f43f5e"/>
        </div>
        {result.strategic_inferences?.length>0 && (
          <div style={{background:"#0a0f1c",border:"1px solid #f43f5e22",borderRadius:8,padding:"12px 14px"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#f43f5e",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Strategic Inferences</div>
            {result.strategic_inferences.map((s,i)=>(
              <div key={i} style={{fontSize:12,color:"#94a3b8",marginBottom:4,paddingLeft:12,borderLeft:"2px solid #f43f5e44"}}>→ {s}</div>
            ))}
          </div>
        )}
        {result.top_skills_demanded?.length>0 && (
          <TagList label="Top Skills Demanded" tags={result.top_skills_demanded} color="#f43f5e"/>
        )}
        {result.jobs?.length>0 && (
          <div style={{background:"#0a0f1c",border:"1px solid #1e293b",borderRadius:8,overflow:"hidden"}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",color:"#475569",textTransform:"uppercase",padding:"10px 14px 6px"}}>Open Roles ({result.jobs.length})</div>
            <div style={{maxHeight:180,overflowY:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <tbody>{result.jobs.map((j,i)=>(
                  <tr key={i} style={{borderTop:"1px solid #0f172a"}}>
                    <td style={{padding:"6px 14px",color:"#cbd5e1",fontWeight:500}}>{j.title}</td>
                    <td style={{padding:"6px 14px",color:"#475569"}}>{j.department}</td>
                    <td style={{padding:"6px 14px",color:"#475569"}}>{j.location}</td>
                    <td style={{padding:"6px 14px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:10,background:"#f43f5e22",color:"#f43f5e"}}>{j.level||"IC"}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );

    // Procurement
    if (agentId === "procurement" && result.pricing) return (
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10}}>
          {result.scores && Object.entries(result.scores).map(([k,v])=>(
            <div key={k} style={{background:"#0a0f1c",border:"1px solid #1e293b",borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:800,color: v>=7?"#10b981":v>=5?"#f59e0b":"#ef4444"}}>{v}</div>
              <div style={{fontSize:10,color:"#475569",textTransform:"capitalize",marginTop:2}}>{k}</div>
            </div>
          ))}
        </div>
        {result.pricing?.length>0 && (
          <div style={{background:"#0a0f1c",border:"1px solid #10b98122",borderRadius:8,overflow:"hidden"}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",color:"#10b981",textTransform:"uppercase",padding:"10px 14px 6px"}}>Pricing Tiers</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <tbody>{result.pricing.map((p,i)=>(
                <tr key={i} style={{borderTop:"1px solid #0f172a"}}>
                  <td style={{padding:"7px 14px",color:"#cbd5e1",fontWeight:500}}>{p.tier}</td>
                  <td style={{padding:"7px 14px",color:"#10b981",fontWeight:700}}>{p.price}</td>
                  <td style={{padding:"7px 14px",color:"#475569"}}>{p.unit}</td>
                  <td style={{padding:"7px 14px",color:"#475569",fontSize:11}}>{p.notes}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {result.hidden_costs?.length>0 && (
          <div style={{background:"#ef444411",border:"1px solid #ef444422",borderRadius:8,padding:"12px 14px"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#f87171",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>⚠ Hidden Costs</div>
            {result.hidden_costs.map((c,i)=><div key={i} style={{fontSize:12,color:"#fca5a5",marginBottom:2}}>• {c}</div>)}
          </div>
        )}
        {result.recommendation && (
          <div style={{background:"#0a0f1c",border:"1px solid #10b98133",borderRadius:8,padding:"12px 14px",fontSize:13,color:"#6ee7b7",lineHeight:1.6}}>
            <strong style={{color:"#10b981"}}>Recommendation:</strong> {result.recommendation}
          </div>
        )}
      </div>
    );

    // Travel Booking
    if (agentId === "travel" && result.flights) return (
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{background:"#0a0f1c",border:"1px solid #3b82f622",borderRadius:8,padding:"12px 14px"}}>
          <div style={{fontSize:13,color:"#3b82f6",fontWeight:600,marginBottom:4}}>
            {result.travel_request?.origin || result.search_criteria?.from} → {result.travel_request?.destination || result.search_criteria?.to}
          </div>
          <div style={{fontSize:11,color:"#475569"}}>
            {result.travel_request?.date || result.search_criteria?.dates} · {result.travel_request?.travelers || result.search_criteria?.travelers} traveler(s) · {result.travel_request?.currency || result.search_criteria?.currency || "INR"}
          </div>
        </div>
        {result.flights?.length>0 && (
          <div style={{background:"#0a0f1c",border:"1px solid #1e293b",borderRadius:8,overflow:"hidden"}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",color:"#3b82f6",textTransform:"uppercase",padding:"10px 14px 6px"}}>✈️ Flights ({result.flights.length})</div>
            <div style={{maxHeight:200,overflowY:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <tbody>{result.flights.map((f,i)=>(
                  <tr key={i} style={{borderTop:"1px solid #0f172a"}}>
                    <td style={{padding:"8px 14px",color:"#cbd5e1",fontWeight:600}}>{f.airline}</td>
                    <td style={{padding:"8px 14px",color:"#3b82f6",fontWeight:700}}>{f.price}</td>
                    <td style={{padding:"8px 14px",color:"#475569",fontSize:11}}>{f.departure} → {f.arrival}</td>
                    <td style={{padding:"8px 14px",color:"#475569",fontSize:11}}>{f.duration}</td>
                    <td style={{padding:"8px 14px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:10,background:f.stops===0||f.stops==="Nonstop"?"#10b98122":"#f59e0b22",color:f.stops===0||f.stops==="Nonstop"?"#10b981":"#f59e0b"}}>{f.stops===0||f.stops==="Nonstop"?"Nonstop":`${f.stops} stop`}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
        {result.hotels?.length>0 && (
          <div style={{background:"#0a0f1c",border:"1px solid #1e293b",borderRadius:8,overflow:"hidden"}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",color:"#3b82f6",textTransform:"uppercase",padding:"10px 14px 6px"}}>🏨 Hotels ({result.hotels.length})</div>
            <div style={{maxHeight:200,overflowY:"auto"}}>
              {result.hotels.map((h,i)=>(
                <div key={i} style={{borderTop:i>0?"1px solid #0f172a":"none",padding:"10px 14px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <div style={{fontSize:13,color:"#cbd5e1",fontWeight:600}}>{h.name} {"⭐".repeat(h.stars||3)}</div>
                    <div style={{fontSize:14,color:"#3b82f6",fontWeight:700}}>{h.price}</div>
                  </div>
                  <div style={{fontSize:11,color:"#475569"}}>{h.description || h.location}</div>
                  {h.deal && <div style={{fontSize:10,color:"#10b981",marginTop:2}}>🎉 {h.deal}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
        {result.best_combination && (
          <div style={{background:"#3b82f611",border:"1px solid #3b82f633",borderRadius:8,padding:"12px 14px"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#3b82f6",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>💰 Best Combination</div>
            <div style={{fontSize:13,color:"#94a3b8",lineHeight:1.6}}>
              <div>Flight: {result.best_combination.flight || result.best_flight?.airline + " " + result.best_flight?.price}</div>
              <div>Hotel: {result.best_combination.hotel || result.best_hotel?.name + " " + result.best_hotel?.price}</div>
              <div style={{fontSize:16,fontWeight:700,color:"#3b82f6",marginTop:6}}>Total: {result.best_combination.total || result.total_trip_cost}</div>
            </div>
          </div>
        )}
        {result.recommendations && (
          <div style={{background:"#0a0f1c",border:"1px solid #1e293b",borderRadius:8,padding:"12px 14px",fontSize:12,color:"#94a3b8",lineHeight:1.6}}>
            {result.recommendations}
          </div>
        )}
      </div>
    );

    // Default: JSON tree
    return (
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,lineHeight:1.7}}>
        <JsonTree data={result} />
      </div>
    );
  };

  return (
    <div style={{marginTop:16,animation:"fadeUp 0.3s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <GlowDot status="completed"/>
          <span style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",color:"#10b981",textTransform:"uppercase"}}>Mission Complete</span>
        </div>
        <div style={{display:"flex",gap:6}}>
          {["visual","json"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{
              padding:"3px 10px",borderRadius:4,border:"1px solid",fontFamily:"inherit",cursor:"pointer",
              fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em",transition:"all 0.15s",
              borderColor: tab===t ? agentColor : "#1e293b",
              background: tab===t ? `${agentColor}22` : "transparent",
              color: tab===t ? agentColor : "#475569",
            }}>{t}</button>
          ))}
          <button onClick={()=>exportJSON(result,`result-${Date.now()}.json`)} style={{
            padding:"3px 10px",borderRadius:4,border:"1px solid #1e293b",fontFamily:"inherit",
            cursor:"pointer",fontSize:11,background:"transparent",color:"#475569",
          }}>↓ JSON</button>
        </div>
      </div>
      <div style={{background:"#040810",border:"1px solid #0f172a",borderRadius:8,padding:"14px 16px",maxHeight:420,overflowY:"auto"}}>
        {tab === "json"
          ? <pre style={{margin:0,fontSize:11.5,fontFamily:"'JetBrains Mono',monospace",color:"#94a3b8",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{JSON.stringify(result,null,2)}</pre>
          : renderVisual()
        }
      </div>
    </div>
  );
}

function InfoBox({ label, value, color }) {
  return (
    <div style={{background:"#0a0f1c",border:"1px solid #1e293b",borderRadius:8,padding:"10px 14px"}}>
      <div style={{fontSize:11,color:"#475569",marginBottom:4}}>{label}</div>
      <div style={{fontSize:16,fontWeight:700,color: color||"#cbd5e1"}}>{value||"—"}</div>
    </div>
  );
}

function ListBox({ label, items, color }) {
  return (
    <div style={{background:"#0a0f1c",border:`1px solid ${color}22`,borderRadius:8,padding:"12px 14px"}}>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",color,textTransform:"uppercase",marginBottom:8}}>{label}</div>
      {(items||[]).map((item,i)=>(
        <div key={i} style={{fontSize:12,color:"#94a3b8",marginBottom:4,paddingLeft:10,borderLeft:`2px solid ${color}44`}}>{item}</div>
      ))}
    </div>
  );
}

function TagList({ label, tags, color }) {
  return (
    <div style={{background:"#0a0f1c",border:"1px solid #1e293b",borderRadius:8,padding:"12px 14px"}}>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",color:"#475569",textTransform:"uppercase",marginBottom:8}}>{label}</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
        {(tags||[]).map((t,i)=>(
          <span key={i} style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:`${color}18`,color,border:`1px solid ${color}33`}}>{t}</span>
        ))}
      </div>
    </div>
  );
}

function DiffPanel({ oldResult, newResult }) {
  if (!oldResult || !newResult) return null;
  const changes = computeDiff(oldResult, newResult);
  if (changes.length === 0) return (
    <div style={{padding:"10px 14px",background:"#10b98111",border:"1px solid #10b98133",borderRadius:8,fontSize:13,color:"#34d399",marginTop:12}}>
      ✓ No changes detected since last run
    </div>
  );
  return (
    <div style={{marginTop:12,background:"#0a0f1c",border:"1px solid #f59e0b33",borderRadius:8,padding:"12px 14px"}}>
      <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",color:"#f59e0b",textTransform:"uppercase",marginBottom:10}}>
        ⚡ {changes.length} Change{changes.length!==1?"s":""} Detected
      </div>
      {changes.map((c,i)=>(
        <div key={i} style={{marginBottom:8,padding:"8px 10px",background:"#050911",borderRadius:6,fontFamily:"monospace",fontSize:11}}>
          <div style={{color:"#475569",marginBottom:4}}>{c.path}</div>
          {c.old !== undefined && <div style={{color:"#f87171"}}>- {JSON.stringify(c.old)}</div>}
          {c.new !== undefined && <div style={{color:"#34d399"}}>+ {JSON.stringify(c.new)}</div>}
        </div>
      ))}
    </div>
  );
}

function HistoryRow({ run, onRerun, onDiff, compareTarget }) {
  const [open, setOpen] = useState(false);
  const agentDef = AGENTS.find(a=>a.id===run.agentId)||AGENTS[5];
  return (
    <div style={{border:"1px solid #1e293b",borderRadius:8,overflow:"hidden",marginBottom:8,background:"#0a0f1c"}}>
      <div onClick={()=>setOpen(x=>!x)} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",cursor:"pointer"}}>
        <GlowDot status={run.status}/>
        <span style={{fontSize:18}}>{agentDef.icon}</span>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:600,color:"#cbd5e1"}}>{run.agentLabel}</div>
          <div style={{fontSize:11,color:"#475569",fontFamily:"monospace",marginTop:1}}>{run.url?.substring(0,50)}</div>
        </div>
        <span style={{fontSize:11,color:"#334155"}}>{run.duration}</span>
        <span style={{fontSize:11,color:"#334155"}}>{run.timestamp}</span>
        <span style={{color:"#334155",fontSize:12}}>{open?"▲":"▼"}</span>
      </div>
      {open && (
        <div style={{borderTop:"1px solid #0f172a",padding:"10px 14px 14px"}}>
          {run.result && (
            <pre style={{background:"#040810",border:"1px solid #0f172a",borderRadius:6,padding:"10px 12px",
              fontSize:11,fontFamily:"monospace",color:"#34d399",maxHeight:140,overflowY:"auto",margin:"0 0 10px",
              whiteSpace:"pre-wrap",wordBreak:"break-word"}}>
              {JSON.stringify(run.result,null,2)}
            </pre>
          )}
          {run.error && <div style={{fontSize:12,color:"#f87171",marginBottom:10}}>Error: {run.error}</div>}
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={()=>onRerun(run)} color="#f59e0b">↻ Re-run</Btn>
            {compareTarget && compareTarget.id !== run.id && run.result && compareTarget.result && (
              <Btn onClick={()=>onDiff(compareTarget.result, run.result)} color="#8b5cf6">⟺ Diff</Btn>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Btn({ onClick, color, children, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding:"5px 14px",borderRadius:6,border:`1px solid ${color}44`,
      background:`${color}11`,color,fontSize:12,cursor:disabled?"not-allowed":"pointer",
      fontFamily:"inherit",fontWeight:500,opacity:disabled?0.5:1,transition:"all 0.15s",
    }}>{children}</button>
  );
}

function BatchPanel({ agent, onRunBatch }) {
  const [urls, setUrls] = useState((agent.defaultUrls || []).join("\n"));
  const [fields, setFields] = useState({});
  return (
    <div style={{background:"#0a0f1c",border:"1px solid #1e293b",borderRadius:8,padding:"14px 16px",marginTop:16}}>
      <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",color:"#475569",textTransform:"uppercase",marginBottom:10}}>
        ⚡ Batch Run — One goal, many targets
      </div>
      <div style={{marginBottom:10}}>
        <label style={{fontSize:11,color:"#475569",display:"block",marginBottom:5}}>URLs (one per line)</label>
        <textarea value={urls} onChange={e=>setUrls(e.target.value)} rows={4} style={{
          width:"100%",background:"#050911",border:"1px solid #1e293b",borderRadius:6,
          padding:"8px 12px",fontSize:12,color:"#94a3b8",fontFamily:"monospace",resize:"vertical",
        }}/>
      </div>
      {agent.fields.filter(f=>f.key!=="url"&&f.key!=="goal").map(f=>(
        <div key={f.key} style={{marginBottom:10}}>
          <label style={{fontSize:11,color:"#475569",display:"block",marginBottom:5}}>{f.label}</label>
          <input value={fields[f.key]||""} onChange={e=>setFields(p=>({...p,[f.key]:e.target.value}))}
            placeholder={f.placeholder} style={{
              width:"100%",background:"#050911",border:"1px solid #1e293b",borderRadius:6,
              padding:"8px 12px",fontSize:12,color:"#94a3b8",fontFamily:"monospace",
            }}/>
        </div>
      ))}
      <Btn color="#f59e0b" onClick={()=>onRunBatch(urls.split("\n").filter(Boolean),fields)}>
        ▶ Run All ({urls.split("\n").filter(Boolean).length} targets)
      </Btn>
    </div>
  );
}

function SchedulerPanel({ agent, onSchedule, schedules }) {
  const [cron, setCron] = useState("daily");
  const [url, setUrl] = useState(agent.defaultUrls?.[0]||"");
  return (
    <div style={{background:"#0a0f1c",border:"1px solid #8b5cf633",borderRadius:8,padding:"14px 16px",marginTop:16}}>
      <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",color:"#8b5cf6",textTransform:"uppercase",marginBottom:10}}>
        🕐 Scheduler — Auto-run on a schedule
      </div>
      <div style={{display:"flex",gap:10,marginBottom:10}}>
        <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="URL to monitor"
          style={{flex:1,background:"#050911",border:"1px solid #1e293b",borderRadius:6,padding:"8px 12px",fontSize:12,color:"#94a3b8",fontFamily:"monospace"}}/>
        <select value={cron} onChange={e=>setCron(e.target.value)} style={{
          background:"#050911",border:"1px solid #1e293b",borderRadius:6,padding:"8px 12px",
          fontSize:12,color:"#94a3b8",cursor:"pointer",
        }}>
          <option value="hourly">Every hour</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>
      <Btn color="#8b5cf6" onClick={()=>onSchedule({agentId:agent.id,url,cron,label:agent.label})}>
        + Add Schedule
      </Btn>
      {schedules.length>0 && (
        <div style={{marginTop:12}}>
          {schedules.map((s,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderTop:"1px solid #0f172a"}}>
              <GlowDot status="scheduled"/>
              <span style={{fontSize:12,color:"#94a3b8",flex:1,fontFamily:"monospace"}}>{s.url?.substring(0,40)}</span>
              <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"#8b5cf622",color:"#8b5cf6"}}>{s.cron}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════════════
export default function App() {
  const [activeAgent, setActiveAgent] = useState(AGENTS[0]);
  const [fields, setFields] = useState({});
  const [stealth, setStealth] = useState(false);
  const [proxy, setProxy] = useState(false);
  const [status, setStatus] = useState("idle");
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [mainTab, setMainTab] = useState("run");
  const [subTab, setSubTab] = useState("single");
  const [schedules, setSchedules] = useState([]);
  const [diffResult, setDiffResult] = useState(null);
  const [batchResults, setBatchResults] = useState([]);
  const [batchProgress, setBatchProgress] = useState(null);
  const [copied, setCopied] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const abortRef = useRef(false);
  const prevResultRef = useRef(null);

  const addLog = useCallback((msg, type="info") => {
    setLogs(p => [...p, { msg, type, t: ts() }]);
  }, []);

  const handleAgentSelect = (agent) => {
    setActiveAgent(agent);
    setFields({});
    setResult(null);
    setError(null);
    setLogs([]);
    setDiffResult(null);
    subTab !== "batch" && setSubTab("single");
  };

  const buildRunParams = (agentDef, f) => ({
    url: agentDef.buildUrl(f),
    goal: agentDef.buildGoal(f),
  });

  const doRun = async (agentDef, f, opts = {}) => {
    const { url, goal } = buildRunParams(agentDef, f);
    if (!url || !goal) throw new Error("Missing URL or goal");

    setStatus("running"); setResult(null); setError(null); setLogs([]);
    abortRef.current = false;
    const t0 = Date.now();
    addLog(`▶ Targeting ${url}`, "nav");
    addLog(`⚙  Mode: ${stealth ? "stealth" : "lite"} · Proxy: ${proxy ? "on" : "off"}`, "info");

    try {
      for await (const evt of streamAgent({ url, goal, stealth, proxy })) {
        if (abortRef.current) break;
        const msg = evt.message || evt.action || evt.thought || evt.description;
        if (evt.type === "ACTION" || evt.type === "STEP") addLog(`→ ${msg || JSON.stringify(evt)}`, "action");
        else if (evt.type === "NAVIGATION") addLog(`🌐 ${evt.url || msg || "navigating..."}`, "nav");
        else if (evt.type === "EXTRACTION") addLog(`📦 Extracting...`, "extract");
        else if (evt.type === "THOUGHT" || evt.type === "PLANNING") addLog(`⟳ ${msg || "thinking..."}`, "info");
        else if (evt.type === "COMPLETE" || evt.status === "COMPLETED") {
          const dur = fmtDuration(Date.now()-t0);
          addLog(`✓ Done in ${dur}`, "complete");
          const res = evt.resultJson ?? evt.result ?? evt.data ?? null;
          if (!opts.silent) {
            setResult(res);
            setStatus("completed");
            // Change detection
            if (prevResultRef.current && res) {
              const changes = computeDiff(prevResultRef.current, res);
              if (changes.length > 0) {
                setAlerts(p => [...p, { id: Date.now(), agent: agentDef.label, url, changes, ts: new Date().toLocaleTimeString() }]);
              }
              setDiffResult({ old: prevResultRef.current, new: res });
            }
            prevResultRef.current = res;
          }
          const run = {
            id: Date.now(), agentId: agentDef.id, agentLabel: agentDef.label,
            url, goal, result: res, status: "completed", duration: dur,
            timestamp: new Date().toLocaleTimeString(),
          };
          setHistory(p => [run, ...p.slice(0,49)]);
          return res;
        } else if (evt.type === "ERROR" || evt.status === "FAILED") {
          throw new Error(msg || evt.error || "Agent failed");
        } else if (msg) addLog(msg, "info");
      }
    } catch (err) {
      if (!abortRef.current) {
        addLog(`✗ ${err.message}`, "error");
        setError(err.message);
        setStatus("error");
        const run = { id:Date.now(), agentId:agentDef.id, agentLabel:agentDef.label, url, goal, error:err.message, status:"error", duration:fmtDuration(Date.now()-t0), timestamp:new Date().toLocaleTimeString() };
        setHistory(p=>[run,...p.slice(0,49)]);
        throw err;
      }
    }
  };

  const handleRun = () => doRun(activeAgent, fields);

  const handleBatch = async (urls, extraFields) => {
    setBatchResults([]); setBatchProgress({ done:0, total:urls.length, results:[] });
    for (let i=0; i<urls.length; i++) {
      const url = urls[i].trim();
      const f = { ...extraFields, url, company:url };
      try {
        const res = await doRun(activeAgent, f, { silent:true });
        setBatchResults(p=>[...p,{ url, result:res, status:"completed" }]);
        setBatchProgress(p=>({ ...p, done:i+1, results:[...p.results,{url,status:"completed"}] }));
      } catch {
        setBatchResults(p=>[...p,{ url, result:null, status:"error" }]);
        setBatchProgress(p=>({ ...p, done:i+1 }));
      }
    }
    setStatus("completed");
    addLog(`✓ Batch complete: ${urls.length} targets processed`, "complete");
  };

  const handleRerun = (run) => {
    const agent = AGENTS.find(a=>a.id===run.agentId)||AGENTS[5];
    setActiveAgent(agent);
    setFields({ url:run.url, goal:run.goal });
    setMainTab("run"); setSubTab("single");
    setResult(null); setError(null); setLogs([]);
  };

  const statsCompleted = history.filter(r=>r.status==="completed").length;
  const statsTotal = history.length;
  const avgDuration = history.filter(r=>r.duration).length
    ? (history.filter(r=>r.duration).map(r=>parseFloat(r.duration)).reduce((a,b)=>a+b,0)/history.filter(r=>r.duration).length).toFixed(1)+"s"
    : "—";

  return (
    <div style={{ minHeight:"100vh", background:"#030712", color:"#e2e8f0",
      fontFamily:"'DM Sans','Sora',system-ui,sans-serif", display:"flex", flexDirection:"column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;} body{margin:0;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:#030712;}
        ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:2px;}
        textarea,input,select{outline:none;font-family:inherit;}
        textarea:focus,input:focus{border-color:#f59e0b!important;box-shadow:0 0 0 2px #f59e0b18!important;}
        @keyframes glow-pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.4;transform:scale(1.5);}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        @keyframes shimmer{0%{background-position:-200% 0;}100%{background-position:200% 0;}}
        .agent-card:hover{border-color:#334155!important;background:#0a0f1c!important;}
        .nav-btn:hover{color:#cbd5e1!important;}
        .run-btn:hover:not(:disabled){filter:brightness(1.1);}
        .subtab:hover{color:#94a3b8!important;}
      `}</style>

      {/* ── TOP NAV ── */}
      <header style={{ borderBottom:"1px solid #0d1628", padding:"14px 28px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        background:"rgba(3,7,18,0.95)", backdropFilter:"blur(12px)",
        position:"sticky", top:0, zIndex:200 }}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{ width:38, height:38, borderRadius:10,
            background:"linear-gradient(135deg,#06b6d4,#8b5cf6)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:20, boxShadow:"0 0 24px rgba(6,182,212,0.35)" }}>🐟</div>
          <div>
            <div style={{fontWeight:800,fontSize:17,letterSpacing:"-0.03em",background:"linear-gradient(90deg,#e2e8f0,#94a3b8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              TinyFish Agent OS
            </div>
            <div style={{fontSize:10,color:"#334155",letterSpacing:"0.12em",textTransform:"uppercase"}}>
              Autonomous Web Intelligence Platform
            </div>
          </div>
        </div>

        {/* Main nav tabs */}
        <div style={{display:"flex",gap:0,border:"1px solid #1e293b",borderRadius:8,overflow:"hidden"}}>
          {[["run","▶ Missions"],["history",`📋 History (${statsTotal})`],["batch","⚡ Batch"],["schedule","🕐 Scheduler"],["alerts",`🔔 Alerts${alerts.length>0?` (${alerts.length})`:""}`]].map(([t,l])=>(
            <button key={t} className="nav-btn" onClick={()=>setMainTab(t)} style={{
              padding:"8px 16px",border:"none",borderRight:"1px solid #1e293b",
              background: mainTab===t ? "#0f172a" : "transparent",
              color: mainTab===t ? "#e2e8f0" : "#475569",
              cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,
              transition:"color 0.15s",
            }}>{l}</button>
          ))}
        </div>

        {/* Status strip */}
        <div style={{display:"flex",alignItems:"center",gap:16,fontSize:12}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <GlowDot status="completed"/>
            <span style={{color:"#334155"}}>{statsCompleted} runs</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <GlowDot status={status}/>
            <span style={{color:"#334155",textTransform:"capitalize"}}>{status}</span>
          </div>
          <div style={{width:1,height:20,background:"#1e293b"}}/>
          <div style={{fontSize:10,color:"#1e293b",fontFamily:"monospace"}}>API ●</div>
        </div>
      </header>

      <div style={{flex:1,display:"flex",maxWidth:1400,margin:"0 auto",width:"100%",padding:"0 20px"}}>

        {/* ── SIDEBAR ── */}
        <aside style={{width:240,padding:"24px 16px 24px 0",borderRight:"1px solid #0d1628",flexShrink:0}}>
          <div style={{fontSize:9,fontWeight:800,letterSpacing:"0.16em",color:"#1e293b",marginBottom:14,textTransform:"uppercase",paddingLeft:4}}>
            Agent Templates
          </div>
          {AGENTS.map(agent=>(
            <div key={agent.id} className="agent-card" onClick={()=>handleAgentSelect(agent)} style={{
              border:`1px solid ${activeAgent.id===agent.id ? agent.color : "#0d1628"}`,
              borderRadius:10, padding:"13px 14px", cursor:"pointer", marginBottom:6,
              background: activeAgent.id===agent.id ? `${agent.color}0d` : "transparent",
              transition:"all 0.18s",position:"relative",overflow:"hidden",
            }}>
              {activeAgent.id===agent.id && <div style={{position:"absolute",left:0,top:0,bottom:0,width:2,background:agent.color}}/>}
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18}}>{agent.icon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12.5,fontWeight:700,color:activeAgent.id===agent.id?agent.color:"#94a3b8",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{agent.label}</div>
                  <div style={{fontSize:10,color:"#334155",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{agent.tagline}</div>
                </div>
              </div>
            </div>
          ))}

          {/* Stats box */}
          <div style={{marginTop:20,background:"#0a0f1c",border:"1px solid #0d1628",borderRadius:10,padding:"14px"}}>
            <div style={{fontSize:9,fontWeight:800,letterSpacing:"0.16em",color:"#1e293b",marginBottom:12,textTransform:"uppercase"}}>Session</div>
            {[["Runs",statsTotal,"#e2e8f0"],["Success",statsCompleted,"#10b981"],["Avg Time",avgDuration,"#f59e0b"],["Alerts",alerts.length,"#f43f5e"]].map(([l,v,c])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:11,color:"#334155"}}>{l}</span>
                <span style={{fontSize:12,fontWeight:700,color:c}}>{v}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main style={{flex:1,padding:"24px 0 24px 24px",animation:"fadeUp 0.2s ease"}}>

          {/* ═══ RUN TAB ═══ */}
          {mainTab === "run" && (
            <>
              {/* Agent header */}
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  <div style={{width:48,height:48,borderRadius:12,background:`${activeAgent.color}22`,border:`1px solid ${activeAgent.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>
                    {activeAgent.icon}
                  </div>
                  <div>
                    <h2 style={{margin:0,fontSize:20,fontWeight:800,letterSpacing:"-0.03em",color:"#e2e8f0"}}>{activeAgent.label}</h2>
                    <p style={{margin:"3px 0 0",fontSize:12,color:"#475569",lineHeight:1.5,maxWidth:420}}>{activeAgent.description}</p>
                  </div>
                </div>
                {/* Sub-tabs */}
                <div style={{display:"flex",gap:0,border:"1px solid #1e293b",borderRadius:7,overflow:"hidden",flexShrink:0}}>
                  {[["single","Single"],...(activeAgent.batchable?[["batch","Batch"]]:[])].map(([t,l])=>(
                    <button key={t} className="subtab" onClick={()=>setSubTab(t)} style={{
                      padding:"7px 16px",border:"none",fontFamily:"inherit",cursor:"pointer",
                      fontSize:12,fontWeight:600,transition:"all 0.15s",
                      background: subTab===t ? "#0f172a" : "transparent",
                      color: subTab===t ? activeAgent.color : "#334155",
                      borderRight:"1px solid #1e293b",
                    }}>{l}</button>
                  ))}
                </div>
              </div>

              {subTab === "single" && (
                <>
                  {/* Dynamic fields */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr",gap:12,marginBottom:14}}>
                    {activeAgent.fields.map(f=>(
                      <div key={f.key}>
                        <label style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#334155",textTransform:"uppercase",display:"block",marginBottom:6}}>{f.label}</label>
                        {f.type==="textarea"
                          ? <textarea value={fields[f.key]||""} onChange={e=>setFields(p=>({...p,[f.key]:e.target.value}))}
                              placeholder={f.placeholder} rows={4} style={{
                                width:"100%",background:"#070c18",border:"1px solid #1e293b",borderRadius:7,
                                padding:"10px 14px",fontSize:13,color:"#94a3b8",fontFamily:"'JetBrains Mono',monospace",
                                resize:"vertical",lineHeight:1.6,transition:"all 0.2s",
                              }}/>
                          : <input type={f.type||"text"} value={fields[f.key]||""} onChange={e=>setFields(p=>({...p,[f.key]:e.target.value}))}
                              placeholder={f.placeholder} style={{
                                width:"100%",background:"#070c18",border:"1px solid #1e293b",borderRadius:7,
                                padding:"10px 14px",fontSize:13,color:"#94a3b8",fontFamily:"'JetBrains Mono',monospace",
                                transition:"all 0.2s",
                              }}/>
                        }
                      </div>
                    ))}
                  </div>

                  {/* Options row */}
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18,flexWrap:"wrap"}}>
                    {[{key:"stealth",label:"🥷 Stealth",val:stealth,set:setStealth},{key:"proxy",label:"🌐 Proxy",val:proxy,set:setProxy}].map(o=>(
                      <label key={o.key} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 12px",
                        border:`1px solid ${o.val?"#f59e0b44":"#1e293b"}`,borderRadius:7,cursor:"pointer",
                        background:o.val?"#f59e0b0a":"transparent",transition:"all 0.15s",fontSize:12,color:o.val?"#f59e0b":"#475569",fontWeight:500}}>
                        <input type="checkbox" checked={o.val} onChange={e=>o.set(e.target.checked)} style={{accentColor:"#f59e0b",width:12,height:12}}/>
                        {o.label}
                      </label>
                    ))}
                    <div style={{flex:1}}/>
                    {status==="running" ? (
                      <button onClick={()=>{abortRef.current=true;setStatus("error");addLog("⏹ Stopped","error");}} style={{
                        padding:"10px 24px",borderRadius:7,border:"1px solid #ef444444",
                        background:"#ef444411",color:"#f87171",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                      }}>⏹ Stop</button>
                    ) : (
                      <button className="run-btn" onClick={handleRun} disabled={status==="running"} style={{
                        padding:"10px 28px",borderRadius:7,border:"none",
                        background:`linear-gradient(135deg,${activeAgent.color},${activeAgent.color}cc)`,
                        color:"#000",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit",
                        letterSpacing:"0.02em",boxShadow:`0 4px 20px ${activeAgent.color}44`,
                        transition:"all 0.18s",
                      }}>▶ Launch Agent</button>
                    )}
                  </div>

                  {error && (
                    <div style={{background:"#ef444411",border:"1px solid #ef444433",borderRadius:7,padding:"10px 14px",fontSize:13,color:"#f87171",marginBottom:14}}>
                      ✗ {error}
                    </div>
                  )}

                  {/* Live log */}
                  <div style={{marginBottom:4}}>
                    <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#1e293b",textTransform:"uppercase",marginBottom:7}}>Live Agent Log</div>
                    <LiveLog entries={logs}/>
                  </div>

                  {/* Result */}
                  <ResultPanel result={result} agentColor={activeAgent.color} agentId={activeAgent.id}/>

                  {/* Diff */}
                  {diffResult && <DiffPanel oldResult={diffResult.old} newResult={diffResult.new}/>}
                </>
              )}

              {subTab === "batch" && (
                <>
                  <BatchPanel agent={activeAgent} onRunBatch={handleBatch}/>
                  {batchProgress && (
                    <div style={{marginTop:16}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                        <span style={{fontSize:12,color:"#475569"}}>Progress: {batchProgress.done}/{batchProgress.total}</span>
                        <span style={{fontSize:12,color:"#10b981"}}>{Math.round((batchProgress.done/batchProgress.total)*100)}%</span>
                      </div>
                      <div style={{background:"#1e293b",borderRadius:4,height:4,overflow:"hidden"}}>
                        <div style={{height:"100%",background:activeAgent.color,width:`${(batchProgress.done/batchProgress.total)*100}%`,transition:"width 0.3s",borderRadius:4}}/>
                      </div>
                      <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap"}}>
                        {batchResults.map((r,i)=>(
                          <div key={i} style={{padding:"5px 12px",borderRadius:20,background:r.status==="completed"?"#10b98122":"#ef444422",border:`1px solid ${r.status==="completed"?"#10b98144":"#ef444444"}`,fontSize:11,color:r.status==="completed"?"#34d399":"#f87171",fontFamily:"monospace"}}>
                            {r.status==="completed"?"✓":"✗"} {r.url?.replace(/https?:\/\//,"")}
                          </div>
                        ))}
                      </div>
                      {batchResults.length === batchProgress.total && batchProgress.total > 0 && (
                        <div style={{marginTop:12}}>
                          <Btn color="#10b981" onClick={()=>exportCSV(history.slice(0,batchProgress.total))}>↓ Export Batch CSV</Btn>
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{marginTop:16}}>
                    <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#1e293b",textTransform:"uppercase",marginBottom:7}}>Batch Log</div>
                    <LiveLog entries={logs}/>
                  </div>
                </>
              )}
            </>
          )}

          {/* ═══ HISTORY TAB ═══ */}
          {mainTab === "history" && (
            <>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                <h2 style={{margin:0,fontSize:18,fontWeight:800,letterSpacing:"-0.02em"}}>Run History</h2>
                {history.length > 0 && (
                  <div style={{display:"flex",gap:8}}>
                    <Btn color="#10b981" onClick={()=>exportCSV(history)}>↓ Export CSV</Btn>
                    <Btn color="#8b5cf6" onClick={()=>exportJSON(history,"run-history.json")}>↓ Export JSON</Btn>
                  </div>
                )}
              </div>
              {history.length === 0
                ? <div style={{padding:60,textAlign:"center",border:"1px dashed #1e293b",borderRadius:12,color:"#1e293b"}}>
                    <div style={{fontSize:32,marginBottom:12}}>🐟</div>
                    <div>No runs yet. Launch your first agent.</div>
                  </div>
                : history.map(run=>(
                    <HistoryRow key={run.id} run={run}
                      onRerun={handleRerun}
                      onDiff={(a,b)=>{setDiffResult({old:a,new:b});setMainTab("run");}}
                      compareTarget={history.find(r=>r.agentId===run.agentId&&r.id!==run.id)}
                    />
                  ))
              }
            </>
          )}

          {/* ═══ BATCH TAB ═══ */}
          {mainTab === "batch" && (
            <>
              <h2 style={{margin:"0 0 8px",fontSize:18,fontWeight:800,letterSpacing:"-0.02em"}}>Batch Operations</h2>
              <p style={{margin:"0 0 24px",fontSize:13,color:"#475569"}}>Run any agent across dozens of targets simultaneously. Great for competitive sweeps, lead enrichment, and market mapping.</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {AGENTS.filter(a=>a.batchable).map(agent=>(
                  <div key={agent.id} onClick={()=>{setActiveAgent(agent);setMainTab("run");setSubTab("batch");}} style={{
                    border:`1px solid ${agent.color}33`,borderRadius:10,padding:"16px 18px",cursor:"pointer",
                    background:`${agent.color}08`,transition:"all 0.15s",
                  }}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                      <span style={{fontSize:22}}>{agent.icon}</span>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:agent.color}}>{agent.label}</div>
                        <div style={{fontSize:11,color:"#475569"}}>{agent.tagline}</div>
                      </div>
                    </div>
                    <div style={{fontSize:11,color:"#334155"}}>
                      {agent.defaultUrls?.length ? `${agent.defaultUrls.length} example targets` : "Custom URLs"}
                    </div>
                    <div style={{marginTop:10,fontSize:12,color:agent.color,fontWeight:600}}>Launch batch run →</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ═══ SCHEDULE TAB ═══ */}
          {mainTab === "schedule" && (
            <>
              <h2 style={{margin:"0 0 8px",fontSize:18,fontWeight:800,letterSpacing:"-0.02em"}}>Scheduled Monitors</h2>
              <p style={{margin:"0 0 24px",fontSize:13,color:"#475569"}}>Set agents to run on a recurring schedule. Get alerted when anything changes — prices, job postings, terms, competitor moves.</p>
              {AGENTS.filter(a=>a.schedulable).map(agent=>(
                <div key={agent.id} style={{marginBottom:16}}>
                  <div style={{fontSize:13,fontWeight:700,color:agent.color,marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
                    {agent.icon} {agent.label}
                  </div>
                  <SchedulerPanel agent={agent}
                    onSchedule={(s)=>setSchedules(p=>[...p,{...s,id:Date.now()}])}
                    schedules={schedules.filter(s=>s.agentId===agent.id)}
                  />
                </div>
              ))}
              {schedules.length > 0 && (
                <div style={{marginTop:24,background:"#0a0f1c",border:"1px solid #1e293b",borderRadius:10,padding:"16px"}}>
                  <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",color:"#334155",textTransform:"uppercase",marginBottom:12}}>Active Schedules</div>
                  {schedules.map(s=>(
                    <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderTop:"1px solid #0f172a"}}>
                      <GlowDot status="scheduled"/>
                      <span style={{fontSize:13,color:"#94a3b8",flex:1}}>{s.label}</span>
                      <span style={{fontSize:11,fontFamily:"monospace",color:"#475569"}}>{s.url?.substring(0,35)}</span>
                      <span style={{padding:"2px 9px",borderRadius:20,background:"#8b5cf622",color:"#8b5cf6",fontSize:11,fontWeight:600}}>{s.cron}</span>
                      <button onClick={()=>setSchedules(p=>p.filter(x=>x.id!==s.id))} style={{background:"none",border:"none",color:"#334155",cursor:"pointer",fontSize:13,padding:"0 4px"}}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ═══ ALERTS TAB ═══ */}
          {mainTab === "alerts" && (
            <>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                <h2 style={{margin:0,fontSize:18,fontWeight:800,letterSpacing:"-0.02em"}}>Change Alerts</h2>
                {alerts.length>0 && <Btn color="#ef4444" onClick={()=>setAlerts([])}>Clear All</Btn>}
              </div>
              {alerts.length === 0
                ? <div style={{padding:60,textAlign:"center",border:"1px dashed #1e293b",borderRadius:12,color:"#1e293b"}}>
                    <div style={{fontSize:32,marginBottom:12}}>🔔</div>
                    <div>No alerts yet. Run an agent twice on the same URL to detect changes.</div>
                  </div>
                : alerts.map(alert=>(
                  <div key={alert.id} style={{border:"1px solid #f59e0b33",borderRadius:10,padding:"14px 16px",marginBottom:10,background:"#f59e0b08"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#f59e0b"}}>{alert.agent}</div>
                      <span style={{fontSize:11,color:"#475569"}}>{alert.ts}</span>
                    </div>
                    <div style={{fontSize:11,color:"#475569",fontFamily:"monospace",marginBottom:8}}>{alert.url}</div>
                    <div style={{fontSize:12,color:"#94a3b8"}}>{alert.changes.length} change{alert.changes.length!==1?"s":""} detected:</div>
                    {alert.changes.slice(0,3).map((c,i)=>(
                      <div key={i} style={{fontSize:11,fontFamily:"monospace",color:"#f59e0b",marginTop:4,paddingLeft:10}}>
                        {c.path}: {JSON.stringify(c.old)} → {JSON.stringify(c.new)}
                      </div>
                    ))}
                  </div>
                ))
              }
            </>
          )}

        </main>
      </div>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop:"1px solid #0d1628", padding:"12px 28px",
        display:"flex", justifyContent:"space-between", alignItems:"center",
        fontSize:11, color:"#1e293b", background:"rgba(3,7,18,0.9)" }}>
        <span style={{display:"flex",alignItems:"center",gap:8}}>
          🐟 <span>TinyFish Agent OS · Hackathon Submission · Powered by TinyFish Web Agent API</span>
        </span>
        <span>SSE Streaming · Real browser automation · 6 agent types · Batch · Scheduler · Diff engine</span>
      </footer>
    </div>
  );
}
