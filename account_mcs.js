// إعدادات Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDbNspkYfKclyjD3wRGQMV9UNkH2RHlmY0",
    authDomain: "databasemcs-ce7f2.firebaseapp.com",
    projectId: "databasemcs-ce7f2",
    storageBucket: "databasemcs-ce7f2.firebasestorage.app",
    messagingSenderId: "548181040188",
    appId: "1:548181040188:web:fc520e13481afe0f8bb739"
};

// تهيئة Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase initialized');
}

const auth = firebase.auth();
const API_BASE_URL = 'https://test-pozg.onrender.com';

// متغيرات التحكم
let isInitialized = false;
let currentUser = null;

// دالة تسجيل الدخول المحسنة
async function signInWithGoogle() {
    try {
        console.log('بدء تسجيل الدخول...');
        
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        
        provider.setCustomParameters({
            prompt: 'select_account',
            display: 'popup',
            ux_mode: 'popup'
        });
        
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        
        console.log('✅ تسجيل الدخول ناجح:', user.email);
        console.log('👤 User ID:', user.uid);
        
        await sendUserToServer(user);
        
    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        
        if (error.code === 'auth/unauthorized-domain') {
            alert('❌ هذا النطاق غير مسموح به!\n\nيرجى إضافة النطاق التالي إلى Firebase Console:\n' + 
                  window.location.hostname + '\n\n' +
                  'الرابط: https://console.firebase.google.com/project/databasemcs-ce7f2/authentication/settings');
            
            window.open('https://console.firebase.google.com/project/databasemcs-ce7f2/authentication/settings', '_blank');
            
        } else if (error.code === 'auth/popup-blocked') {
            alert('⚠️ تم حجب النافذة المنبثقة!\n\n' +
                  'يجب السماح بالنوافذ المنبثقة لهذا الموقع.\n' +
                  '1. ابحث عن أيقونة 🔒 بجوار عنوان الموقع\n' +
                  '2. اضغط عليها\n' +
                  '3. اختر "Always allow pop-ups"');
                  
        } else if (error.code === 'auth/popup-closed-by-user') {
            console.log('المستخدم أغلق نافذة التسجيل');
            
        } else if (error.code === 'auth/cancelled-popup-request') {
            console.log('تم إلغاء طلب النافذة');
            
        } else {
            alert('حدث خطأ أثناء تسجيل الدخول: ' + error.message);
        }
    }
}

// دالة إرسال بيانات المستخدم للسيرفر
async function sendUserToServer(firebaseUser) {
    try {
        const userData = {
            google_id: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            photo_url: firebaseUser.photoURL || ''
        };
        
        console.log('📤 إرسال بيانات المستخدم:', userData);
        
        const response = await fetch(`${API_BASE_URL}/acco/auth/google`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });
        
        console.log('📥 استجابة السيرفر:', response.status);
        
        if (response.ok) {
            const serverUser = await response.json();
            console.log('✅ تم حفظ بيانات المستخدم:', serverUser);
            
            localStorage.setItem('mcs_user', JSON.stringify(serverUser));
            localStorage.setItem('mcs_user_sync_time', Date.now().toString());
            
            currentUser = serverUser;
            updateUI(serverUser);
            
            showAdvancedNotification(`مرحباً ${serverUser.name}! 👋`, 'success', 'تسجيل الدخول ناجح');
            
        } else {
            const errorText = await response.text();
            console.error('❌ رسالة الخطأ من السيرفر:', errorText);
            
            handleServerError(firebaseUser);
        }
        
    } catch (error) {
        console.error('❌ خطأ في إرسال البيانات:', error);
        handleServerError(firebaseUser);
    }
}

// معالجة خطأ السيرفر
function handleServerError(firebaseUser) {
    const mockUser = {
        id: "temp_" + Date.now(),
        google_id: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        photo_url: firebaseUser.photoURL || '',
        coins: 100,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        total_downloads: 0
    };
    
    localStorage.setItem('mcs_user', JSON.stringify(mockUser));
    localStorage.setItem('mcs_user_sync_time', Date.now().toString());
    localStorage.setItem('mcs_offline_mode', 'true');
    
    currentUser = mockUser;
    updateUI(mockUser);
    
    showAdvancedNotification('تم تسجيل الدخول محلياً (وضع عدم الاتصال)', 'warning', 'ملاحظة');
}

// دالة تسجيل الخروج
// دالة تسجيل الخروج
async function signOut() {
    if (confirm('هل تريد تسجيل الخروج؟')) {
        try {
            await auth.signOut();
            
            // إيقاف نظام النقاط أولاً
            if (window.stopCoinSystem) {
                window.stopCoinSystem();
            }
            
            localStorage.removeItem('mcs_user');
            localStorage.removeItem('mcs_user_sync_time');
            localStorage.removeItem('mcs_offline_mode');
            localStorage.removeItem('mcs_pending_coins'); // تنظيف النقاط المعلقة
            
            currentUser = null;
            updateUI(null);
            showAdvancedNotification('تم تسجيل الخروج بنجاح 👋', 'info', 'تسجيل الخروج');
            
        } catch (error) {
            console.error('❌ خطأ في تسجيل الخروج:', error);
            showAdvancedNotification('حدث خطأ أثناء تسجيل الخروج', 'error', 'خطأ');
        }
    }
}

