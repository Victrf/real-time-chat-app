const socket = io();

let room = "";
let username = "";

function joinChat() {
    username = document.getElementById("username").value.trim();
    room = document.getElementById("room").value.trim();

    if (!username || !room) return alert("Enter both username and room name");

    window.username = username;
    window.room = room;

    socket.emit("joinRoom", { room, username });

    document.getElementById("login").style.display = "none";
    document.getElementById("chat").style.display = "block";
}

// Send text message
function sendMessage() {
    const input = document.getElementById("messageInput");
    const message = input.value.trim();

    if (message) {
        socket.emit("chatMessage", { room, message });
        input.value = "";
    }
}

// Receive message
socket.on("message", ({ username: sender, message }) => {
    const messagesDiv = document.getElementById("messages");

    const wrapper = document.createElement("div");
    wrapper.className = `mb-2 d-flex flex-column ${sender === username ? 'align-items-end' : 'align-items-start'}`;

    const bubble = document.createElement("div");
    bubble.className = `p-2 rounded ${sender === username ? 'bg-primary text-white' : 'bg-light text-dark'}`;
    bubble.style.maxWidth = "75%";

    bubble.innerHTML = `<strong>${sender}</strong><br>${message}<br><small class="text-muted">${new Date().toLocaleTimeString()}</small>`;

    wrapper.appendChild(bubble);
    messagesDiv.appendChild(wrapper);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// Typing indicator
let typingTimeout;
const messageInput = document.getElementById("messageInput");

messageInput.addEventListener("input", () => {
    socket.emit("typing", { room, username, isTyping: true });

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit("typing", { room, username, isTyping: false });
    }, 1000);
});

socket.on("typing", ({ username: typer, isTyping }) => {
    if (typer === username) return;
    document.getElementById("typingStatus").textContent = isTyping ? `${typer} is typing...` : "";
});

// Theme toggle
function toggleTheme() {
    const body = document.body;
    const button = document.getElementById("themeToggle");

    body.classList.toggle("light-mode");

    if (body.classList.contains("light-mode")) {
        button.classList.replace("btn-outline-light", "btn-outline-dark");
    } else {
        button.classList.replace("btn-outline-dark", "btn-outline-light");
    }
}

// Upload button triggers file input
document.getElementById("fileUploadBtn").addEventListener("click", () => {
    document.getElementById("fileInput").click();
});

// File upload
document.getElementById("fileInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        socket.emit("fileMessage", {
            room,
            username,
            file: {
                filename: file.name,
                filetype: file.type,
                data: reader.result
            }
        });
    };
    reader.readAsDataURL(file);
});

// Display received file
socket.on("fileMessage", ({ username: sender, file }) => {
    const messagesDiv = document.getElementById("messages");

    const wrapper = document.createElement("div");
    wrapper.className = `mb-2 d-flex flex-column ${sender === username ? 'align-items-end' : 'align-items-start'}`;

    const bubble = document.createElement("div");
    bubble.className = `p-2 rounded ${sender === username ? 'bg-primary text-white' : 'bg-light text-dark'}`;
    bubble.style.maxWidth = "75%";

    let content = "";
    if (file.filetype.startsWith("image/")) {
        content = `<img src="${file.data}" alt="${file.filename}" style="max-width: 100%; border-radius: 5px;">`;
    } else if (file.filetype.startsWith("audio/")) {
        content = `<audio controls src="${file.data}" style="width: 100%;"></audio>`;
    } else if (file.filetype.startsWith("video/")) {
        content = `<video controls src="${file.data}" style="max-width: 100%; border-radius: 5px;"></video>`;
    } else {
        content = `<a href="${file.data}" download="${file.filename}" class="text-info">📄 ${file.filename}</a>`;
    }

    bubble.innerHTML = `<strong>${sender}</strong><br>${content}<br><small>${new Date().toLocaleTimeString()}</small>`;
    wrapper.appendChild(bubble);
    messagesDiv.appendChild(wrapper);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// Room user list with private messaging
socket.on("roomUsers", (users) => {
    const userListEl = document.getElementById("userList");
    const userHtml = users.map(u => {
        if (u.username === username) return `<span style="color: gray; margin-right: 8px;">${u.username} (You)</span>`;
        return `<span class="user-entry" data-id="${u.id}" style="cursor:pointer; margin-right:8px;">${u.username}</span>`;
    }).join("");
    userListEl.innerHTML = userHtml;
});

// Private message trigger
const userListContainer = document.getElementById("userListContainer");

if (userListContainer) {
  userListContainer.addEventListener("click", (e) => {
    if (e.target.dataset.id) {
      const toId = e.target.dataset.id;
      const recipient = e.target.textContent;
      const msg = prompt(`Send private message to ${recipient}`);
      if (msg) {
        socket.emit("privateMessage", { toSocketId: toId, message: msg });
      }
    }
  });
} else {
  console.warn("userListContainer not found.");
}




window.addEventListener('DOMContentLoaded', () => {
    const emojiBtn = document.querySelector('#emojiBtn');
    const messageInput = document.querySelector('#messageInput');

    if (!emojiBtn || !messageInput) {
        console.error('Missing emoji button or input field');
        return;
    }

    // ✅ This must NOT throw error if emoji-button.min.js loaded correctly
    console.log('EmojiButton type:', typeof EmojiButton);  // Must be 'function'

    const picker = new EmojiButton({
        position: 'top-end',
        theme: 'auto'
    });

    emojiBtn.addEventListener('click', () => {
        picker.togglePicker(emojiBtn);
    });

    picker.on('emoji', emoji => {
        messageInput.value += emoji;
        messageInput.focus();
    });
});





window.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('messageInput');

    input.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // prevent newline
            sendMessage();         // call your existing send function
        }
    });
});
