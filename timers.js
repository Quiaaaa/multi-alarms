//const fs = require('fs');
//const path = require('path');

const alarmGroups = [];

function formatTime(ms) {
	if (ms < 0) return "00:00:00";
	const totalSeconds = Math.floor(ms / 1000);
	const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
	const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
	const seconds = String(totalSeconds % 60).padStart(2, "0");
	return `${hours}:${minutes}:${seconds}`;
}

function renderGroups() {
	const groupsDiv = document.getElementById("groups");
	groupsDiv.innerHTML = "";
	alarmGroups.forEach((group, groupIdx) => {
		const groupDiv = document.createElement("div");
		groupDiv.className = "group";

		// Group Name and remove button
		const groupHeader = document.createElement("div");
		groupHeader.classList.add("internalBorder", "groupHeader");
		const groupLabelInput = makeElem_input({
			name: "Group",
			value: group.label,
			oninput: (e) => {
				group.label = e.target.value;
				saveGroups();
			}
		});
		groupHeader.appendChild(groupLabelInput);

		const removeGroupBtn = makeElem_closeBtn("Remove Group")
		removeGroupBtn.onclick = () => {
			alarmGroups.splice(groupIdx, 1);
			renderGroups();
		};
		groupHeader.appendChild(removeGroupBtn);
		groupDiv.appendChild(groupHeader);

		// Controls for alarms in group
		const controlsDiv = document.createElement("div");
		controlsDiv.className = "controls";

		// append controls to the div
		makeElem_controls(group, controlsDiv);

		// Add Alarm button for group
		const addAlarmBtn = document.createElement("button");
		addAlarmBtn.textContent = "Add New Alarm";
		addAlarmBtn.onclick = () => {
			group.alarms.push({ control: {}, set: null });
			renderGroups();
		};
		controlsDiv.appendChild(addAlarmBtn);

		// Reset All Alarms in Group button
		const resetAllBtn = document.createElement("button");
		resetAllBtn.textContent = "Set All Alarms in Group";
		resetAllBtn.onclick = () => {
			resetAllAlarmsInGroup(group);
		};
		
		controlsDiv.appendChild(resetAllBtn);
		groupDiv.appendChild(controlsDiv);

		groupDiv.appendChild(makeElem_timers(group, groupIdx));
		groupsDiv.appendChild(groupDiv);
	});
	saveGroups();
	updateLogDisplay();
}

