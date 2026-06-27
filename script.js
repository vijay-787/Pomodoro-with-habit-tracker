/* === SYSTEM LOGIC STATE === */
let state = {
    timer: {
        totalSeconds: 25 * 60,
        secondsRemaining: 25 * 60,
        isRunning: false,
        intervalId: null,
        currentMode: 'work', // 'work', 'shortBreak', 'longBreak'
        modes: {
            work: 25 * 60,
            shortBreak: 5 * 60,
            longBreak: 15 * 60
        }
    },
    habits: JSON.parse(localStorage.getItem('focusforge_habits')) || [
        { id: 1, text: "Work focused for 4 pomodoros", completed: false, streak: 3 },
        { id: 2, text: "Hydrate (3 liters daily)", completed: true, streak: 5 },
        { id: 3, text: "Evening review & reflection", completed: false, streak: 0 }
    ],
    completedSessions: parseInt(localStorage.getItem('focusforge_completed_sessions')) || 0,
    ambientActive: {
        brown: false,
        alpha: false
    }
};

// Web Audio Context setup for fully dynamic on-demand synthesizers
let audioContext = null;
let ambientAudioNodes = {};

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return audioContext;
}

/* === CORE TIMER LOGIC === */
const timerDisplay = document.getElementById('timer-display');
const timerStatusLabel = document.getElementById('timer-status-label');
const progressCircle = document.getElementById('timer-progress-circle');
const btnToggleLabel = document.getElementById('label-toggle');
const iconPlay = document.getElementById('icon-play');
const iconPause = document.getElementById('icon-pause');

// Circular progress circle geometry setup
const radius = progressCircle.r.baseVal.value;
const circumference = radius * 2 * Math.PI;
progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
progressCircle.style.strokeDashoffset = 0;

function updateProgress(percent) {
    const offset = circumference - (percent / 100 * circumference);
    progressCircle.style.strokeDashoffset = offset;
}

function renderTimer() {
    const minutes = Math.floor(state.timer.secondsRemaining / 60);
    const seconds = state.timer.secondsRemaining % 60;
    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    // Set dynamic browser tab title
    document.title = `(${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}) FocusForge`;

    const currentTotal = state.timer.modes[state.timer.currentMode];
    const percentElapsed = ((currentTotal - state.timer.secondsRemaining) / currentTotal) * 100;
    updateProgress(percentElapsed);

    // Update status text
    if (state.timer.isRunning) {
        timerStatusLabel.textContent = state.timer.currentMode === 'work' ? 'Forging Deep Work' : 'Time to Recharge';
        timerStatusLabel.classList.add('text-brand-500');
    } else {
        timerStatusLabel.textContent = 'Engine Paused';
        timerStatusLabel.classList.remove('text-brand-500');
    }
}

function setTimerMode(mode) {
    state.timer.currentMode = mode;
    state.timer.secondsRemaining = state.timer.modes[mode];
    state.timer.totalSeconds = state.timer.modes[mode];
    
    // UI Button Highlighting
    const modes = ['work', 'shortBreak', 'longBreak'];
    modes.forEach(m => {
        const btn = document.getElementById(`mode-${m}`);
        if (m === mode) {
            btn.className = "flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-sm";
        } else {
            btn.className = "flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white";
        }
    });

    // Color adaptation for breaks
    if (mode === 'work') {
        progressCircle.className.baseVal = "progress-ring__circle text-brand-500";
    } else {
        progressCircle.className.baseVal = "progress-ring__circle text-indigo-500";
    }

    pauseTimer();
    renderTimer();
    showToast(`Mode switched to ${mode === 'work' ? 'Focus Work' : 'Break Time'}`);
}

