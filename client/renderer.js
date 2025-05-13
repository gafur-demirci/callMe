const socket = io("http://localhost:3000");
// MARK: - BUTTONS
const usernameInput = document.getElementById("usernameInput");
const joinBtn = document.getElementById("joinBtn");
const userListEl = document.getElementById("userList");
const targetUserSelect = document.getElementById("targetUser");

const startCallBtn = document.getElementById("startCall");
const acceptCallBtn = document.getElementById("acceptCall");
const endCallBtn = document.getElementById("endCall");
const cancelCallBtn = document.getElementById("cancelCall");

const statusText = document.getElementById("status");
const incomingCallDiv = document.getElementById("incomingCall");
// MARK: - VARIABLES
let myUsername = "";
let callingUser = "";
let peerConnection;
let localStream;
let offerReceived = null;
let accepted = false;
// MARK: - FUNCTIONS
function updateStatus(text, isError = false) {
  statusText.textContent = `Durum: ${text}`;
  statusText.className = isError ? "error" : "";
}

function showIncomingCall() {
  document.getElementById("incomingCall").style.display = "block";
}

function hideIncomingCall() {
  document.getElementById("incomingCall").style.display = "none";
}
// MARK: - ASYNC FUNCTIONS
async function getMicrophoneStream() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return stream;
  } catch (err) {
    updateStatus("Mikrofon izni reddedildi. Lütfen izin verin.", true);
    alert("Lütfen mikrofon erişimine izin verin.");
    throw err;
  }
}

async function setupPeerConnection() {
  peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", {
        target: callingUser,
        candidate: event.candidate,
      });
    }
  };

  peerConnection.ontrack = (event) => {
    const remoteAudio = new Audio();
    remoteAudio.srcObject = event.streams[0];
    remoteAudio.play();
  };
}

async function handleOffer(offer) {
  await setupPeerConnection();
  localStream = await getMicrophoneStream();

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit("answer", answer);
  updateStatus("Bağlantı kuruldu!");
}
// MARK: - BUTTON EVENTS
startCallBtn.onclick = async () => {
  callingUser = targetUserSelect.value;
  if (!callingUser) return alert("Hedef kullanıcı seçilmedi.");

  await setupPeerConnection();
  localStream = await getMicrophoneStream();
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit("offer", {
    target: callingUser,
    offer,
    from: myUsername
  });

  cancelCallBtn.disabled = false;
};

acceptCallBtn.onclick = async () => {
  if (!offerReceived) return;

  accepted = true;
  await setupPeerConnection();
  localStream = await getMicrophoneStream();
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offerReceived.offer));
  callingUser = offerReceived.from;

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit("answer", {
    target: callingUser,
    answer
  });

  hideIncomingCall();
  updateStatus("Görüşme başladı.");
};

cancelCallBtn.onclick = () => {
  socket.emit("call-cancelled");
  updateStatus("Çağrı iptal edildi.");
  cancelCallBtn.disabled = true;
};

endCallBtn.onclick = () => {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
    updateStatus("Görüşme sonlandırıldı.");
  }
};

joinBtn.onclick = () => {
  const name = usernameInput.value.trim();
  if (!name) return alert("Lütfen kullanıcı adı girin.");
  myUsername = name;
  socket.emit("register", name);
  joinBtn.disabled = true;
  usernameInput.disabled = true;
  updateStatus(`${name} olarak giriş yapıldı.`);
};

// MARK: - SOCKET EVENTS
socket.on("offer", (data) => {
  offerReceived = data;
  callingUser = data.from;
  showIncomingCall();
  updateStatus(`${callingUser} kullanıcısından gelen çağrı.`);
});

socket.on("answer", async (answer) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  updateStatus("Karşı taraf cevap verdi.");
});

socket.on("ice-candidate", async (candidate) => {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (e) {
    console.error("ICE eklenemedi", e);
  }
});

socket.on("call-cancelled", () => {
  updateStatus("Karşı taraf çağrıyı iptal etti.");
  hideIncomingCall();
  offerReceived = null;
  accepted = false;
});

socket.on("user-list", (users) => {
  userListEl.innerHTML = "";
  targetUserSelect.innerHTML = "";

  users.forEach((user) => {
    if (user !== myUsername) {
      const li = document.createElement("li");
      li.textContent = user;
      userListEl.appendChild(li);

      const option = document.createElement("option");
      option.value = user;
      option.textContent = user;
      targetUserSelect.appendChild(option);
    }
  });

  startCallBtn.disabled = users.length <= 1;
});

// MARK: - INITIALIZATION
window.onload = async () => {
  try {
    await getMicrophoneStream();
    updateStatus("Mikrofon erişimi başarılı.");
    startCallBtn.disabled = false;
    acceptCallBtn.disabled = false;
  } catch {
    updateStatus("Mikrofona erişilemiyor.", true);
  }
};
