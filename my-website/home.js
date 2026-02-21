// ================================
// VIDEO MODAL SYSTEM
// ================================

const modal = document.getElementById("videoModal");
const video = document.getElementById("policyVideo");
const closeBtn = document.querySelector(".close-btn");

// Open Modal
function openVideoModal() {
  if (!modal) return;
  modal.style.display = "block";
  document.body.style.overflow = "hidden";

  if (video) {
    video.currentTime = 0;
    video.play();
  }
}

// Close Modal
function closeVideoModal() {
  if (!modal) return;
  modal.style.display = "none";
  document.body.style.overflow = "auto";

  if (video) {
    video.pause();
    video.currentTime = 0;
  }
}

// Close button
if (closeBtn) {
  closeBtn.onclick = closeVideoModal;
}

// Click outside close
window.addEventListener("click", function (e) {
  if (e.target === modal) {
    closeVideoModal();
  }
});

// ESC key close
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closeVideoModal();
  }
});
