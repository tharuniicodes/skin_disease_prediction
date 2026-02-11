function clearHistory() {
  localStorage.removeItem("scanHistory");
  location.reload();
}

document.addEventListener("DOMContentLoaded", () => {
  const prefsRaw = localStorage.getItem("healthPrefs");
  if (!prefsRaw) return;

  let prefs;
  try {
    prefs = JSON.parse(prefsRaw);
  } catch {
    return;
  }

  // Medical conditions
  const conditions = [];
  if (prefs.diabetes) conditions.push("Diabetes");
  if (prefs.thyroid) conditions.push("Thyroid");
  if (prefs.pcos) conditions.push("PCOS / Hormonal");
  if (prefs.asthma) conditions.push("Asthma");
  if (prefs.hypertension) conditions.push("Hypertension");
  if (prefs.autoimmune) conditions.push("Autoimmune");

  const conditionsEl = document.getElementById("medicalConditions");
  if (conditionsEl) {
    conditionsEl.textContent = conditions.length ? conditions.join(" • ") : "None reported";
  }

  // Lifestyle
  const setText = (id, value, suffix = "") => {
    const el = document.getElementById(id);
    if (el) el.textContent = value ? `${value}${suffix}` : "—";
  };

  setText("skinType", prefs.skinType);
  setText("sensitivity", prefs.sensitivity);
  setText("sleep", prefs.sleep, " hrs");
  setText("water", prefs.water, " glasses");
  setText("stress", prefs.stress);
});

document.addEventListener("DOMContentLoaded", () => {
  const riskFill = document.getElementById("riskFill");
  const riskLabel = document.getElementById("riskLabel");
  const riskPercent = document.getElementById("riskPercent");
  const insightsList = document.getElementById("insightsList");

  if (!riskFill || !riskLabel || !riskPercent || !insightsList) return;

  const parseRisk = () => {
    const raw =
      localStorage.getItem("riskPercent") ||
      localStorage.getItem("riskLevel") ||
      localStorage.getItem("overallRisk");

    if (!raw) return 25;

    const numeric = Number(raw);
    if (!Number.isNaN(numeric)) {
      return Math.max(0, Math.min(100, numeric));
    }

    const normalized = String(raw).toLowerCase();
    if (normalized.includes("high")) return 80;
    if (normalized.includes("medium")) return 55;
    return 25;
  };

  const percent = parseRisk();
  const level = percent <= 33 ? "Low" : percent <= 66 ? "Medium" : "High";

  riskLabel.textContent = `${level} Risk`;
  riskPercent.textContent = `${Math.round(percent)}%`;
  riskFill.classList.remove("risk-low", "risk-medium", "risk-high");
  riskFill.classList.add(
    level === "Low" ? "risk-low" : level === "Medium" ? "risk-medium" : "risk-high"
  );
  requestAnimationFrame(() => {
    riskFill.style.width = `${percent}%`;
  });

  let healthPrefs = null;
  try {
    healthPrefs = JSON.parse(localStorage.getItem("healthPrefs") || "null");
  } catch {
    healthPrefs = null;
  }

  const insights = [
    "Maintain your current skincare routine.",
    "Stay hydrated (8 glasses/day recommended).",
    "Continue monthly monitoring.",
    "No recent high-risk detections found."
  ];

  if (level === "Medium") {
    insights.unshift("Consider a dermatologist check-in for prevention.");
  }
  if (level === "High") {
    insights.unshift("We recommend a dermatologist consultation soon.");
    insights.unshift("Increase monitoring frequency to weekly checks.");
  }

  if (healthPrefs) {
    const conditions = [];
    if (healthPrefs.diabetes) conditions.push("Diabetes");
    if (healthPrefs.thyroid) conditions.push("Thyroid");
    if (healthPrefs.pcos) conditions.push("PCOS / Hormonal");
    if (healthPrefs.asthma) conditions.push("Asthma");
    if (healthPrefs.hypertension) conditions.push("Hypertension");
    if (healthPrefs.autoimmune) conditions.push("Autoimmune");
    if (conditions.length) {
      insights.push(`Manage underlying conditions: ${conditions.join(", ")}.`);
    }
    if (healthPrefs.sensitivity) {
      insights.push(`Sensitivity level noted as ${healthPrefs.sensitivity}. Use gentle products.`);
    }
  }

  const unique = Array.from(new Set(insights)).slice(0, 5);
  insightsList.innerHTML = unique.map(item => `<li>${item}</li>`).join("");
});

document.addEventListener("DOMContentLoaded", () => {
  const historyContainer = document.getElementById("historyList");
  const emptyState = document.getElementById("emptyHistory");
  if (!historyContainer || !emptyState) return;

  const renderHistory = () => {
    const history = JSON.parse(localStorage.getItem("scanHistory")) || [];

    if (history.length === 0) {
      emptyState.style.display = "block";
      historyContainer.innerHTML = "";
    } else {
      emptyState.style.display = "none";

      historyContainer.innerHTML = history
        .slice().reverse()
        .map(item => `
          <div class="history-card">
            <div class="history-main">
              <h4 class="history-disease">${item.disease}</h4>
              <span class="history-confidence">
                ${(item.confidence * 100).toFixed(1)}%
              </span>
            </div>
            <div class="history-meta">
              <span>${new Date(item.time).toLocaleDateString()}</span>
              <span>${new Date(item.time).toLocaleTimeString()}</span>
            </div>
          </div>
        `)
        .join("");
    }
  };

  renderHistory();

  const clearBtn = document.getElementById("clearHistoryBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      clearHistory();
    });
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("currentUser");
      localStorage.removeItem("loggedInUser");
      window.location.href = "index.html";
    });
  }

  const editBtn = document.getElementById("editHealthBtn");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      window.location.href = "settings.html";
    });
  }
});
