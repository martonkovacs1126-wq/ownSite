import './app.css';
import PocketBase from 'pocketbase';

// Csatlakozunk a helyi PocketBase-hez
const pb = new PocketBase('http://127.0.0.1:8090');

// Itt jöhet a többi kódod (pl. a pb inicializálás és a checkAuth)

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
      const avatar = document.querySelector(".avatarr");
      const initials = getInitials(user.name);
      const roleData = Array.isArray(user.expand?.role) 
          ? user.expand.role[0] 
          : user.expand?.role;
      if (userDisplay) {
        const roleTitle = roleData?.title || 'Tag';
        const fullName = user.name || user.email;

        userDisplay.innerHTML = `${fullName}<br><span class="rang">${roleTitle}</span>`;
      }
      if (avatar) {
        avatar.innerHTML = initials;
      }
      const roleTitle = roleData?.title || 'Tag'; 

        // Debugging: írasd ki a konzolba, hogy lássuk, mit kap el
        console.log("Felhasználó rangja:", roleTitle);

        // Admin menü megjelenítése, ha Rendszergazda
        if (roleTitle === "Rendszergazda") {
        const menuList = document.querySelector("ul"); // Vagy querySelector("#menuList")
        const logoutLi = menuList?.querySelector(".mt-auto");
    
      if (menuList && logoutLi && !document.querySelector("#adminMenu")) {
          const adminHTML = `<li id="adminMenu"><a href="http://127.0.0.1:8090/_/" target="_blank"><i class="fi fi-br-limit-hand"></i>Admin felület</a></li>`;
          logoutLi.insertAdjacentHTML('beforebegin', adminHTML);
      }
}
    } catch (error) {
        console.error("Hiba a felhasználói adatok lekérésekor:", error);
        pb.authStore.clear();
        window.location.replace('login.html');
    }
}

// Indítás az oldal betöltésekor
checkAuth();

async function getActiveUsers() {
  const activeusers = document.querySelector("#activeusers");
      const activeresult = pb.collection('users').getList(1,1);
      if(!activeusers) return;
      
      try {
        activeusers.innerHTML = (await activeresult).totalItems;
      } catch {
        console.log(error);
      };
}

getActiveUsers();


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
        createToast("error", "Töltsd ki mindkét mezőt!");
        return;
    }

    try {
        console.log("2. 📡 Bejelentkezés a PocketBase-be...");
        
        // A PocketBase beépített auth metódusa
        await pb.collection('users').authWithPassword(emailValue, passwdValue);

        localStorage.setItem('loginSuccess', 'Sikeres bejelentkezés!');
        window.location.replace('index.html');
    } catch (error) {
        console.error("❌ PocketBase hiba:", error);
        createToast("error", 'Hibás e-mail cím vagy jelszó!');
    }
});

document.addEventListener('DOMContentLoaded', () => {
  const toastMessage = localStorage.getItem('loginSuccess');
  
  if (toastMessage) {
    // Azonnal töröljük, hogy egyszer jelenjen csak meg
    localStorage.removeItem('loginSuccess');

    // Meghívjuk a toast függvényt a mentett üzenettel
    createToast('success', toastMessage);
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

    localStorage.setItem("logout", "Sikeres kijelentkezés!")
    window.location.replace('login.html');
});


// === 4. SEGÉDFÜGGVÉNYEK (TOAST) ===
function createToast(type, message) {
    const container = document.querySelector(".toastContainer");
    if (!container) return;
    let alertClass = "alert-success";
    let alertIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>`;
    if (type === "warning") {
      alertClass = "alert-warning";
      alertIcon = ` <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>`;
    }
    if (type === "error") {
      alertClass = "alert-error";
      alertIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>`;
    }
    if (type === "info") {
      alertClass = "alert-info";
      alertIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="h-6 w-6 shrink-0 stroke-current">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
  </svg>`;
    }
    // Létrehozzuk a dobozt, ÉS rátesszük a .toast osztályt, amit a CSS keres!
    const toast = document.createElement("div");
    toast.className = "my-toast"; // <--- EZ KELL HOGY LEGYEN!
    
    toast.innerHTML = `
      <div role="alert" class="alert ${alertClass} shadow-lg">
        ${alertIcon}
        <span>${message}</span>
      </div>
    `;

    container.appendChild(toast);

    // 3 másodperc múlva elindítjuk a kilépő animációt
    setTimeout(() => {
        dismissToast(toast);
    }, 3000);
}

function dismissToast(toastElement) {
    toastElement.classList.add('fade-out'); // <--- Ez aktiválja a .toast.fade-out CSS-t
    toastElement.addEventListener('animationend', () => {
        toastElement.remove();
    });
}

function getInitials(fullName) {
  if (!fullName) return '';
  
  return fullName
    .trim()
    .split(/\s+/) // Szétbontja a szóközök mentén (akár több szóköz esetén is működik)
    .map(word => word.charAt(0).toUpperCase()) // Kiveszi az első betűt és nagybetűsíti
    .join(''); // Összefűzi egy sztringgé
}

// === REGISZTRÁCIÓ ===
//EGYELŐRE NEM ELLENŐRZI, HOGY AZ ADATVÉDELMI TÁJÉKOZTATÓ ELFOGADÁSRA KERÜLT-E
// Figyeljük a teljes dokumentumot a submit eseményre
// Közvetlenül a gomb kattintását figyeljük, így a dialog/form nem tudja elnyelni
document.addEventListener('click', async (e) => {
  // Megnézzük, hogy a gombra kattintottak-e (id="btnlogin")
  if (e.target && e.target.id === 'regbtn') {
    e.preventDefault(); // Megakadályozzuk az alapértelmezett gomb-viselkedést

    // Kiolvassuk az értékeket
    const reg_email = document.querySelector("#reg_email").value;
    const reg_name = document.querySelector("#reg_name").value;
    const reg_pwd1 = document.querySelector("#reg_pwd1").value;
    const reg_pwd2 = document.querySelector("#reg_pwd2").value;

    // Jelszó egyezés ellenőrzése
    if (reg_pwd1 !== reg_pwd2) {
      alert('A két jelszó nem egyezik!');
      return;
    }

    if (reg_pwd1.length < 8) {
      alert("A jelszó 8 karakternél rövidebb.");
      return;
    }

    const username = "";

    const data = {
      email: reg_email,
      name: reg_name,
      password: reg_pwd1,
      passwordConfirm: reg_pwd2,
      emailVisibility: true,
      role: "u6zg3dujd3hiofv", //felhasználó
      status: "jlpaovgvjlb5x8y",
    };

    try {
      const record = await pb.collection('users').create(data);
      localStorage.setItem('registerSuccess', 'Sikeres regisztráció!');
      window.location.href = '/login.html';
    } catch (error) {
      console.error('Részletes hiba:', error.response || error.data); // <--- Ezt írd át
      alert('Hiba: ' + (error.data?.message || 'Nem sikerült a regisztráció.'));
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const toastMessage = localStorage.getItem('registerSuccess');
  
  if (toastMessage) {
    // Azonnal töröljük, hogy egyszer jelenjen csak meg
    localStorage.removeItem('registerSuccess');

    // Meghívjuk a toast függvényt a mentett üzenettel
    createToast('success', toastMessage);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const toastMessage = localStorage.getItem('logout');
  
  if (toastMessage) {
    // Azonnal töröljük, hogy egyszer jelenjen csak meg
    localStorage.removeItem('logout');

    // Meghívjuk a toast függvényt a mentett üzenettel
    createToast('info', toastMessage);
  }
});

