/* === SYSTEM LOGIC STATE === */
let state = {
    timer: {
        totalSeconds: 25 * 60,
        secondsRemaining: 25 * 60,
        isRunning: false,
        intervalId: null,
        currentMode: 'work',
        modes: {
            work: 25 * 60,
            shortBreak: 5 * 60,
            longBreak: 15 * 60
        }
    },
    habits: JSON.parse(localStorage.getItem('focusforge_habits')) || [
        {
            id: 1,
            text: "Work focused for 4 pomodoros",
            completed: false,
            streak: 3
        },
        {
            id: 2,
            text: "Hydrate (3 liters daily)",
            completed: true,
            streak: 5
        },
        {
            id: 3,
            text: "Evening review & reflection",
            completed: false,
            streak: 0
        }
    ],
    completedSessions: parseInt(
        localStorage.getItem('focusforge_completed_sessions')
    ) || 0,
    ambientActive: {
        brown: false,
        alpha: false
    }
};

/* ===========================
   AUDIO CONTEXT
=========================== */

let audioContext = null;
let ambientAudioNodes = {};

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioContext.state === "suspended") {
        audioContext.resume();
    }

    return audioContext;
}

/* ===========================
   TIMER ELEMENTS
=========================== */

const timerDisplay = document.getElementById("timer-display");
const timerStatusLabel = document.getElementById("timer-status-label");
const progressCircle = document.getElementById("timer-progress-circle");
const btnToggleLabel = document.getElementById("label-toggle");
const iconPlay = document.getElementById("icon-play");
const iconPause = document.getElementById("icon-pause");

/* Progress Ring */

const radius = progressCircle.r.baseVal.value;
const circumference = radius * 2 * Math.PI;

progressCircle.style.strokeDasharray =
    `${circumference} ${circumference}`;

progressCircle.style.strokeDashoffset = 0;

function updateProgress(percent) {
    const offset =
        circumference - (percent / 100) * circumference;

    progressCircle.style.strokeDashoffset = offset;
}

function renderTimer() {

    const minutes = Math.floor(
        state.timer.secondsRemaining / 60
    );

    const seconds =
        state.timer.secondsRemaining % 60;

    timerDisplay.textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    document.title =
        `(${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}) FocusForge`;

    const currentTotal =
        state.timer.modes[state.timer.currentMode];

    const percentElapsed =
        ((currentTotal - state.timer.secondsRemaining) /
            currentTotal) *
        100;

    updateProgress(percentElapsed);

    if (state.timer.isRunning) {

        timerStatusLabel.textContent =
            state.timer.currentMode === "work"
                ? "Forging Deep Work"
                : "Time to Recharge";

        timerStatusLabel.classList.add("text-brand-500");

    } else {

        timerStatusLabel.textContent = "Engine Paused";
        timerStatusLabel.classList.remove("text-brand-500");

    }
}
/* ===========================
   TIMER FUNCTIONS
=========================== */

function setTimerMode(mode) {

    state.timer.currentMode = mode;
    state.timer.secondsRemaining = state.timer.modes[mode];
    state.timer.totalSeconds = state.timer.modes[mode];

    const modes = ["work", "shortBreak", "longBreak"];

    modes.forEach((m) => {

        const btn = document.getElementById(`mode-${m}`);

        if (m === mode) {

            btn.className =
                "flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-sm";

        } else {

            btn.className =
                "flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white";

        }
    });

    if (mode === "work") {

        progressCircle.className.baseVal =
            "progress-ring__circle text-brand-500";

    } else {

        progressCircle.className.baseVal =
            "progress-ring__circle text-indigo-500";

    }

    pauseTimer();
    renderTimer();

    showToast(
        `Mode switched to ${
            mode === "work"
                ? "Focus Work"
                : "Break Time"
        }`
    );
}

function toggleTimer() {

    getAudioContext();

    if (state.timer.isRunning) {

        pauseTimer();

    } else {

        startTimer();

    }
}

function startTimer() {

    state.timer.isRunning = true;

    btnToggleLabel.textContent = "Pause Session";

    iconPlay.classList.add("hidden");
    iconPause.classList.remove("hidden");

    state.timer.intervalId = setInterval(() => {

        if (state.timer.secondsRemaining > 0) {

            state.timer.secondsRemaining--;
            renderTimer();

        } else {

            handleSessionCompletion();

        }

    }, 1000);

    renderTimer();
}

function pauseTimer() {

    state.timer.isRunning = false;

    btnToggleLabel.textContent = "Resume Work";

    iconPlay.classList.remove("hidden");
    iconPause.classList.add("hidden");

    clearInterval(state.timer.intervalId);

    renderTimer();
}

function resetTimer() {

    pauseTimer();

    state.timer.secondsRemaining =
        state.timer.modes[state.timer.currentMode];

    btnToggleLabel.textContent = "Start Focus";

    renderTimer();

    showToast(
        "Timer cleared back to original schedule"
    );
}

