// Csatlakozunk a helyi PocketBase-hez
const pb = new PocketBase('http://127.0.0.1:8090');

console.log("1. 🚀 Script.js lefutott ezen az oldalon:", window.location.pathname);

// === 1. VÍZZÁRÓ ÚTVONAL- ÉS MUNKAMENET-VÉDELEM (ROUTE GUARD) ===
// FONTOS: Itt ott kell lennie az 'async' szónak a function előtt!
async function checkAuth() {
    const isLoginPage = window.location.pathname.includes('login.html');
    const isLoggedIn = pb.authStore.isValid;

    if (isLoginPage) {
        if (isLoggedIn) {
            console.log("✅ Már be van jelentkezve, átirányítás az index.html-re...");
            window.location.replace('index.html');
        }
        return;
    }

    if (!isLoggedIn) {
        console.warn("⚠️ Nincs bejelentkezett felhasználó, átirányítás a login.html-re...");
        window.location.replace('login.html');
        return;
    }

    try {
        // Ez a 29. sor környéki rész: az 'await' CSAK itt, egy async függvényen belül működik helyesen!
        const userId = pb.authStore.model.id;
        const user = await pb.collection('users').getOne(userId, {
            expand: 'role'
        });
        const userDisplay = document.querySelector("#username");
        const avatar = document.querySelector(".avatar");

        if (userDisplay) {
            const roleTitle = user.expand?.role?.title || 'Tag'; 
            const fullName = user.name || user.email;

            userDisplay.innerHTML = `${fullName}<br><span class="rang">${roleTitle}</span>`;
        }
        if (avatar) {
            const initialSource = user.name || user.email;
            avatar.innerHTML = initialSource[0].toUpperCase();
        }

    } catch (error) {
        console.error("Hiba a felhasználói adatok lekérésekor:", error);
        pb.authStore.clear();
        window.location.replace('login.html');
    }
}

// Indítás az oldal betöltésekor
checkAuth();


// === 2. BEJELENTKEZÉS KEZELÉSE ===
document.addEventListener("click", async function(e) {
    const loginBtn = e.target.closest("#btnlogin");
    if (!loginBtn) return;

    e.preventDefault();

    const emailInput = document.querySelector("#email");
    const passwdInput = document.querySelector("#pwd");

    if (!emailInput || !passwdInput) return;

    const emailValue = emailInput.value.trim();
    const passwdValue = passwdInput.value.trim();

    if (!emailValue || !passwdValue) {
        createToast("Töltsd ki mindkét mezőt!");
        return;
    }

    try {
        console.log("2. 📡 Bejelentkezés a PocketBase-be...");
        
        // A PocketBase beépített auth metódusa
        await pb.collection('users').authWithPassword(emailValue, passwdValue);

        console.log("4. 🎉 Sikeres belépés, átirányítás...");
        window.location.replace('index.html');

    } catch (error) {
        console.error("❌ PocketBase hiba:", error);
        createToast('Hibás e-mail cím vagy jelszó!');
    }
});


// === 3. KIJELENTKEZÉSI KEZELÉS ===
document.addEventListener("click", function(e) {
    const logoutBtn = e.target.closest("#logoutbtn");
    if (!logoutBtn) return;

    e.preventDefault();
    console.log("🚪 Kijelentkezés indítása...");

    // PocketBase tokenek törlése a memóriából és localStorage-ből
    pb.authStore.clear();

    console.log("🧹 Átirányítás a login.html-re...");
    window.location.replace('login.html');
});


// === 4. SEGÉDFÜGGVÉNYEK (TOAST) ===
function createToast(message) {
    const container = document.querySelector(".toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<div class="warning"><img src="alert.png"></div>
        <p class="message">${message}</p>`;
    container.appendChild(toast);

    setTimeout(() => {
        dismissToast(toast);
    }, 2000);
}

function dismissToast(toastElement) {
    toastElement.classList.add('fade-out');
    toastElement.addEventListener('animationend', () => {
        toastElement.remove();
    });
}