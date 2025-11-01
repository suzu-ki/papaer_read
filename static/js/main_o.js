const form = document.getElementById("uploadForm");
const output = document.getElementById("output");
const errorEl = document.getElementById("error");
const controls = document.getElementById("controls");
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resumeBtn = document.getElementById("resumeBtn");
const stopBtn = document.getElementById("stopBtn");
let utterance;

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fileInput = document.getElementById("pdfFile");
  const formData = new FormData();
  formData.append("pdf", fileInput.files[0]);
  output.textContent = "PDFを解析中...";
  errorEl.textContent = "";

  try {
    const res = await fetch("/upload", { method: "POST", body: formData });
    const data = await res.json();

    if (data.error) {
      errorEl.textContent = data.error;
      output.textContent = "";
      return;
    }

    output.textContent = data.text;
    controls.style.display = "block";
  } catch (err) {
    errorEl.textContent = "サーバとの通信に失敗しました。";
  }
});

playBtn.addEventListener("click", () => {
  if (!output.textContent.trim()) return;
  const lang = document.getElementById("langSelect").value;
  utterance = new SpeechSynthesisUtterance(output.textContent);
  utterance.lang = lang;
  speechSynthesis.speak(utterance);
});

pauseBtn.addEventListener("click", () => {
  if (speechSynthesis.speaking && !speechSynthesis.paused) {
    speechSynthesis.pause();
  }
});

resumeBtn.addEventListener("click", () => {
  if (speechSynthesis.paused) {
    speechSynthesis.resume();
  }
});

stopBtn.addEventListener("click", () => {
  speechSynthesis.cancel();
});
