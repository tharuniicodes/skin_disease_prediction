function login() {
  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");

  fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: emailInput.value,
      password: passwordInput.value
    })
  })
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
    .then(data => {
      if (!data.ok || !data.data.success) {
        alert("Invalid email or password");
      } else {
        const user = data.data.user || {};
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("loggedInUser", user.username || "");
        localStorage.setItem("loggedInEmail", user.email || "");
        localStorage.setItem("userPassword", passwordInput.value);
        window.location.href = "home.html";
      }
    })
    .catch(() => {
      alert("Invalid email or password");
    });
}

function signup() {
  const usernameInput = document.getElementById("signupUsername");
  const emailInput = document.getElementById("signupEmail");
  const passwordInput = document.getElementById("signupPassword");

  fetch("/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: usernameInput.value,
      email: emailInput.value,
      password: passwordInput.value
    })
  })
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
    .then(data => {
      if (!data.ok || !data.data.success) {
        alert(data.data.message || "Signup failed");
      } else {
        localStorage.setItem("loggedInUser", usernameInput.value);
        localStorage.setItem("loggedInEmail", emailInput.value);
        localStorage.setItem("userPassword", passwordInput.value);
        alert("Signup successful");
        window.location.href = "index.html";
      }
    })
    .catch(() => {
      alert("Signup failed");
    });
}

function upload() {
  window.location.href = "upload.html";
}

async function detect() {
  const input = document.getElementById("imageInput");
  const file = input?.files?.[0];
  const prediction = document.getElementById("prediction");
  const confidence = document.getElementById("confidence");
  const aiPrefs = (() => {
    try {
      return JSON.parse(localStorage.getItem("aiPreferences") || "null") || {
        detectionSensitivity: "medium",
        autoCropImage: false,
        showConfidenceScore: true
      };
    } catch {
      return {
        detectionSensitivity: "medium",
        autoCropImage: false,
        showConfidenceScore: true
      };
    }
  })();
  const notifPrefs = (() => {
    try {
      return JSON.parse(localStorage.getItem("notificationPreferences") || "null") || {
        scanResultAlerts: false,
        healthReminders: false,
        emailNotifications: false
      };
    } catch {
      return {
        scanResultAlerts: false,
        healthReminders: false,
        emailNotifications: false
      };
    }
  })();

  if (!file) {
    if (prediction) prediction.textContent = "Please select an image first.";
    if (confidence) confidence.textContent = "";
    return;
  }

  if (prediction) prediction.textContent = "Analyzing...";
  if (confidence) confidence.textContent = "";

  const formData = new FormData();
  formData.append("image", file);

  try {
    const res = await fetch("/predict", {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      throw new Error("Prediction failed");
    }

    const data = await res.json();
    if (prediction) prediction.textContent = `Predicted Disease: ${data.label}`;
    // Show Insights & Remedies buttons after prediction
    document.getElementById("actionButtons").style.display = "flex";
    if (confidence) {
      const pct = Math.round((data.confidence || 0) * 100);
      confidence.textContent = `Confidence: ${pct}%`;
      confidence.style.display = aiPrefs.showConfidenceScore ? "block" : "none";
    }

    if (prediction) {
      let warning = document.getElementById("sensitivityWarning");
      if (!warning) {
        warning = document.createElement("div");
        warning.id = "sensitivityWarning";
        warning.style.marginTop = "8px";
        warning.style.fontSize = "13px";
        warning.style.color = "#dc2626";
        prediction.insertAdjacentElement("afterend", warning);
      }
      if (aiPrefs.detectionSensitivity === "high") {
        warning.textContent = "High sensitivity: minor irregularities may be flagged. Consider professional advice.";
        warning.style.display = "block";
      } else if (aiPrefs.detectionSensitivity === "low") {
        warning.textContent = "Low sensitivity: fewer warnings will be shown.";
        warning.style.display = "block";
      } else {
        warning.textContent = "";
        warning.style.display = "none";
      }
    }

    // Store latest prediction for downstream pages
    const label = data.label;
    const predictionConfidence = data.confidence;
    localStorage.setItem("predictedDisease", String(label).toLowerCase());
    localStorage.setItem("predictionConfidence", predictionConfidence);
    localStorage.setItem(
      "predictionResult",
      JSON.stringify({
        label,
        confidence: predictionConfidence
      })
    );

    // Add scan to current user history (frontend-only)
    const username = localStorage.getItem("currentUser");
    if (username) {
      const key = `skincare_ai_user_${username}`;
      const dataStore = JSON.parse(localStorage.getItem(key) || "{}");

      dataStore.history = dataStore.history || [];

      // Get preview image (base64)
      const previewImg = document.querySelector(".preview-img");
      const imageDataURL = previewImg ? previewImg.src : null;

      // Replace these with YOUR variables:
      const disease = data.label;
      const predictedConfidence = Math.round((data.confidence || 0) * 100);

      dataStore.history.unshift({
        disease,
        confidence: predictedConfidence,
        imageDataURL,
        ts: Date.now()
      });

      localStorage.setItem(key, JSON.stringify(dataStore));
    }

    // Save to global scan history
    const history = JSON.parse(localStorage.getItem("scanHistory")) || [];
    history.push({
      disease: label,
      confidence: predictionConfidence,
      time: new Date().toISOString()
    });
    localStorage.setItem("scanHistory", JSON.stringify(history));

    if (notifPrefs.scanResultAlerts) {
      const toast = document.createElement("div");
      toast.textContent = "Scan completed successfully";
      toast.style.position = "fixed";
      toast.style.right = "20px";
      toast.style.bottom = "20px";
      toast.style.padding = "10px 14px";
      toast.style.borderRadius = "10px";
      toast.style.color = "#fff";
      toast.style.background = "#16a34a";
      toast.style.boxShadow = "0 8px 18px rgba(0,0,0,0.15)";
      toast.style.zIndex = "3000";
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2500);
    }

    if (notifPrefs.emailNotifications && prediction) {
      const emailMsg = document.createElement("div");
      emailMsg.textContent = "Email sent successfully";
      emailMsg.style.marginTop = "8px";
      emailMsg.style.fontSize = "13px";
      emailMsg.style.color = "#2563eb";
      prediction.insertAdjacentElement("afterend", emailMsg);
      setTimeout(() => emailMsg.remove(), 2500);
    }

  } catch (err) {
    if (prediction) prediction.textContent = "Prediction failed. Please try again.";
    if (confidence) confidence.textContent = "";
  }
}

