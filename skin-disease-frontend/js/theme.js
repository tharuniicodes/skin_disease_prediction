(function () {
  function getThemeMode() {
    const theme = localStorage.getItem("theme") || "light";
    return theme === "dark";
  }

  function applyRootThemeClass() {
    const useDark = getThemeMode();
    document.documentElement.classList.toggle("dark", useDark);
  }

  function applyAllSettings() {
    const theme = localStorage.getItem("theme") || "light";
    const fontSize = localStorage.getItem("fontSize") || "medium";
    const useDark = getThemeMode();
    document.documentElement.classList.toggle("dark", useDark);
    if (document.body) {
      document.body.classList.toggle("dark", useDark);
    }
    const root = document.documentElement;
    const body = document.body;
    const sizeClass =
      fontSize === "small" ? "small-font" :
      fontSize === "large" ? "large-font" :
      "medium-font";

    root.classList.remove("small-font", "medium-font", "large-font");
    root.classList.add(sizeClass);
    if (body) {
      body.classList.remove("small-font", "medium-font", "large-font");
      body.classList.add(sizeClass);
    }
  }

  function initGlobalActions() {
    const logoutLinks = document.querySelectorAll("[data-logout]");
    logoutLinks.forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.removeItem("currentUser");
        localStorage.removeItem("loggedInUser");
        window.location.href = `${window.location.origin}/index.html`;
      });
    });
  }

  // Apply theme class ASAP to prevent flicker
  applyRootThemeClass();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      applyAllSettings();
      initGlobalActions();
    });
  } else {
    applyAllSettings();
    initGlobalActions();
  }

  // Update if settings change in another tab
  window.addEventListener("storage", (e) => {
    if (["theme", "fontSize"].includes(e.key)) {
      applyAllSettings();
    }
  });

  // Expose for instant apply on the same page
  window.applyAllSettings = applyAllSettings;
  window.applyRootThemeClass = applyRootThemeClass;
})();
