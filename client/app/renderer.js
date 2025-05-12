console.log("Renderer process started");

async function getMicrophoneStream() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log("Mikrofona erişildi!");
    return stream;
  } catch (err) {
    console.error("Mikrofona erişilemedi:", err);
  }
}

getMicrophoneStream();

const peerConnection = new RTCPeerConnection({
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
});

async function startCall() {
  const localStream = await getMicrophoneStream();

  // Ses akışını peer connection'a ekle
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  // Diğer uçtan gelen sesi oynat
  peerConnection.ontrack = (event) => {
    const remoteAudio = new Audio();
    remoteAudio.srcObject = event.streams[0];
    remoteAudio.play();
  };

  // Sinyal verileri burada toplanır (offer/answer için)
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      // Bu ICE candidate'ı karşıya göndermemiz gerekecek
      console.log("ICE Candidate:", event.candidate);
    }
  };

  // Bir "offer" üretelim (çağrı başlatma)
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  console.log("Offer oluşturuldu:", offer);
}
