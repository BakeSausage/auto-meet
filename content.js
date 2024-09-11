console.log("enter meet");

window.onload = function() {

    const interval1 = setInterval(() => {
        const micButton = document.querySelector('[aria-label="關閉麥克風"]');
        if (micButton) {
            console.log("find mic button");
            micButton.click();
        } else {
            console.log("cant find mic button");
        }

        const videoButton = document.querySelector('[aria-label="關閉攝影機"]');
        if (videoButton) {
            console.log("find video button");
            videoButton.click();
        } else {
            console.log("cant find video button");
        }
		
		if (micButton && videoButton) {
			clearInterval(interval1);
		}
    }, 1000);  // 每秒檢查一次

    const interval2 = setInterval(() => {
        const joinButton = Array.from(document.querySelectorAll('button')).find(btn => 
            btn.innerText.includes('立即加入') || btn.innerText.includes('切換到這裡')
        );
        if (joinButton) {
            console.log("find join button");
            clearInterval(interval2);  // 停止檢查

            // 延遲5秒後點擊
            setTimeout(() => {
                console.log("clicking join button after 5 seconds");
                joinButton.click();
            }, 5000);
        } else {
            console.log("cant find join button");
        }
    }, 1000);  // 每秒檢查一次
};