function toggleTimer() {
    getAudioContext(); // Enable Audio context securely on user gesture
    if (state.timer.isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
}

function startTimer() {
    state.timer.isRunning = true;
    btnToggleLabel.textContent = "Pause Session";
    iconPlay.classList.add('hidden');
    iconPause.classList.remove('hidden');

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
    iconPlay.classList.remove('hidden');
    iconPause.classList.add('hidden');
    clearInterval(state.timer.intervalId);
    renderTimer();
}

function resetTimer() {
    pauseTimer();
    state.timer.secondsRemaining = state.timer.modes[state.timer.currentMode];
    btnToggleLabel.textContent = "Start Focus";
    renderTimer();
    showToast("Timer cleared back to original schedule");
}

function handleSessionCompletion() {
    pauseTimer();
    triggerSynthesizedAlarm();
    
    if (state.timer.currentMode === 'work') {
        state.completedSessions++;
        localStorage.setItem('focusforge_completed_sessions', state.completedSessions);
        updateStatsDisplay();
        showToast("Spectacular work! Session saved successfully.");
        setTimerMode('shortBreak');
    } else {
        showToast("Break concluded! Back to the focus forge.");
        setTimerMode('work');
    }
}

/* === WEB AUDIO SYNTHESIZED ALARMS === */
function triggerSynthesizedAlarm() {
    const alarmType = document.getElementById('alarm-select').value;
    synthesizeAlarm(alarmType);
}

function testAlarmSound() {
    getAudioContext();
    const alarmType = document.getElementById('alarm-select').value;
    synthesizeAlarm(alarmType);
    showToast(`Testing "${alarmType}" synthesized ringtone`);
}

function synthesizeAlarm(type) {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (type === 'beep') {
        playBeepFreq(880, 0.1, now);
        playBeepFreq(880, 0.1, now + 0.15);
        playBeepFreq(1200, 0.25, now + 0.3);
    } else if (type === 'chime') {
        playChimeTone(523.25, 1.2, now); // C5
        playChimeTone(659.25, 1.2, now + 0.25); // E5
        playChimeTone(783.99, 1.5, now + 0.5); // G5
    } else if (type === 'retro') {
        for (let i = 0; i < 10; i++) {
            const ringTime = now + (i * 0.15);
            playBeepFreq(i % 2 === 0 ? 900 : 950, 0.08, ringTime, 'sawtooth');
        }
    } else if (type === 'tibet') {
        playTibetanBowl(146.83, 3.0, now); // D3 fundamental
        playTibetanBowl(220.00, 2.8, now + 0.05); // A3 fifth
        playTibetanBowl(293.66, 2.5, now + 0.1); // D4 octave
    }
}

function playBeepFreq(freq, duration, startTime, type = 'sine') {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.15, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
}

function playChimeTone(freq, duration, startTime) {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.2, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    const subtone = ctx.createOscillator();
    const subGain = ctx.createGain();
    subtone.frequency.setValueAtTime(freq * 0.5, startTime);
    subGain.gain.setValueAtTime(0.05, startTime);
    subGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    subtone.connect(subGain);
    gain.connect(ctx.destination);
    subGain.connect(ctx.destination);

    osc.start(startTime);
    subtone.start(startTime);
    osc.stop(startTime + duration);
    subtone.stop(startTime + duration);
}

function playTibetanBowl(freq, duration, startTime) {
    const ctx = getAudioContext();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, startTime);
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq + 1.5, startTime);

    gainNode.gain.setValueAtTime(0.3, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
}

/* === FOCUS AMBIENT AUDIO SYNTHESIS === */
function toggleAmbient(type) {
    const ctx = getAudioContext();
    const btn = document.getElementById(`btn-ambient-${type}`);

    if (state.ambientActive[type]) {
        if (ambientAudioNodes[type]) {
            try {
                ambientAudioNodes[type].source.stop();
            } catch(e) {}
            state.ambientActive[type] = false;
            btn.textContent = "Play";
            btn.classList.remove('bg-indigo-500', 'text-white');
            btn.classList.add('bg-slate-200', 'text-slate-700', 'dark:bg-slate-800', 'dark:text-slate-300');
            showToast(`${type === 'brown' ? 'Brown noise' : 'Binaural Alpha'} deactivated`);
        }
    } else {
        Object.keys(state.ambientActive).forEach(key => {
            if (state.ambientActive[key] && key !== type) {
                toggleAmbient(key);
            }
        });

        let nodeSetup = null;
        if (type === 'brown') {
            nodeSetup = createBrownNoiseNode(ctx);
        } else if (type === 'alpha') {
            nodeSetup = createBinauralAlphaNode(ctx);
        }

        if (nodeSetup) {
            ambientAudioNodes[type] = nodeSetup;
            nodeSetup.source.start(0);
            state.ambientActive[type] = true;
            btn.textContent = "Mute";
            btn.classList.remove('bg-slate-200', 'text-slate-700');
            btn.classList.add('bg-indigo-500', 'text-white');
            showToast(`${type === 'brown' ? 'Brown noise' : 'Binaural Alpha'} streaming`);
        }
    }
}

function createBrownNoiseNode(ctx) {
    const bufferSize = 10 * ctx.sampleRate; 
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; 
    }

    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 400; 

    const gain = ctx.createGain();
    gain.gain.value = 0.12; 

    source.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(ctx.destination);

    return { source, gain };
}

function createBinauralAlphaNode(ctx) {
    const merger = ctx.createChannelMerger(2);
    
    const oscLeft = ctx.createOscillator();
    oscLeft.type = 'sine';
    oscLeft.frequency.value = 140; 

    const oscRight = ctx.createOscillator();
    oscRight.type = 'sine';
    oscRight.frequency.value = 150; 

    const gainLeft = ctx.createGain();
    const gainRight = ctx.createGain();
    gainLeft.gain.value = 0.05;
    gainRight.gain.value = 0.05;

    oscLeft.connect(gainLeft);
    oscRight.connect(gainRight);

    gainLeft.connect(merger, 0, 0);
    gainRight.connect(merger, 0, 1);

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.8;
    merger.connect(masterGain);
    masterGain.connect(ctx.destination);

    const controller = {
        start: () => {
            oscLeft.start(0);
            oscRight.start(0);
        },
        stop: () => {
            oscLeft.stop();
            oscRight.stop();
        }
    };

    return { source: controller, masterGain };
}