function remedies() {
  window.location.href = "remedies.html";
}

function insights() {
  window.location.href = "insights.html";
}

function profile() {
  window.location.href = "profile.html";
}

function preview(e) {
  const img = document.getElementById("img");
  const file = e.target.files && e.target.files[0];
  if (!file || !img) return;
  img.src = URL.createObjectURL(file);
  const aiPrefs = (() => {
    try {
      return JSON.parse(localStorage.getItem("aiPreferences") || "null") || {
        detectionSensitivity: "medium",
        autoCropImage: false,
        showConfidenceScore: true
      };
    } catch {
      return {
        detectionSensitivity: "medium",
        autoCropImage: false,
        showConfidenceScore: true
      };
    }
  })();
  if (aiPrefs.autoCropImage) {
    const imgEl = img;
    const temp = new Image();
    temp.crossOrigin = "anonymous";
    temp.onload = () => {
      const size = Math.min(temp.width, temp.height);
      const sx = (temp.width - size) / 2;
      const sy = (temp.height - size) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(temp, sx, sy, size, size, 0, 0, size, size);
      imgEl.src = canvas.toDataURL("image/jpeg", 0.9);
    };
    temp.src = img.src;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      localStorage.setItem("uploadedImage", reader.result);
    } catch {
      // ignore storage errors
    }
  };
  reader.readAsDataURL(file);
}