function resetAllAlarmsInGroup(group) {
	group.alarms.forEach((alarm, alarmIdx) => {
		const control = alarm.control;
		const now = Date.now();
		const timers = [];
		for (let i = 1; i <= (control.numAlarms || 0); i++) {
			const offsetMs = (control.intervalHours || 0) * 3600 * 1000 * i;
			timers.push({
				label: `@ ${new Date(now + offsetMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
				targetTime: now + offsetMs,
				notified: false
			});
		}
		alarm.set = {
			label: control.setLabel || `Timer Set ${alarmIdx + 1}`,
			timers,
		};
	});
	// group-level log entry 
	appendAlarmLog(group.label || "Unnamed Group");
	renderGroups();
}

function makeElem_controls(group, controlsDiv) {
	group.alarms.forEach((alarm, alarmIdx) => {
		const control = alarm.control;
		const set = alarm.set;
		const controlDiv = document.createElement("div");
		controlDiv.className = "control";

		const setLabelInput = makeElem_input({
			name: "Alarm Name",
			location: "setLabel",
			control: control,
		});
		controlDiv.appendChild(setLabelInput);

		const intervalInput = makeElem_input({
			type: "number",
			name: "Interval (hours)",
			location: "intervalHours",
			control: control,
		});
		controlDiv.appendChild(intervalInput);

		const numAlarmsInput = makeElem_input({
			type: "number",
			name: "Repeats",
			location: "numAlarms",
			control: control,
		});
		controlDiv.appendChild(numAlarmsInput);

		const alarmsExist = set && set.timers && set.timers.length > 0;
		const alarmsBtn = document.createElement("button");
		alarmsBtn.className = "alarmsBtn";
		alarmsBtn.textContent = alarmsExist ? "Reset Alarm" : "Set Alarm";
		alarmsBtn.onclick = () => {
			alarmsBtn.textContent = "Reset Alarm";
			const now = Date.now();
			const timers = [];
			for (let i = 1; i <= (control.numAlarms || 0); i++) {
				const offsetMs = (control.intervalHours || 0) * 3600 * 1000 * i;
				timers.push({
					label: `@ ${new Date(now + offsetMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
					targetTime: now + offsetMs,
					notified: false
				});
			}
			const setLabel = control.setLabel || `Timer Set ${alarmIdx + 1}`;
			alarm.set = {
				label: setLabel,
				timers,
			};
			// Log this alarm set (per-alarm)
			appendAlarmLog(setLabel);
			renderGroups();
		};
		controlDiv.appendChild(alarmsBtn);

		const closeBtn = makeElem_closeBtn("Remove Alarm");
		closeBtn.onclick = () => {
			group.alarms.splice(alarmIdx, 1);
			renderGroups();
		};
		controlDiv.appendChild(closeBtn);

		controlsDiv.appendChild(controlDiv);
	});
	return controlsDiv;
}

function makeElem_input({control = "", type = "text", name = "", value = "", location = "", oninput = ""}) {
	const label = document.createElement("label");
	label.textContent = name;
	const input = document.createElement("input");
	input.type = type;
	if (location && control) {
		input.oninput =  (e) => {
			if (type == "number") control[location] = Number(e.target.value);
			else control[location] = e.target.value;
			saveGroups();
		}
		input.value = control[location] ?? "";
	}
	else {
		input.value = value ?? "";
	}
	if (oninput) input.oninput = oninput;
	label.appendChild(input);
	return label;
}

function makeElem_timers(group, groupIdx) {
	const timerSetsDiv = document.createElement("div");
	timerSetsDiv.className = "timerSets";
	group.alarms.forEach((alarm, alarmIdx) => {
		const set = alarm.set;
		if (!set) return;
		const setDiv = document.createElement("div");
		setDiv.classList.add("internalBorder", "timer-set");
		
		// timers label
		const nameDiv = document.createElement("div")
		nameDiv.className = "timerHeader";
		const label = document.createElement("div");
		label.textContent = set.label;
		nameDiv.appendChild(label);

		// Remove set button
		const removeSetBtn = makeElem_closeBtn("Remove Timers");
		removeSetBtn.onclick = () => {
			alarm.set = null;
			renderGroups();
		};
		nameDiv.appendChild(removeSetBtn);
		setDiv.appendChild(nameDiv);

		set.timers.forEach((timer, timerIdx) => {
			const timerDiv = document.createElement("div");
			timerDiv.className = "timer";
			timerDiv.innerHTML = `<strong>${timer.label}</strong>: <span id="timer-${groupIdx}-${alarmIdx}-${timerIdx}">${formatTime(timer.targetTime - Date.now())}</span>`;
			setDiv.appendChild(timerDiv);
		});

		timerSetsDiv.appendChild(setDiv);
	});
	return timerSetsDiv;
}

function makeElem_closeBtn(title = "") {
	const closeBtn = document.createElement("button");
	closeBtn.textContent = "✕";
	closeBtn.className = "closeBtn"
	if (title) closeBtn.title = title;
	return closeBtn
}

function notifyTimer(label) {
	if ("Notification" in window && Notification.permission === "granted") {
		new Notification("Timer", {
			body: `${label} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
			requireInteraction: true,
		});
	}
}

function updateAndNotifyTimers() {
	alarmGroups.forEach((group, groupIdx) => {
		group.alarms.forEach((alarm, alarmIdx) => {
			const set = alarm.set;
			if (!set) return;
			set.timers.forEach((timer, timerIdx) => {
				const span = document.getElementById(`timer-${groupIdx}-${alarmIdx}-${timerIdx}`);
				if (span) {
					span.textContent = formatTime(timer.targetTime - Date.now());
				}
				if (!timer.notified && Date.now() >= timer.targetTime) {
					notifyTimer(set.label);
					timer.notified = true;
					saveGroups();
				}
			});
		});
	});
}

// ---------- Alarm log in localStorage (tab-separated) ----------
const ALARM_LOG_KEY = "alarmLog";

function getAlarmLog() {
	return localStorage.getItem(ALARM_LOG_KEY) || "";
}

function setAlarmLog(text) {
	localStorage.setItem(ALARM_LOG_KEY, text);
	updateLogDisplay();
}

function appendAlarmLog(name) {
	const time = new Date().toISOString();
	const entry = `${time}\t${name}\n`;
	const current = getAlarmLog();
	setAlarmLog(current + entry);
}

// UI for log area: create once and update
function renderLogArea() {
	if (document.getElementById("alarmLogContainer")) return;

	const container = document.createElement("div");
	container.id = "alarmLogContainer";
	container.className = "container"

	const title = document.createElement("div");
	title.textContent = "Alarm Log";
	container.appendChild(title);

	const textarea = document.createElement("textarea");
	textarea.id = "alarmLog";
	textarea.rows = 8;
	textarea.readOnly = true;
	container.appendChild(textarea);

	const btnBar = document.createElement("div");
	btnBar.className = "alarmLogButtonBar";

	const copyBtn = document.createElement("button");
	copyBtn.textContent = "Copy to Clipboard";
	copyBtn.onclick = async () => {
		try {
			await navigator.clipboard.writeText(getAlarmLog());
		} catch (err) {
			// ignore
		}
	};
	btnBar.appendChild(copyBtn);

	const saveBtn = document.createElement("button");
	saveBtn.textContent = "Save Log to File";
	saveBtn.onclick = () => {
		const blob = new Blob([getAlarmLog()], { type: "text/plain;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "alarm_log.txt";
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	};
	btnBar.appendChild(saveBtn);

	const clearBtn = document.createElement("button");
	clearBtn.textContent = "Clear Log";
	clearBtn.onclick = () => {
		setAlarmLog("");
	};
	btnBar.appendChild(clearBtn);

	container.appendChild(btnBar);

	document.body.appendChild(container);
	updateLogDisplay();
}

function updateLogDisplay() {
	const textarea = document.getElementById("alarmLog");
	if (textarea) textarea.value = getAlarmLog();
}

function saveGroups() {
	localStorage.setItem("alarmGroups", JSON.stringify(alarmGroups));
}

function loadGroups() {
	const savedGroups = localStorage.getItem("alarmGroups");
	if (savedGroups) {
		const parsedGroups = JSON.parse(savedGroups);
		alarmGroups.length = 0;
		parsedGroups.forEach(group => {
			group.alarms.forEach(alarm => {
				if (alarm.set && alarm.set.timers) {
					alarm.set.timers = alarm.set.timers.map(timer => ({
						...timer,
						notified: timer.notified || false
					}));
				}
			});
			alarmGroups.push(group);
		});
	}
}

// Load localstorage
loadGroups();

// Add group button
document.getElementById("addGroupBtn").addEventListener("click", () => {
	alarmGroups.push({ label: "", alarms: [] });
	renderGroups();
});

// Request notification permission on page load
if ("Notification" in window) {
	Notification.requestPermission();
}

// Initial render
renderGroups();
renderLogArea();

// Update timers every second
setInterval(updateAndNotifyTimers, 1000);