// Csatlakozunk a helyi Directus-hoz
const DIRECTUS_URL = 'http://127.0.0.1:8055';

console.log("1. 🚀 Script.js lefutott ezen az oldalon:", window.location.pathname);

// === 1. VÍZZÁRÓ ÚTVONAL- ÉS MUNKAMENET-VÉDELEM (ROUTE GUARD) ===
async function checkAuth() {
    const token = localStorage.getItem('directus_token');
    const isLoginPage = window.location.pathname.includes('login.html');

    // ===================================================
    // A) HA A LOGIN.HTML OLDALON VAGYUNK
    // ===================================================
    if (isLoginPage) {
        if (token) {
            console.log("🔍 Token található a login oldalon, érvényesség ellenőrzése...");
            try {
                const res = await fetch(`${DIRECTUS_URL}/users/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    console.log("✅ A token érvényes, átirányítás az index.html-re...");
                    window.location.replace('index.html');
                    return;
                }
            } catch (e) {
                console.warn("Nem érhető el a szerver a token ellenőrzéséhez.");
            }

            // Ha a token érvénytelen/lejárt (401 vagy egyéb hiba):
            console.warn("🧹 Érvénytelen token a login oldalon! Törlés...");
            localStorage.removeItem('directus_token');
            localStorage.removeItem('directus_refresh_token');
        }

        // 🛑 MEGÁLLÓ: Ha a login oldalon vagyunk és nincs érvényes token, ITT MARADUNK!
        return;
    }

    // ===================================================
    // B) HA AZ INDEX.HTML (VAGY MÁS VÉDETT) OLDALON VAGYUNK
    // ===================================================
    if (!token) {
        console.warn("⚠️ Nincs token, átirányítás a login.html-re...");
        window.location.replace('login.html');
        return;
    }

    try {
        const response = await fetch(`${DIRECTUS_URL}/users/me?fields=id,email,role.*, first_name, last_name, policies.policy.*,role.*,role.policies.policy.*`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401 || !response.ok) {
            console.warn("🛑 Érvénytelen token az index oldalon. Törlés és átirányítás...");
            localStorage.removeItem('directus_token');
            localStorage.removeItem('directus_refresh_token');
            window.location.replace('login.html');
            return;
        }

        const result = await response.json();
        const user = result.data;
        console.log("👤 Munkamenet aktív. Belépve mint:", user.email);
        const userDisplay = document.querySelector("#username");
        const avatar = document.querySelector(".avatar");
        if (userDisplay) {
            userDisplay.innerHTML = `${user.last_name} ${user.first_name}<br><span class="rang">${user.role.name}</span>`;
        }
        if (avatar) {
            avatar.innerHTML = user.last_name[0] + user.first_name[0];
        }
        // Admin menü kezelése
        // 1. Összegyűjtjük a közvetlen és a rangból származó policy-kat
        const directPolicies = user.policies?.map(p => p.policy) || [];
        const rolePolicies = user.role?.policies?.map(p => p.policy) || [];
        const allPolicies = [...directPolicies, ...rolePolicies];

        // 2. Megnézzük, hogy van-e köztük 'access_adminpanel' nevű policy (vagy ID-jú)
        const isAdmin = allPolicies.some(p => p?.name === 'access_adminpanel' || p?.id === 'access_adminpanel');

        // 3. Admin menü megjelenítése / elrejtése
        const adminMenu = document.querySelector("#adminMenu");
        if (adminMenu) {
            if (isAdmin) {
            document.querySelector("#adminLink").setAttribute("href", "http://127.0.0.1:8055");
                adminMenu.classList.remove('hidden'); // Ha admin, eltávolítjuk a hidden osztályt
            } else {
                document.querySelector("#adminLink").setAttribute("href", "");
                adminMenu.classList.add('hidden');    // Ha nem admin, rátesszük a hidden osztályt
            }
        }

    } catch (error) {
        console.error("Hálózati hiba a munkamenet ellenőrzésekor:", error);
    }
}

// Indítás az oldal betöltésekor
checkAuth();


// === 2. BEJELENTKEZÉS KEZELÉSE ===
document.addEventListener("click", async function(e) {
    const loginBtn = e.target.closest("#btnlogin");
    if (!loginBtn) return;

    e.preventDefault();

    // Régi beragadt tokenek letakarítása
    localStorage.removeItem('directus_token');
    localStorage.removeItem('directus_refresh_token');

    console.log("1. 🧹 Régi tokenek törölve, bejelentkezés indítása...");

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
        console.log("2. 📡 Küldés a Directusnak...");
        const response = await fetch(`${DIRECTUS_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: emailValue,
                password: passwdValue,
                mode: "json"
            }),

        });

        console.log("3. 📩 Szerver válasz státusz:", response.status);

        if (!response.ok) {
            const errorResult = await response.json();
            console.error("❌ Directus hiba:", errorResult);
            createToast('Hibás e-mail cím vagy jelszó!');
            return;
        }

        const result = await response.json();

        // Új tokenek mentése
        localStorage.setItem('directus_token', result.data.access_token);
        if (result.data.refresh_token) {
            localStorage.setItem('directus_refresh_token', result.data.refresh_token);
        }

        console.log("4. 🎉 Sikeres belépés, átirányítás...");
        window.location.replace('index.html');

    } catch (error) {
        console.error("💥 Hálózati hiba:", error);
        createToast('Hálózati hiba történt!');
    }
});


// === 3. KIJELENTKEZÉS KEZELÉSE ===
document.addEventListener("click", async function(e) {
    const logoutBtn = e.target.closest("#logoutbtn");
    if (!logoutBtn) return;

    e.preventDefault();
    console.log("🚪 Kijelentkezés indítása...");

    const refreshToken = localStorage.getItem('directus_refresh_token');

    // Azonnali helyi törlés
    localStorage.removeItem('directus_token');
    localStorage.removeItem('directus_refresh_token');

    if (refreshToken) {
        try {
            await fetch(`${DIRECTUS_URL}/auth/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    refresh_token: refreshToken,
                    mode: "json"
                })
            });
            console.log("✅ Szerveroldali munkamenet lezárva.");
        } catch (error) {
            console.warn("⚠️ A szerver nem válaszolt a logoutra, de a helyi tokenek törölve lettek.");
        }
    }

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