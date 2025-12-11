// login.js - النسخة المحسنة
import { auth, provider, signInWithPopup, db, collection, getDocs, query, where } from './firebase-config.js';

// متغير لتتبع حالة تسجيل الدخول
let isLoggingIn = false;

document.getElementById('googleLoginBtn').addEventListener('click', async () => {
    if (isLoggingIn) {
        console.log("⏳ تسجيل الدخول قيد المعالجة بالفعل...");
        return;
    }
    
    isLoggingIn = true;
    const originalBtnText = document.getElementById('googleLoginBtn').innerHTML;
    document.getElementById('googleLoginBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري تسجيل الدخول...';
    document.getElementById('googleLoginBtn').disabled = true;
    
    try {
        console.log("🚀 بدء عملية تسجيل الدخول بـ Google...");
        
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        console.log("✅ تسجيل الدخول ناجح:", user.email);
        console.log("📊 بيانات المستخدم:", {
            email: user.email,
            name: user.displayName,
            photoURL: user.photoURL
        });
        
        // تنظيف localStorage القديم
        localStorage.removeItem('mcs_user');
        localStorage.removeItem('controlLoggedIn');
        localStorage.removeItem('loginTime');
        
        // إضافة تأخير بسيط للتأكد من اكتمال عملية المصادقة
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // التحقق من اتصال Firestore
        if (!db) {
            throw new Error("Firestore غير متصل");
        }
        
        // البحث في قسم "حسابات الادمن" في Firestore
        console.log("🔍 البحث في admins...");
        const adminsCollection = collection(db, 'admins');
        const adminQuery = query(adminsCollection, where('email', '==', user.email));
        const adminSnapshot = await getDocs(adminQuery);
        
        // البحث في قسم "الدعوات" في Firestore
        console.log("🔍 البحث في invitations...");
        const invitesCollection = collection(db, 'invitations');
        const inviteQuery = query(invitesCollection, where('email', '==', user.email));
        const inviteSnapshot = await getDocs(inviteQuery);
        
        let userFound = false;
        let userType = '';
        let userData = null;
        
        // التحقق في حسابات الادمن أولاً
        if (!adminSnapshot.empty) {
            userFound = true;
            userType = 'admin';
            const adminDoc = adminSnapshot.docs[0];
            userData = {
                id: adminDoc.id,
                ...adminDoc.data()
            };
            console.log("✅ وجد في حسابات الادمن:", user.email);
        }
        // إذا لم يجد في الادمن، ابحث في الدعوات
        else if (!inviteSnapshot.empty) {
            userFound = true;
            userType = 'invitation';
            const inviteDoc = inviteSnapshot.docs[0];
            userData = {
                id: inviteDoc.id,
                ...inviteDoc.data()
            };
            console.log("✅ وجد في الدعوات:", user.email);
        }
        
        if (!userFound) {
            console.log("❌ المستخدم غير موجود في قاعدة البيانات:", user.email);
            showError('تم رفض الوصول. ليس لديك صلاحية للدخول. الرجاء التواصل مع المؤسس.');
            
            // تسجيل خروج المستخدم من Firebase
            try {
                await auth.signOut();
            } catch (signOutError) {
                console.error("خطأ في تسجيل الخروج:", signOutError);
            }
            
            isLoggingIn = false;
            document.getElementById('googleLoginBtn').innerHTML = originalBtnText;
            document.getElementById('googleLoginBtn').disabled = false;
            return;
        }
        
        // حفظ بيانات المستخدم في localStorage
        const userToStore = {
            email: user.email,
            name: user.displayName || userData.name || user.email.split('@')[0],
            photoURL: user.photoURL || userData.profileImage || 'https://lh3.googleusercontent.com/a/ACg8ocIwrmQ4ZyLhsN0_5rdXUPR-TyQrVexf1h8jwHOzbgVDYhHUYA=s96-c',
            type: userType,
            id: userData.id,
            permissions: userData.permissions || [],
            createdAt: userData.createdAt || new Date().toISOString()
        };
        
        console.log("💾 حفظ بيانات المستخدم في localStorage:", userToStore.email);
        localStorage.setItem('mcs_user', JSON.stringify(userToStore));
        
        // إضافة تأخير قبل التوجيه
        setTimeout(() => {
            // توجيه المستخدم بناءً على نوعه
            if (userType === 'admin') {
                console.log("➡️ توجيه إلى enter-password.html");
                window.location.href = 'enter-password.html';
            } else if (userType === 'invitation') {
                console.log("➡️ توجيه إلى setup-account.html");
                window.location.href = 'setup-account.html';
            }
        }, 100);
        
    } catch (error) {
        console.error("❌ خطأ تفصيلي في تسجيل الدخول:", error);
        
        let errorMessage = 'حدث خطأ أثناء تسجيل الدخول.';
        
        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'تم إغلاق نافذة تسجيل الدخول.';
        } else if (error.code === 'auth/popup-blocked') {
            errorMessage = 'تم حظر نافذة تسجيل الدخول. يرجى السماح بالنوافذ المنبثقة.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'خطأ في الاتصال بالشبكة. يرجى التحقق من اتصال الإنترنت.';
        }
        
        showError(errorMessage);
        
        isLoggingIn = false;
        document.getElementById('googleLoginBtn').innerHTML = originalBtnText;
        document.getElementById('googleLoginBtn').disabled = false;
    }
});

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
    
    // إخفاء رسالة الخطأ بعد 5 ثوان
    setTimeout(() => {
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }, 5000);
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
    }
}

// التحقق مما إذا كان المستخدم مسجل دخول بالفعل
window.addEventListener('load', () => {
    console.log("🔄 تحميل صفحة تسجيل الدخول...");
    
    // تنظيف البيانات القديمة
    const user = JSON.parse(localStorage.getItem('mcs_user'));
    const isLoggedIn = localStorage.getItem('controlLoggedIn');
    const loginTime = localStorage.getItem('loginTime');
    
    if (user && isLoggedIn && loginTime) {
        const currentTime = new Date().getTime();
        const sessionDuration = 24 * 60 * 60 * 1000; // 24 ساعة
        
        if (currentTime - parseInt(loginTime) <= sessionDuration) {
            console.log("🔄 إعادة توجيه المستخدم المسجل مسبقاً...");
            
            // تأخير بسيط قبل التوجيه
            setTimeout(() => {
                if (user.type === 'admin') {
                    window.location.href = 'control-main.html';
                } else if (user.type === 'invitation') {
                    window.location.href = 'setup-account.html';
                }
            }, 500);
        } else {
            // انتهت الجلسة، احذف البيانات
            console.log("⏰ انتهت الجلسة، حذف البيانات");
            localStorage.removeItem('controlLoggedIn');
            localStorage.removeItem('loginTime');
            localStorage.removeItem('mcs_user');
        }
    }
});