document.addEventListener("DOMContentLoaded", function () {
  /* =========================
     LOAD USER FROM LOGIN
     ========================= */

  const getLoggedInUser = () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (user && (user.username || user.name || user.email)) {
        return user;
      }
    } catch {
      // Fall back to legacy keys below.
    }

    const username = localStorage.getItem("loggedInUser") || "";
    const email = localStorage.getItem("loggedInEmail") || "";
    return username || email ? { username, email } : null;
  };

  const storedUser = getLoggedInUser();

  if (storedUser) {
    document.getElementById("displayName").textContent =
      storedUser.username || storedUser.name || "—";
    document.getElementById("displayEmail").textContent =
      storedUser.email || "—";
  }

  const aiSensitivitySelect = document.getElementById("aiSensitivitySelect");
  const autoCropToggle = document.getElementById("autoCropToggle");
  const showConfidenceToggle = document.getElementById("showConfidenceToggle");
  const saveAiBtn = document.getElementById("saveAIPreferencesBtn");

  const notifScanToggle = document.getElementById("notifScanToggle");
  const notifRemindersToggle = document.getElementById("notifRemindersToggle");
  const notifEmailToggle = document.getElementById("notifEmailToggle");
  const saveNotifBtn = document.getElementById("saveNotificationsBtn");

  const readJson = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  const showSaved = (btn, text) => {
    if (!btn) return;
    const existing = btn.parentElement.querySelector(".success-msg");
    if (existing) existing.remove();
    const msg = document.createElement("div");
    msg.className = "success-msg";
    msg.textContent = text;
    btn.insertAdjacentElement("afterend", msg);
    requestAnimationFrame(() => msg.classList.add("show"));
    setTimeout(() => {
      msg.classList.remove("show");
      setTimeout(() => msg.remove(), 300);
    }, 3000);
  };

  const aiPrefs = readJson("aiPreferences", {
    detectionSensitivity: "medium",
    autoCropImage: false,
    showConfidenceScore: true
  });
  if (aiSensitivitySelect) aiSensitivitySelect.value = aiPrefs.detectionSensitivity || "medium";
  if (autoCropToggle) autoCropToggle.checked = !!aiPrefs.autoCropImage;
  if (showConfidenceToggle) showConfidenceToggle.checked = !!aiPrefs.showConfidenceScore;

  if (saveAiBtn) {
    saveAiBtn.addEventListener("click", function (event) {
      event.preventDefault();
      const payload = {
        detectionSensitivity: aiSensitivitySelect ? aiSensitivitySelect.value : "medium",
        autoCropImage: autoCropToggle ? autoCropToggle.checked : false,
        showConfidenceScore: showConfidenceToggle ? showConfidenceToggle.checked : true
      };
      localStorage.setItem("aiPreferences", JSON.stringify(payload));
      showSaved(saveAiBtn, "Saved Successfully");
    });
  }

  const notifPrefs = readJson("notificationPreferences", {
    scanResultAlerts: false,
    healthReminders: false,
    emailNotifications: false
  });
  if (notifScanToggle) notifScanToggle.checked = !!notifPrefs.scanResultAlerts;
  if (notifRemindersToggle) notifRemindersToggle.checked = !!notifPrefs.healthReminders;
  if (notifEmailToggle) notifEmailToggle.checked = !!notifPrefs.emailNotifications;

  if (saveNotifBtn) {
    saveNotifBtn.addEventListener("click", function (event) {
      event.preventDefault();
      const payload = {
        scanResultAlerts: notifScanToggle ? notifScanToggle.checked : false,
        healthReminders: notifRemindersToggle ? notifRemindersToggle.checked : false,
        emailNotifications: notifEmailToggle ? notifEmailToggle.checked : false
      };
      localStorage.setItem("notificationPreferences", JSON.stringify(payload));
      showSaved(saveNotifBtn, "Saved Successfully");
    });
  }

  const passwordModal = document.getElementById("passwordModal");
  const passwordModalClose = document.getElementById("passwordModalClose");
  const changePasswordBtn = document.getElementById("changePasswordBtn");
  const passwordCancelBtn = document.getElementById("passwordCancelBtn");
  const passwordSaveBtn = document.getElementById("passwordSaveBtn");
  const currentPasswordInput = document.getElementById("currentPasswordInput");
  const newPasswordInput = document.getElementById("newPasswordInput");
  const confirmPasswordInput = document.getElementById("confirmPasswordInput");
  const passwordError = document.getElementById("passwordError");
  const passwordSuccessMsg = document.getElementById("passwordSuccessMsg");

  const openPasswordModal = () => {
    if (!passwordModal) return;
    passwordModal.classList.add("open");
    passwordModal.setAttribute("aria-hidden", "false");
    if (passwordError) passwordError.textContent = "";
    if (currentPasswordInput) currentPasswordInput.value = "";
    if (newPasswordInput) newPasswordInput.value = "";
    if (confirmPasswordInput) confirmPasswordInput.value = "";
  };

  const closePasswordModal = () => {
    if (!passwordModal) return;
    passwordModal.classList.remove("open");
    passwordModal.setAttribute("aria-hidden", "true");
  };

  if (changePasswordBtn) {
    changePasswordBtn.addEventListener("click", openPasswordModal);
  }
  if (passwordModalClose) {
    passwordModalClose.addEventListener("click", closePasswordModal);
  }
  if (passwordCancelBtn) {
    passwordCancelBtn.addEventListener("click", closePasswordModal);
  }
  if (passwordModal) {
    passwordModal.addEventListener("click", (e) => {
      if (e.target === passwordModal) closePasswordModal();
    });
  }

  if (passwordSaveBtn) {
    passwordSaveBtn.addEventListener("click", async () => {
      const current = currentPasswordInput ? currentPasswordInput.value.trim() : "";
      const next = newPasswordInput ? newPasswordInput.value.trim() : "";
      const confirm = confirmPasswordInput ? confirmPasswordInput.value.trim() : "";
      const email = storedUser ? storedUser.email : "";

      if (!email) {
        if (passwordError) passwordError.textContent = "No logged-in email found. Please log in again.";
        return;
      }
      if (!current) {
        if (passwordError) passwordError.textContent = "Enter your current password.";
        return;
      }
      if (!next || next.length < 6) {
        if (passwordError) passwordError.textContent = "New password must be at least 6 characters.";
        return;
      }
      if (next !== confirm) {
        if (passwordError) passwordError.textContent = "New password and confirmation do not match.";
        return;
      }

      try {
        passwordSaveBtn.disabled = true;
        if (passwordError) passwordError.textContent = "";

        const loginRes = await fetch("/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: current })
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok || !loginData.success) {
          if (passwordError) passwordError.textContent = loginData.message || "Current password is incorrect.";
          return;
        }

        const resetRes = await fetch("/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: next })
        });
        const resetData = await resetRes.json();
        if (!resetRes.ok || !resetData.success) {
          if (passwordError) passwordError.textContent = resetData.message || "Failed to update password.";
          return;
        }

        closePasswordModal();
        if (passwordSuccessMsg) {
          passwordSuccessMsg.style.opacity = 1;
          setTimeout(() => {
            passwordSuccessMsg.style.opacity = 0;
          }, 2000);
        }
      } catch {
        if (passwordError) passwordError.textContent = "Password update failed. Please try again.";
      } finally {
        passwordSaveBtn.disabled = false;
      }
    });
  }

  /* =========================
     THEME + UI SETTINGS
     ========================= */

  const themeRadios = document.querySelectorAll("input[name='theme']");
  const savedTheme = localStorage.getItem("theme") || "light";
  const savedFontSize = localStorage.getItem("fontSize") || "medium";

  themeRadios.forEach(radio => {
    radio.checked = radio.value === savedTheme;
    radio.addEventListener("change", () => {
      localStorage.setItem("theme", radio.value);
      if (window.applyAllSettings) window.applyAllSettings();
    });
  });

  const fontSizeSelect = document.getElementById("fontSizeSelect");
  if (fontSizeSelect) {
    fontSizeSelect.value = savedFontSize;
    fontSizeSelect.addEventListener("change", (e) => {
      localStorage.setItem("fontSize", e.target.value);
      if (window.applyAllSettings) window.applyAllSettings();
    });
  }


  /* =========================
     SAVE HEALTH PREFS
     ========================= */

  document.getElementById("saveHealthPreferencesBtn").addEventListener("click", function (event) {
    event.preventDefault();
    const data = {
      diabetes: condDiabetes.checked,
      thyroid: condThyroid.checked,
      pcos: condPCOS.checked,
      asthma: condAsthma.checked,
      hypertension: condHypertension.checked,
      autoimmune: condAutoimmune.checked,
      skinType: skinTypeSelect.value,
      sensitivity: sensitivitySelect.value,
      sleep: sleepHoursInput.value,
      water: waterIntakeInput.value,
      stress: stressSelect.value
    };

    localStorage.setItem("healthPrefs", JSON.stringify(data));
    const existing = document.getElementById("healthPrefsSuccessMsg");
    if (existing) existing.remove();

    const msg = document.createElement("div");
    msg.id = "healthPrefsSuccessMsg";
    msg.className = "save-msg-inline";
    msg.textContent = "Health Preferences Saved Successfully";
    event.currentTarget.insertAdjacentElement("afterend", msg);
    requestAnimationFrame(() => msg.classList.add("show"));

    setTimeout(() => {
      msg.classList.remove("show");
      setTimeout(() => msg.remove(), 300);
    }, 3000);
  });
});
