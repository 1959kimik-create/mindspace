const THEMES = {
  morning: {
    label: "아침",
    start: 6,
    end: 10,
    greeting: "좋은 아침입니다. 오늘도 차분히 시작해 볼까요?",
    image: "https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=1920&q=80",
    credit: "Photo by Dave Hoefler on Unsplash",
  },
  day: {
    label: "낮",
    start: 10,
    end: 17,
    greeting: "잠시 숨을 고르고 마음에 여유를 가져보세요.",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80",
    credit: "Photo by Bailey Zindel on Unsplash",
  },
  evening: {
    label: "저녁",
    start: 17,
    end: 20,
    greeting: "오늘 하루도 수고 많으셨습니다.",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80",
    credit: "Photo by Sean Oulashin on Unsplash",
  },
  night: {
    label: "밤",
    start: 20,
    end: 25,
    greeting: "하루를 내려놓고 편안하게 쉬어 가세요.",
    image: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=1920&q=80",
    credit: "Photo by Sasha Freemind on Unsplash",
  },
  dawn: {
    label: "새벽",
    start: 1,
    end: 6,
    greeting: "고요한 새벽입니다. 나와 잠시 마주해 보세요.",
    image: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1920&q=80",
    credit: "Photo by Sebastian Unrau on Unsplash",
  },
};

const LOGS_KEY = "meditationLogs";
const THEME_KEY = "themeOverride";

const bgEl = document.getElementById("bg");
const greetingEl = document.getElementById("greeting");
const photoCreditEl = document.getElementById("photoCredit");
const themeSelect = document.getElementById("themeSelect");
const timerDisplay = document.getElementById("timerDisplay");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const chips = [...document.querySelectorAll(".chip")];
const playerWrap = document.getElementById("playerWrap");
const playerTitle = document.getElementById("playerTitle");
const playerFrame = document.querySelector(".player-frame");
const closePlayerBtn = document.getElementById("closePlayerBtn");
const videoItems = [...document.querySelectorAll(".video-item")];
const calendarBtn = document.getElementById("calendarBtn");
const calendarPanel = document.getElementById("calendarPanel");
const mainView = document.getElementById("mainView");
const calendarTitle = document.getElementById("calendarTitle");
const calendarGrid = document.getElementById("calendarGrid");
const dayDetail = document.getElementById("dayDetail");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const closeCalendarBtn = document.getElementById("closeCalendarBtn");
const completeModal = document.getElementById("completeModal");
const modalBody = document.getElementById("modalBody");
const modalConfirmBtn = document.getElementById("modalConfirmBtn");

