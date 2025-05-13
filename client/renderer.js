const socket = io("http://localhost:3000");
// BUTTONS
const startCallBtn = document.getElementById("startCall");
const cancelCallBtn = document.getElementById("cancelCall");
const acceptCallBtn = document.getElementById("acceptCall");
const endCallBtn = document.getElementById("endCall");
const statusText = document.getElementById("status");
// VARIABLES
let peerConnection;
let localStream;
let offerReceived = null;
let accepted = false;
// FUNCTIONS
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
// ASYNC FUNCTIONS
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
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" }
    ]
  });

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", event.candidate);
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
// BUTTON EVENTS
startCallBtn.onclick = async () => {
  updateStatus("Çağrı başlatılıyor...");
  await setupPeerConnection();
  localStream = await getMicrophoneStream();

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit("offer", offer);

  cancelCallBtn.disabled = false; // 👈 butonu aktif et
};

cancelCallBtn.onclick = () => {
  socket.emit("call-cancelled");
  updateStatus("Çağrı iptal edildi.");
  cancelCallBtn.disabled = true;
};

acceptCallBtn.onclick = async () => {
  updateStatus("Çağrı kabul edildi. Bağlantı kuruluyor...");
  accepted = true;
  hideIncomingCall();

  if (offerReceived) {
    await handleOffer(offerReceived);
  }

  if (!offerReceived) {
  updateStatus("Aktif çağrı yok.");
  return;
}
};

endCallBtn.onclick = () => {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
    updateStatus("Görüşme sonlandırıldı.");
  }
};
// SOCKET EVENTS
socket.on("offer", async (offer) => {
  offerReceived = offer;
  updateStatus("Gelen çağrı var. Kabul etmek için butona basın.");
  showIncomingCall(); // 👈 burada bildirimi göster

  if (accepted) {
    await handleOffer(offer);
    hideIncomingCall(); // 👈 çağrı kabul edildiğinde gizle
  }
});

socket.on("answer", async (answer) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  updateStatus("Karşı taraf cevap verdi. Görüşme başladı.");
});

socket.on("call-cancelled", () => {
  updateStatus("Karşı taraf çağrıyı iptal etti.");
  hideIncomingCall();
  offerReceived = null;
  accepted = false;
});

socket.on("ice-candidate", async (candidate) => {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (e) {
    console.error("ICE eklenemedi:", e);
  }
});



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
