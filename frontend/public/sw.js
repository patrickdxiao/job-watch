self.addEventListener("push", (event) => {
  let title = "JobWatch";
  let body = "A new job was posted.";
  let icon = "/icon.png";

  try {
    const data = event.data.json();
    title = data.title || title;
    body = data.body || body;
    icon = data.icon || icon;
  } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(title, { body, icon })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/jobs"));
});