const state = {
  selectedMinutes: 10,
  remainingSeconds: 10 * 60,
  elapsedSeconds: 0,
  running: false,
  intervalId: null,
  pendingDuration: 0,
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth(),
  selectedDate: null,
  selectedVideoId: null,
};

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatClock(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${pad(minutes)}:${pad(seconds)}`;
}

function formatLocalDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function themeFromHour(hour) {
  if (hour >= 6 && hour < 10) return "morning";
  if (hour >= 10 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "evening";
  if (hour >= 20 || hour < 1) return "night";
  return "dawn";
}

function applyTheme(themeKey) {
  const theme = THEMES[themeKey];
  if (!theme) return;
  bgEl.style.backgroundImage = `url("${theme.image}")`;
  greetingEl.textContent = theme.greeting;
  photoCreditEl.textContent = theme.credit;
  document.body.dataset.theme = themeKey;
}

function resolveTheme() {
  const override = localStorage.getItem(THEME_KEY);
  if (override && override !== "auto" && THEMES[override]) {
    themeSelect.value = override;
    applyTheme(override);
    return;
  }
  themeSelect.value = "auto";
  applyTheme(themeFromHour(new Date().getHours()));
}

function getLogs() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOGS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function logMeditation(minutes) {
  const logs = getLogs();
  logs.push({ date: formatLocalDate(new Date()), duration: minutes });
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

function logsForDate(dateKey) {
  return getLogs().filter((log) => log.date === dateKey);
}

function totalMinutesForDate(dateKey) {
  return logsForDate(dateKey).reduce((sum, log) => sum + Number(log.duration || 0), 0);
}

function renderTimer() {
  if (state.selectedMinutes === 0) {
    timerDisplay.textContent = formatClock(state.elapsedSeconds);
    return;
  }
  timerDisplay.textContent = formatClock(state.remainingSeconds);
}

function setDuration(minutes) {
  if (state.running) return;
  state.selectedMinutes = minutes;
  state.elapsedSeconds = 0;
  state.remainingSeconds = minutes === 0 ? 0 : minutes * 60;
  chips.forEach((chip) => {
    chip.classList.toggle("is-active", Number(chip.dataset.minutes) === minutes);
  });
  renderTimer();
  resetBtn.hidden = true;
  resetBtn.textContent = "리셋";
  startBtn.textContent = "명상 시작";
}

function hasProgress() {
  if (state.selectedMinutes === 0) return state.elapsedSeconds > 0;
  return state.remainingSeconds !== state.selectedMinutes * 60;
}

function setRunningUi(running) {
  state.running = running;
  chips.forEach((chip) => {
    chip.disabled = running;
  });

  if (running) {
    startBtn.textContent = "일시정지";
    resetBtn.hidden = false;
    resetBtn.textContent = "리셋";
    return;
  }

  if (state.selectedMinutes === 0 && state.elapsedSeconds > 0) {
    startBtn.textContent = "계속";
    resetBtn.hidden = false;
    resetBtn.textContent = "명상 종료";
    return;
  }

  startBtn.textContent = "명상 시작";
  resetBtn.hidden = !hasProgress();
  resetBtn.textContent = "리셋";
}

function clearTick() {
  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
}

function playAlarm() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const now = ctx.currentTime;
  [523.25, 659.25, 783.99].forEach((freq, index) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = freq;
    const startAt = now + index * 0.16;
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.12, startAt + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 1.6);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + 1.7);
  });
  ctx.resume();
}

function openCompleteModal(minutes) {
  state.pendingDuration = minutes;
  modalBody.textContent = `${minutes}분 명상을 마쳤습니다. 오늘의 기록이 달력에 남았습니다.`;
  completeModal.hidden = false;
  modalConfirmBtn.focus();
}

function finishSession(minutes) {
  clearTick();
  setRunningUi(false);
  stopMeditationVideo();
  const savedMinutes = Math.max(1, minutes);
  playAlarm();
  openCompleteModal(savedMinutes);
}

function tick() {
  state.elapsedSeconds += 1;
  if (state.selectedMinutes === 0) {
    renderTimer();
    return;
  }
  state.remainingSeconds -= 1;
  renderTimer();
  if (state.remainingSeconds <= 0) {
    finishSession(state.selectedMinutes);
    setDuration(state.selectedMinutes);
  }
}

function startTimer() {
  clearTick();
  setRunningUi(true);
  if (state.elapsedSeconds === 0) {
    playMeditationVideo(true);
  } else {
    playMeditationVideo(false);
  }
  state.intervalId = setInterval(tick, 1000);
}

function pauseTimer() {
  clearTick();
  setRunningUi(false);
  pauseMeditationVideo();
}

function resetTimer() {
  clearTick();
  state.running = false;
  stopMeditationVideo();
  setDuration(state.selectedMinutes);
  startBtn.textContent = "명상 시작";
  resetBtn.hidden = true;
  resetBtn.textContent = "리셋";
  chips.forEach((chip) => {
    chip.disabled = false;
  });
}

function onStartClick() {
  if (state.running) {
    pauseTimer();
    return;
  }
  startTimer();
}

function onResetClick() {
  if (state.selectedMinutes === 0 && state.elapsedSeconds > 0 && !state.running) {
    finishSession(Math.max(1, Math.round(state.elapsedSeconds / 60)));
    setDuration(0);
    resetBtn.hidden = true;
    resetBtn.textContent = "리셋";
    return;
  }
  resetTimer();
}

function buildEmbedUrl(videoId, autoplay) {
  const params = new URLSearchParams({
    enablejsapi: "1",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });
  if (autoplay) params.set("autoplay", "1");
  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    params.set("origin", window.location.origin);
    params.set("widget_referrer", window.location.origin);
  }
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

function commandPlayer(func, args = []) {
  const iframe = document.getElementById("ytPlayer");
  if (!iframe || !iframe.contentWindow) return;
  iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), "*");
}

function playMeditationVideo(fromStart) {
  if (!state.selectedVideoId) return;
  if (fromStart) commandPlayer("seekTo", [0, true]);
  commandPlayer("playVideo");
}

function pauseMeditationVideo() {
  commandPlayer("pauseVideo");
}

function stopMeditationVideo() {
  commandPlayer("pauseVideo");
  commandPlayer("seekTo", [0, true]);
}

function mountPlayer(videoId, autoplay) {
  playerFrame.replaceChildren();
  const iframe = document.createElement("iframe");
  iframe.id = "ytPlayer";
  iframe.title = "명상 영상";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.allowFullscreen = true;
  playerFrame.appendChild(iframe);
  iframe.src = buildEmbedUrl(videoId, autoplay);
  iframe.addEventListener("load", () => {
    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage(JSON.stringify({ event: "listening", id: 1 }), "*");
    }
    if (state.running) commandPlayer("playVideo");
  });
}

function playVideo(videoId, title, card) {
  playerTitle.textContent = title;
  state.selectedVideoId = videoId;
  playerWrap.hidden = false;
  videoItems.forEach((item) => item.classList.toggle("is-active", item === card));
  mountPlayer(videoId, state.running);
}

function closePlayer() {
  stopMeditationVideo();
  state.selectedVideoId = null;
  playerFrame.replaceChildren();
  playerWrap.hidden = true;
  videoItems.forEach((item) => item.classList.remove("is-active"));
}

function renderDayDetail(dateKey) {
  if (!dateKey) {
    dayDetail.textContent = "날짜를 누르면 그날의 명상 시간을 볼 수 있습니다.";
    return;
  }
  const [year, month, day] = dateKey.split("-");
  const sessions = logsForDate(dateKey);
  if (!sessions.length) {
    dayDetail.textContent = `${Number(year)}년 ${Number(month)}월 ${Number(day)}일에는 아직 기록이 없습니다.`;
    return;
  }
  const total = totalMinutesForDate(dateKey);
  const countLabel = sessions.length > 1 ? ` · ${sessions.length}회` : "";
  dayDetail.textContent = `${Number(year)}년 ${Number(month)}월 ${Number(day)}일 · 총 ${total}분${countLabel}`;
}

function renderCalendar() {
  const year = state.calendarYear;
  const month = state.calendarMonth;
  calendarTitle.textContent = `${year}년 ${month + 1}월`;
  calendarGrid.replaceChildren();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = formatLocalDate(new Date());

  for (let i = 0; i < firstDay; i += 1) {
    const empty = document.createElement("div");
    empty.className = "day-cell is-empty";
    calendarGrid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${year}-${pad(month + 1)}-${pad(day)}`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "day-cell";
    button.textContent = String(day);
    if (dateKey === todayKey) button.classList.add("is-today");
    if (logsForDate(dateKey).length) button.classList.add("has-log");
    if (state.selectedDate === dateKey) button.classList.add("is-selected");
    button.addEventListener("click", () => {
      state.selectedDate = dateKey;
      renderCalendar();
      renderDayDetail(dateKey);
    });
    calendarGrid.appendChild(button);
  }

  renderDayDetail(state.selectedDate);
}

