const delayTime = ms => new Promise(resolve => setTimeout(resolve, ms));

// 改進的 delay 函數，包含超時檢查
const delay = (ms, options = {}) => {
  const {
    checkInterval = 200,
    checkCompletion = () => false,
    onTimeout = () => {},
    onSuccess = () => {},
    timeoutMessage = `Operation timed out after ${ms}ms`
  } = options;

  return new Promise((resolve, reject) => {
    let timeoutId;
    let intervalId;

    const cleanup = () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };

    timeoutId = setTimeout(() => {
      cleanup();
      onTimeout();
      reject(new Error(timeoutMessage));
    }, ms);

    intervalId = setInterval(() => {
      if (checkCompletion()) {
        cleanup();
        onSuccess();
        resolve();
      }
    }, checkInterval);

    // 返回一個取消函數
    return () => {
      cleanup();
      reject(new Error('Operation cancelled'));
    };
  });
};

// 等待元素出現的輔助函數
const waitForElement = (selector, text = '', timeout = 5000, numberOfElement = 0) => {
  return new Promise((resolve, reject) => {
    const checkCompletion = () => {
      const element = findElement(selector, text, numberOfElement);
      if (element) {
        resolve(element); // 如果找到元素，返回该元素
        return true;
      }
      return false;
    };

    delay(timeout, {
      checkInterval: 200,
      checkCompletion,
      onTimeout: () => {},
      onSuccess: () => {},
      timeoutMessage: `Timeout waiting for element: ${selector} ${text}`
    }).catch(reject);
  });
};

// 尋找元素的輔助函數
const findElement = (selector, text = '', numberOfElement = 0) => {
  const elements = document.querySelectorAll(selector);
  //console.log(`查找元素: ${selector}, 共找到 ${elements.length} 個`); // 注释掉日志
  if (text) {
    const element = Array.from(elements).find(el => el.innerText.includes(text));
    //console.log(`查找包含文本 "${text}" 的元素: `, element); // 注释掉日志
    return element;
  }
  //console.log(`找到的元素: `, elements[numberOfElement]); // 注释掉日志
  return elements[numberOfElement];
};

// 改進的 clickElement 函數
const clickElement = async (selector, text = '', maxAttempts = 3, interval = 5000, numberOfElement = 0) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const element = await waitForElement(selector, text, interval, numberOfElement); // 接收到找到的元素
      if (!element) {
        //console.log(`沒有找到元素: ${selector} ${text}`); // 注释掉日志
        continue;
      }
      //console.log(`找到的元素: `, element); // 注释掉日志
      await delayTime(1000);
      element.click(); // 点击找到的元素
      //console.log(`Clicked element: ${selector} ${text}`); // 注释掉日志
      return true;
    } catch (error) {
      //console.log(`Attempt ${i + 1} failed: ${error.message}`); // 注释掉日志
    }
  }
  throw new Error(`Failed to click element after ${maxAttempts} attempts: ${selector} ${text}`);
};

// 截圖函數
const captureScreenshot = () => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'captureScreenshot' }, (response) => {
      console.log(response) // 注释掉日志
      console.log(response.success) // 注释掉日志
      console.log(response.dataUrl) // 注释掉日志
      if (response && response.success) {
        resolve(response.dataUrl); // 成功返回截圖的數據URL
      } else {
        reject(new Error(response ? response.error : 'Unknown error occurred'));
      }
    });
  });
};

const downloadScreenshot = async () => {
  try {
    const screenshotDataUrl = await captureScreenshot(); // 等待截圖完成，獲得圖片的 dataUrl

    // 創建一個下載鏈接
    const downloadLink = document.createElement('a');
    downloadLink.href = screenshotDataUrl;
    downloadLink.download = 'screenshot.png'; // 設置下載的文件名

    // 將鏈接添加到頁面中，然後自動觸發點擊
    document.body.appendChild(downloadLink);
    downloadLink.click();

    // 下載完成後，移除鏈接
    document.body.removeChild(downloadLink);

    // console.log('Screenshot downloaded successfully'); // 注释掉日志
  } catch (error) {
    // console.log('Failed to capture or download screenshot:', error.message); // 注释掉日志
  }
};

