function login() {
  window.location = "home.html";
}

function signup() {
  window.location = "index.html";
}

function upload() {
  window.location = "upload.html";
}

function detect() {
  window.location = "result.html";
}

function remedies() {
  window.location = "remedies.html";
}

function insights() {
  window.location = "insights.html";
}

function profile() {
  window.location = "profile.html";
}

function preview(e) {
  document.getElementById("img").src =
    URL.createObjectURL(e.target.files[0]);
}
