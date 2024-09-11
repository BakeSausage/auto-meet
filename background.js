(() => {
    "use strict";
	
	const STORAGE_KEY = 'meetSchedules';
	
    // 创建一个每分钟触发的闹钟
    chrome.alarms.create("checkSign", {
        periodInMinutes: 1
    });

    chrome.alarms.onAlarm.addListener(() => {
        //console.log("Start checking sign...");
        // 获取存储的数据
		chrome.storage.sync.get(STORAGE_KEY, (data) => {
			const schedules = data[STORAGE_KEY] || {};
			
            if (!schedules) {
				return;
			}

			for (const url in schedules) {
				const {signStates} = schedules[url];
				
				for (const signState in signStates) {
					const {date, hours, minutes, isopen} = signStates[signState];

					if (!date || !hours || !minutes) {
						console.log("wrong meeting data, return.");
						return;
					}

					const now = new Date();
					const targetDateTime = new Date(`${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);

					// 如果当前时间超过目标时间并且尚未执行过任务
					if (now > targetDateTime && !isopen) {
						console.log("try to join meet: ", {url})
						
						signStates[signState].isopen = true;
						chrome.storage.sync.set({ [STORAGE_KEY]: schedules });

						chrome.tabs.create({ url: `https://meet.google.com/${url}`, active: false }, (tab) => {
							chrome.scripting.executeScript({
								target: { tabId: tab.id },
								files: ['content.js']
							});
						});
						console.log("success open meet.");
					}
				}
			}
        });
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'addSchedule') {
            console.log("add schedule : ", message.url, message.date, message.time);
        } else if (message.type === 'removeSchedule') {
            console.log("delete schedule: ", message.url, message.time.date, `${message.time.hours}:${message.time.minutes}`);
        } else if (message.type === 'urlDeleted') {
            console.log("URL deleted: ", message.url);
        }else if (message.type === 'updateSchedule') {
            console.log("update Schedule");
        }else if (message.type === 'debug') {
			console.log(message.message)
		}
    });
})();
