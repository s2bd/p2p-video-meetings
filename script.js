const peerServerURL = "https://mux8.com/server.php";  // PHP-based signaling server
const peer = new Peer();

// Elements
const localVideo = document.getElementById("local-video");
const remoteVideosGrid = document.getElementById("video-grid");
const peerIdInput = document.getElementById("peer-id-input");
const myPeerIdElement = document.getElementById("my-peer-id");
const micIcon = document.getElementById("mic-icon");
const videoIcon = document.getElementById("video-icon");
const micBtn = document.getElementById("mic-btn");
const videoBtn = document.getElementById("video-btn");
const copyBtn = document.getElementById("copy-id");
const errorMessage = document.getElementById("error-message");
const errorText = document.getElementById("error-text");
const screenShareBtn = document.getElementById("screen-share-btn");
const screenShareIcon = document.getElementById("screen-share-icon");
const fullscreenLocalBtn = document.getElementById("fullscreen-local");
const exitFullscreenLocalBtn = document.getElementById("exit-fullscreen-local");

let micMuted = false;
let videoMuted = false;
let activePeers = {};  // To keep track of active peer feeds
let isScreenSharing = false;
let originalStream = null; // Store the original camera stream

// Get user media
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        localVideo.srcObject = stream;

        peer.on("call", call => {
            call.answer(stream);
            call.on("stream", remoteStream => {
                const peerId = call.peer;
                if (!activePeers[peerId]) {
                    addRemoteFeed(remoteStream, peerId);
                }
            });
        });
    })
    .catch(error => showError("Error accessing media devices: " + error));

// Add Peer by ID
function addPeer() {
    const peerId = peerIdInput.value.trim();
    if (!peerId) {
        return showError("Please enter a Peer ID.");
    }

    if (activePeers[peerId]) {
        return showError("This Peer ID is already added.");
    }

    const call = peer.call(peerId, localVideo.srcObject);
    call.on("stream", remoteStream => {
        if (!activePeers[peerId]) {
            addRemoteFeed(remoteStream, peerId);
        }
    });

    call.on("close", () => {
        removeRemoteFeed(peerId);
    });
}


// Save Peer ID to PHP server
peer.on("open", id => {
    myPeerIdElement.innerText = id;
    fetch(peerServerURL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "peerId=" + encodeURIComponent(id)
    })
    .then(response => response.json())
    .catch(error => console.error("Error storing Peer ID:", error));
});

function addRemoteFeed(remoteStream, peerId) {
    const videoWrapper = document.createElement("div");
    videoWrapper.classList.add("video-wrapper");

    const newVideo = document.createElement("video");
    newVideo.classList.add("video-frame");
    newVideo.srcObject = remoteStream;
    newVideo.autoplay = true;

    // Create fullscreen button
    const fullscreenBtn = document.createElement("button");
    fullscreenBtn.classList.add("fullscreen-btn");
    fullscreenBtn.innerHTML = "⛶"; // Unicode for fullscreen icon
    fullscreenBtn.onclick = () => enterFullscreen(newVideo, fullscreenBtn);

    // Append elements
    videoWrapper.appendChild(newVideo);
    videoWrapper.appendChild(fullscreenBtn);
    remoteVideosGrid.appendChild(videoWrapper);

    // Store the peer's video feed
    activePeers[peerId] = videoWrapper;
    arrangeVideoFeeds();
}

// Remove a remote video feed and update layout
function removeRemoteFeed(peerId) {
    const videoElement = activePeers[peerId];
    if (videoElement) {
        videoElement.remove();
        delete activePeers[peerId];
        console.log(`Removed feed for peer: ${peerId}`);
        arrangeVideoFeeds();
    }
}

// Check for inactive peers every 5 seconds
async function checkInactivePeers() {
    try {
        const response = await fetch(peerServerURL);
        const activePeerList = await response.json();

        // Compare with currently active peers
        for (const peerId in activePeers) {
            if (!activePeerList.includes(peerId)) {
                removeRemoteFeed(peerId);
                console.log(`Peer ${peerId} disconnected, removing feed.`);
            }
        }
    } catch (error) {
        console.error("Error checking inactive peers:", error);
    }
}

// Run the inactive peer check every 5 seconds
//setInterval(checkInactivePeers, 5000);


// Handle peer disconnections
peer.on("disconnected", () => {
    for (let peerId in activePeers) {
        removeRemoteFeed(peerId);
    }
});

// Arrange video feeds dynamically
function arrangeVideoFeeds() {
    const videos = remoteVideosGrid.querySelectorAll("video");
    const totalVideos = videos.length + 1; // Including local video
    const cols = Math.min(Math.ceil(Math.sqrt(totalVideos)), 3); // Maximum 3 columns
    const rows = Math.ceil(totalVideos / cols);

    remoteVideosGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    remoteVideosGrid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
}

function enterFullscreen(video, button) {
    if (video.requestFullscreen) {
        video.requestFullscreen();
    } else if (video.mozRequestFullScreen) { // Firefox
        video.mozRequestFullScreen();
    } else if (video.webkitRequestFullscreen) { // Chrome, Safari, Opera
        video.webkitRequestFullscreen();
    } else if (video.msRequestFullscreen) { // IE/Edge
        video.msRequestFullscreen();
    }

    // Change button to exit fullscreen
    button.innerHTML = "✖"; // Unicode for exit icon
    button.onclick = () => exitFullscreen(button);
}

function exitFullscreen(button) {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }

    // Restore fullscreen button
    button.innerHTML = "⛶";
    button.onclick = () => enterFullscreen(button.previousElementSibling, button);
}


