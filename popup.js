// 常數和全局變量
const STORAGE_KEY = 'meetSchedules';
let currentUrl = '';

// DOM 載入完成後執行
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    loadUrlLayer();
    setupEventListeners();
}

function setupEventListeners() {
    document.getElementById('urlContainer').addEventListener('input', handleUrlInput);
    document.getElementById('urlContainer').addEventListener('click', handleUrlClick);
    document.getElementById('backButton').addEventListener('click', showUrlLayer);
    document.getElementById('addTime').addEventListener('click', handleAddTime);
}

function handleUrlInput(event) {
    const urlInputs = document.querySelectorAll('.meet-url');
    const lastInput = urlInputs[urlInputs.length - 1];
    if (lastInput.value.trim() !== '') {
        addNewUrlInput();
    }
}

function handleUrlClick(event) {
    if (event.target.classList.contains('editSchedule')) {
        const urlItem = event.target.previousElementSibling.value.trim();
        if (urlItem !== '') {
            showScheduleLayer(urlItem);
        } else {
            alert('請輸入有效的 Google Meet ID。');
        }
    }
}

function showUrlLayer() {
    toggleLayerVisibility('scheduleLayer', 'urlLayer');
    loadUrlLayer();
}

function showScheduleLayer(url) {
    currentUrl = url;
    document.getElementById('currentUrl').textContent = currentUrl;
    loadScheduleForUrl(currentUrl);
    toggleLayerVisibility('urlLayer', 'scheduleLayer');
}

function toggleLayerVisibility(hideId, showId) {
    document.getElementById(hideId).classList.add('hidden');
    document.getElementById(showId).classList.remove('hidden');
}

function handleAddTime() {
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    if (date && time) {
        saveSchedule(currentUrl, date, time);
    } else {
        alert('請選擇日期和時間。');
    }
}

function loadUrlLayer() {
    chrome.storage.sync.get(STORAGE_KEY, (data) => {
        const schedules = data[STORAGE_KEY] || {};
        const urlContainer = document.getElementById('urlContainer');
        urlContainer.innerHTML = '';

        Object.entries(schedules).forEach(([url, schedule]) => {
            if (schedule && schedule.signStates && schedule.signStates.length > 0) {
                appendUrlItem(urlContainer, url);
            }
        });

        addNewUrlInput();
    });
}

function appendUrlItem(container, url) {
    const urlItem = document.createElement('div');
    urlItem.classList.add('url-item');
    urlItem.innerHTML = `
        <input type="text" class="meet-url" value="${url}" readonly>
        <button class="editSchedule">編輯行程</button>
        <button class="deleteUrl">刪除</button>
    `;

    urlItem.querySelector('.editSchedule').addEventListener('click', () => showScheduleLayer(url));
    urlItem.querySelector('.deleteUrl').addEventListener('click', () => deleteUrl(url));

    container.appendChild(urlItem);
}

function addNewUrlInput() {
    const urlContainer = document.getElementById('urlContainer');
    const urlItem = document.createElement('div');
    urlItem.classList.add('url-item');
    urlItem.innerHTML = `
        <input type="text" class="meet-url" placeholder="Enter Google Meet ID">
        <button class="editSchedule">加入行程</button>
    `;
    urlContainer.appendChild(urlItem);
}

function loadScheduleForUrl(url) {
    chrome.storage.sync.get(STORAGE_KEY, (data) => {
        const schedules = data[STORAGE_KEY] || {};
        const schedule = schedules[url] || {};
        const tableBody = document.getElementById('scheduleTable').getElementsByTagName('tbody')[0];
        tableBody.innerHTML = '';

        if (schedule.signStates) {
            schedule.signStates.forEach(item => {
                appendScheduleRow(tableBody, url, item);
            });
        }
    });
}

function appendScheduleRow(tableBody, url, item) {
    const { date, hours, minutes, isopen } = item;
    const row = tableBody.insertRow();
    row.insertCell().textContent = `${date} ${hours}:${minutes.toString().padStart(2, '0')}`;
    
    // 添加 isopen 状态显示
    const statusCell = row.insertCell();
    statusCell.textContent = isopen ? '已完成' : '未完成';
    
    const deleteCell = row.insertCell();
    const deleteButton = document.createElement('button');
    deleteButton.textContent = '刪除';
    deleteButton.classList.add('delete');
    deleteButton.addEventListener('click', () => {
        row.remove();
        removeScheduleItem(url, item);
    });
    deleteCell.appendChild(deleteButton);
}


function saveSchedule(url, date, time) {
    const [hours, minutes] = time.split(':').map(Number);
    const newSignStates = { date, hours, minutes, isopen: false };  // 初始化 isopen 为 false

    chrome.storage.sync.get(STORAGE_KEY, (data) => {
        const schedules = data[STORAGE_KEY] || {};
        const schedule = schedules[url] || { signStates: [] };

        if (!schedule.signStates.some(item => JSON.stringify(item) === JSON.stringify(newSignStates))) {
            schedule.signStates.push(newSignStates);
            schedules[url] = schedule;
            chrome.storage.sync.set({ [STORAGE_KEY]: schedules }, () => {
                chrome.runtime.sendMessage({ type: 'addSchedule', url, date, time });
                loadScheduleForUrl(url);
            });
        }
    });
}


function removeScheduleItem(url, item) {
    const { date, hours, minutes } = item;
    chrome.storage.sync.get(STORAGE_KEY, (data) => {
        const schedules = data[STORAGE_KEY] || {};
        const schedule = schedules[url];

        if (schedule && schedule.signStates) {
            schedule.signStates = schedule.signStates.filter(i => JSON.stringify(i) !== JSON.stringify(item));
            schedules[url] = schedule;

            chrome.storage.sync.set({ [STORAGE_KEY]: schedules }, () => {
                chrome.runtime.sendMessage({ type: 'removeSchedule', url, time: { date, hours, minutes } });
            });
        }
    });
}


function deleteUrl(url) {
    chrome.storage.sync.get(STORAGE_KEY, (data) => {
        const schedules = data[STORAGE_KEY] || {};
        delete schedules[url];

        chrome.storage.sync.set({ [STORAGE_KEY]: schedules }, () => {
            loadUrlLayer();
            chrome.runtime.sendMessage({ type: 'urlDeleted', url: url });
        });
    });
}
