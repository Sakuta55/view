// get_coin.js - النسخة الكاملة مع انتقال القيادة خلال 2 ثانية

const COIN_API_BASE_URL = 'https://test-pozg.onrender.com';
const PAGE_ID = `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const LEADER_TIMEOUT = 2000; // 2 ثانية فقط لانتقال القيادة

// متغيرات النظام
let coinTimer = null;
let countdownTimer = null;
let remainingSeconds = 0;
let isCoinSystemActive = false;
let isPageActive = true;

// إعدادات النظام
let COIN_SETTINGS = {
    interval_time: 5000,
    coins_per_interval: 5,
    is_active: true
};

// ====================== نظام القيادة السريع ======================

// كيفية إغلاق القائد:
// 1. عندما تغلق الصفحة (حدث beforeunload)
// 2. عندما تفقد الصفحة التركيز (حدث blur) لفترة طويلة
// 3. عندما يتوقف جافاسكريبت في الصفحة (انهيار النظام)

function getActivePages() {
    try {
        const activePages = JSON.parse(localStorage.getItem('mcs_active_pages') || '{}');
        const now = Date.now();
        const timeoutTime = now - LEADER_TIMEOUT;
        
        // تنظيف الصفحات القديمة (أكثر من 2 ثانية)
        Object.keys(activePages).forEach(pageId => {
            if (activePages[pageId].lastSeen < timeoutTime) {
                delete activePages[pageId];
                console.log(`🗑️ تمت إزالة الصفحة ${pageId} بسبب عدم النشاط`);
            }
        });
        
        return activePages;
    } catch (error) {
        return {};
    }
}

// تحديد القائد (الصفحة الأقدم)
function determineLeader(activePages) {
    if (Object.keys(activePages).length === 0) {
        return { pageId: null, isLeader: false };
    }
    
    const leaderEntry = Object.entries(activePages).reduce((oldest, current) => {
        return current[1].startedAt < oldest[1].startedAt ? current : oldest;
    });
    
    return {
        pageId: leaderEntry[0],
        isLeader: leaderEntry[0] === PAGE_ID,
        startedAt: leaderEntry[1].startedAt
    };
}

// تسجيل الصفحة كصفحة نشطة
function registerActivePage() {
    try {
        const activePages = getActivePages();
        
        activePages[PAGE_ID] = {
            startedAt: Date.now(),
            lastSeen: Date.now(),
            url: window.location.href,
            isActive: true
        };
        
        localStorage.setItem('mcs_active_pages', JSON.stringify(activePages));
        console.log(`✅ الصفحة ${PAGE_ID} مسجلة كصفحة نشطة`);
    } catch (error) {
        console.error('❌ خطأ في تسجيل الصفحة:', error);
    }
}

// تحديث نشاط الصفحة
function updatePagePresence() {
    if (!isPageActive) return;
    
    try {
        const activePages = getActivePages();
        
        if (activePages[PAGE_ID]) {
            activePages[PAGE_ID].lastSeen = Date.now();
            activePages[PAGE_ID].isActive = isPageActive;
            localStorage.setItem('mcs_active_pages', JSON.stringify(activePages));
        }
    } catch (error) {
        console.error('❌ خطأ في تحديث الصفحة:', error);
    }
}

// إزالة الصفحة من القائمة النشطة
function removeActivePage() {
    try {
        const activePages = getActivePages();
        
        if (activePages[PAGE_ID]) {
            delete activePages[PAGE_ID];
            localStorage.setItem('mcs_active_pages', JSON.stringify(activePages));
            console.log(`🗑️ الصفحة ${PAGE_ID} تمت إزالتها`);
        }
    } catch (error) {
        console.error('❌ خطأ في إزالة الصفحة:', error);
    }
}

// التحقق إذا كانت هذه الصفحة هي القائد
function checkIfLeader() {
    try {
        const activePages = getActivePages();
        const leader = determineLeader(activePages);
        
        // إذا لم يكن هناك قائد، أصبح هذه الصفحة القائد
        if (!leader.pageId) {
            console.log('👑 أصبحت القائد (لا يوجد قائد حالي)');
            return true;
        }
        
        // إذا كان هناك قائد ولكنه هذه الصفحة
        if (leader.isLeader) {
            return true;
        }
        
        // التحقق إذا انتهت صلاحية القائد الحالي (2 ثانية)
        const now = Date.now();
        const leaderInfo = activePages[leader.pageId];
        
        if (leaderInfo && (now - leaderInfo.lastSeen > LEADER_TIMEOUT)) {
            console.log(`👑 القائد السابق ${leader.pageId} انتهت صلاحيته، أصبحت القائد`);
            return true;
        }
        
        console.log(`👤 القائد الحالي هو ${leader.pageId}`);
        return false;
    } catch (error) {
        console.error('❌ خطأ في التحقق من القيادة:', error);
        return true; // في حالة الخطأ، تصبح هذه الصفحة القائد
    }
}

// ====================== وظائف الإعدادات ======================

async function fetchCoinSettings() {
    try {
        const response = await fetch(`${COIN_API_BASE_URL}/mcs/coin-settings`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            cache: 'no-cache'
        });
        
        if (response.ok) {
            const settings = await response.json();
            
            COIN_SETTINGS.interval_time = settings.interval_time || 5000;
            COIN_SETTINGS.coins_per_interval = settings.coins_per_interval || 5;
            COIN_SETTINGS.is_active = settings.is_active !== false;
            
            console.log(`⚙️ الإعدادات: ${COIN_SETTINGS.coins_per_interval} نقطة كل ${COIN_SETTINGS.interval_time/1000}ثانية`);
            
            // تخزين محلي للإعدادات
            localStorage.setItem('mcs_coin_settings_cache', JSON.stringify({
                settings: COIN_SETTINGS,
                timestamp: Date.now()
            }));
            
            return COIN_SETTINGS;
        }
    } catch (error) {
        console.warn('⚠️ استخدام الإعدادات المحلية');
        
        // محاولة استخدام الإعدادات المحلية المخزنة
        try {
            const cached = JSON.parse(localStorage.getItem('mcs_coin_settings_cache') || '{}');
            if (cached.settings && Date.now() - cached.timestamp < 300000) { // 5 دقائق
                COIN_SETTINGS = cached.settings;
            }
        } catch (e) {
            // استخدام القيم الافتراضية
        }
    }
    
    return COIN_SETTINGS;
}

// ====================== التحقق من المستخدم ======================

function validateUserForCoins() {
    try {
        const userData = JSON.parse(localStorage.getItem('mcs_user'));
        
        if (!userData || !userData.id || !userData.email) {
            return null;
        }
        
        return userData;
    } catch (error) {
        return null;
    }
}

// ====================== إضافة النقاط ======================

async function addCoinsToServer(userId, coinsToAdd) {
    try {
        const response = await fetch(`${COIN_API_BASE_URL}/acco/user/${userId}/add-coins`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                coins: coinsToAdd,
                source: 'auto_earning',
                timestamp: new Date().toISOString(),
                page_id: PAGE_ID,
                settings: COIN_SETTINGS
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // تحديث البيانات المحلية
            updateLocalUserCoins(result.new_balance);
            
            // إرسال حدث مخصص إذا احتجت
            window.dispatchEvent(new CustomEvent('coinsEarned', {
                detail: { 
                    earned: coinsToAdd, 
                    total: result.new_balance,
                    pageId: PAGE_ID 
                }
            }));
            
            console.log(`💰 +${coinsToAdd} نقطة (المجموع: ${result.new_balance})`);
            
            return result;
        } else {
            const errorText = await response.text();
            console.error('❌ فشل إضافة النقاط:', errorText);
            
            // تخزين النقاط مؤقتاً
            storePendingCoins(userId, coinsToAdd);
            return null;
        }
    } catch (error) {
        console.error('❌ خطأ في الاتصال:', error);
        
        // تخزين النقاط مؤقتاً
        storePendingCoins(userId, coinsToAdd);
        return null;
    }
}

function updateLocalUserCoins(newBalance) {
    try {
        const userData = JSON.parse(localStorage.getItem('mcs_user'));
        if (userData) {
            userData.coins = newBalance;
            userData.last_coin_update = new Date().toISOString();
            localStorage.setItem('mcs_user', JSON.stringify(userData));
            
            updateCoinDisplay(newBalance);
        }
    } catch (error) {
        console.error('❌ خطأ في تحديث البيانات المحلية:', error);
    }
}

function updateCoinDisplay(coins) {
    // تحديث عناصر النقاط في الصفحة (بدون تأثيرات)
    const coinElements = document.querySelectorAll('[id*="coin"], [class*="coin"], #coinsDisplay, .coins-count, .user-coins');
    
    coinElements.forEach(element => {
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            element.value = coins;
        } else {
            element.textContent = coins;
        }
    });
}

function storePendingCoins(userId, coins) {
    try {
        const pendingCoins = JSON.parse(localStorage.getItem('mcs_pending_coins') || '[]');
        
        pendingCoins.push({
            userId,
            coins,
            timestamp: new Date().toISOString(),
            pageId: PAGE_ID
        });
        
        localStorage.setItem('mcs_pending_coins', JSON.stringify(pendingCoins));
        console.log(`💾 تم تخزين ${coins} نقطة مؤقتاً`);
    } catch (error) {
        console.error('❌ خطأ في تخزين النقاط المؤقتة:', error);
    }
}

// ====================== نظام المكافآت ======================

async function processCoinEarning() {
    if (!isPageActive || !isCoinSystemActive) {
        return;
    }
    
    // التحقق إذا كانت هذه الصفحة هي القائد
    const isLeader = checkIfLeader();
    
    if (!isLeader) {
        console.log('👤 هذه الصفحة ليست القائد، في انتظار دورها...');
        
        // المحاولة مرة أخرى بعد وقت قصير
        setTimeout(() => {
            if (isCoinSystemActive && isPageActive) {
                processCoinEarning();
            }
        }, LEADER_TIMEOUT);
        
        return;
    }
    
    // تحديث حضور الصفحة كقائد
    updatePagePresence();
    
    // التحقق من المستخدم
    const userData = validateUserForCoins();
    if (!userData) {
        console.log('⏸️ توقف - لا يوجد مستخدم');
        stopCoinSystem();
        return;
    }
    
    // التحقق من تفعيل النظام
    if (!COIN_SETTINGS.is_active) {
        console.log('⏸️ النظام معطل من الإدارة');
        return;
    }
    
    console.log('🎯 بدأ العد التنازلي لإضافة النقاط...');
    
    // بدأ العد التنازلي الداخلي (بدون عرض للمستخدم)
    startCountdown();
    
    // إضافة النقاط بعد الوقت المحدد
    setTimeout(async () => {
        if (!isPageActive || !isCoinSystemActive) {
            return;
        }
        
        // التحقق مرة أخرى إذا ما زالت القائد
        const stillLeader = checkIfLeader();
        if (!stillLeader) {
            console.log('❌ فقدت القيادة أثناء الانتظار');
            processCoinEarning();
            return;
        }
        
        const result = await addCoinsToServer(userData.id, COIN_SETTINGS.coins_per_interval);
        
        // إعادة جلب الإعدادات (تحديث محتمل)
        await fetchCoinSettings();
        
        // إعادة تشغيل الدورة
        if (isCoinSystemActive && COIN_SETTINGS.is_active && isPageActive) {
            processCoinEarning();
        }
    }, COIN_SETTINGS.interval_time);
}

function startCountdown() {
    const intervalSeconds = COIN_SETTINGS.interval_time / 1000;
    remainingSeconds = intervalSeconds;
    
    if (countdownTimer) {
        clearInterval(countdownTimer);
    }
    
    countdownTimer = setInterval(() => {
        remainingSeconds--;
        
        if (remainingSeconds <= 0) {
            clearInterval(countdownTimer);
        }
    }, 1000);
}

// ====================== التحكم بالنظام ======================

async function startCoinSystem() {
    if (isCoinSystemActive) {
        return;
    }
    
    const userData = validateUserForCoins();
    if (!userData) {
        console.log('❌ لا يمكن البدء - يرجى تسجيل الدخول');
        return;
    }
    
    // جلب الإعدادات أولاً
    await fetchCoinSettings();
    
    if (!COIN_SETTINGS.is_active) {
        console.log('❌ النظام معطل من الإدارة');
        return;
    }
    
    isCoinSystemActive = true;
    
    // تسجيل الصفحة كصفحة نشطة
    registerActivePage();
    
    console.log(`🚀 تم تشغيل نظام النقاط (${COIN_SETTINGS.coins_per_interval}ن/${COIN_SETTINGS.interval_time/1000}ث)`);
    
    // بدأ الدورة الأولى
    processCoinEarning();
    
    // تحديث وجود الصفحة كل ثانية
    setInterval(updatePagePresence, 1000);
}

function stopCoinSystem() {
    isCoinSystemActive = false;
    
    if (coinTimer) {
        clearTimeout(coinTimer);
        coinTimer = null;
    }
    
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }
    
    // إزالة الصفحة من القائمة النشطة
    removeActivePage();
    
    console.log('⏸️ تم إيقاف نظام النقاط');
}

// ====================== إدارة أحداث الصفحة ======================

function setupPageListeners() {
    // التركيز على الصفحة
    window.addEventListener('focus', function() {
        console.log('🔍 الصفحة حصلت على التركيز');
        isPageActive = true;
        updatePagePresence();
        
        if (!isCoinSystemActive) {
            const userData = validateUserForCoins();
            if (userData) {
                startCoinSystem();
            }
        }
    });
    
    // فقدان التركيز
    window.addEventListener('blur', function() {
        console.log('👁️ الصفحة فقدت التركيز');
        isPageActive = false;
    });
    
    // إغلاق الصفحة
    window.addEventListener('beforeunload', function() {
        console.log('📴 إغلاق الصفحة...');
        stopCoinSystem();
    });
    
    // تغيير رؤية الصفحة
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            console.log('👻 الصفحة مخفية');
            isPageActive = false;
        } else {
            console.log('👀 الصفحة ظاهرة');
            isPageActive = true;
            updatePagePresence();
        }
    });
}

// ====================== التهيئة ======================

async function initializeCoinSystem() {
    console.log('🎰 جاري تهيئة نظام النقاط...');
    
    // إعداد المستمعين أولاً
    setupPageListeners();
    
    // التحقق من وجود مستخدم
    const userData = validateUserForCoins();
    
    if (userData) {
        console.log(`👤 المستخدم ${userData.email} جاهز`);
        
        // تأخير بسيط للسماح للصفحات الأخرى بالتسجيل
        setTimeout(async () => {
            await fetchCoinSettings();
            
            if (COIN_SETTINGS.is_active) {
                startCoinSystem();
            }
            
            // محاولة مزامنة النقاط المؤقتة القديمة
            syncPendingCoins();
        }, 3000); // 3 ثواني للتهيئة
    } else {
        console.log('👤 انتظر تسجيل الدخول...');
    }
    
    // الاستماع لتغيرات حالة المستخدم
    window.addEventListener('userStateChange', function(event) {
        if (event.detail.user) {
            console.log('👤 تم تسجيل دخول مستخدم جديد');
            setTimeout(() => {
                startCoinSystem();
                syncPendingCoins();
            }, 2000);
        } else {
            console.log('🚪 المستخدم خرج');
            stopCoinSystem();
        }
    });
}

async function syncPendingCoins() {
    try {
        const pendingCoins = JSON.parse(localStorage.getItem('mcs_pending_coins') || '[]');
        if (pendingCoins.length === 0) return;
        
        const userData = validateUserForCoins();
        if (!userData) return;
        
        // تصفية النقاط الخاصة بهذه الصفحة
        const pagePendingCoins = pendingCoins.filter(tx => tx.pageId === PAGE_ID);
        
        if (pagePendingCoins.length === 0) return;
        
        let totalCoins = 0;
        pagePendingCoins.forEach(tx => {
            totalCoins += tx.coins;
        });
        
        if (totalCoins > 0) {
            console.log(`🔄 مزامنة ${totalCoins} نقطة معلقة...`);
            await addCoinsToServer(userData.id, totalCoins);
        }
        
        // إزالة النقاط المعالجة
        const remainingCoins = pendingCoins.filter(tx => tx.pageId !== PAGE_ID);
        localStorage.setItem('mcs_pending_coins', JSON.stringify(remainingCoins));
        
    } catch (error) {
        console.error('❌ خطأ في مزامنة النقاط المؤقتة:', error);
    }
}

// ====================== البدء ======================

// بدأ التهيئة عند تحميل الصفحة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initializeCoinSystem, 2000);
    });
} else {
    setTimeout(initializeCoinSystem, 1000);
}

// جعل الدوال متاحة عالمياً للتحكم
window.startCoinSystem = startCoinSystem;
window.stopCoinSystem = stopCoinSystem;
window.updateCoinDisplay = updateCoinDisplay;

// إضافة حدث لتحديث القيادة يدوياً
window.checkLeaderStatus = function() {
    return checkIfLeader();
};

console.log('💎 نظام النقاط تم تحميله بنجاح');