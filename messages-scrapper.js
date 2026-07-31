(function(){
function scrapeChatRawData() {
    let articles = document.querySelectorAll('[role="article"]');
    let extractedData = [];

    // ================== فلترة الإيموجي (لتنضيف اسم البروفايل بس) ==================
    function isEmojiOrSymbol(str) {
        if (!str) return true;
        let cleanStr = str.trim();
        let emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu;
        return cleanStr.replace(emojiRegex, '').trim().length === 0;
    }

    // ================== تطبيع التاريخ/الوقت ==================
    function normalizeTimeFormat(rawTime) {
        if (!rawTime) return "";

        let daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        let matchedDay = daysOfWeek.find(d => rawTime.toLowerCase().startsWith(d.toLowerCase()));
        let isBareTime = /^\d{1,2}:\d{2}\s?(?:AM|PM|am|pm)/i.test(rawTime.trim());

        if (matchedDay || rawTime.toLowerCase().startsWith("yesterday") || rawTime.toLowerCase().startsWith("today") || isBareTime) {
            let today = new Date();
            let targetDate = new Date();

            if (matchedDay) {
                let targetDayIndex = daysOfWeek.indexOf(matchedDay);
                let currentDayIndex = today.getDay();
                let diff = currentDayIndex - targetDayIndex;
                if (diff <= 0) diff += 7;
                targetDate.setDate(today.getDate() - diff);
            } else if (rawTime.toLowerCase().startsWith("yesterday")) {
                targetDate.setDate(today.getDate() - 1);
            }
            // isBareTime أو "today" => يفضل تاريخ النهاردة زي ما هو

            let timePartMatch = rawTime.match(/\d{1,2}:\d{2}\s?(?:AM|PM|am|pm)?/i);
            let timePart = timePartMatch ? timePartMatch[0] : "";

            let monthName = months[targetDate.getMonth()];
            let dayNum = targetDate.getDate();
            let yearNum = targetDate.getFullYear();

            return `${monthName} ${dayNum}, ${yearNum}${timePart ? ', ' + timePart : ''}`;
        }

        return rawTime; // لو كان تاريخ كامل بالفعل يرجعه زي ما هو
    }

    // تحويل التاريخ المطبّع لصيغة YYYY-MM-DD HH:MM (24 ساعة) + نرجّع كائن Date كمان للمقارنة
    function toISODateTime(normalizedTime) {
        if (!normalizedTime) return { text: "", dateObj: null };
        let d = new Date(normalizedTime);
        if (isNaN(d.getTime())) return { text: "", dateObj: null };
        let y = d.getFullYear();
        let mo = String(d.getMonth() + 1).padStart(2, "0");
        let day = String(d.getDate()).padStart(2, "0");
        let hh = String(d.getHours()).padStart(2, "0");
        let mm = String(d.getMinutes()).padStart(2, "0");
        return { text: `${y}-${mo}-${day} ${hh}:${mm}`, dateObj: d };
    }

    // آخر اسم كامل اتعرف من صورة البروفايل - مش محتاجينه دلوقتي، هنحل المشكلة
    // بمعالجة لاحقة (post-processing) بعد ما نجمع كل الرسائل

    // ================== السحب الفعلي - مفيش أي تصنيف هنا ==================
    articles.forEach(article => {
        let messageButton = article.querySelector('[aria-label^="Enter, Message sent"]');

        if (messageButton) {
            let fullLabel = messageButton.getAttribute('aria-label');
            let match = fullLabel.match(/Message sent (.*?)(?: by (.*?))?: (.*)/s);

            if (match) {
                let rawTimeStr = match[1] ? match[1].trim() : "";
                let fallbackName = match[2] ? match[2].trim() : "غير معروف";
                let messageText = match[3] ? match[3].trim() : "";

                let normalizedTime = normalizeTimeFormat(rawTimeStr);
                let { text: dateTimeText } = toISODateTime(normalizedTime);

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
                    date: dateTimeText || rawTimeStr, // لو التحويل فشل، سيب الوقت الخام زي ما هو
                    name: senderName,
                    message: messageText.replace(/\n/g, " ").trim()
                });
            }
        }
    });

    console.log(`✅ تم سحب ${extractedData.length} رسالة من الشات.`);
    return extractedData;
}

// ================== حل مشكلة الأسماء المختصرة (كلمة واحدة) ==================
// لو الاسم مكوّن من كلمة واحدة، نستنى ونشوف الرسايل اللي بعده:
//   - لو بردو كلمة واحدة ونفس الكلمة -> نكمل نستنى
//   - أول ما نلاقي اسم من كلمتين+ وأول كلمة فيه هي نفس الكلمة -> نرجع نصلّح كل
//     الرسايل اللي كانت بكلمة واحدة وناخد منها الاسم الكامل
//   - لو أول كلمة مختلفة (أو خلصنا الرسايل) -> سيبها زي ما هي، اسمه فعلاً كلمة واحدة
function backfillSingleWordNames(data) {
    let i = 0;
    while (i < data.length) {
        let words = data[i].name.trim().split(/\s+/);
        if (words.length === 1) {
            let singleWord = words[0];
            let runStart = i;
            let j = i + 1;

            // نمد الاستنى طالما لسه نفس الكلمة الواحدة متكررة
            while (j < data.length) {
                let wj = data[j].name.trim().split(/\s+/);
                if (wj.length === 1 && wj[0] === singleWord) {
                    j++;
                } else {
                    break;
                }
            }

            if (j < data.length) {
                let wj = data[j].name.trim().split(/\s+/);
                if (wj.length >= 2 && wj[0] === singleWord) {
                    // لقينا الاسم الكامل - نصلّح كل الرن اللي فات
                    let fullName = data[j].name;
                    for (let k = runStart; k < j; k++) {
                        data[k].name = fullName;
                    }
                }
                // غير كده: أول كلمة مختلفة - سيبهم زي ما هما (اسم كلمة واحدة فعلاً)
            }
            // لو وصلنا لآخر الداتا من غير ما نلاقي اسم من كلمتين، برضو سيبهم زي ما هما

            i = j;
        } else {
            i++;
        }
    }
    return data;
}

// ================== نسخ الناتج الخام - بدون أي فلترة أو تصنيف ==================
let rawData = scrapeChatRawData();
rawData = backfillSingleWordNames(rawData);

if (rawData.length > 0) {
    let output = rawData
        .map(r => `[${r.date}] | [${r.name}] : ${r.message}`)
        .join('\n---\n');

    copy(output);
    console.log(`📋 اتنسخت ${rawData.length} رسالة خام للحافظة (من غير أي فلترة أو تصنيف).`);
    console.log(output);
} else {
    console.log("مفيش رسائل اتسحبت.");
}
})();