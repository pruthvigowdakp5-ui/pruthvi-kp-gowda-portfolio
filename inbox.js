import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const config = window.PORTFOLIO_CONFIG;
const authView = document.querySelector("#auth-view");
const messagesView = document.querySelector("#messages-view");
const loginForm = document.querySelector("#login-form");
const signOutButton = document.querySelector("#sign-out");
const inboxStatus = document.querySelector("#inbox-status");
const messageList = document.querySelector("#message-list");

function setStatus(message, isError = false) {
  inboxStatus.textContent = message;
  inboxStatus.classList.toggle("is-error", isError);
}

function showSignedOut() {
  authView.hidden = false;
  messagesView.hidden = true;
  messageList.replaceChildren();
}

function renderMessages(messages) {
  messageList.replaceChildren();

  if (messages.length === 0) {
    setStatus("No messages yet.");
    return;
  }

  messages.forEach((message) => {
    const article = document.createElement("article");
    article.className = "inbox-message";

    const header = document.createElement("div");
    header.className = "inbox-message-header";

    const name = document.createElement("h3");
    name.className = "inbox-message-name";
    name.textContent = message.sender_name;

    const date = document.createElement("time");
    date.className = "inbox-message-date";
    date.dateTime = message.created_at;
    date.textContent = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(message.created_at));

    const email = document.createElement("a");
    email.className = "inbox-message-meta";
    email.href = `mailto:${encodeURIComponent(message.sender_email)}`;
    email.textContent = message.sender_email;

    const body = document.createElement("p");
    body.className = "inbox-message-body";
    body.textContent = message.message;

    header.append(name, date);
    article.append(header, email, body);
    messageList.append(article);
  });

  setStatus(`${messages.length} message${messages.length === 1 ? "" : "s"} shown.`);
}

if (
  !config?.supabaseUrl ||
  !config?.supabaseAnonKey ||
  !config.supabaseUrl.startsWith("https://")
) {
  showSignedOut();
  setStatus("Inbox setup is incomplete. Add your Supabase project URL and anon key in config.js.", true);
} else {
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);

  async function loadMessages() {
    authView.hidden = true;
    messagesView.hidden = false;
    setStatus("Loading messages…");

    const { data, error } = await supabase
      .from("inbox_messages")
      .select("id, sender_name, sender_email, message, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      setStatus(`Could not load messages: ${error.message}`, true);
      return;
    }

    renderMessages(data);
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("Signing in…");

    const formData = new FormData(loginForm);
    const { error } = await supabase.auth.signInWithPassword({
      email: formData.get("email"),
      password: formData.get("password")
    });

    if (error) {
      setStatus(`Sign-in failed: ${error.message}`, true);
      return;
    }

    loginForm.reset();
    await loadMessages();
  });

  signOutButton.addEventListener("click", async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setStatus(`Could not sign out: ${error.message}`, true);
      return;
    }
    showSignedOut();
    setStatus("You are signed out.");
  });

  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    showSignedOut();
    setStatus(`Could not check your sign-in: ${error.message}`, true);
  } else if (session) {
    await loadMessages();
  } else {
    showSignedOut();
    setStatus("Sign in to view your messages.");
  }
}