// 調整版面
async function adjustGoogleMeetLayout() {
  try {
    try {
      await clickElement('button[aria-label="取消固定"]');
    } catch (error) {
      // console.log('沒有找到取消固定按鈕') // 注释掉日志
    }
    
    try {
      await clickElement('div[data-is-menu-dynamic="true"] button[data-tooltip-y-position="2"]');
    } catch (error) {
      // console.log('沒有找到更多選項按鈕') // 注释掉日志
    }
    
    try {
      await clickElement('[role="menuitem"]', "變更版面配置");
    } catch (error) {
      // console.log('沒有找到變更版面配置按鈕') // 注释掉日志
    }
    
    try {
      await clickElement('input[name="preferences"]', '', 3, 5000, 1);
    } catch (error) {
      // console.log('沒有找到視訊方格按鈕') // 注释掉日志
    }
    
    try {
      const slider = await waitForElement('input[type="range"]', '', 10000);
      if (slider) {
        //console.log("slider found") // 注释掉日志
        slider.value = 5;
        slider.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } catch (error) {
      console.log('沒有找到拉條') // 注释掉日志
    }

    try {
      const labelElement = await waitForElement('label', '隱藏沒開啟視訊的方格', 10000);//有問題
      const divElement = labelElement.parentElement.querySelector('div');
      const buttonElement = divElement.querySelector('button');
      if (buttonElement.getAttribute('aria-checked') === 'true') {
        buttonElement.click();
      }
      console.log('aria-checked 屬性已改為 false'); // 注释掉日志

    } catch (error) {
      console.log('沒有找到隱藏視訊方格選像') // 注释掉日志
    }
    
    try {
      await clickElement('button[aria-label="Close"]');
    } catch (error) {
      console.log('沒有找到關閉版面配置按鈕') // 注释掉日志
    }
    
    try {
      await clickElement('button[aria-label="關閉"]');
    } catch (error) {
      console.log('沒有找到需要關閉的介面') // 注释掉日志
    }
    
    console.log('Google Meet layout adjusted successfully'); // 注释掉日志
    
    try {
      downloadScreenshot();
    } catch (error) {
      console.log('截圖時發生錯誤:', error); // 注释掉日志
    }
  } catch (error) {
    console.log('調整版面配置時發生錯誤:', error); // 注释掉日志
  }
}

function checkWeekendAndAdjust() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 是星期日，6 是星期六

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    //console.log("adjustGoogleMeetLayout") // 注释掉日志
    adjustGoogleMeetLayout();
  } else {
    console.log('Today is not a weekend. Skipping layout adjustment.'); // 注释掉日志
  }
}

async function joinMeetingAndAdjust() {
  try {
    // 等待並點擊麥克風和攝影機按鈕
    await Promise.all([
      clickElement('[aria-label="關閉麥克風"]'),
      clickElement('[aria-label="關閉攝影機"]')
    ]);
    //console.log('Microphone and camera disabled'); // 注释掉日志
  } catch (error) {
    console.log('關閉麥克風與攝影機時發生錯誤:', error); // 注释掉日志
    return;
  }

  try {
    // 等待並點擊加入按鈕
    await Promise.any([
      clickElement('button', '立即加入'),
      clickElement('button', '切換到這裡')
    ]);
    //console.log('Join button clicked');
  } catch (error) {
    console.log('加入會議時發生錯誤:', error);
    return;
  }

  try {
    // 等待並點擊OK按鈕
    await clickElement('button[data-mdc-dialog-action="ok"]');
    //console.log('OK button clicked');

  } catch (error) {
    console.log('點擊OK時發生錯誤:', error);
  }

  try {
    // 檢查是否為週末並調整版面
    checkWeekendAndAdjust();
  } catch (error) {
    console.log('調整版面時發生錯誤:', error);
    return;
  }
}

window.onload = joinMeetingAndAdjust;