// Enter fullscreen
fullscreenLocalBtn.addEventListener("click", () => {
    const video = document.getElementById("local-video");

    if (video.requestFullscreen) {
        video.requestFullscreen();
    } else if (video.mozRequestFullScreen) {
        video.mozRequestFullScreen();
    } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
    } else if (video.msRequestFullscreen) {
        video.msRequestFullscreen();
    }

    fullscreenLocalBtn.classList.add("hidden");
    exitFullscreenLocalBtn.classList.remove("hidden");
});

// Exit fullscreen
exitFullscreenLocalBtn.addEventListener("click", () => {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }

    fullscreenLocalBtn.classList.remove("hidden");
    exitFullscreenLocalBtn.classList.add("hidden");
});

// Reset fullscreen buttons when fullscreen mode is exited manually
document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) {
        fullscreenLocalBtn.classList.remove("hidden");
        exitFullscreenLocalBtn.classList.add("hidden");
    }
});

// Handle exit fullscreen event to reset button state
document.addEventListener("fullscreenchange", resetFullscreenButtons);
document.addEventListener("webkitfullscreenchange", resetFullscreenButtons);
document.addEventListener("mozfullscreenchange", resetFullscreenButtons);
document.addEventListener("MSFullscreenChange", resetFullscreenButtons);

function resetFullscreenButtons() {
    if (!document.fullscreenElement) {
        document.querySelectorAll(".fullscreen-btn").forEach(btn => {
            btn.innerHTML = "⛶";
            btn.onclick = () => enterFullscreen(btn.previousElementSibling, btn);
        });
    }
}


function toggleMic() {
    const stream = localVideo.srcObject;
    const audioTrack = stream.getAudioTracks()[0];

    if (!audioTrack) {
        return showError("No audio track found!");
    }

    if (micMuted) {
        audioTrack.enabled = true;
        micIcon.classList.remove("text-red-500");
        micIcon.classList.add("text-green-400");
        micBtn.classList.remove("disabled");
    } else {
        audioTrack.enabled = false;
        micIcon.classList.remove("text-green-400");
        micIcon.classList.add("text-red-500");
        micBtn.classList.add("disabled");
    }
    micMuted = !micMuted;
}


function toggleVideo() {
    const stream = localVideo.srcObject;
    const videoTrack = stream.getVideoTracks()[0];

    if (!videoTrack) {
        return showError("No video track found!");
    }

    if (videoMuted) {
        videoTrack.enabled = true;
        videoIcon.classList.remove("text-red-500");
        videoIcon.classList.add("text-green-400");
        videoBtn.classList.remove("disabled");
    } else {
        videoTrack.enabled = false;
        videoIcon.classList.remove("text-green-400");
        videoIcon.classList.add("text-red-500");
        videoBtn.classList.add("disabled");
    }
    videoMuted = !videoMuted;
}


async function toggleScreenShare() {
    if (!isScreenSharing) {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const videoTrack = screenStream.getVideoTracks()[0];

            // Store the original stream before replacing
            originalStream = localVideo.srcObject;
            localVideo.srcObject = screenStream;

            // Replace video track in existing peer connections
            for (const peerId in activePeers) {
                const sender = peer.connections[peerId]?.[0]?.peerConnection.getSenders().find(s => s.track.kind === "video");
                if (sender) {
                    sender.replaceTrack(videoTrack);
                }
            }

            // Handle when the user stops screen sharing
            videoTrack.onended = () => {
                toggleScreenShare(); // Automatically revert back
            };

            screenShareIcon.classList.remove("text-red-500");
            isScreenSharing = true;
        } catch (error) {
            showError("Screen sharing failed: " + error.message);
        }
    } else {
        // Revert back to original camera stream
        const videoTrack = originalStream.getVideoTracks()[0];
        localVideo.srcObject = originalStream;

        // Replace video track in existing peer connections
        for (const peerId in activePeers) {
            const sender = peer.connections[peerId]?.[0]?.peerConnection.getSenders().find(s => s.track.kind === "video");
            if (sender) {
                sender.replaceTrack(videoTrack);
            }
        }

        screenShareIcon.classList.add("text-red-500");
        isScreenSharing = false;
    }
}



// Show error message
function showError(message) {
    errorText.innerText = message;
    errorMessage.classList.remove("hidden");
    setTimeout(() => errorMessage.classList.add("hidden"), 5000);
}

// Copy Peer ID to clipboard
function copyID() {
    const textToCopy = myPeerIdElement.innerText;
    if (!textToCopy) return showError("No Peer ID available to copy!");

    navigator.clipboard.writeText(textToCopy).then(() => {
        copyBtn.innerHTML = '<i class="fas fa-check text-green-500"></i>'; // Success icon
        setTimeout(() => {
            copyBtn.innerHTML = '<i class="fas fa-copy"></i>'; // Restore copy icon
        }, 2000);
    }).catch(err => {
        showError("Error copying Peer ID: " + err);
    });
}

// Function to check if the user is on a mobile device or has a small screen
function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;
}

// Remove the screen share button if on a mobile device or small screen
window.onload = () => {
    if (isMobileDevice()) {
        screenShareBtn.parentNode.removeChild(screenShareBtn); // Completely remove the button div
    }
};

window.onload = function() {
      const params = new URLSearchParams(window.location.search);
      const peerId = params.get("id");
      if (peerId) {
          const inputField = document.getElementById("peer-id-input");
          if (inputField) {
              inputField.value = peerId;

              // Add peer ID automatically
              setTimeout(() => {
                  const addButton = document.querySelector("button[onclick='addPeer()']");
                  if (addButton) {
                      addButton.click();
                  }
              }, 500); // delay
          }
      }
  };
