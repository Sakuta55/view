// control-main-script.js - المحدث
// التحقق من تسجيل الدخول
function checkAuth() {
    const isLoggedIn = localStorage.getItem('controlLoggedIn');
    const loginTime = localStorage.getItem('loginTime');
    
    // إذا لم يكن مسجلاً دخول أو انتهت الجلسة (24 ساعة)
    if (!isLoggedIn || !loginTime) {
        redirectToLogin();
        return;
    }
    
    const currentTime = new Date().getTime();
    const sessionDuration = 24 * 60 * 60 * 1000; // 24 ساعة
    
    if (currentTime - parseInt(loginTime) > sessionDuration) {
        // انتهت الجلسة
        logout();
    }
}

// إعادة التوجيه إلى صفحة تسجيل الدخول
function redirectToLogin() {
    window.location.href = 'index.html';
}

// تسجيل الخروج
function logout() {
    localStorage.removeItem('controlLoggedIn');
    localStorage.removeItem('loginTime');
    localStorage.removeItem('mcs_user');
    redirectToLogin();
}

// التحقق من المصادقة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    
    // إضافة زر الخروج لجميع الصفحات
    if (!document.querySelector('.logout-btn')) {
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'logout-btn';
        logoutBtn.textContent = 'خروج';
        logoutBtn.onclick = logout;
        document.body.appendChild(logoutBtn);
    }
});

// تحديث وقت الجلسة عند التفاعل مع الصفحة
document.addEventListener('click', function() {
    if (localStorage.getItem('controlLoggedIn')) {
        localStorage.setItem('loginTime', new Date().getTime());
    }
});

// التحقق من الجلسة كل 5 دقائق
setInterval(checkAuth, 5 * 60 * 1000);

// تحميل بيانات المستخدم في كل صفحة
function loadUserData() {
    const user = JSON.parse(localStorage.getItem('mcs_user'));
    if (!user) {
        redirectToLogin();
        return null;
    }
    return user;
}

// التحقق من الصلاحية في الصفحات
function checkPermission(requiredPermission) {
    const user = loadUserData();
    if (!user) return false;
    
    const permissions = user.permissions || [];
    return permissions.includes('المؤسس') || permissions.includes(requiredPermission);
}

export { checkAuth, logout, loadUserData, checkPermission };