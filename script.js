// API endpoints
let API_BASE_URL = '';
let POPUP_API = '';

// دالة جلب عنوان API من ملف JSON
async function getApiBaseUrl() {
  try {
    const response = await fetch('aupril.json');
    if (!response.ok) {
      throw new Error('فشل في تحميل ملف الإعدادات');
    }
    const config = await response.json();
    API_BASE_URL = config.API_BASE_URL;
    POPUP_API = `${API_BASE_URL}/mcs/popup`;
  } catch (error) {
    console.error('خطأ في تحميل الإعدادات:', error);
  }
}

getApiBaseUrl();

// عناصر DOM
const popup = document.getElementById('popup');
const closePopupBtn = document.getElementById('closePopup');
const popupText = document.getElementById('popupText');
const popupImage = document.getElementById('popupImage');

// دالة جلب بيانات النافذة المنبثقة من السيرفر
async function fetchPopupData() {
    try {
        const response = await fetch(POPUP_API);
        const data = await response.json();
        
        return data;
    } catch (error) {
        console.error('خطأ في جلب بيانات النافذة المنبثقة:', error);
        return null;
    }
}

// دالة عرض النافذة المنبثقة
function showPopup(popupData) {
    if (popupData && popupData.status === 'on' && popupData.text && popupData.image_path) {
        popupText.textContent = popupData.text;
        popupImage.src = popupData.image_path;
        popupImage.alt = popupData.text;
        popup.style.display = 'flex';
    }
}

// دالة إغلاق النافذة المنبثقة
function closePopup() {
    popup.style.display = 'none';
}

// إضافة event listeners
closePopupBtn.addEventListener('click', closePopup);

// إغلاق النافذة عند النقر خارج المحتوى
popup.addEventListener('click', function(event) {
    if (event.target === popup) {
        closePopup();
    }
});

// تهيئة الصفحة عند التحميل
document.addEventListener('DOMContentLoaded', async function() {
    await getApiBaseUrl();
    const popupData = await fetchPopupData();
if (popupData) {showPopup(popupData);
    }
});

// منع إعادة فتح النافذة عند تحديث الصفحة إذا كانت مغلقة
window.addEventListener('beforeunload', function() {
    if (popup.style.display === 'none') {
        sessionStorage.setItem('popupClosed', 'true');
    }
});

// التحقق إذا كانت النافذة مغلقة مسبقاً في هذه الجلسة
document.addEventListener('DOMContentLoaded', function() {
    const popupClosed = sessionStorage.getItem('popupClosed');
    if (popupClosed === 'true') {
        popup.style.display = 'none';
        sessionStorage.removeItem('popupClosed');
    }
});