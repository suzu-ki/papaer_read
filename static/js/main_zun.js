let sections = [];
let sentences = [];
let sentenceIndex = 0;
let currentSectionIndex = 0;
let currentAudio = null; // ← 再生中のAudioを保持
let isPaused = false;

const form = document.getElementById("uploadForm");
const dropArea = document.getElementById("dropArea");
const output = document.getElementById("output");
const errorEl = document.getElementById("error");
const controls = document.getElementById("controls");
const sectionSelect = document.getElementById("sectionSelect");
const currentReading = document.getElementById("currentReading");

const fileInput = document.getElementById("pdfFile");

// PDFアップロード
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
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

// ドラッグオーバー・ドラッグリーブ
dropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropArea.style.borderColor = "#00f";
});
dropArea.addEventListener("dragleave", () => {
    dropArea.style.borderColor = "#ccc";
});

// ドロップで input にセット
dropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    dropArea.style.borderColor = "#ccc";
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === "application/pdf") {
        fileInput.files = files;
    } else {
        alert("PDFファイルのみアップロード可能です。");
    }
});

// Section選択
sectionSelect.addEventListener("change", () => {
    currentSectionIndex = parseInt(sectionSelect.value);
    output.textContent = sections[currentSectionIndex].text;
    stopSpeech();
});

// 文単位で分割して再生
async function playSpeech() {
    if (!sections.length) return;
    stopSpeech();

    const lang = document.getElementById("langSelect").value;
    const sectionText = sections[currentSectionIndex].text;

    if (lang.startsWith("ja")) {
        sentences = sectionText
            .split(/。|．/)
            .filter(s => s.trim() !== "")
            .map(s => s + "。");
    } else {
        sentences = sectionText.split(". ").filter(s => s.trim() !== "").map(s => s + ". ");
    }

    const auio_style = document.getElementById("audioSelect").value;
    sentenceIndex = 0;
    if (auio_style.startsWith("system")){
        speakNextSentence(lang);
    }else{
        await speakNextSentenceVOICEVOX(sentences);
    }
}

async function speakNextSentenceVOICEVOX(sentences) {
    if (sentenceIndex >= sentences.length) return;

    const text = sentences[sentenceIndex];
    const speakerId = 3; // ずんだもん
    const queryUrl = `http://127.0.0.1:50021/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`;
    const synthUrl = `http://127.0.0.1:50021/synthesis?speaker=${speakerId}`;

    try {
        const queryResponse = await fetch(queryUrl, { method: "POST" });
        const queryData = await queryResponse.json();

        const audioResponse = await fetch(synthUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(queryData)
        });
        const audioBlob = await audioResponse.blob();

        // 再生
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        currentAudio = audio;

        // 🔹 再生開始時に現在の文を表示
        audio.onplay = () => {
            if (currentReading) {
                currentReading.textContent = sentences[sentenceIndex];
            }
        };

        // 🔹 再生完了時に次の文へ
        audio.onended = () => {
            if (!isPaused) {
                sentenceIndex++;
                speakNextSentenceVOICEVOX(sentences);
            }
        };

        audio.play();

    } catch (err) {
        console.error("VOICEVOX再生中にエラー:", err);
    }
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
    if (currentAudio && !currentAudio.paused) {
        currentAudio.pause();
        isPaused = true;
    }
}

function resumeSpeech() {
    if (currentAudio && currentAudio.paused) {
        currentAudio.play();
        isPaused = false;
    }
}

function stopSpeech() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
    isPaused = false;
    sentenceIndex = 0;
    currentReading.textContent = "";
}

document.getElementById("playBtn").addEventListener("click", playSpeech);
document.getElementById("pauseBtn").addEventListener("click", pauseSpeech);
document.getElementById("resumeBtn").addEventListener("click", resumeSpeech);
document.getElementById("stopBtn").addEventListener("click", stopSpeech);

