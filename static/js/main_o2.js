let sections = [];
let utterance;
let currentSectionIndex = 0;

const form = document.getElementById("uploadForm");
const output = document.getElementById("output");
const errorEl = document.getElementById("error");
const controls = document.getElementById("controls");
const sectionSelect = document.getElementById("sectionSelect");
const currentReading = document.getElementById("currentReading");

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById("pdfFile");
    const formData = new FormData();
    formData.append("pdf", fileInput.files[0]);

    output.textContent = "PDFを解析中...";
    errorEl.textContent = "";
    sectionSelect.innerHTML = "";
    sections = [];

    try {
        const res = await fetch("/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.error) {
            errorEl.textContent = data.error;
            output.textContent = "";
            return;
        }
        sections = data.sections;
        sections.forEach((sec, i) => {
            const opt = document.createElement("option");
            opt.value = i;
            opt.textContent = sec.title;
            sectionSelect.appendChild(opt);
        });
        currentSectionIndex = 0;
        output.textContent = sections[currentSectionIndex].text;
        controls.style.display = "block";
    } catch (err) {
        errorEl.textContent = "サーバとの通信に失敗しました。";
    }
});

sectionSelect.addEventListener("change", () => {
    currentSectionIndex = parseInt(sectionSelect.value);
    output.textContent = sections[currentSectionIndex].text;
    stopSpeech();
});

function playSpeech() {
    if (!sections.length) return;
    const lang = document.getElementById("langSelect").value;
    stopSpeech();
    utterance = new SpeechSynthesisUtterance(sections[currentSectionIndex].text);
    utterance.lang = lang;
    utterance.onboundary = (event) => {
        if (event.name === "word") {
            const idx = event.charIndex;
            const len = event.charLength || 1;
            const currentText = sections[currentSectionIndex].text.substr(idx, len);
            currentReading.textContent = currentText;
        }
    };
    speechSynthesis.speak(utterance);
}

function pauseSpeech() {
    if (speechSynthesis.speaking && !speechSynthesis.paused) {
        speechSynthesis.pause();
    }
}

function resumeSpeech() {
    if (speechSynthesis.paused) {
        speechSynthesis.resume();
    }
}

function stopSpeech() {
    speechSynthesis.cancel();
    currentReading.textContent = "";
}

document.getElementById("playBtn").addEventListener("click", playSpeech);
document.getElementById("pauseBtn").addEventListener("click", pauseSpeech);
document.getElementById("resumeBtn").addEventListener("click", resumeSpeech);
document.getElementById("stopBtn").addEventListener("click", stopSpeech);
