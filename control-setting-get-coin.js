// admin_coin_settings.js - ملف JavaScript المنفصل لإدارة نظام النقاط

const API_BASE = 'https://test-pozg.onrender.com';
const COIN_SETTINGS_ENDPOINT = `${API_BASE}/mcs/coin-settings`;
let currentSettings = {};

// تحديث عرض الإعدادات الحالية
function updateCurrentSettingsDisplay(settings) {
    const seconds = settings.interval_time / 1000;
    const container = document.getElementById('currentSettingsList');
    
    container.innerHTML = `
        <div class="setting-item">
            <div class="setting-label">عدد النقاط</div>
            <div class="setting-value coins">
                <i class="fas fa-coins"></i>
                ${settings.coins_per_interval} نقطة
            </div>
        </div>
        <div class="setting-item">
            <div class="setting-label">الفترة الزمنية</div>
            <div class="setting-value time">
                <i class="fas fa-clock"></i>
                ${seconds} ثانية
            </div>
        </div>
        <div class="setting-item">
            <div class="setting-label">حالة النظام</div>
            <div class="setting-value status ${settings.is_active ? 'active' : 'inactive'}">
                <i class="fas ${settings.is_active ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                ${settings.is_active ? 'مفعل' : 'معطل'}
            </div>
        </div>
        <div class="setting-item">
            <div class="setting-label">آخر تحديث</div>
            <div class="setting-value">
                <i class="fas fa-calendar-alt"></i>
                ${settings.updated_at ? new Date(settings.updated_at).toLocaleString('ar-SA') : 'غير معروف'}
            </div>
        </div>
    `;
}

// تحديث معلومات النظام
function updateSystemInfo(settings) {
    const container = document.getElementById('systemInfo');
    const seconds = settings.interval_time / 1000;
    
    container.innerHTML = `
        <div class="info-item">
            <div class="info-label">النقاط في الساعة</div>
            <div class="info-value">${Math.floor((3600 / seconds) * settings.coins_per_interval)} نقطة</div>
        </div>
        <div class="info-item">
            <div class="info-label">النقاط في اليوم</div>
            <div class="info-value">${Math.floor((86400 / seconds) * settings.coins_per_interval)} نقطة</div>
        </div>
        <div class="info-item">
            <div class="info-label">معدل النقاط</div>
            <div class="info-value">${settings.coins_per_interval} / ${seconds}ث</div>
        </div>
        <div class="info-item">
            <div class="info-label">الوقت الحالي</div>
            <div class="info-value">${new Date().toLocaleTimeString('ar-SA')}</div>
        </div>
    `;
}

// جلب الإعدادات الحالية
async function loadCurrentSettings() {
    try {
        showLoading('جاري تحميل الإعدادات...');
        
        const response = await fetch(COIN_SETTINGS_ENDPOINT, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });
        
        if (response.ok) {
            const settings = await response.json();
            currentSettings = settings;
            
            // تعبئة النموذج
            document.getElementById('coinsPerInterval').value = settings.coins_per_interval;
            document.getElementById('intervalTime').value = settings.interval_time / 1000;
            document.getElementById('timeValue').textContent = `${settings.interval_time / 1000} ثانية`;
            document.getElementById('isActive').checked = settings.is_active;
            
            // تحديث العروض
            updateCurrentSettingsDisplay(settings);
            updateSystemInfo(settings);
            
            hideMessage();
        } else {
            const errorText = await response.text();
            console.error('❌ فشل تحميل الإعدادات:', response.status, errorText);
            showError(`فشل تحميل الإعدادات (${response.status})`);
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل الإعدادات:', error);
        showError('خطأ في الاتصال بالسيرفر. تأكد من اتصال الإنترنت.');
    }
}

// عرض رسالة نجاح
function showSuccess(message) {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.innerHTML = `<div class="message success"><i class="fas fa-check-circle"></i> ${message}</div>`;
    
    // إخفاء الرسالة بعد 5 ثواني
    setTimeout(hideMessage, 5000);
}

// عرض رسالة خطأ
function showError(message) {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.innerHTML = `<div class="message error"><i class="fas fa-exclamation-circle"></i> ${message}</div>`;
}

// عرض رسالة تحميل
function showLoading(message) {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.innerHTML = `<div class="message loading"><i class="fas fa-spinner fa-spin"></i> ${message}</div>`;
}

// إخفاء الرسالة
function hideMessage() {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.innerHTML = '';
}

// إعدادات محفوظة للاستخدام في التأكيد
let pendingSettings = null;

