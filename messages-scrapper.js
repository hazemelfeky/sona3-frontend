function scrapePerfectChatWithAutoDates() {
    let articles = document.querySelectorAll('[role="article"]');
    let extractedData = [];

    // دالة أمنة وفلترة للإيموجي والرموز
    function isEmojiOrSymbol(str) {
        if (!str) return true;
        let cleanStr = str.trim();
        let emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu;
        return cleanStr.replace(emojiRegex, '').trim().length === 0;
    }

    // دالة تحويل أسامي الأيام لتواريخ كاملة
    function normalizeTimeFormat(rawTime) {
        if (!rawTime) return "";

        let daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        let matchedDay = daysOfWeek.find(d => rawTime.toLowerCase().startsWith(d.toLowerCase()));
        
        if (matchedDay || rawTime.toLowerCase().startsWith("yesterday") || rawTime.toLowerCase().startsWith("today")) {
            let today = new Date();
            let targetDate = new Date();

            if (matchedDay) {
                let targetDayIndex = daysOfWeek.indexOf(matchedDay);
                let currentDayIndex = today.getDay();
                let diff = currentDayIndex - targetDayIndex;
                if (diff <= 0) diff += 7; // إرجاع التاريخ لآخر يوم مذكور في الأسبوع
                targetDate.setDate(today.getDate() - diff);
            } else if (rawTime.toLowerCase().startsWith("yesterday")) {
                targetDate.setDate(today.getDate() - 1);
            }

            // استخراج الوقت (مثلاً: 3:02pm أو 12:12 AM)
            let timePartMatch = rawTime.match(/\d{1,2}:\d{2}\s?(?:AM|PM|am|pm)?/i);
            let timePart = timePartMatch ? timePartMatch[0] : "";

            let monthName = months[targetDate.getMonth()];
            let dayNum = targetDate.getDate();
            let yearNum = targetDate.getFullYear();

            return `${monthName} ${dayNum}, ${yearNum}${timePart ? ', ' + timePart : ''}`;
        }

        return rawTime; // لو كان تاريخ كامل بالفعل يرجعه كما هو
    }

    articles.forEach(article => {
        let messageButton = article.querySelector('[aria-label^="Enter, Message sent"]');
        
        if (messageButton) {
            let fullLabel = messageButton.getAttribute('aria-label');
            let match = fullLabel.match(/Message sent (.*?)(?: by (.*?))?: (.*)/s);
            
            if (match) {
                let rawTimeStr = match[1] ? match[1].trim() : "";
                let fallbackName = match[2] ? match[2].trim() : "غير معروف";
                let messageText = match[3] ? match[3].trim() : "";

                let timeStr = normalizeTimeFormat(rawTimeStr);
                let senderName = fallbackName;
                let profileImgs = article.querySelectorAll('img[alt]');

                profileImgs.forEach(img => {
                    let alt = img.getAttribute('alt').trim();
                    if (alt && 
                        !alt.startsWith("Seen by") && 
                        !alt.includes("Open photo") && 
                        !alt.includes("Original image") && 
                        !alt.includes("Original photo") &&
                        !isEmojiOrSymbol(alt) && 
                        alt.length > 2) {
                        senderName = alt;
                    }
                });

                extractedData.push({
                    time: timeStr,
                    name: senderName,
                    message: messageText.replace(/\n/g, " ")
                });
            }
        }
    });

    console.log(`✅ تم سحب ${extractedData.length} رسالة وتحويل الأيام لتواريخ كاملة بنجاح!`);
    return extractedData;
}

// تشغيل وتنسيق النتيجة
let finalData = scrapePerfectChatWithAutoDates();

if (finalData.length > 0) {
    let output = finalData.map(r => `[${r.time}] | [${r.name}] : ${r.message}`).join('\n---\n');
    copy(output);
    console.log("📋 تم نسخ البيانات المعدلة بالتواريخ والأسماء إلى الحافظة!");
    console.log(output);
}