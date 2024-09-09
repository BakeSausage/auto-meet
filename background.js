chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'updateSchedule') {
        console.log('Received updateSchedule message');
        checkAndSetAlarms(); // 重新检查并设置闹钟
    }
});

chrome.alarms.onAlarm.addListener((alarm) => {
    console.log('Alarm triggered:', alarm.name);
    if (alarm.name === 'checkMeetings') {
        console.log('Checking meetings and setting alarms...'); // 添加这一行
        checkAndSetAlarms(); // 定期检查并设置闹钟
    } else if (alarm.name.startsWith('meetAlarm-')) {
        const [_, url] = alarm.name.split('meetAlarm-'); // 提取网址
        chrome.tabs.create({ url: `https://meet.google.com/${url}`, active: false }, (tab) => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
        });
    }
});

function checkAndSetAlarms() {
    const bufferTime = 60 * 1000; // 一分钟的缓冲时间

    chrome.storage.sync.get(null, (data) => {
        // 不再清除所有闹钟

        // 获取当前已存在的闹钟列表
        chrome.alarms.getAll((alarms) => {
            const existingAlarms = alarms.map(alarm => alarm.name);

            Object.keys(data).forEach(url => {
                const schedule = data[url];
                schedule.forEach(item => {
                    const [date, time] = item.split(' ');
                    const now = new Date();
                    const targetDate = new Date(`${date}T${time}`);

                    if (targetDate.getTime() + bufferTime <= now.getTime()) {
                        console.log(`Skipping alarm for ${url} - ${item}, as the target time has passed.`);
                        return;
                    }

                    const alarmName = `meetAlarm-${url}-${date}-${time}`;

                    // 如果闹钟已存在，跳过设置
                    if (existingAlarms.includes(alarmName)) {
                        console.log(`Alarm ${alarmName} already exists.`);
                        return;
                    }

                    console.log(`Setting alarm for ${url} - ${item} at ${targetDate.toString()}`);

                    // 设置闹钟，闹钟名称包括 "meetAlarm-"、URL、日期和时间
                    chrome.alarms.create(alarmName, { when: targetDate.getTime() });
                });
            });
        });
    });

    // 定期清理过期的闹钟
    cleanUpExpiredAlarms();
}

function cleanUpExpiredAlarms() {
    const bufferTime = 60 * 1000; // 一分钟的缓冲时间
    chrome.alarms.getAll((alarms) => {
        const now = Date.now();
        alarms.forEach((alarm) => {
            if (alarm.name.startsWith('meetAlarm-') && alarm.scheduledTime + bufferTime <= now) {
                chrome.alarms.clear(alarm.name);
                console.log(`Cleared expired alarm: ${alarm.name}`);
            }
        });
    });
}

// 初始化时设置定期检查闹钟
chrome.alarms.create('checkMeetings', { periodInMinutes: 1 });
