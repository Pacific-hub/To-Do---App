const inputBox = document.getElementById("input-box");
const listContainer = document.getElementById("list-container");
const reminderInput = document.getElementById("reminder");
const addBtn = document.getElementById("add-btn");
const modal = document.getElementById("modal");
const modalText = document.getElementById("modal-text");
const modalOk = document.getElementById("modal-ok");

const scheduledTimeouts = new Map();
let uidCounter = 0;

const funnyMessages = [
  "Reminder: Do the thing! (You got this 💪 — and maybe coffee ☕)",
  "Ding ding! Time to adult for a bit. Pretend you enjoy it 😅",
  "Heads up! Your task is breathing down your neck... politely.",
  "Time’s up! This is your friendly reminder — plus a joke: Why don’t eggs tell jokes? They’d crack up!",
  "Reminder activated! Now go be the hero of your to-do list 🦸‍♀️"
];

function playAlarm(durationMs = 2500) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.connect(ctx.destination);

    let t = now;
    for (let i = 0; i < 6; i++) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600 + i * 80, t);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.15);
      gain.gain.linearRampToValueAtTime(0.25 / (i + 1), t + 0.01);
      t += 0.25;
    }
   
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  } catch (err) {
 
    console.warn("Audio failed:", err);
  }
}


function showModal(text) {
  modalText.textContent = text;
  modal.classList.remove("hidden");
}
modalOk.addEventListener("click", () => modal.classList.add("hidden"));

function formatLocal(dtString) {
 
  const dt = new Date(dtString);
  if (isNaN(dt)) return "";
  return dt.toLocaleString();
}

function generateUid() {
  uidCounter += 1;
  return "task-" + Date.now() + "-" + uidCounter;
}

function createTaskElement(text, reminderISO = "", uid = null, checked = false) {
  const li = document.createElement("li");
  li.className = "task";
  li.setAttribute("role", "listitem");
  if (!uid) uid = generateUid();
  li.dataset.uid = uid;

  const textDiv = document.createElement("div");
  textDiv.className = "text";
  textDiv.textContent = text;
  li.appendChild(textDiv);

  if (reminderISO) {
    li.dataset.reminder = reminderISO;
    const label = document.createElement("div");
    label.className = "reminder-label";
    label.textContent = formatLocal(reminderISO);
    li.appendChild(label);
  }

  const del = document.createElement("div");
  del.className = "delete";
  del.innerHTML = "✕";
  del.setAttribute("title", "Delete task");
  li.appendChild(del);

  if (checked) li.classList.add("checked");

  return li;
}


function addTask() {
  const text = inputBox.value.trim();
  const reminderVal = reminderInput.value; 
  if (!text) {
    alert("Please write a task before adding — your future self will thank you.");
    inputBox.focus();
    return;
  }

  const li = createTaskElement(text, reminderVal);
  listContainer.prepend(li); 

  if (reminderVal) scheduleReminderForLi(li);

  inputBox.value = "";
  reminderInput.value = "";
  inputBox.focus();
  saveData();
}

addBtn.addEventListener("click", addTask);
inputBox.addEventListener("keydown", e => { if (e.key === "Enter") addTask(); });

listContainer.addEventListener("click", function (e) {
  const target = e.target;

  if (target.classList.contains("delete")) {
    const li = target.closest("li.task");
    if (!li) return;
    const uid = li.dataset.uid;
    if (scheduledTimeouts.has(uid)) {
      clearTimeout(scheduledTimeouts.get(uid));
      scheduledTimeouts.delete(uid);
    }
    li.remove();
    saveData();
    return;
  }

  const li = target.closest("li.task");
  if (li) {
    li.classList.toggle("checked");
    saveData();
  }
});

function saveData() {
  
  Array.from(listContainer.children).forEach((li, idx) => {
    if (!li.dataset.uid) li.dataset.uid = generateUid();
  });
  localStorage.setItem("todoData", listContainer.innerHTML);
}

function showTask() {
  const stored = localStorage.getItem("todoData");
  if (stored) {
    listContainer.innerHTML = stored;
    
    Array.from(listContainer.querySelectorAll("li.task")).forEach(li => {
      
      if (!li.classList.contains("task")) li.classList.add("task");
     
      if (li.dataset.reminder) {
        scheduleReminderForLi(li);
      }
    });
  }
}

function scheduleReminderForLi(li) {
  
  const uid = li.dataset.uid || generateUid();
  li.dataset.uid = uid;
  if (scheduledTimeouts.has(uid)) {
    clearTimeout(scheduledTimeouts.get(uid));
    scheduledTimeouts.delete(uid);
  }

  const remISO = li.dataset.reminder;
  if (!remISO) return;

  const then = new Date(remISO).getTime();
  const now = Date.now();
  const diff = then - now;

  
  if (diff <= 1000) {
    setTimeout(() => triggerReminder(li), 200);
    return;
  }


  const timeoutId = setTimeout(() => {
    scheduledTimeouts.delete(uid);
    triggerReminder(li);
  }, diff);

  scheduledTimeouts.set(uid, timeoutId);
}


function triggerReminder(li) {
  
  if (!document.body.contains(li)) return;

  
  li.classList.add("reminder-active");

  
  playAlarm(2500);

 
  const msg = (funnyMessages[Math.floor(Math.random() * funnyMessages.length)] || "Reminder!");

 
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const n = new Notification("To-Do Reminder", {
        body: msg + " — " + (li.querySelector(".text") ? li.querySelector(".text").textContent : ""),
        silent: true 
      });
      
      setTimeout(() => n.close(), 8000);
    } catch (err) {
     
      showModal(msg + "\n" + (li.querySelector(".text") ? li.querySelector(".text").textContent : ""));
    }
  } else if ("Notification" in window && Notification.permission !== "denied") {
    
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        triggerReminder(li); 
        
        showModal(msg + " — " + (li.querySelector(".text") ? li.querySelector(".text").textContent : ""));
      }
    });
  } else {
   
    showModal(msg + " — " + (li.querySelector(".text") ? li.querySelector(".text").textContent : ""));
  }

  
  li.removeAttribute("data-reminder");

  const rLabel = li.querySelector(".reminder-label");
  if (rLabel) rLabel.remove();

 
  saveData();
}


window.addEventListener("load", () => {
  showTask();

  if ("Notification" in window && Notification.permission === "default") {
   
    Notification.requestPermission().catch(() => {});
  }
});
