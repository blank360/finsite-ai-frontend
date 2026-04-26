import { useState, useRef, useEffect } from "react";
import Papa from "papaparse";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";

const API = "https://finsite-ai-backend.onrender.com/api";

const COLORS = ["#00e5a0", "#7c6af7", "#f5a623", "#ff4d6d", "#00bcd4", "#e91e8c", "#8bc34a", "#ff9800"];

const SAMPLE_CSV = `Date,Description,Amount,Type
2024-01-02,Swiggy Food Order,-450,Debit
2024-01-03,Salary Credit,45000,Credit
2024-01-05,Amazon Shopping,-2300,Debit
2024-01-06,Ola Cab,-180,Debit
2024-01-08,Netflix Subscription,-649,Debit
2024-01-10,Zomato Order,-320,Debit
2024-01-12,Electricity Bill,-1200,Debit
2024-01-14,BigBasket Groceries,-1800,Debit
2024-01-15,Gym Membership,-999,Debit
2024-01-16,Pharmacy,-450,Debit
2024-01-18,Swiggy Food Order,-580,Debit
2024-01-20,Petrol,-1100,Debit
2024-01-22,Amazon Shopping,-3500,Debit
2024-01-24,Jio Recharge,-299,Debit
2024-01-25,Freelance Payment,8000,Credit
2024-01-26,Uber Cab,-220,Debit
2024-01-27,Zomato Order,-410,Debit
2024-01-28,H&M Clothes,-2800,Debit
2024-01-29,Internet Bill,-799,Debit
2024-01-30,Coffee Shop,-340,Debit`;

function fmt(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0
  }).format(Math.abs(amount));
}