// دالة تحديث واجهة المستخدم (محسنة)
function updateUI(user) {
    console.log('🔄 تحديث واجهة المستخدم:', user ? user.email : 'لا يوجد مستخدم');
    
    const userInfo = document.getElementById('userInfo');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const coinsDisplay = document.getElementById('coinsDisplay');
    const downloadsDisplay = document.getElementById('userDownloads');
    
    if (user) {
        // حالة: مسجل دخول
        document.getElementById('userName').textContent = user.name || 'مستخدم';
        document.getElementById('userEmail').textContent = user.email || 'بريد غير معروف';
        
        if (downloadsDisplay) {
            downloadsDisplay.textContent = user.total_downloads || 0;
        }
        
        if (coinsDisplay) {
            coinsDisplay.textContent = user.coins || 0;
            
            if (user.coins < 50) {
                coinsDisplay.style.color = '#ff6b6b';
                coinsDisplay.style.animation = 'pulse 1.5s infinite';
                coinsDisplay.title = 'رصيدك منخفض! اشتري المزيد من العملات';
            } else {
                coinsDisplay.style.color = '#ffd700';
                coinsDisplay.style.animation = 'none';
                coinsDisplay.title = 'رصيدك الحالي';
            }
        }
        
        if (userInfo) userInfo.style.display = 'block';
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        
    } else {
        // حالة: غير مسجل
        if (userInfo) userInfo.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (coinsDisplay) {
            coinsDisplay.textContent = '0';
            coinsDisplay.style.color = '#ffd700';
            coinsDisplay.style.animation = 'none';
        }
        if (downloadsDisplay) downloadsDisplay.textContent = '0';
    }
    
    // إرسال حدث بتغير حالة المستخدم للنظام
    const userStateEvent = new CustomEvent('userStateChange', {
        detail: { user: user }
    });
    window.dispatchEvent(userStateEvent);
}

// دالة تحديث الرصيد
async function updateUserCoins() {
    const userData = getUserData();
    
    if (userData && userData.id) {
        try {
            const response = await fetch(`${API_BASE_URL}/acco/user/${userData.id}/coins`);
            
            if (response.ok) {
                const data = await response.json();
                const coinsDisplay = document.getElementById('coinsDisplay');
                
                if (coinsDisplay) {
                    coinsDisplay.textContent = data.coins;
                    
                    if (data.coins < 50) {
                        coinsDisplay.style.color = '#ff6b6b';
                        coinsDisplay.style.animation = 'pulse 1.5s infinite';
                    } else {
                        coinsDisplay.style.color = '#ffd700';
                        coinsDisplay.style.animation = 'none';
                    }
                }
                
                userData.coins = data.coins;
                localStorage.setItem('mcs_user', JSON.stringify(userData));
            }
        } catch (error) {
            console.error('❌ خطأ في تحديث الرصيد:', error);
        }
    }
}

// دالات مساعدة
function getUserData() {
    try {
        const userStr = localStorage.getItem('mcs_user');
        const user = userStr ? JSON.parse(userStr) : null;
        
        // التحقق من صلاحية البيانات المحلية
        if (user) {
            const syncTime = localStorage.getItem('mcs_user_sync_time');
            const currentTime = Date.now();
            
            // إذا مر أكثر من 5 دقائق دون مزامنة
            if (syncTime && (currentTime - parseInt(syncTime) > 300000)) {
                refreshUserData();
            }
        }
        
        return user;
    } catch (error) {
        console.error('❌ خطأ في قراءة بيانات المستخدم:', error);
        return null;
    }
}

