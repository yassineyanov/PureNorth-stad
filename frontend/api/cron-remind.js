export default async function handler(req, res) {
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "";
  const cronSecret = process.env.CRON_SECRET || "";

  try {
    const response = await fetch(`${backendUrl}/api/invoices/auto-remind`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": cronSecret,
      },
    });
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
