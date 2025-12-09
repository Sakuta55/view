// get_coin.js - النسخة المعدلة لمنع تعدد المكافآت

const COIN_API_BASE_URL = 'https://test-pozg.onrender.com';
const PAGE_ID = `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// متغيرات النظام
let coinTimer = null;
let countdownTimer = null;
let remainingSeconds = 0;
let isCoinSystemActive = false;
let isPageActive = true;

// إعدادات النظام (سيتم جلبها من السيرفر)
let COIN_SETTINGS = {
    interval_time: 5000,
    coins_per_interval: 5,
    is_active: true
};

// ====================== وظائف التحكم بالصفحات ======================

// التحقق من وجود صفحة نشطة أخرى
function checkForActivePage() {
    try {
        const activePages = JSON.parse(localStorage.getItem('mcs_active_pages') || '{}');
        const now = Date.now();
        const fiveMinutesAgo = now - (5 * 60 * 1000);
        
        // تنظيف الصفحات القديمة
        Object.keys(activePages).forEach(pageId => {
            if (activePages[pageId].lastSeen < fiveMinutesAgo) {
                delete activePages[pageId];
            }
        });
        
        localStorage.setItem('mcs_active_pages', JSON.stringify(activePages));
        
        // التحقق إذا كان هناك صفحة أخرى تقوم بالعد
        const activeCount = Object.keys(activePages).length;
        
        if (activeCount > 1) {
            console.log(`👥 نظام النقاط: هناك ${activeCount - 1} صفحة أخرى نشطة`);
            
            // إيجاد القائد (الصفحة التي بدأت أولاً)
            const leader = Object.entries(activePages).reduce((oldest, current) => {
                return current[1].startedAt < oldest[1].startedAt ? current : oldest;
            });
            
            const isLeader = leader[0] === PAGE_ID;
            
            return {
                isLeader: isLeader,
                leaderId: leader[0],
                activeCount: activeCount,
                shouldEarnCoins: isLeader // فقط القائد يكسب النقاط
            };
        }
        
        return {
            isLeader: true,
            leaderId: PAGE_ID,
            activeCount: 1,
            shouldEarnCoins: true
        };
    } catch (error) {
        console.error('❌ نظام النقاط: خطأ في التحقق من الصفحات النشطة:', error);
        return {
            isLeader: true,
            leaderId: PAGE_ID,
            activeCount: 1,
            shouldEarnCoins: true
        };
    }
}

// تسجيل الصفحة كصفحة نشطة
function registerActivePage() {
    try {
        const activePages = JSON.parse(localStorage.getItem('mcs_active_pages') || '{}');
        
        activePages[PAGE_ID] = {
            startedAt: Date.now(),
            lastSeen: Date.now(),
            url: window.location.href,
            isEarning: true
        };
        
        localStorage.setItem('mcs_active_pages', JSON.stringify(activePages));
        console.log(`✅ نظام النقاط: تم تسجيل الصفحة ${PAGE_ID}`);
    } catch (error) {
        console.error('❌ نظام النقاط: خطأ في تسجيل الصفحة:', error);
    }
}

// تحديث آخر ظهور للصفحة
function updatePagePresence() {
    if (!isPageActive) return;
    
    try {
        const activePages = JSON.parse(localStorage.getItem('mcs_active_pages') || '{}');
        
        if (activePages[PAGE_ID]) {
            activePages[PAGE_ID].lastSeen = Date.now();
            localStorage.setItem('mcs_active_pages', JSON.stringify(activePages));
        }
    } catch (error) {
        console.error('❌ نظام النقاط: خطأ في تحديث الصفحة:', error);
    }
}

// إزالة الصفحة من القائمة النشطة
function removeActivePage() {
    try {
        const activePages = JSON.parse(localStorage.getItem('mcs_active_pages') || '{}');
        
        if (activePages[PAGE_ID]) {
            delete activePages[PAGE_ID];
            localStorage.setItem('mcs_active_pages', JSON.stringify(activePages));
            console.log(`🗑️ نظام النقاط: تم إزالة الصفحة ${PAGE_ID}`);
        }
    } catch (error) {
        console.error('❌ نظام النقاط: خطأ في إزالة الصفحة:', error);
    }
}

// ====================== وظائف الإعدادات ======================

// دالة جلب إعدادات النقاط من السيرفر
async function fetchCoinSettings() {
    try {
        const response = await fetch(`${COIN_API_BASE_URL}/mcs/coin-settings`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            cache: 'no-cache'
        });
        
        if (response.ok) {
            const settings = await response.json();
            
            COIN_SETTINGS.interval_time = settings.interval_time || 5000;
            COIN_SETTINGS.coins_per_interval = settings.coins_per_interval || 5;
            COIN_SETTINGS.is_active = settings.is_active !== false;
            
            console.log(`⚙️ نظام النقاط: ${COIN_SETTINGS.coins_per_interval} نقطة كل ${COIN_SETTINGS.interval_time/1000}ث`);
            
            return COIN_SETTINGS;
        }
    } catch (error) {
        console.warn('⚠️ نظام النقاط: استخدام الإعدادات المحلية');
    }
    
    return COIN_SETTINGS;
}

// ====================== وظائف التحقق ======================

// دالة التحقق من بيانات المستخدم
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

// دالة إضافة النقاط للسيرفر
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
                page_id: PAGE_ID
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // تحديث البيانات المحلية فقط
            updateLocalUserCoins(result.new_balance);
            
            return result;
        }
    } catch (error) {
        console.error('❌ نظام النقاط: خطأ في إضافة النقاط:', error);
        
        // تخزين مؤقت للعملات
        storePendingCoins(userId, coinsToAdd);
    }
    
    return null;
}

// دالة تحديث البيانات المحلية
function updateLocalUserCoins(newBalance) {
    try {
        const userData = JSON.parse(localStorage.getItem('mcs_user'));
        if (userData) {
            userData.coins = newBalance;
            userData.last_coin_update = new Date().toISOString();
            localStorage.setItem('mcs_user', JSON.stringify(userData));
            
            // تحديث الواجهة في الصفحة الحالية
            updateCoinDisplay(newBalance);
        }
    } catch (error) {
        console.error('❌ نظام النقاط: خطأ في تحديث البيانات المحلية:', error);
    }
}

// دالة تحديث عرض النقاط في الصفحة
function updateCoinDisplay(coins) {
    // تحديث جميع عناصر عرض النقاط في الصفحة
    const coinElements = document.querySelectorAll('[id*="coin"], [class*="coin"], #coinsDisplay, .coins-count, .user-coins');
    
    coinElements.forEach(element => {
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            element.value = coins;
        } else {
            element.textContent = coins;
        }
    });
}

// دالة تخزين النقاط المؤقتة
function storePendingCoins(userId, coins) {
    try {
        const pendingCoins = JSON.parse(localStorage.getItem('mcs_pending_coins') || '[]');
        
        pendingCoins.push({
            userId,
            coins,
            timestamp: new Date().toISOString(),
            page_id: PAGE_ID
        });
        
        localStorage.setItem('mcs_pending_coins', JSON.stringify(pendingCoins));
    } catch (error) {
        console.error('❌ نظام النقاط: خطأ في تخزين النقاط المؤقتة:', error);
    }
}

// ====================== وظائف نظام المكافآت ======================

// الدالة الرئيسية لإضافة النقاط
async function processCoinEarning() {
    if (!isPageActive || !isCoinSystemActive) {
        return;
    }
    
    // التحقق من أن الصفحة هي القائد
    const pageStatus = checkForActivePage();
    
    if (!pageStatus.shouldEarnCoins) {
        console.log(`👤 نظام النقاط: هذه الصفحة ليست القائد، القائد هو ${pageStatus.leaderId}`);
        
        // محاولة بعد فترة إذا كان القائد قد توقف
        setTimeout(() => {
            if (isCoinSystemActive) {
                processCoinEarning();
            }
        }, 30000); // حاول كل 30 ثانية
        
        return;
    }
    
    // التحقق من المستخدم
    const userData = validateUserForCoins();
    if (!userData) {
        console.log('⏸️ نظام النقاط: توقف - لا يوجد مستخدم');
        stopCoinSystem();
        return;
    }
    
    // التحقق من تفعيل النظام
    if (!COIN_SETTINGS.is_active) {
        console.log('⏸️ نظام النقاط: متوقف - النظام غير مفعل من الإدارة');
        return;
    }
    
    console.log('🎯 نظام النقاط: معالجة إضافة النقاط...');
    
    // بدأ العد التنازلي
    startCountdown();
    
    // إضافة النقاط بعد الوقت المحدد
    setTimeout(async () => {
        if (!isPageActive || !isCoinSystemActive) {
            return;
        }
        
        const result = await addCoinsToServer(userData.id, COIN_SETTINGS.coins_per_interval);
        
        if (result) {
            console.log(`💰 نظام النقاط: تم إضافة ${COIN_SETTINGS.coins_per_interval} نقطة`);
        }
        
        // إعادة جلب الإعدادات للتأكد من التحديثات
        await fetchCoinSettings();
        
        // إعادة تشغيل الدورة إذا كان النظام نشطاً
        if (isCoinSystemActive && COIN_SETTINGS.is_active && isPageActive) {
            processCoinEarning();
        }
    }, COIN_SETTINGS.interval_time);
}

// دالة تشغيل نظام النقاط
async function startCoinSystem() {
    if (isCoinSystemActive) {
        return;
    }
    
    const userData = validateUserForCoins();
    if (!userData) {
        return;
    }
    
    // جلب الإعدادات أولاً
    await fetchCoinSettings();
    
    if (!COIN_SETTINGS.is_active) {
        return;
    }
    
    isCoinSystemActive = true;
    
    // تسجيل الصفحة كصفحة نشطة
    registerActivePage();
    
    console.log(`🚀 نظام النقاط: تم التشغيل (${COIN_SETTINGS.coins_per_interval}ن/${COIN_SETTINGS.interval_time/1000}ث)`);
    
    // بدأ الدورة الأولى
    processCoinEarning();
    
    // تحديث وجود الصفحة كل دقيقة
    setInterval(updatePagePresence, 60000);
}

// دالة إيقاف نظام النقاط
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
    
    console.log('⏸️ نظام النقاط: تم الإيقاف');
}

// دالة تشغيل العد التنازلي (داخلية فقط - بدون عرض للمستخدم)
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

// ====================== أحداث الصفحة ======================

// الاستماع لتركيز الصفحة
function setupPageFocusListeners() {
    window.addEventListener('focus', function() {
        isPageActive = true;
        updatePagePresence();
        
        if (!isCoinSystemActive) {
            const userData = validateUserForCoins();
            if (userData) {
                startCoinSystem();
            }
        }
    });
    
    window.addEventListener('blur', function() {
        isPageActive = false;
    });
    
    window.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            isPageActive = false;
        } else {
            isPageActive = true;
            updatePagePresence();
        }
    });
}

// الاستماع لإغلاق الصفحة
function setupPageUnloadListeners() {
    window.addEventListener('beforeunload', function() {
        // إيقاف النظام فوراً
        stopCoinSystem();
        
        // إزالة الصفحة من القائمة النشطة
        removeActivePage();
        
        // مزامنة النقاط المؤقتة
        syncPendingCoins();
    });
}

// دالة مزامنة النقاط المؤقتة
async function syncPendingCoins() {
    try {
        const pendingCoins = JSON.parse(localStorage.getItem('mcs_pending_coins') || '[]');
        if (pendingCoins.length === 0) return;
        
        const userData = validateUserForCoins();
        if (!userData) return;
        
        // تصفية النقاط الخاصة بهذه الصفحة فقط
        const pagePendingCoins = pendingCoins.filter(tx => tx.page_id === PAGE_ID);
        
        if (pagePendingCoins.length === 0) return;
        
        let totalCoins = 0;
        pagePendingCoins.forEach(tx => {
            totalCoins += tx.coins;
        });
        
        // إرسال النقاط المجمعة
        if (totalCoins > 0) {
            await addCoinsToServer(userData.id, totalCoins);
        }
        
        // إزالة النقاط المعالجة
        const remainingCoins = pendingCoins.filter(tx => tx.page_id !== PAGE_ID);
        localStorage.setItem('mcs_pending_coins', JSON.stringify(remainingCoins));
        
    } catch (error) {
        console.error('❌ نظام النقاط: خطأ في مزامنة النقاط المؤقتة:', error);
    }
}

// ====================== التهيئة ======================

// تهيئة النظام
async function initializeCoinSystem() {
    console.log('🎰 نظام النقاط: جاري التهيئة...');
    
    // إعداد المستمعين أولاً
    setupPageFocusListeners();
    setupPageUnloadListeners();
    
    // التحقق من وجود مستخدم
    const userData = validateUserForCoins();
    
    if (userData) {
        console.log(`👤 نظام النقاط: المستخدم ${userData.email} متصل`);
        
        // تأخير بسيط للتحقق من الصفحات الأخرى
        setTimeout(async () => {
            await fetchCoinSettings();
            
            if (COIN_SETTINGS.is_active) {
                startCoinSystem();
            }
            
            // مزامنة النقاط المؤقتة القديمة
            syncPendingCoins();
        }, 2000);
    } else {
        console.log('👤 نظام النقاط: انتظر تسجيل الدخول...');
    }
    
    // الاستماع لتغيرات حالة المستخدم (إذا كان لديك نظام تسجيل دخول)
    if (typeof window !== 'undefined') {
        window.addEventListener('userStateChange', function(event) {
            if (event.detail.user) {
                console.log('👤 نظام النقاط: تم تسجيل دخول مستخدم جديد');
                setTimeout(() => {
                    startCoinSystem();
                    syncPendingCoins();
                }, 1000);
            } else {
                console.log('🚪 نظام النقاط: المستخدم خرج');
                stopCoinSystem();
                removeActivePage();
            }
        });
    }
}

// جعل الدوال متاحة عالمياً للتحكم اليدوي
if (typeof window !== 'undefined') {
    window.startCoinSystem = startCoinSystem;
    window.stopCoinSystem = stopCoinSystem;
    window.updateCoinDisplay = updateCoinDisplay;
}

// بدأ التهيئة عند تحميل الصفحة
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initializeCoinSystem, 3000); // تأخير إضافي
        });
    } else {
        setTimeout(initializeCoinSystem, 1000);
    }
}