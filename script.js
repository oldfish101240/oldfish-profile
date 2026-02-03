// ============================================
// 深色/淺色模式切換（預設深色）
// ============================================
// 注意：主題設定已在 <head> 中的內聯腳本設置，這裡負責綁定切換事件和跨頁面同步
(function() {
    const html = document.documentElement;
    const body = document.body;
    
    // 應用主題的函數
    function applyTheme(theme) {
        html.setAttribute('data-theme', theme);
        if (body) {
            body.setAttribute('data-theme', theme);
        }
    }
    
    // 從 URL 參數或 localStorage 讀取主題
    function getTheme() {
        // 優先讀取 URL 參數（跳轉時傳遞的主題）
        const urlParams = new URLSearchParams(window.location.search);
        const urlTheme = urlParams.get('theme');
        if (urlTheme === 'dark' || urlTheme === 'light') {
            // 如果 URL 中有主題參數，更新 localStorage
            localStorage.setItem('theme', urlTheme);
            return urlTheme;
        }
        // 否則從 localStorage 讀取
        return localStorage.getItem('theme') || 'dark';
    }
    
    // 從 localStorage 讀取並應用主題（確保使用最新設定）
    function syncTheme() {
        const theme = getTheme();
        applyTheme(theme);
    }
    
    // 頁面載入時同步主題（確保使用最新設定）
    syncTheme();
    
    // 監聽 storage 事件，實現跨標籤頁即時同步
    // 當其他標籤頁修改了 localStorage 時，當前頁面也會自動更新
    window.addEventListener('storage', (e) => {
        if (e.key === 'theme' && e.newValue) {
            applyTheme(e.newValue);
        }
    });
    
    // 為所有頁面連結添加主題參數
    function updateLinksWithTheme() {
        const links = document.querySelectorAll('a[href]');
        const currentTheme = html.getAttribute('data-theme') || 'dark';
        
        links.forEach(link => {
            // 保存原始 href（如果還沒有保存）
            if (!link.dataset.originalHref) {
                link.dataset.originalHref = link.getAttribute('href');
            }
            
            const originalHref = link.dataset.originalHref;
            if (!originalHref) return;
            
            // 只處理內部頁面連結（HTML 文件）
            const isInternalHtml = originalHref.endsWith('.html') || 
                                   originalHref.includes('.html');
            
            // 處理絕對路徑（GitHub Pages）或相對路徑的 HTML 連結
            if (isInternalHtml && 
                !originalHref.startsWith('#') && 
                !originalHref.startsWith('mailto:') && 
                !originalHref.startsWith('tel:')) {
                
                try {
                    // 如果是絕對路徑（以 http 或 https 開頭）
                    if (originalHref.startsWith('http://') || originalHref.startsWith('https://')) {
                        const url = new URL(originalHref);
                        url.searchParams.set('theme', currentTheme);
                        link.href = url.toString();
                    } else {
                        // 相對路徑，使用當前 origin
                        const url = new URL(originalHref, window.location.origin);
                        url.searchParams.set('theme', currentTheme);
                        link.href = url.toString();
                    }
                } catch (e) {
                    // 如果 URL 解析失敗，使用簡單拼接
                    const separator = originalHref.includes('?') ? '&' : '?';
                    link.href = originalHref + separator + 'theme=' + currentTheme;
                }
            }
        });
    }
    
    // 等待 DOM 載入完成後再綁定事件
    function initThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        
        if (themeToggle) {
            // 主題切換功能
            themeToggle.addEventListener('click', () => {
                const currentTheme = html.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                
                // 應用新主題
                applyTheme(newTheme);
                
                // 儲存到 localStorage，讓其他頁面也能讀取
                localStorage.setItem('theme', newTheme);
                
                // 更新當前 URL 的主題參數（不刷新頁面）
                const url = new URL(window.location);
                url.searchParams.set('theme', newTheme);
                window.history.replaceState({}, '', url);
                
                // 更新所有連結的主題參數
                updateLinksWithTheme();
            });
        }
        
        // 頁面載入時為連結添加主題參數
        updateLinksWithTheme();
    }
    
    // 如果 DOM 已經載入，立即執行；否則等待載入完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initThemeToggle();
            // DOM 載入完成後再次更新連結（確保所有連結都已渲染）
            setTimeout(updateLinksWithTheme, 100);
        });
    } else {
        initThemeToggle();
        // 如果 DOM 已載入，稍等一下再更新連結
        setTimeout(updateLinksWithTheme, 100);
    }
})();