export default function App() {
  const [stage, setStage] = useState("upload"); // upload | loading | dashboard
  const [analysis, setAnalysis] = useState(null);
  const [drag, setDrag] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Parsing your transactions...");
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const loadingMessages = [
    "Parsing your transactions...",
    "Categorizing spending patterns...",
    "Running AI analysis via Groq...",
    "Generating insights...",
  ];

  const processCSV = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        await analyze(result.data);
      },
    });
  };

  const loadSample = () => {
    Papa.parse(SAMPLE_CSV, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        await analyze(result.data);
      },
    });
  };

  const analyze = async (transactions) => {
    setStage("loading");
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % loadingMessages.length;
      setLoadingText(loadingMessages[i]);
    }, 1400);

    try {
      const res = await fetch(`${API}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnalysis(data);
      setStage("dashboard");
    } catch (err) {
      alert("Analysis failed: " + err.message);
      setStage("upload");
    } finally {
      clearInterval(interval);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const question = chatInput.trim();
    setChatInput("");
    const userMsg = { role: "user", content: question };
    setChatHistory((h) => [...h, userMsg]);
    setChatLoading(true);

    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          context: analysis,
          history: chatHistory.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setChatHistory((h) => [...h, { role: "assistant", content: data.answer }]);
    } catch {
      setChatHistory((h) => [...h, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) processCSV(file);
  };

  const reset = () => {
    setStage("upload");
    setAnalysis(null);
    setChatHistory([]);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <div className="logo-icon">💹</div>
          Fin<span>Sight</span> AI
        </div>
        <div className="header-badge">Powered by Groq · LLaMA 3.3 70B</div>
      </header>

      {stage === "upload" && (
        <section className="hero">
          <div className="hero-eyebrow">AI-Powered Finance Advisor</div>
          <h1>Understand your money<br />in <em>seconds</em></h1>
          <p>Upload your bank statement CSV and get instant AI-powered analysis — spending breakdown, smart insights, and a personal finance chatbot.</p>

          <div
            className={`upload-zone ${drag ? "drag-active" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files[0] && processCSV(e.target.files[0])}
            />
            <span className="upload-icon">📂</span>
            <h3>Drop your CSV or click to upload</h3>
            <p>Supports standard bank export formats — Date, Description, Amount, Type</p>
          </div>

          <button className="sample-btn" onClick={loadSample}>
            ✨ Try with sample data
          </button>
        </section>
      )}

      {stage === "loading" && (
        <div className="loading-overlay">
          <div className="spinner" />
          <div>
            <strong>Analyzing your finances</strong>
            <p>{loadingText}</p>
          </div>
        </div>
      )}

      {stage === "dashboard" && analysis && (
        <div className="dashboard">
          <div className="dash-header">
            <div>
              <div className="dash-title">Your Financial Overview</div>
              <div className="dash-subtitle mono">AI analysis complete · {analysis.categories?.length} categories detected</div>
            </div>
            <button className="reset-btn" onClick={reset}>↩ New Analysis</button>
          </div>

          {/* STAT CARDS */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">Total Income</div>
              <div className="stat-value income">{fmt(analysis.summary.totalIncome)}</div>
              <div className="stat-sub">This period</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Expenses</div>
              <div className="stat-value expense">{fmt(analysis.summary.totalExpenses)}</div>
              <div className="stat-sub">This period</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Net Savings</div>
              <div className="stat-value savings">{fmt(analysis.summary.netSavings)}</div>
              <div className="stat-sub">After expenses</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Savings Rate</div>
              <div className="stat-value rate">{analysis.summary.savingsRate?.toFixed(1)}%</div>
              <div className="stat-sub">Of total income</div>
            </div>
          </div>

          {/* CHART + CATEGORIES */}
          <div className="grid-2" style={{ marginBottom: "1rem" }}>
            <div className="card">
              <div className="card-title">📊 Spending by Category</div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analysis.categories}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%" cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                    >
                      {analysis.categories.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => fmt(v)}
                      contentStyle={{ background: "#111318", border: "1px solid #222530", borderRadius: "8px", fontFamily: "DM Mono" }}
                      labelStyle={{ color: "#e8eaf2" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-title">💸 Breakdown</div>
              <div className="category-list">
                {analysis.categories.map((cat, i) => (
                  <div className="category-item" key={i}>
                    <span className="cat-emoji">{cat.emoji}</span>
                    <div className="cat-info">
                      <div className="cat-name">{cat.name}</div>
                      <div className="cat-bar-wrap">
                        <div className="cat-bar" style={{ width: `${cat.percentage}%` }} />
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="cat-amount">{fmt(cat.amount)}</div>
                      <div className="cat-pct">{cat.percentage?.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* BAR CHART + MERCHANTS + TREND */}
          <div className="grid-3" style={{ marginBottom: "1rem" }}>
            <div className="card">
              <div className="card-title">🏪 Top Merchants</div>
              <table className="merchant-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Merchant</th>
                    <th style={{ textAlign: "center" }}>Txns</th>
                    <th style={{ textAlign: "right" }}>Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.topMerchants?.map((m, i) => (
                    <tr key={i}>
                      <td className="merchant-rank">{i + 1}</td>
                      <td className="merchant-name">{m.name}</td>
                      <td className="merchant-count">{m.count}</td>
                      <td className="merchant-amount">{fmt(m.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card">
              <div className="card-title">📈 Category Bar</div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analysis.categories} margin={{ top: 4, right: 4, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222530" />
                    <XAxis dataKey="name" tick={{ fill: "#5a5f72", fontSize: 9 }} angle={-30} textAnchor="end" />
                    <YAxis tick={{ fill: "#5a5f72", fontSize: 9 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                    <Tooltip
                      formatter={(v) => fmt(v)}
                      contentStyle={{ background: "#111318", border: "1px solid #222530", borderRadius: "8px", fontFamily: "DM Mono", fontSize: "12px" }}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {analysis.categories.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-title">📝 Spending Narrative</div>
              <p className="trend-text">{analysis.monthlyTrend}</p>
            </div>
          </div>

          {/* INSIGHTS */}
          <div className="card" style={{ marginBottom: "1rem" }}>
            <div className="card-title">💡 AI Insights</div>
            <div className="insights-list">
              {analysis.insights?.map((ins, i) => (
                <div className={`insight-item ${ins.type}`} key={i}>
                  <div className="insight-dot" />
                  <div>
                    <div className="insight-title">{ins.title}</div>
                    <div className="insight-desc">{ins.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CHAT */}
          <div className="card chat-section">
            <div className="card-title">🤖 Ask FinSight AI</div>
            <div className="chat-messages">
              {chatHistory.length === 0 && (
                <div className="empty-chat">
                  Ask me anything about your finances...<br />
                  <span style={{ opacity: 0.5 }}>e.g. "Am I spending too much on food?" · "How can I save ₹5000 more?"</span>
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div className={`chat-msg ${msg.role === "user" ? "user" : "ai"}`} key={i}>
                  {msg.role === "assistant" && <div className="msg-label">FinSight AI</div>}
                  {msg.content}
                </div>
              ))}
              {chatLoading && (
                <div className="chat-msg ai">
                  <div className="msg-label">FinSight AI</div>
                  Thinking...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="chat-input-row">
              <input
                className="chat-input"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                placeholder="Ask about your spending..."
                disabled={chatLoading}
              />
              <button className="chat-send-btn" onClick={sendChat} disabled={chatLoading || !chatInput.trim()}>
                Send →
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        FinSight AI · Built for HackPulse 2026 · Powered by Groq LLaMA 3.3 70B
      </footer>
    </div>
  );
}
