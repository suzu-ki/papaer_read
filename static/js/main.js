let sections = [];
let sentences = [];
let sentenceIndex = 0;
let currentSectionIndex = 0;

const form = document.getElementById("uploadForm");
const output = document.getElementById("output");
const errorEl = document.getElementById("error");
const controls = document.getElementById("controls");
const sectionSelect = document.getElementById("sectionSelect");
const currentReading = document.getElementById("currentReading");

// PDFアップロード
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

// Section選択
sectionSelect.addEventListener("change", () => {
    currentSectionIndex = parseInt(sectionSelect.value);
    output.textContent = sections[currentSectionIndex].text;
    stopSpeech();
});

// 文単位で分割して再生
function playSpeech() {
    if (!sections.length) return;
    stopSpeech();

    const lang = document.getElementById("langSelect").value;
    const sectionText = sections[currentSectionIndex].text;

    // 日本語は「。」で分割、英語は ". " で分割
    if (lang.startsWith("ja")) {
        // sentences = sectionText.split("。").filter(s => s.trim() !== "").map(s => s + "。");
        // 日本語は「。」または「．」で分割
        sentences = sectionText
            .split(/。|．/)
            .filter(s => s.trim() !== "")
            .map(s => s + "。");  // 結合する際は通常の「。」に統一
    } else {
        sentences = sectionText.split(". ").filter(s => s.trim() !== "").map(s => s + ". ");
    }

    sentenceIndex = 0;
    speakNextSentence(lang);
}

// 次の文を再生
function speakNextSentence(lang) {
    if (sentenceIndex >= sentences.length) return;

    const utterance = new SpeechSynthesisUtterance(sentences[sentenceIndex]);
    utterance.lang = lang;

    utterance.onstart = () => {
        currentReading.textContent = sentences[sentenceIndex];
    };

    utterance.onend = () => {
        sentenceIndex++;
        speakNextSentence(lang);
    };

    speechSynthesis.speak(utterance);
}

// 一時停止・再開・停止
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