// ============================================
// 導航列滾動效果
// ============================================
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ============================================
// 平滑滾動到區塊
// ============================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offsetTop = target.offsetTop - 80;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// ============================================
// 滾動進度條
// ============================================
const createScrollProgress = () => {
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 0%;
        height: 4px;
        background: linear-gradient(90deg, #3B82F6, #06B6D4);
        z-index: 9999;
        transition: width 0.1s ease;
        box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
    `;
    document.body.appendChild(progressBar);
    
    window.addEventListener('scroll', () => {
        const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (window.scrollY / windowHeight) * 100;
        progressBar.style.width = scrolled + '%';
    });
};

createScrollProgress();

// ============================================
// 載入動畫
// ============================================
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    }, 100);
    
    // 觸發初始動畫
    const heroElements = document.querySelectorAll('.hero-avatar-wrapper, .hero-text-wrapper');
    heroElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        setTimeout(() => {
            el.style.transition = 'all 0.8s ease';
            el.style.opacity = '1';
            el.style.transform = 'translate(0)';
        }, 200 + (index * 200));
    });
    
    // 頁面連結動畫
    const pageLinks = document.querySelectorAll('.page-link');
    pageLinks.forEach((link, index) => {
        link.style.opacity = '0';
        link.style.transform = 'translateY(20px)';
        setTimeout(() => {
            link.style.transition = 'all 0.6s ease';
            link.style.opacity = '1';
            link.style.transform = 'translateY(0)';
        }, 600 + (index * 100));
    });
});

// ============================================
// 視差滾動效果
// ============================================
const parallaxElements = document.querySelectorAll('.floating-shape, .hero-bg-pattern');
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    parallaxElements.forEach((element, index) => {
        const speed = 0.5 + (index * 0.1);
        element.style.transform = `translateY(${scrolled * speed}px)`;
    });
});

// ============================================
// 小彩蛋：Logo 點擊、年份資訊、自訂提示
// ============================================
function createToastContainer() {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

function showToast(message, options = {}) {
    const {
        anchor = null,
        placement = 'bottom',
        offsetX = 0,
        offsetY = 0
    } = options;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = message.replace(/\n/g, '<br>');
    
    if (anchor) {
        toast.classList.add('toast-floating');
        document.body.appendChild(toast);
        
        const rect = anchor.getBoundingClientRect();
        const baseX = window.scrollX + rect.left + rect.width / 2;
        const baseY = placement === 'top'
            ? window.scrollY + rect.top - 10   // 基本往上顯示
            : window.scrollY + rect.bottom + 8; // 基本往下顯示
        const x = baseX + offsetX;
        const y = baseY + offsetY;
        toast.style.setProperty('--toast-left', `${x}px`);
        toast.style.setProperty('--toast-top', `${y}px`);
    } else {
        const container = createToastContainer();
        toast.classList.add('toast-center');
        container.appendChild(toast);
    }
    
    requestAnimationFrame(() => {
        toast.classList.add('visible');
    });
    
    setTimeout(() => {
        toast.classList.add('hide');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, 3200);
}

function initLogoClickEasterEgg() {
    const logos = document.querySelectorAll('.logo-text');
    if (!logos.length) {
        return;
    }
    
    const STORAGE_KEY = 'logoClickCount';
    
    logos.forEach(logo => {
        logo.addEventListener('click', () => {
            const currentCount = Number(sessionStorage.getItem(STORAGE_KEY) || 0) + 1;
            sessionStorage.setItem(STORAGE_KEY, currentCount);
            
            if (currentCount >= 10) {
                // Logo 彩蛋：提示在 Logo 右下方一點，避免貼到邊界
                showToast(
                    '恭喜你發現了小彩蛋!<br>(但好像沒什麼意義就是了...)',
                    { anchor: logo, placement: 'bottom', offsetX: 53, offsetY: 20 }
                );
                sessionStorage.setItem(STORAGE_KEY, 0);
            }
        });
    });
}

function initYearInfoEasterEgg() {
    const yearButtons = document.querySelectorAll('.year-trigger');
    if (!yearButtons.length) {
        return;
    }
    
    const VISIT_KEY = 'oldfishVisitCount';
    const visitCount = Number(localStorage.getItem(VISIT_KEY) || 0) + 1;
    localStorage.setItem(VISIT_KEY, visitCount);
    
    yearButtons.forEach(button => {
        button.addEventListener('click', () => {
            const launchDate = button.dataset.launch || '2025-01-01';
            // 年份彩蛋：從按鈕「更上方」彈出一點，避免太貼近按鈕
            showToast(
                `本站建立於 ${launchDate}<br>這是你第 ${visitCount} 次拜訪`,
                { anchor: button, placement: 'top', offsetY: -70 }
            );
        });
    });
}

function initEasterEggs() {
    initLogoClickEasterEgg();
    initYearInfoEasterEgg();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEasterEggs);
} else {
    initEasterEggs();
}

// ============================================
// 功能開關檢查
// ============================================
function checkWhisperEnabled() {
    const enabled = localStorage.getItem('whisperEnabled');
    // 如果未設置，預設為啟用
    return enabled === null || enabled === 'true';
}

// ============================================
// 顯示功能關閉提醒視窗
// ============================================
function showFeatureDisabledModal() {
    // 檢查是否已經顯示過
    if (document.getElementById('featureDisabledModal')) {
        return;
    }
    
    const modal = document.createElement('div');
    modal.id = 'featureDisabledModal';
    modal.className = 'feature-disabled-modal';
    
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    const isDark = theme === 'dark';
    
    modal.innerHTML = `
        <div class="feature-disabled-modal-backdrop"></div>
        <div class="feature-disabled-modal-content">
            <div class="feature-disabled-modal-icon">🔒</div>
            <h2 class="feature-disabled-modal-title">悄悄話功能已關閉</h2>
            <p class="feature-disabled-modal-message">
                抱歉，悄悄話功能目前暫時關閉中。<br>
                如有需要，請透過其他方式聯繫。
            </p>
            <button class="feature-disabled-modal-button" onclick="this.closest('.feature-disabled-modal').remove()">
                我知道了
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 添加動畫
    requestAnimationFrame(() => {
        modal.classList.add('visible');
    });
    
    // 點擊背景關閉
    modal.querySelector('.feature-disabled-modal-backdrop').addEventListener('click', () => {
        modal.remove();
    });
}

// ============================================
// 顯示過濾器提醒視窗
// ============================================
function showFilterAlertModal(matches) {
    // 檢查是否已經顯示過
    if (document.getElementById('filterAlertModal')) {
        return;
    }
    
    const modal = document.createElement('div');
    modal.id = 'filterAlertModal';
    modal.className = 'filter-alert-modal';
    
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    const isDark = theme === 'dark';
    
    const matchedWords = matches.map(m => m.word).join('、');
    
    modal.innerHTML = `
        <div class="filter-alert-modal-backdrop"></div>
        <div class="filter-alert-modal-content">
            <div class="filter-alert-modal-icon">⚠️</div>
            <h2 class="filter-alert-modal-title">內容包含不當用語</h2>
            <p class="filter-alert-modal-message">
                您的訊息中包含以下不當用語：<br>
                <strong class="filter-alert-modal-words">${matchedWords}</strong>
            </p>
            <p class="filter-alert-modal-hint">
                請修改您的訊息內容後再試。
            </p>
            <div class="filter-alert-modal-actions">
                <button class="filter-alert-modal-button filter-alert-modal-button-primary" onclick="this.closest('.filter-alert-modal').remove()">
                    我知道了
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 添加動畫
    requestAnimationFrame(() => {
        modal.classList.add('visible');
    });
    
    // 點擊背景關閉
    modal.querySelector('.filter-alert-modal-backdrop').addEventListener('click', () => {
        modal.remove();
    });
}

// ============================================
// 悄悄話表單提交
// ============================================
function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    
    if (!contactForm) {
        return; // 不是悄悄話頁面，直接返回
    }
    
    // 檢查功能是否啟用
    if (!checkWhisperEnabled()) {
        // 禁用表單
        contactForm.style.opacity = '0.5';
        contactForm.style.pointerEvents = 'none';
        
        // 顯示提醒視窗
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', showFeatureDisabledModal);
        } else {
            showFeatureDisabledModal();
        }
        return;
    }
    
    // 創建訊息提示區域
    let messageAlert = document.getElementById('formMessageAlert');
    if (!messageAlert) {
        messageAlert = document.createElement('div');
        messageAlert.id = 'formMessageAlert';
        messageAlert.style.cssText = `
            margin-top: 1rem;
            padding: 1rem;
            border-radius: 12px;
            display: none;
            font-size: 0.95rem;
            line-height: 1.5;
        `;
        contactForm.appendChild(messageAlert);
    }
    
    function showMessage(text, type = 'success') {
        messageAlert.textContent = text;
        messageAlert.style.display = 'block';
        if (type === 'success') {
            messageAlert.style.background = 'rgba(16, 185, 129, 0.1)';
            messageAlert.style.color = '#10B981';
            messageAlert.style.border = '1px solid rgba(16, 185, 129, 0.3)';
        } else {
            messageAlert.style.background = 'rgba(239, 68, 68, 0.1)';
            messageAlert.style.color = '#EF4444';
            messageAlert.style.border = '1px solid rgba(239, 68, 68, 0.3)';
        }
    }
    
    function hideMessage() {
        messageAlert.style.display = 'none';
    }
    
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideMessage();
        
        const submitButton = contactForm.querySelector('.btn-submit');
        const originalText = submitButton.innerHTML;
        const originalBg = submitButton.style.background;
        
        // 獲取表單數據
        const formData = new FormData(contactForm);
        const name = formData.get('name')?.trim();
        const message = formData.get('message')?.trim();
        
        // 驗證表單
        if (!name || !message) {
            showMessage('請填寫所有欄位', 'error');
            return;
        }
        
        // 檢查過濾器（如果已載入）
        if (typeof ContentFilter !== 'undefined') {
            const filterResult = ContentFilter.detect(name + ' ' + message);
            if (filterResult.detected) {
                // 記錄過濾統計
                filterResult.matches.forEach(match => {
                    ContentFilter.recordBlock(match.category || 'general');
                });

                // 記錄被攔截的內容（供 admin 查看）
                if (typeof ContentFilter.logBlockedContent === 'function') {
                    ContentFilter.logBlockedContent({
                        page: window.location.pathname,
                        name,
                        message,
                        matches: filterResult.matches
                    });
                }

                // 同步送到後端（全站攔截紀錄）
                try {
                    const API_ENDPOINT = 'https://oldfish-profile.vercel.app/api/log-blocked';
                    const useAPI = API_ENDPOINT.includes('YOUR_API_URL') === false;
                    if (useAPI) {
                        fetch(API_ENDPOINT, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                path: window.location.pathname,
                                name,
                                message,
                                matches: filterResult.matches
                            })
                        }).catch(() => {});
                    }
                } catch (e) {}
                
                // 顯示過濾提醒視窗
                showFilterAlertModal(filterResult.matches);
                
                // 恢復按鈕狀態
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
                submitButton.style.background = originalBg;
                return;
            }
        }
        
        // 顯示載入狀態
        submitButton.disabled = true;
        submitButton.innerHTML = '<span>送出中...</span>';
        
        try {
            // 使用 GitHub Issues API 創建 Issue
            // 需要設置後端 API 端點（見 api/create-issue.js）
            // 設置步驟：
            // 1. 部署 api/create-issue.js 到 Vercel/Netlify
            // 2. 設置環境變數 GITHUB_TOKEN
            // 3. 將下面的 API_ENDPOINT 替換為你的 API URL
            
            const API_ENDPOINT = 'https://oldfish-profile.vercel.app/api/create-issue'; // 替換為實際的 API URL
            
            // 檢查是否已設置 API
            const useAPI = API_ENDPOINT.includes('YOUR_API_URL') === false;
            
            if (useAPI) {
                // 使用 GitHub Issues API（通過後端代理）
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: name,
                        message: message
                    })
                });
                
                const data = await response.json();
                
                if (response.ok && data.success) {
                    // 顯示成功訊息
                    showMessage('✓ 訊息已成功送出！', 'success');
                    submitButton.innerHTML = '<span>✓ 已送出</span>';
                    submitButton.style.background = 'var(--gradient-secondary)';
                    
                    // 重置表單
                    contactForm.reset();
                    
                    // 3 秒後恢復按鈕
                    setTimeout(() => {
                        submitButton.disabled = false;
                        submitButton.innerHTML = originalText;
                        submitButton.style.background = originalBg;
                        hideMessage();
                    }, 3000);
                    return;
                } else {
                    throw new Error(data.error || '提交失敗');
                }
            } else {
                // 備用方案：使用 localStorage（僅用於開發測試）
                console.warn('⚠️ API 端點未設置，使用 localStorage 作為備用方案');
                console.warn('⚠️ 請設置 API 端點以接收來自世界各地的訊息');
                
                const messageData = {
                    id: Date.now() + Math.random(),
                    name: name,
                    message: message,
                    timestamp: new Date().toISOString(),
                    read: false
                };
                
                let messages = [];
                try {
                    const existingData = localStorage.getItem('whisperMessages');
                    if (existingData) {
                        messages = JSON.parse(existingData);
                        if (!Array.isArray(messages)) {
                            messages = [];
                        }
                    }
                } catch (error) {
                    messages = [];
                }
                
                messages.unshift(messageData);
                if (messages.length > 1000) {
                    messages = messages.slice(0, 1000);
                }
                
                localStorage.setItem('whisperMessages', JSON.stringify(messages));
                
                showMessage('✓ 訊息已送出（本地測試模式）。請設置 API 端點以接收來自世界各地的訊息。', 'success');
                submitButton.innerHTML = '<span>✓ 已送出</span>';
                submitButton.style.background = 'var(--gradient-secondary)';
                
                contactForm.reset();
                
                setTimeout(() => {
                    submitButton.disabled = false;
                    submitButton.innerHTML = originalText;
                    submitButton.style.background = originalBg;
                    hideMessage();
                }, 5000);
            }
            
        } catch (error) {
            console.error('提交失敗:', error);
            showMessage('✗ 送出失敗：' + (error.message || '請稍後再試'), 'error');
            submitButton.innerHTML = '<span>✗ 送出失敗</span>';
            submitButton.style.background = 'var(--accent)';
            
            setTimeout(() => {
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
                submitButton.style.background = originalBg;
            }, 3000);
        }
    });
}

// 確保在 DOM 載入後執行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContactForm);
} else {
    initContactForm();
}
