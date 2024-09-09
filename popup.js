document.addEventListener('DOMContentLoaded', () => {
    let currentUrl = '';

    // 加載 URL 層
    loadUrlLayer();

    document.getElementById('urlContainer').addEventListener('input', (event) => {
        const urlInputs = document.querySelectorAll('.meet-url');
        const lastInput = urlInputs[urlInputs.length - 1];

        if (lastInput.value.trim() !== '') {
            addNewUrlInput();
        }
    });

    document.getElementById('urlContainer').addEventListener('click', (event) => {
        if (event.target.classList.contains('editSchedule')) {
            const urlItem = event.target.previousElementSibling.value.trim();
            if (urlItem !== '') {
                currentUrl = urlItem;
                document.getElementById('currentUrl').textContent = currentUrl;
                loadScheduleForUrl(currentUrl);

                document.getElementById('urlLayer').classList.add('hidden');
                document.getElementById('scheduleLayer').classList.remove('hidden');
            } else {
                alert('請輸入有效的 Google Meet ID。');
            }
        }
    });

    document.getElementById('backButton').addEventListener('click', () => {
        document.getElementById('scheduleLayer').classList.add('hidden');
        document.getElementById('urlLayer').classList.remove('hidden');
        loadUrlLayer(); // 重新加載 URL 層
    });

    document.getElementById('addTime').addEventListener('click', () => {
        const date = document.getElementById('date').value;
        const time = document.getElementById('time').value;

        if (date && time) {
            const scheduleItem = `${date} ${time}`;
            addScheduleItem(scheduleItem);
            saveSchedule(currentUrl, scheduleItem);
        } else {
            alert('請選擇日期和時間。');
        }
    });
});

function loadUrlLayer() {
    chrome.storage.sync.get(null, (data) => {
        const urlContainer = document.getElementById('urlContainer');
        urlContainer.innerHTML = '';

        for (const [url, schedule] of Object.entries(data)) {
            if (Array.isArray(schedule) && schedule.length > 0) {
                const urlItem = document.createElement('div');
                urlItem.classList.add('url-item');

                urlItem.innerHTML = `
                    <input type="text" class="meet-url" value="${url}" readonly>
                    <button class="editSchedule">編輯行程</button>
                    <button class="deleteUrl">刪除</button>
                `;

                urlItem.querySelector('.editSchedule').addEventListener('click', () => {
                    currentUrl = url;
                    document.getElementById('currentUrl').textContent = currentUrl;
                    loadScheduleForUrl(currentUrl);

                    document.getElementById('urlLayer').classList.add('hidden');
                    document.getElementById('scheduleLayer').classList.remove('hidden');
                });

                urlItem.querySelector('.deleteUrl').addEventListener('click', () => {
                    deleteUrl(url);
                });

                urlContainer.appendChild(urlItem);
            }
        }

        addNewUrlInput(); // 保證最後一個輸入框在底部
    });
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
    chrome.storage.sync.get([url], (data) => {
        const schedule = data[url] || [];
        const tableBody = document.getElementById('scheduleTable').getElementsByTagName('tbody')[0];
        tableBody.innerHTML = ''; // 清除現有的表格行

        schedule.forEach(item => {
            const [date, time] = item.split(' ');
            const row = tableBody.insertRow();
            row.insertCell().textContent = `${date} ${time}`;
            const deleteCell = row.insertCell();
            deleteCell.innerHTML = '<button class="delete">刪除</button>';

            deleteCell.querySelector('.delete').addEventListener('click', () => {
                row.remove();
                removeScheduleItem(url, item);
            });
        });
    });
}

function addScheduleItem(item) {
    const tableBody = document.getElementById('scheduleTable').getElementsByTagName('tbody')[0];
    const [date, time] = item.split(' ');
    const row = tableBody.insertRow();
    row.insertCell().textContent = `${date} ${time}`;
    const deleteCell = row.insertCell();
    deleteCell.innerHTML = '<button class="delete">刪除</button>';

    deleteCell.querySelector('.delete').addEventListener('click', () => {
        row.remove();
        removeScheduleItem(currentUrl, item);
    });
}

function saveSchedule(url, item) {
    chrome.storage.sync.get([url], (data) => {
        const schedule = data[url] || [];
        schedule.push(item);
        chrome.storage.sync.set({ [url]: schedule }, () => {
            // 通知 background.js 立即更新鬧鐘
            chrome.runtime.sendMessage({ type: 'updateSchedule' });
        });
    });
}

function removeScheduleItem(url, item) {
    chrome.storage.sync.get([url], (data) => {
        let schedule = data[url] || [];
        schedule = schedule.filter(i => i !== item);
        chrome.storage.sync.set({ [url]: schedule }, () => {
            // 通知 background.js 立即更新鬧鐘
            chrome.runtime.sendMessage({ type: 'updateSchedule' });
        });
    });
}

function deleteUrl(url) {
    chrome.storage.sync.remove([url], () => {
        // 重新加載 URL 層以顯示更新後的內容
        loadUrlLayer();
        // 通知 background.js 刪除了 URL
        chrome.runtime.sendMessage({ type: 'urlDeleted', url: url });
    });
}
