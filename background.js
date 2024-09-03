chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'updateSchedule') {
        console.log('Received updateSchedule message');
        setAlarms(); // 重新設置鬧鐘
    }
});

chrome.alarms.onAlarm.addListener((alarm) => {
    console.log('Alarm triggered:', alarm.name);
    if (alarm.name.startsWith('meetAlarm-')) {
        const url = alarm.name.split('meetAlarm-')[1]; // 提取網址
        chrome.tabs.create({ url: `https://meet.google.com/${url}` }, (tab) => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
        });
    }
});

function setAlarms() {
    chrome.storage.sync.get(null, (data) => { // 獲取所有儲存的數據
        chrome.alarms.clearAll(); // 清除之前的鬧鐘

        Object.keys(data).forEach(url => { // 遍歷每個網址
            const schedule = data[url];
            schedule.forEach(item => {
                const [day, time] = item.split(' ');
                const now = new Date();
                const targetDate = new Date();

                targetDate.setHours(parseInt(time.split(':')[0]), parseInt(time.split(':')[1]), 0);
                targetDate.setDate(now.getDate() + (dayOfWeek(day) - now.getDay() + 7) % 7);

                if (targetDate.getTime() <= now.getTime()) {
                    console.log(`Skipping alarm for ${url} - ${item}, as the target time has passed.`);
                    return;
                }

                console.log(`Setting alarm for ${url} - ${item} at ${targetDate.toString()}`);

                // 設置鬧鐘，鬧鐘名稱包括 "meetAlarm-" 和 URL
                chrome.alarms.create(`meetAlarm-${url}`, { when: targetDate.getTime() });
            });
        });
    });
}

function dayOfWeek(day) {
    const days = {
        'Sunday': 0,
        'Monday': 1,
        'Tuesday': 2,
        'Wednesday': 3,
        'Thursday': 4,
        'Friday': 5,
        'Saturday': 6
    };
    return days[day];
}

setAlarms(); // 初始化時設置鬧鐘