// إشعار متطور
function showAdvancedNotification(text, type, title = '') {
    const notification = document.createElement('div');
    
    const colors = {
        success: { bg: '#4CAF50', border: '#388E3C', icon: 'fa-check-circle' },
        error: { bg: '#f44336', border: '#d32f2f', icon: 'fa-exclamation-circle' },
        warning: { bg: '#ff9800', border: '#f57c00', icon: 'fa-exclamation-triangle' },
        info: { bg: '#2196F3', border: '#1976D2', icon: 'fa-info-circle' }
    };
    
    const config = colors[type] || colors.info;
    
    notification.innerHTML = `
        <div style="
            position: fixed;
            top: 80px;
            right: 20px;
            background: ${config.bg};
            color: white;
            padding: 15px 25px;
            border-radius: 12px;
            z-index: 10000;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            animation: slideInRight 0.3s ease;
            max-width: 350px;
            border-left: 5px solid ${config.border};
        ">
            <div style="display: flex; align-items: center; gap: 15px;">
                <i class="fas ${config.icon}" style="font-size: 24px;"></i>
                <div>
                    ${title ? `<div style="font-weight: bold; margin-bottom: 5px;">${title}</div>` : ''}
                    <div>${text}</div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// الاستماع لتغيرات حالة المستخدم (معدّل)
// الاستماع لتغيرات حالة المستخدم (معدّل)
auth.onAuthStateChanged((user) => {
    console.log('🔑 حالة المصادقة تغيرت:', user ? user.email : 'غير مسجل');
    
    if (user) {
        // التحقق مما إذا كان نفس المستخدم الحالي
        if (currentUser && currentUser.google_id === user.uid) {
            console.log('👤 نفس المستخدم، لا حاجة للتحديث');
            
            // ولكن قد يكون نظام النقاط متوقفاً، لذا نعيد تشغيله
            setTimeout(() => {
                if (window.startCoinSystem && isCoinSystemActive === false) {
                    console.log('🔄 إعادة تشغيل نظام النقاط لنفس المستخدم');
                    window.startCoinSystem();
                }
            }, 1000);
            
            return;
        }
        
        console.log('🔄 مستخدم جديد أو مختلف، تحديث البيانات...');
        
        // تحديث بيانات المستخدم من السيرفر
        sendUserToServer(user);
        
        // تشغيل نظام النقاط بعد تأكيد تسجيل الدخول (3 ثواني)
        setTimeout(() => {
            if (window.startCoinSystem) {
                console.log('🚀 بدأ تشغيل نظام النقاط للمستخدم الجديد');
                window.startCoinSystem();
            }
        }, 3000);
        
    } else if (currentUser) {
        // إذا كان هناك مستخدم محلي ولكن Firebase ليس لديه مستخدم
        console.log('⚠️ Firebase ليس لديه مستخدم، لكن هناك مستخدم محلي');
        
        // التحقق من وضع عدم الاتصال
        const offlineMode = localStorage.getItem('mcs_offline_mode');
        if (offlineMode === 'true') {
            console.log('✅ وضع عدم الاتصال، الاحتفاظ بالمستخدم المحلي');
            return;
        }
        
        // إذا لم يكن في وضع عدم الاتصال، تسجيل الخروج
        console.log('🚪 تسجيل الخروج من البيانات المحلية');
        
        // إيقاف نظام النقاط أولاً
        if (window.stopCoinSystem) {
            window.stopCoinSystem();
        }
        
        localStorage.removeItem('mcs_user');
        localStorage.removeItem('mcs_user_sync_time');
        currentUser = null;
        updateUI(null);
    }
});

// دالة تحديث بيانات المستخدم من السيرفر
async function refreshUserData() {
    try {
        const userData = getUserData();
        
        if (userData && userData.id) {
            console.log('🔄 تحديث بيانات المستخدم من السيرفر...');
            
            const response = await fetch(`${API_BASE_URL}/acco/user/${userData.id}`);
            
            if (response.ok) {
                const updatedUser = await response.json();
                
                localStorage.setItem('mcs_user', JSON.stringify(updatedUser));
                localStorage.setItem('mcs_user_sync_time', Date.now().toString());
                localStorage.removeItem('mcs_offline_mode');
                
                currentUser = updatedUser;
                updateUI(updatedUser);
                
                console.log('✅ تم تحديث بيانات المستخدم');
                
                const event = new CustomEvent('userDataUpdated', {
                    detail: updatedUser
                });
                window.dispatchEvent(event);
                
                return updatedUser;
            }
        }
    } catch (error) {
        console.error('❌ خطأ في تحديث بيانات المستخدم:', error);
    }
    return null;
}

// تهيئة الصفحة (معدّل)
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ صفحة الحساب جاهزة');
    
    // تعيين العلامة كي لا نعيد التهيئة
    if (isInitialized) {
        console.log('⚠️ الصفحة مسبقاً مهيأة');
        return;
    }
    
    isInitialized = true;
    
    // عرض البيانات المحلية أولاً
    const savedUser = getUserData();
    
    if (savedUser) {
        console.log('👤 وجدت بيانات مستخدم محلية:', savedUser.email);
        currentUser = savedUser;
        updateUI(savedUser);
        
        // تحديث من السيرفر في الخلفية
        setTimeout(() => {
            refreshUserData();
        }, 1000);
    } else {
        console.log('👤 لا توجد بيانات مستخدم محلية');
        updateUI(null);
    }
    
    // تحديث الرصيد كل 30 ثانية
    setInterval(() => {
        if (getUserData()) {
            updateUserCoins();
        }
    }, 30000);
});

// جعل الدوال متاحة عالمياً
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
window.refreshUserData = refreshUserData;