function showCalendar(show) {
  calendarPanel.hidden = !show;
  mainView.hidden = show;
  calendarBtn.setAttribute("aria-expanded", String(show));
  if (show) {
    state.calendarYear = new Date().getFullYear();
    state.calendarMonth = new Date().getMonth();
    renderCalendar();
  }
}

function confirmCompletion() {
  if (state.pendingDuration > 0) {
    logMeditation(state.pendingDuration);
    state.pendingDuration = 0;
  }
  completeModal.hidden = true;
  startBtn.focus();
}

themeSelect.addEventListener("change", () => {
  const value = themeSelect.value;
  if (value === "auto") {
    localStorage.removeItem(THEME_KEY);
  } else {
    localStorage.setItem(THEME_KEY, value);
  }
  resolveTheme();
});

chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    setDuration(Number(chip.dataset.minutes));
    resetBtn.hidden = true;
    startBtn.textContent = "명상 시작";
  });
});

startBtn.addEventListener("click", onStartClick);
resetBtn.addEventListener("click", onResetClick);

videoItems.forEach((card) => {
  card.addEventListener("click", () => {
    playVideo(card.dataset.video, card.dataset.title, card);
  });
});

closePlayerBtn.addEventListener("click", closePlayer);
calendarBtn.addEventListener("click", () => {
  showCalendar(calendarPanel.hidden);
});
closeCalendarBtn.addEventListener("click", () => showCalendar(false));

prevMonthBtn.addEventListener("click", () => {
  state.calendarMonth -= 1;
  if (state.calendarMonth < 0) {
    state.calendarMonth = 11;
    state.calendarYear -= 1;
  }
  state.selectedDate = null;
  renderCalendar();
});

nextMonthBtn.addEventListener("click", () => {
  state.calendarMonth += 1;
  if (state.calendarMonth > 11) {
    state.calendarMonth = 0;
    state.calendarYear += 1;
  }
  state.selectedDate = null;
  renderCalendar();
});

modalConfirmBtn.addEventListener("click", confirmCompletion);
completeModal.addEventListener("click", (event) => {
  if (event.target === completeModal) confirmCompletion();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !completeModal.hidden) {
    confirmCompletion();
  }
});

resolveTheme();
setDuration(10);
renderCalendar();