// عرض نافذة التأكيد
function showConfirmation(settings) {
    pendingSettings = settings;
    const modal = document.getElementById('confirmationModal');
    const details = document.getElementById('confirmationDetails');
    
    const oldSeconds = currentSettings.interval_time / 1000;
    const newSeconds = settings.interval_time / 1000;
    
    details.innerHTML = `
        <div class="detail-item">
            <span class="detail-label">عدد النقاط:</span>
            <span class="detail-value">
                ${currentSettings.coins_per_interval} → ${settings.coins_per_interval}
                <span style="color: ${settings.coins_per_interval > currentSettings.coins_per_interval ? '#4CAF50' : '#f44336'};">
                    (${settings.coins_per_interval > currentSettings.coins_per_interval ? '+' : ''}${settings.coins_per_interval - currentSettings.coins_per_interval})
                </span>
            </span>
        </div>
        <div class="detail-item">
            <span class="detail-label">الفترة الزمنية:</span>
            <span class="detail-value">
                ${oldSeconds}ث → ${newSeconds}ث
                <span style="color: ${newSeconds > oldSeconds ? '#f44336' : '#4CAF50'};">
                    (${newSeconds > oldSeconds ? '+' : ''}${newSeconds - oldSeconds}ث)
                </span>
            </span>
        </div>
        <div class="detail-item">
            <span class="detail-label">حالة النظام:</span>
            <span class="detail-value" style="color: ${settings.is_active ? '#4CAF50' : '#f44336'};">
                ${settings.is_active ? 'مفعل' : 'معطل'}
            </span>
        </div>
    `;
    
    modal.style.display = 'flex';
}

// إخفاء نافذة التأكيد
function hideConfirmation() {
    const modal = document.getElementById('confirmationModal');
    modal.style.display = 'none';
    pendingSettings = null;
}

// حفظ الإعدادات
async function saveSettings(settings) {
    try {
        showLoading('جاري حفظ الإعدادات...');
        
        const response = await fetch(COIN_SETTINGS_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                interval_time: settings.interval_time,
                coins_per_interval: settings.coins_per_interval,
                is_active: settings.is_active,
                admin_id: 'admin_panel'
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            showSuccess('✅ تم حفظ الإعدادات بنجاح');
            
            // تحديث العرض
            await loadCurrentSettings();
            
            // إشعار للمستخدمين
            setTimeout(() => {
                alert('تم تحديث إعدادات النقاط! سيطبق التغيير على جميع المستخدمين.');
            }, 500);
            
            return true;
        } else {
            const error = await response.json();
            showError(`❌ ${error.error || 'فشل حفظ الإعدادات'}`);
            return false;
        }
    } catch (error) {
        console.error('❌ خطأ في حفظ الإعدادات:', error);
        showError('❌ خطأ في الاتصال بالسيرفر');
        return false;
    }
}

// التحكم في النطاق الزمني
document.getElementById('intervalTime').addEventListener('input', function(e) {
    const seconds = parseInt(e.target.value);
    document.getElementById('timeValue').textContent = `${seconds} ثانية`;
});

// إرسال النموذج
document.getElementById('coinSettingsForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const settings = {
        interval_time: parseInt(document.getElementById('intervalTime').value) * 1000,
        coins_per_interval: parseInt(document.getElementById('coinsPerInterval').value),
        is_active: document.getElementById('isActive').checked
    };
    
    // التحقق من صحة البيانات
    if (settings.interval_time < 1000) {
        showError('الوقت الأدنى هو 1 ثانية (1000 مللي ثانية)');
        return;
    }
    
    if (settings.coins_per_interval < 1) {
        showError('الحد الأدنى للنقاط هو 1');
        return;
    }
    
    if (settings.coins_per_interval > 100) {
        showError('الحد الأقصى للنقاط هو 100');
        return;
    }
    
    if (settings.interval_time > 60000) {
        showError('الحد الأقصى للوقت هو 60 ثانية');
        return;
    }
    
    // عرض نافذة التأكيد
    showConfirmation(settings);
});

// تأكيد الحفظ
document.getElementById('confirmSave').addEventListener('click', async function() {
    if (pendingSettings) {
        const saveBtn = document.getElementById('saveBtn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
        
        const success = await saveSettings(pendingSettings);
        
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> 💾 حفظ الإعدادات';
        
        if (success) {
            hideConfirmation();
        }
    }
});

// إلغاء الحفظ
document.getElementById('cancelSave').addEventListener('click', function() {
    hideConfirmation();
});

// إغلاق النافذة عند النقر خارجها
document.getElementById('confirmationModal').addEventListener('click', function(e) {
    if (e.target === this) {
        hideConfirmation();
    }
});

// تهيئة الصفحة
function initializePage() {
    console.log('🎰 إدارة نظام النقاط: جاري التهيئة...');
    
    // تحميل الإعدادات عند فتح الصفحة
    loadCurrentSettings();
    
    // تحديث الإعدادات كل 30 ثانية
    setInterval(loadCurrentSettings, 30000);
    
    // تحديث الوقت كل دقيقة
    setInterval(() => {
        if (currentSettings.interval_time) {
            updateSystemInfo(currentSettings);
        }
    }, 60000);
    
    console.log('✅ إدارة نظام النقاط: تم التهيئة بنجاح');
}

// تحميل الإعدادات عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', initializePage);

// بدأ التحميل إذا كانت الصفحة محملة بالفعل
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initializePage, 100);
}