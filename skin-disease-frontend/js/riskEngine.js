(function () {
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeText(value) {
    return String(value || "").toLowerCase().trim();
  }

  function hasCondition(conditions, name) {
    return conditions.some(c => normalizeText(c) === normalizeText(name));
  }

  function calculateSkinRisk(userData) {
    let baseRisk = 10;

    if (hasCondition(userData.medicalConditions, "Diabetes")) baseRisk += 20;
    if (hasCondition(userData.medicalConditions, "Thyroid")) baseRisk += 15;

    if (normalizeText(userData.skinType) === "oily") baseRisk += 10;
    if (normalizeText(userData.sensitivity) === "sensitive") baseRisk += 10;

    if (normalizeText(userData.sleep) === "poor") baseRisk += 10;
    if (normalizeText(userData.hydration) === "low") baseRisk += 10;

    if (Array.isArray(userData.history) && userData.history.length) {
      const highRiskDiseases = ["melanoma", "basal cell carcinoma", "bcc"];
      const hasHighRisk = userData.history.some(item => {
        const label = normalizeText(item.disease || item.label);
        return highRiskDiseases.some(hr => label.includes(hr));
      });
      if (hasHighRisk) baseRisk += 15;
    }

    const percentage = clamp(baseRisk, 0, 100);
    const level = percentage <= 30 ? "Low" : percentage <= 60 ? "Medium" : "High";

    return { percentage, level };
  }

  function generateInsights(riskData, userData) {
    const insights = [];
    const conditions = (userData.medicalConditions || []).map(c => normalizeText(c));

    const hasPCOS = conditions.some(c => c.includes("pcos") || c.includes("hormonal"));
    const hasAsthma = conditions.some(c => c.includes("asthma"));

    if (hasPCOS) {
      insights.push(
        "Hormonal imbalance may increase oil production and acne susceptibility.",
        "Monitor breakouts around menstrual cycles.",
        "Use non-comedogenic and oil-regulating skincare products.",
        "Consider niacinamide or salicylic acid-based treatments."
      );
    }

    if (hasAsthma) {
      insights.push(
        "Long-term steroid medications may affect skin barrier strength.",
        "Use fragrance-free and ceramide-based moisturizers.",
        "Avoid harsh exfoliants or chemical peels.",
        "Monitor for dryness or eczema-like irritation."
      );
    }

    if (normalizeText(userData.skinType) === "oily") {
      insights.push(
        "Oily skin type increases pore congestion risk. Use lightweight gel-based moisturizers."
      );
    }

    if (normalizeText(userData.sensitivity) === "high") {
      insights.push(
        "High sensitivity detected. Avoid alcohol-based and fragrance products."
      );
    }

    if (!conditions.length) {
      insights.push(
        "No major medical risk factors detected.",
        "Maintain a consistent skincare routine."
      );
    }

    console.log("SkinCare AI insights conditions", conditions);
    console.log("SkinCare AI insights risk", riskData);
    console.log("SkinCare AI insights generated", insights);

    return insights;
  }

  function getUserDataFromPage() {
    const conditionsEl = document.getElementById("medicalConditions");
    const conditionsText = conditionsEl ? conditionsEl.textContent : "";
    const medicalConditions = conditionsText
      .split("•")
      .map(s => s.trim())
      .filter(Boolean);

    const getText = (id) => {
      const el = document.getElementById(id);
      return el ? el.textContent.trim() : "";
    };

    const skinType = getText("skinType");
    const sensitivity = getText("sensitivity");
    const sleep = getText("sleep").toLowerCase().includes("5") || getText("sleep").toLowerCase().includes("6") ? "poor" : "good";
    const waterText = getText("water");
    const hydration = /[0-6]/.test(waterText) ? "low" : "good";

    const history = JSON.parse(localStorage.getItem("scanHistory") || "[]");

    return {
      medicalConditions,
      skinType,
      sensitivity,
      hydration,
      sleep,
      history
    };
  }

  function updateRiskUI(riskData) {
    const riskFill = document.getElementById("riskFill");
    const riskLabel = document.getElementById("riskLabel");
    const riskPercent = document.getElementById("riskPercent");

    if (!riskFill || !riskLabel || !riskPercent) return;

    riskLabel.textContent = `${riskData.level} Risk`;
    riskPercent.textContent = `${Math.round(riskData.percentage)}%`;

    riskFill.classList.remove("risk-low", "risk-medium", "risk-high");
    if (riskData.level === "Low") riskFill.classList.add("risk-low");
    if (riskData.level === "Medium") riskFill.classList.add("risk-medium");
    if (riskData.level === "High") riskFill.classList.add("risk-high");

    requestAnimationFrame(() => {
      riskFill.style.width = `${riskData.percentage}%`;
    });
  }

  function renderInsights(insights) {
    const container = document.getElementById("aiInsights");
    if (!container) return;
    container.innerHTML = "";
    insights.forEach(text => {
      const item = document.createElement("div");
      item.className = "insight-item";
      item.textContent = text;
      container.appendChild(item);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const userData = getUserDataFromPage();
    const riskData = calculateSkinRisk(userData);

    console.log("SkinCare AI riskData", riskData);
    console.log("SkinCare AI userData", userData);

    updateRiskUI(riskData);
    const insights = generateInsights(riskData, userData);
    renderInsights(insights);
  });
})();
