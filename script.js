document.addEventListener("DOMContentLoaded", function() {
  
  // --- NOUVEAU : GESTION SÉCURISÉE DES NOTIFICATIONS WINDOWS ---
  // Les navigateurs exigent que l'utilisateur interagisse avec la page avant d'autoriser les notifications.
  document.body.addEventListener('click', () => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then(permission => {
        if(permission === "granted") {
          sendPushNotification("L0K3D", "Notifications activées avec succès !");
        }
      });
    }
  }, { once: true }); // Ne se déclenche qu'au tout premier clic sur la page

  function sendPushNotification(title, text) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body: text, icon: "🚪" });
    } else {
      console.log("Notification bloquée par le navigateur : ", title, text);
    }
  }

  // --- 1. CONFIGURATION DE LA CONNEXION ---
  const cameraHost = window.location.hostname;
  const streamUrl = `${window.location.protocol}//${cameraHost}:81`;
  const WS_URL = `ws://${cameraHost}:82`;
  let ws;
  let lastStreamObjectUrl = null;

  const connectionDot = document.getElementById("connection-dot");

  try {
    ws = new WebSocket(WS_URL);
    const originalSend = ws.send.bind(ws);
    ws.send = function(data) {
      if (ws.readyState === WebSocket.OPEN) {
        originalSend(data);
      } else {
        console.warn("Mode test. Action simulée : " + data);
      }
    };
  } catch (error) {
    console.warn("Mode simulation activé.");
    ws = { send: function(msg) { console.log("Simulation WS : " + msg); }, readyState: 1 };
  }

  // --- GESTION DU MODE SOMBRE ---
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle && localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    themeToggle.innerHTML = "☀️ Mode Clair";
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      if (document.body.classList.contains("dark-mode")) {
        localStorage.setItem("theme", "dark");
        themeToggle.innerHTML = "☀️ Mode Clair";
      } else {
        localStorage.setItem("theme", "light");
        themeToggle.innerHTML = "🌙 Mode Sombre";
      }
    });
  }

  // --- 2. RÉCUPÉRATION DES ÉLÉMENTS ---
  const view = document.getElementById("stream");
  const personFormField = document.getElementById("person");
  const captureButton = document.getElementById("button-capture");
  const recogniseButton = document.getElementById("button-recognise");
  const deleteAllButton = document.getElementById("delete_all");
  const tempAccessCheckbox = document.getElementById("temp-access");
  const openDoorButton = document.getElementById("button-open-door");

  // Notifications visuelles non bloquantes (remplace les alertes navigateur).
  const toastContainer = document.createElement("div");
  toastContainer.className = "toast-container";
  document.body.appendChild(toastContainer);

  function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("show");
    });

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        toast.remove();
      }, 250);
    }, 3200);
  }

  // Fallback si le flux JPEG n'est pas pousse via WebSocket.
  if (view) {
    view.src = streamUrl;
  }

  // --- 3. MENU DE NAVIGATION ---
  const navLinks = document.querySelectorAll('.nav-link');
  const pageSections = document.querySelectorAll('.page-section');
  const sidebar = document.querySelector('.sidebar');
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');

  function closeMobileMenu() {
    if (sidebar) sidebar.classList.remove('open');
    document.body.classList.remove('mobile-menu-open');
    if (mobileMenuToggle) {
      mobileMenuToggle.setAttribute('aria-expanded', 'false');
      mobileMenuToggle.setAttribute('aria-label', 'Ouvrir le menu');
      mobileMenuToggle.textContent = '☰';
    }
  }

  function openMobileMenu() {
    if (sidebar) sidebar.classList.add('open');
    document.body.classList.add('mobile-menu-open');
    if (mobileMenuToggle) {
      mobileMenuToggle.setAttribute('aria-expanded', 'true');
      mobileMenuToggle.setAttribute('aria-label', 'Fermer le menu');
      mobileMenuToggle.textContent = '✕';
    }
  }

  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
      if (sidebar && sidebar.classList.contains('open')) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });
  }

  if (mobileMenuOverlay) {
    mobileMenuOverlay.addEventListener('click', closeMobileMenu);
  }

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      closeMobileMenu();
    }
  });

  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault(); 
      const targetPage = this.getAttribute('data-page');
      navLinks.forEach(l => l.classList.remove('active'));
      pageSections.forEach(s => s.classList.remove('active'));
      this.classList.add('active');
      const targetElement = document.getElementById(targetPage);
      if (targetElement) targetElement.classList.add('active');
      if (window.innerWidth <= 768) closeMobileMenu();
    });
  });

  // --- 4. GESTION DES SONS ---
  const a = new (window.AudioContext || window.webkitAudioContext)();
  function alertSound(w, x, y) {
    let v = a.createOscillator();
    let u = a.createGain();
    v.connect(u);
    v.frequency.value = x; 
    v.type = "square"; 
    u.connect(a.destination);
    u.gain.value = w * 0.01; 
    v.start(a.currentTime);
    v.stop(a.currentTime + y * 0.001); 
  }

  // --- 5. SYSTÈME DE PROFILS ET PASS 24H ---
  function formatTimeLeft(expireTime) {
    let diff = expireTime - Date.now();
    if (diff <= 0) return "⏱️ Expiré";
    let hours = Math.floor(diff / (1000 * 60 * 60));
    let minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    let seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (hours > 0) return `⏱️ ${hours}h ${minutes}m`;
    let secStr = seconds < 10 ? '0' + seconds : seconds;
    return `⏱️ ${minutes}m ${secStr}s`;
  }

  function checkExpiredPasses() {
    let tempPasses = JSON.parse(localStorage.getItem("l0k3d_temp_passes") || "{}");
    let now = Date.now();
    let modified = false;

    for (let person in tempPasses) {
      if (now > tempPasses[person]) {
        ws.send("remove:" + person);
        addHistoryItem("Pass expiré: " + person, "deleted", null, person);
        sendPushNotification("L0K3D - Pass expiré", `L'accès temporaire de ${person} a été révoqué.`);
        
        let item = document.getElementById("face-" + person);
        if (item) item.remove();
        delete tempPasses[person];
        modified = true;
      }
    }

    if (modified) localStorage.setItem("l0k3d_temp_passes", JSON.stringify(tempPasses));

    document.querySelectorAll('.temp-countdown').forEach(badge => {
      let expireTime = parseInt(badge.getAttribute('data-expire'));
      badge.textContent = formatTimeLeft(expireTime);
      if (expireTime - Date.now() <= 0) {
        badge.classList.add('expired');
        badge.classList.remove('temp-countdown'); 
      }
    });
  }

  setInterval(checkExpiredPasses, 1000);
  checkExpiredPasses(); 

  // --- ENREGISTREMENT ET AFFICHAGE DES PROFILS ---
  function logUserAccess(personName) {
    let logs = JSON.parse(localStorage.getItem("l0k3d_access_logs") || "{}");
    if (!logs[personName]) logs[personName] = [];
    
    const now = new Date();
    const timeString = now.toLocaleDateString('fr-FR') + " à " + now.toLocaleTimeString('fr-FR');
    
    logs[personName].unshift(timeString);
    localStorage.setItem("l0k3d_access_logs", JSON.stringify(logs));
  }

  // Permet d'ouvrir le profil n'importe où
  window.showUserProfile = function(personName) {
    const modal = document.getElementById('profile-modal');
    const nameDisplay = document.getElementById('profile-name-display');
    const countDisplay = document.getElementById('profile-open-count');
    const timeList = document.getElementById('profile-time-list');
    const closeBtn = document.getElementById('profile-close-btn');

    if (!modal || !nameDisplay || !countDisplay || !timeList || !closeBtn) return;

    nameDisplay.textContent = personName;
    
    let logs = JSON.parse(localStorage.getItem("l0k3d_access_logs") || "{}");
    let userLogs = logs[personName] || [];

    countDisplay.textContent = userLogs.length;
    timeList.innerHTML = "";

    if (userLogs.length === 0) {
      let li = document.createElement("li");
      li.textContent = "Aucun accès enregistré pour le moment.";
      timeList.appendChild(li);
    } else {
        userLogs.forEach(time => {
            let li = document.createElement("li");
        let icon = document.createElement("span");
        icon.textContent = "🔓";

        let timeText = document.createElement("span");
        timeText.classList.add("profile-time-text");
        timeText.textContent = time;

        li.appendChild(icon);
        li.appendChild(timeText);
            timeList.appendChild(li);
        });
    }

    modal.classList.add('show');
    closeBtn.onclick = () => modal.classList.remove('show');
  }


  // --- 6. MESSAGES ET ÉTAT DE LA CAMÉRA ---
  ws.onopen = () => {
    updateStatus("Connecté au système");
    if(connectionDot) {
      connectionDot.classList.remove("disconnected");
      connectionDot.classList.add("connected");
    }
  };

  ws.onclose = () => {
    updateStatus("Caméra déconnectée", "error");
    if(connectionDot) {
      connectionDot.classList.remove("connected");
      connectionDot.classList.add("disconnected");
    }
  };
  
  ws.onmessage = message => {
    if (typeof message.data === "string") {
      if (message.data.substr(0, 8) == "listface") {
        addFaceToScreen(message.data.substr(9)); 
      } else if (message.data == "delete_faces") {
        deleteAllFacesFromScreen(); 
      } 
      else if (message.data.startsWith("door_open")) {
          let parts = message.data.split(":");
          let person = parts.length > 1 ? parts[1] : null;

          alertSound(10, 233, 100); 
          alertSound(3, 603, 200); 

          // Si l'Arduino a bien envoyé "door_open:constant"
          if (person && person !== "null") {
              logUserAccess(person); 
              addHistoryItem("Accès autorisé: " + person, "success", null, person); 
              sendPushNotification("Accès Autorisé", `${person} a déverrouillé la porte.`);
          } else {
              // Si l'Arduino envoie juste "door_open" sans nom
              addHistoryItem("Accès autorisé (Utilisateur inconnu)", "success"); 
              sendPushNotification("Accès Autorisé", "La porte vient de s'ouvrir.");
          }
      } else if (message.data.startsWith("sys_msg:")) {
          let sysMsg = message.data.substring(8);
          addHistoryItem(sysMsg, "system");
      } else {
          updateStatus(message.data);
      }
    }
    if (message.data instanceof Blob && view) {
      if (lastStreamObjectUrl) {
        URL.revokeObjectURL(lastStreamObjectUrl);
      }
      lastStreamObjectUrl = URL.createObjectURL(message.data);
      view.src = lastStreamObjectUrl;
    }
  }

  window.addEventListener("beforeunload", () => {
    if (lastStreamObjectUrl) {
      URL.revokeObjectURL(lastStreamObjectUrl);
      lastStreamObjectUrl = null;
    }
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });

  // --- 7. ACTIONS DE NOS BOUTONS ---
  if (openDoorButton) openDoorButton.onclick = () => {
    showConfirmModal("Ouverture manuelle", "Déverrouiller la porte maintenant ?", () => {
      ws.send("open_door"); 
      updateStatus("Porte déverrouillée manuellement");
      addHistoryItem("Ouverture manuelle déclenchée", "success");
      sendPushNotification("Ouverture Manuelle", "Porte déverrouillée par l'administrateur.");
    });
  };

  if (captureButton) captureButton.onclick = () => {
    let person_name = personFormField ? personFormField.value.trim() : "";
    if (person_name) { 
      ws.send("capture:" + person_name); 
      updateStatus("Capture de " + person_name);
      
      let isTemporary = tempAccessCheckbox && tempAccessCheckbox.checked;
      
      if (isTemporary) {
        // let expireTime = Date.now() + (24 * 60 * 60 * 1000); 
        // Temps d'expiration temporaire de 1 minute pour les tests
        let expireTime = Date.now() + (1 * 60 * 1000);

        let tempPasses = JSON.parse(localStorage.getItem("l0k3d_temp_passes") || "{}");
        tempPasses[person_name] = expireTime;
        localStorage.setItem("l0k3d_temp_passes", JSON.stringify(tempPasses));
        
        addHistoryItem("Pass Visiteur créé: " + person_name, "added", expireTime, person_name);
        sendPushNotification("Nouvel Utilisateur", `${person_name} a été ajouté(e) pour 24h.`);
      } else {
        addHistoryItem("Enregistrement de: " + person_name, "added", null, person_name);
        sendPushNotification("Nouvel Utilisateur", `${person_name} a été ajouté(e).`);
      }
      
      addFaceToScreen(person_name);
      personFormField.value = "";
      if (tempAccessCheckbox) tempAccessCheckbox.checked = false;
      captureButton.disabled = true;

    } else {
      updateStatus("Veuillez entrer un nom", "error"); 
    }
  };
  
  if (recogniseButton) recogniseButton.onclick = () => {
    ws.send("recognise");
    updateStatus("Mode reconnaissance activé");
  };
  
  if (deleteAllButton) deleteAllButton.onclick = () => {
    showConfirmModal("Suppression totale", "Supprimer TOUS les visages ?", () => {
        ws.send("delete_all");
        addHistoryItem("Tous les visages ont été supprimés", "deleted");
        deleteAllFacesFromScreen(); 
        localStorage.removeItem("l0k3d_temp_passes");
        localStorage.removeItem("l0k3d_access_logs");
        sendPushNotification("Base effacée", "Tous les utilisateurs ont été supprimés.");
      }
    );
  };
  
  if (personFormField) personFormField.onkeyup = () => {
    if (captureButton) captureButton.disabled = personFormField.value.trim() === "";
  };

  // --- FILTRES ET EXPORT ---
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filterValue = btn.getAttribute('data-filter');
      const historyItems = document.querySelectorAll('#history-list .history-item:not(.empty-message)');
      
      historyItems.forEach(item => {
        if (filterValue === 'all' || item.getAttribute('data-status') === filterValue) {
          item.classList.remove('hidden');
        } else {
          item.classList.add('hidden');
        }
      });
    });
  });

  const exportBtn = document.getElementById('export-csv-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const historyItems = document.querySelectorAll('#history-list .history-item:not(.empty-message)');
      if (historyItems.length === 0) return;
      
      let csvContent = "Date et Heure,Action,Statut\n";
      historyItems.forEach(item => {
        let time = item.querySelector('.time').innerText;
        let name = item.querySelector('.name').innerText;
        let status = item.querySelector('.status').innerText;
        csvContent += `"${time}","${name}","${status}"\n`;
      });
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' }); 
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `historique_L0K3D_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  // --- 8. FONCTIONS D'AFFICHAGE ET D'INTERFACE ---
  function showConfirmModal(title, message, onConfirm) {
    const modal = document.getElementById('custom-modal');
    if (!modal) return;
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    modal.classList.add('show');
    document.getElementById('modal-cancel').onclick = () => modal.classList.remove('show');
    document.getElementById('modal-confirm').onclick = () => {
      modal.classList.remove('show');
      if(onConfirm) onConfirm(); 
    };
  }

  function updateStatus(message, type = "success") {
    const statusDisplay = document.getElementById("status-display");
    const currentStatus = document.getElementById("current-status");
    if (currentStatus) currentStatus.textContent = message;
    if (statusDisplay) statusDisplay.style.background = (type === "error") ? "#f44336" : "#4caf50";
  }

  function deleteAllFacesFromScreen() {
    const faceList = document.querySelector(".faces-list");
    if (faceList) while (faceList.firstChild) faceList.firstChild.remove(); 
  }

  function addFaceToScreen(person_name) {
    const faceList = document.querySelector(".faces-list");
    if (!faceList || document.getElementById("face-" + person_name)) return;

    let listItem = document.createElement("li");
    listItem.classList.add("face-item");
    listItem.id = "face-" + person_name; 
    
    let closeItem = document.createElement("span");
    closeItem.classList.add("delete");
    closeItem.textContent = "✕"; 
    
    // NOUVEAU : On gère le clic sur la croix sans déclencher le clic de la carte
    closeItem.addEventListener("click", function(e) {
      e.stopPropagation(); // Empêche l'ouverture du profil
      showConfirmModal("Supprimer un utilisateur", `Révoquer l'accès à ${person_name} ?`, () => {
        ws.send("remove:" + person_name); 
        listItem.remove(); 
        addHistoryItem("Visage supprimé: " + person_name, "deleted", null, person_name);
        sendPushNotification("Utilisateur Supprimé", `L'accès de ${person_name} a été révoqué.`);
        
        let tempPasses = JSON.parse(localStorage.getItem("l0k3d_temp_passes") || "{}");
        if (tempPasses[person_name]) {
          delete tempPasses[person_name];
          localStorage.setItem("l0k3d_temp_passes", JSON.stringify(tempPasses));
        }
      });
    });
    
    // NOUVEAU : On rend toute la ligne cliquable pour ouvrir le profil !
    listItem.addEventListener("click", () => {
      window.showUserProfile(person_name);
    });
    
    let nameContainer = document.createElement("strong");
    nameContainer.textContent = person_name;
    
    let tempPasses = JSON.parse(localStorage.getItem("l0k3d_temp_passes") || "{}");
    if (tempPasses[person_name]) {
      let badge = document.createElement("span");
      badge.classList.add("badge-temp", "temp-countdown"); 
      badge.setAttribute("data-expire", tempPasses[person_name]); 
      badge.textContent = formatTimeLeft(tempPasses[person_name]); 
      nameContainer.appendChild(badge);
    }
    
    listItem.appendChild(nameContainer);
    listItem.appendChild(closeItem);
    faceList.appendChild(listItem);
  }

  function addHistoryItem(message, status = "success", expireTime = null, personName = null) {
    const historyList = document.getElementById("history-list");
    if (!historyList) return;
    
    const emptyMsg = historyList.querySelector('.empty-message');
    if (emptyMsg) emptyMsg.remove();
    
    const now = new Date();
    const timeString = now.toLocaleTimeString('fr-FR') + " - " + now.toLocaleDateString('fr-FR');
    
    let historyItem = document.createElement("li");
    historyItem.classList.add("history-item");
    historyItem.setAttribute("data-status", status);
    
    const activeFilter = document.querySelector('.filter-btn.active');
    if (activeFilter && activeFilter.getAttribute('data-filter') !== 'all' && activeFilter.getAttribute('data-filter') !== status) {
      historyItem.classList.add('hidden');
    }
    
    let timeDiv = document.createElement("div");
    timeDiv.classList.add("time");
    timeDiv.textContent = timeString;
    
    let nameDiv = document.createElement("div");
    nameDiv.classList.add("name");
    nameDiv.textContent = message;

    if (personName) {
        nameDiv.classList.add("clickable-name");
        nameDiv.title = "Voir le profil de " + personName;
        nameDiv.addEventListener("click", () => window.showUserProfile(personName));
    }

    if (expireTime) {
      let badge = document.createElement("span");
      badge.classList.add("badge-temp", "temp-countdown");
      badge.setAttribute("data-expire", expireTime);
      badge.textContent = formatTimeLeft(expireTime);
      nameDiv.appendChild(badge);
    }
    
    let statusDiv = document.createElement("div");
    statusDiv.classList.add("status");
    
    if (status === "success") {
      statusDiv.classList.add("success"); statusDiv.textContent = "Autorisé";
    } else if (status === "deleted") {
      statusDiv.classList.add("denied"); statusDiv.textContent = "Supprimé";
    } else if (status === "added") {
      statusDiv.classList.add("success"); statusDiv.textContent = "Nouveau visage";
    } else if (status === "system") {
      statusDiv.classList.add("system"); statusDiv.textContent = "Système";
    } else {
      statusDiv.classList.add("denied"); statusDiv.textContent = "Refusé"; 
    }
    
    historyItem.appendChild(timeDiv);
    historyItem.appendChild(nameDiv);
    historyItem.appendChild(statusDiv);
    historyList.insertBefore(historyItem, historyList.firstChild);
    
    while (historyList.children.length > 20) {
      historyList.removeChild(historyList.lastChild);
    }
  }

  if (captureButton && personFormField) {
    captureButton.disabled = personFormField.value.trim() === "";
  }

  // --- GESTION DES PARAMÈTRES ---

  // Factorise la logique commune: validation, envoi WS, feedback UI.
  function bindSettingAction(buttonId, inputId, command, successMessageBuilder, min, max) {
    const button = document.getElementById(buttonId);
    const input = document.getElementById(inputId);
    if (!button || !input) return;

    button.addEventListener("click", () => {
      const value = Number.parseInt(input.value, 10);
      if (Number.isNaN(value) || value < min || value > max) {
        const message = `Valeur invalide: entre ${min} et ${max} secondes.`;
        updateStatus(message, "error");
        showToast(message, "error");
        return;
      }

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(`${command}:${value}`);
        const message = successMessageBuilder(value);
        updateStatus(message);
        showToast(message, "success");
      } else {
        const message = "Caméra déconnectée. Impossible d'envoyer le paramètre.";
        updateStatus(message, "error");
        showToast(message, "error");
      }
    });
  }

  bindSettingAction(
    "btn-auto-open",
    "auto-open-delay",
    "auto_open_delay",
    (value) => `Minuteur démarré: ouverture dans ${value} secondes.`,
    1,
    120
  );

  bindSettingAction(
    "btn-save-duration",
    "door-duration",
    "set_duration",
    (value) => `Durée d'ouverture mise à jour à ${value} secondes.`,
    1,
    60
  );

  bindSettingAction(
    "btn-save-cooldown",
    "cooldown-duration",
    "set_cooldown",
    (value) => `Délai anti-spam mis à jour à ${value} secondes.`,
    0,
    60
  );
});