/* === HABIT TRACKER STATE MANAGEMENT === */
const habitsListContainer = document.getElementById('habits-list');
const habitsEmptyState = document.getElementById('habits-empty-state');
const habitInput = document.getElementById('habit-input');
const totalStreakCountDisplay = document.getElementById('total-streak-count');
const habitCountBadge = document.getElementById('habit-count-badge');

function renderHabits() {
    const items = habitsListContainer.querySelectorAll('.habit-ui-item');
    items.forEach(el => el.remove());

    if (state.habits.length === 0) {
        habitsEmptyState.classList.remove('hidden');
        habitCountBadge.textContent = "0 / 0";
    } else {
        habitsEmptyState.classList.add('hidden');
        
        const completedCount = state.habits.filter(h => h.completed).length;
        habitCountBadge.textContent = `${completedCount} / ${state.habits.length}`;

        state.habits.forEach(habit => {
            const itemHTML = `
                <div class="habit-ui-item flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all ${habit.completed ? 'opacity-70' : ''}">
                    <div class="flex items-center space-x-3 flex-1 mr-2">
                        <button onclick="toggleHabitStatus(${habit.id})" class="w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${habit.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-brand-500'}">
                            ${habit.completed ? '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>' : ''}
                        </button>
                        <div class="flex flex-col">
                            <span class="text-sm font-medium ${habit.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}">${habit.text}</span>
                            <div class="flex items-center space-x-1.5 mt-0.5">
                                <span class="text-[10px] text-orange-500 font-bold flex items-center gap-0.5">
                                    🔥 ${habit.streak} Day Streak
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onclick="removeHabit(${habit.id})" class="p-2 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-all" title="Remove Habit">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            `;
            habitsListContainer.insertAdjacentHTML('beforeend', itemHTML);
        });
    }

    localStorage.setItem('focusforge_habits', JSON.stringify(state.habits));
    updateStatsDisplay();
}

function createNewHabit(event) {
    event.preventDefault();
    const text = habitInput.value.trim();
    if (!text) return;

    const newHabit = {
        id: Date.now(),
        text: text,
        completed: false,
        streak: 0
    };

    state.habits.push(newHabit);
    habitInput.value = "";
    renderHabits();
    showToast(`Added habit: "${text}"`);
}

function toggleHabitStatus(id) {
    state.habits = state.habits.map(h => {
        if (h.id === id) {
            const nextCompletedState = !h.completed;
            let nextStreak = h.streak;
            
            if (nextCompletedState) {
                nextStreak++;
                showToast(`Habit achieved! Streak extended!`);
            } else {
                nextStreak = Math.max(0, nextStreak - 1);
            }
            
            return { ...h, completed: nextCompletedState, streak: nextStreak };
        }
        return h;
    });
    renderHabits();
}

function removeHabit(id) {
    const target = state.habits.find(h => h.id === id);
    state.habits = state.habits.filter(h => h.id !== id);
    renderHabits();
    if (target) {
        showToast(`Removed habit: "${target.text}"`);
    }
}

/* === STATISTICS & USER RETENTION DISPLAYS === */
const sessionCountDisplay = document.getElementById('completed-sessions-count');

function updateStatsDisplay() {
    sessionCountDisplay.textContent = `${state.completedSessions} Sessions`;
    const totalStreaks = state.habits.reduce((acc, h) => acc + h.streak, 0);
    totalStreakCountDisplay.textContent = `${totalStreaks} Days`;
}

/* === THEME SWAPPER CONTROLS === */
function toggleTheme() {
    const htmlNode = document.documentElement;
    const themeSun = document.getElementById('theme-sun');
    const themeMoon = document.getElementById('theme-moon');

    if (htmlNode.classList.contains('dark')) {
        htmlNode.classList.remove('dark');
        themeSun.classList.add('hidden');
        themeMoon.classList.remove('hidden');
        localStorage.setItem('focusforge_theme', 'light');
    } else {
        htmlNode.classList.add('dark');
        themeSun.classList.remove('hidden');
        themeMoon.classList.add('hidden');
        localStorage.setItem('focusforge_theme', 'dark');
    }
}

function setupPreferredTheme() {
    const storedTheme = localStorage.getItem('focusforge_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (storedTheme === 'dark' || (!storedTheme && prefersDark)) {
        document.documentElement.classList.add('dark');
        document.getElementById('theme-sun').classList.remove('hidden');
        document.getElementById('theme-moon').classList.add('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        document.getElementById('theme-sun').classList.add('hidden');
        document.getElementById('theme-moon').classList.remove('hidden');
    }
}

/* === GLOBAL NOTIFICATION COMPONENT === */
let toastTimeout = null;
function showToast(message) {
    const toastEl = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    
    toastMsg.textContent = message;
    toastEl.classList.remove('translate-y-10', 'opacity-0');
    toastEl.classList.add('translate-y-0', 'opacity-100');

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toastEl.classList.add('translate-y-10', 'opacity-0');
        toastEl.classList.remove('translate-y-0', 'opacity-100');
    }, 3500);
}

/* === INITIAL BOOT ENGINE === */
window.addEventListener('DOMContentLoaded', () => {
    setupPreferredTheme();
    renderTimer();
    renderHabits();
    updateStatsDisplay();
});