function handleSessionCompletion() {

    pauseTimer();

    triggerSynthesizedAlarm();

    if (state.timer.currentMode === "work") {

        state.completedSessions++;

        localStorage.setItem(
            "focusforge_completed_sessions",
            state.completedSessions
        );

        updateStatsDisplay();

        showToast(
            "Spectacular work! Session saved successfully."
        );

        setTimerMode("shortBreak");

    } else {

        showToast(
            "Break concluded! Back to the focus forge."
        );

        setTimerMode("work");

    }
}

/* ===========================
   ALARM SYSTEM
=========================== */

function triggerSynthesizedAlarm() {

    const alarmType =
        document.getElementById("alarm-select").value;

    synthesizeAlarm(alarmType);
}

function testAlarmSound() {

    getAudioContext();

    const alarmType =
        document.getElementById("alarm-select").value;

    synthesizeAlarm(alarmType);

    showToast(
        `Testing "${alarmType}" synthesized ringtone`
    );
}
/* ===========================
   SYNTHESIZED ALARMS
=========================== */

function synthesizeAlarm(type) {

    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (type === "beep") {

        playBeepFreq(880, 0.1, now);
        playBeepFreq(880, 0.1, now + 0.15);
        playBeepFreq(1200, 0.25, now + 0.30);

    } else if (type === "chime") {

        playChimeTone(523.25, 1.2, now);
        playChimeTone(659.25, 1.2, now + 0.25);
        playChimeTone(783.99, 1.5, now + 0.50);

    } else if (type === "retro") {

        for (let i = 0; i < 10; i++) {

            const ringTime = now + i * 0.15;

            playBeepFreq(
                i % 2 === 0 ? 900 : 950,
                0.08,
                ringTime,
                "sawtooth"
            );
        }

    } else if (type === "tibet") {

        playTibetanBowl(146.83, 3.0, now);
        playTibetanBowl(220.00, 2.8, now + 0.05);
        playTibetanBowl(293.66, 2.5, now + 0.10);

    }
}

function playBeepFreq(freq, duration, startTime, type = "sine") {

    const ctx = getAudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.15, startTime);
    gain.gain.exponentialRampToValueAtTime(
        0.001,
        startTime + duration
    );

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
}

function playChimeTone(freq, duration, startTime) {

    const ctx = getAudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.2, startTime);
    gain.gain.exponentialRampToValueAtTime(
        0.001,
        startTime + duration
    );

    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();

    subOsc.frequency.setValueAtTime(
        freq * 0.5,
        startTime
    );

    subGain.gain.setValueAtTime(0.05, startTime);
    subGain.gain.exponentialRampToValueAtTime(
        0.001,
        startTime + duration
    );

    osc.connect(gain);
    subOsc.connect(subGain);

    gain.connect(ctx.destination);
    subGain.connect(ctx.destination);

    osc.start(startTime);
    subOsc.start(startTime);

    osc.stop(startTime + duration);
    subOsc.stop(startTime + duration);
}

function playTibetanBowl(freq, duration, startTime) {

    const ctx = getAudioContext();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "sine";

    osc1.frequency.setValueAtTime(freq, startTime);
    osc2.frequency.setValueAtTime(freq + 1.5, startTime);

    gain.gain.setValueAtTime(0.3, startTime);
    gain.gain.exponentialRampToValueAtTime(
        0.0001,
        startTime + duration
    );

    osc1.connect(gain);
    osc2.connect(gain);

    gain.connect(ctx.destination);

    osc1.start(startTime);
    osc2.start(startTime);

    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
}

/* ===========================
   AMBIENT AUDIO
=========================== */

function toggleAmbient(type) {

    const ctx = getAudioContext();
    const btn = document.getElementById(
        `btn-ambient-${type}`
    );

    if (state.ambientActive[type]) {

        if (ambientAudioNodes[type]) {

            try {
                ambientAudioNodes[type].source.stop();
            } catch (e) {}

            state.ambientActive[type] = false;

            btn.textContent = "Play";

            btn.classList.remove(
                "bg-indigo-500",
                "text-white"
            );

            btn.classList.add(
                "bg-slate-200",
                "text-slate-700",
                "dark:bg-slate-800",
                "dark:text-slate-300"
            );

            showToast(
                `${type === "brown"
                    ? "Brown noise"
                    : "Binaural Alpha"} deactivated`
            );
        }

    } else {

        Object.keys(state.ambientActive).forEach(key => {

            if (
                state.ambientActive[key] &&
                key !== type
            ) {
                toggleAmbient(key);
            }

        });

        let nodeSetup = null;

        if (type === "brown") {

            nodeSetup = createBrownNoiseNode(ctx);

        } else if (type === "alpha") {

            nodeSetup = createBinauralAlphaNode(ctx);

        }

        if (nodeSetup) {

            ambientAudioNodes[type] = nodeSetup;

            nodeSetup.source.start(0);

            state.ambientActive[type] = true;

            btn.textContent = "Mute";

            btn.classList.remove(
                "bg-slate-200",
                "text-slate-700"
            );

            btn.classList.add(
                "bg-indigo-500",
                "text-white"
            );

            showToast(
                `${type === "brown"
                    ? "Brown noise"
                    : "Binaural Alpha"} streaming`
            );
        }
    }
}