import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

const startCallBtn = document.getElementById("startCall");
const acceptCallBtn = document.getElementById("acceptCall");
const endCallBtn = document.getElementById("endCall");
const statusText = document.getElementById("status");

let peerConnection;
let localStream;
let microphoneAllowed = false;

function updateStatus(text, isError = false) {
  statusText.textContent = `Durum: ${text}`;
  if (isError) {
    statusText.classList.add("error");
  } else {
    statusText.classList.remove("error");
  }
}

async function getMicrophoneStream() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return stream;
  } catch (err) {
    updateStatus("Mikrofon izni reddedildi. Lütfen izin verin.", true);
    alert("Lütfen mikrofon erişimine izin verin. Ayarlardan tekrar açabilirsiniz.");
    throw err;
  }
}

async function setupPeerConnection() {
  peerConnection = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" } // TURN yok
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
};

acceptCallBtn.onclick = async () => {
  updateStatus("Çağrı kabul ediliyor...");
  await setupPeerConnection();
  localStream = await getMicrophoneStream();

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit("answer", answer);
};

endCallBtn.onclick = async () => {
  console.log("End call button clicked");
  
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
    updateStatus("Görüşme sonlandırıldı.");
  }else {
    updateStatus("Henüz bir görüşme yok.");
    localStream = await getMicrophoneStream();

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });
  }
};

socket.on("offer", async (offer) => {
  if (!peerConnection) await setupPeerConnection();
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  updateStatus("Gelen çağrı var. Kabul etmek için butona basın.");
});

socket.on("answer", async (answer) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  updateStatus("Bağlantı kuruldu!");
});

socket.on("ice-candidate", async (candidate) => {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (e) {
    console.error("ICE eklenemedi:", e);
  }
});

// Mikrofon iznini kontrol et ve butonları ayarla
window.onload = async () => {
  try {
    await getMicrophoneStream();
    microphoneAllowed = true;
    updateStatus("Mikrofon erişimi başarılı.");
  } catch {
    microphoneAllowed = false;
  }

  // startCallBtn.disabled = !microphoneAllowed;
  // acceptCallBtn.disabled = !microphoneAllowed;
};