document.addEventListener("DOMContentLoaded", () => {
  const readJson = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  const aiPrefs = readJson("aiPreferences", {
    detectionSensitivity: "medium",
    autoCropImage: false,
    showConfidenceScore: true
  });

  const notifPrefs = readJson("notificationPreferences", {
    scanResultAlerts: false,
    healthReminders: false,
    emailNotifications: false
  });

  const showToast = (message, tone = "success") => {
    const existing = document.getElementById("scaiToast");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.id = "scaiToast";
    toast.textContent = message;
    toast.style.position = "fixed";
    toast.style.right = "20px";
    toast.style.bottom = "20px";
    toast.style.padding = "10px 14px";
    toast.style.borderRadius = "10px";
    toast.style.color = "#fff";
    toast.style.background = tone === "success" ? "#16a34a" : "#2563eb";
    toast.style.boxShadow = "0 8px 18px rgba(0,0,0,0.15)";
    toast.style.zIndex = "3000";
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    toast.style.transform = "translateY(6px)";
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(6px)";
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  };

  const showReminder = () => {
    const today = new Date().toISOString().slice(0, 10);
    if (!notifPrefs.healthReminders) return;
    const last = localStorage.getItem("lastHealthReminder");
    if (last === today) return;
    localStorage.setItem("lastHealthReminder", today);
    const existing = document.getElementById("healthReminderPopup");
    if (existing) existing.remove();
    const popup = document.createElement("div");
    popup.id = "healthReminderPopup";
    popup.textContent = "Reminder: Stay hydrated, sleep well, and follow your skin care routine.";
    popup.style.position = "fixed";
    popup.style.left = "50%";
    popup.style.bottom = "30px";
    popup.style.transform = "translateX(-50%)";
    popup.style.background = "#2563eb";
    popup.style.color = "#fff";
    popup.style.padding = "10px 14px";
    popup.style.borderRadius = "10px";
    popup.style.boxShadow = "0 10px 22px rgba(37,99,235,0.25)";
    popup.style.zIndex = "3000";
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 3000);
  };

  const applyConfidenceVisibility = () => {
    const confidence = document.getElementById("confidence");
    if (!confidence) return;
    confidence.style.display = aiPrefs.showConfidenceScore ? "block" : "none";
  };

  const addSensitivityWarning = (target) => {
    if (!target) return;
    let warning = document.getElementById("sensitivityWarning");
    if (!warning) {
      warning = document.createElement("div");
      warning.id = "sensitivityWarning";
      warning.style.marginTop = "8px";
      warning.style.fontSize = "13px";
      warning.style.color = "#dc2626";
      target.insertAdjacentElement("afterend", warning);
    }
    if (aiPrefs.detectionSensitivity === "high") {
      warning.textContent = "High sensitivity: minor irregularities may be flagged. Consider professional advice.";
      warning.style.display = "block";
    } else if (aiPrefs.detectionSensitivity === "low") {
      warning.textContent = "Low sensitivity: fewer warnings will be shown.";
      warning.style.display = "block";
    } else {
      warning.textContent = "";
      warning.style.display = "none";
    }
  };

  const cropToSquare = (imgEl) => {
    if (!aiPrefs.autoCropImage || !imgEl || !imgEl.src) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
      imgEl.src = canvas.toDataURL("image/jpeg", 0.9);
    };
    img.src = imgEl.src;
  };

  const previewImg = document.getElementById("img");
  const savedImage = localStorage.getItem("uploadedImage");
  if (previewImg && savedImage) {
    previewImg.src = savedImage;
    cropToSquare(previewImg);
  }

  const storedResult = localStorage.getItem("predictionResult");
  if (storedResult) {
    try {
      const parsed = JSON.parse(storedResult);
      const prediction = document.getElementById("prediction");
      const confidence = document.getElementById("confidence");
      if (parsed?.label && prediction) {
        prediction.textContent = `Predicted Disease: ${parsed.label}`;
      }
      if (confidence && typeof parsed?.confidence === "number") {
        const pct = Math.round((parsed.confidence || 0) * 100);
        confidence.textContent = `Confidence: ${pct}%`;
      }
      applyConfidenceVisibility();
      addSensitivityWarning(prediction);
      const actions = document.getElementById("actionButtons");
      if (actions) actions.style.display = "flex";
    } catch {
      // ignore parse errors
    }
  }

  showReminder();

  const clearBtn = document.getElementById("clearUpload");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      localStorage.removeItem("uploadedImage");
      localStorage.removeItem("predictionResult");
      localStorage.removeItem("predictedDisease");
      localStorage.removeItem("predictionConfidence");
      const input = document.getElementById("imageInput");
      const img = document.getElementById("img");
      const prediction = document.getElementById("prediction");
      const confidence = document.getElementById("confidence");
      const actions = document.getElementById("actionButtons");
      if (input) input.value = "";
      if (img) img.src = "";
      if (prediction) prediction.textContent = "";
      if (confidence) confidence.textContent = "";
      if (actions) actions.style.display = "none";
    });
  }

  const doubtsBtn = document.getElementById("doubtsBtn");
  const doubtsNavBtn = document.getElementById("doubtsNavBtn");
  const doubtsSection = document.getElementById("doubtsSection");
  let doubtsBackBtn = document.getElementById("doubtsBackBtn");

  const toggleDoubts = (e) => {
    if (e) e.preventDefault();
    doubtsSection.classList.toggle("show");
  };

  if (doubtsBtn && doubtsSection) {
    doubtsBtn.addEventListener("click", toggleDoubts);
  }

  if (doubtsNavBtn && doubtsSection) {
    doubtsNavBtn.addEventListener("click", toggleDoubts);
  }

  if (doubtsSection && !doubtsBackBtn) {
    doubtsBackBtn = document.createElement("button");
    doubtsBackBtn.type = "button";
    doubtsBackBtn.id = "doubtsBackBtn";
    doubtsBackBtn.className = "doubts-back-btn";
    doubtsBackBtn.textContent = "← Back";
    doubtsSection.prepend(doubtsBackBtn);
  }

  if (doubtsBackBtn && doubtsSection) {
    doubtsBackBtn.addEventListener("click", () => {
      doubtsSection.classList.remove("show");
    });
  }
  
  // Close when clicking outside (optional, but good UX for popups)
  document.addEventListener("click", (e) => {
    if (doubtsSection.classList.contains("show") && 
        !doubtsSection.contains(e.target) && 
        !doubtsBtn.contains(e.target) && 
        !doubtsNavBtn.contains(e.target)) {
      doubtsSection.classList.remove("show");
    }
  });
});


function showResultButtons() {
  const actions = document.getElementById("resultActions");
  if (actions) {
    actions.style.display = "flex";
  }
}
