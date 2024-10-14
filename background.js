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

					if (!date) {
						console.log("wrong meeting data, return.");
						console.log({date, hours, minutes, isopen})
						return;
					}

					const now = new Date();
					const targetDateTime = new Date(`${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);

					// 如果当前时间超过目标时间并且尚未执行过任务
					if (now > targetDateTime && !isopen) {
						console.log(`try to open page : ${url}`)
						
						signStates[signState].isopen = true;
						chrome.storage.sync.set({ [STORAGE_KEY]: schedules });

						chrome.tabs.create({ url: `https://meet.google.com/${url}`, active: true }, (tab) => {
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
    
    //背景頁的請求處理
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
		}else if (message.action === 'captureScreenshot') {
          chrome.tabs.captureVisibleTab(null, {format: "png"}, function(dataUrl) {
            if (chrome.runtime.lastError) {
              sendResponse({success: false, error: chrome.runtime.lastError.message});
            } else {
              // 這裡可以添加保存或處理截圖的邏輯
              console.log("Screenshot taken:", dataUrl.substring(0, 50) + "...");
              sendResponse({ success: true, dataUrl: dataUrl });
            }
          });
          return true;  // 表示將異步發送回應
        }
    });
})();
