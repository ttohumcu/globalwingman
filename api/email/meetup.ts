import { Resend } from 'resend';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      return res.status(500).json({ error: 'RESEND_API_KEY environment variable is missing' });
    }

    const { senderName, receiverEmail, receiverName, message } = req.body || {};
    if (!receiverEmail || typeof receiverEmail !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid receiver email' });
    }

    const resend = new Resend(key);

    const { data, error } = await resend.emails.send({
      from: 'Global Wingman <noreply@globalwingman.org>',
      to: receiverEmail,
      subject: `New Connection Request from ${senderName}`,
      html: `
        <h2>Hello ${receiverName},</h2>
        <p>Another Drone pilot, <strong>${senderName}</strong>, wants to connect with you on Global Wingman!</p>
        <p><strong>Message from pilot:</strong></p>
        <blockquote style="background: #f1f5f9; padding: 10px; border-left: 4px solid #3b82f6;">
          ${message}
        </blockquote>
        <p>Please log in and go to your messages app in the <a href="https://globalwingman.org" style="color: #3b82f6; text-decoration: underline;">Global Wingman</a> portal to accept and connect.</p>
        <br/>
        <p>Safe flying,</p>
        <p>The Global Wingman Team</p>
      `
    });

    if (error) {
      console.error('Meetup Email Error Details:', error);
      return res.status(400).json({ error });
    }

    return res.status(200).json({ success: true, data });
  } catch (e: any) {
    console.error('Meetup Email caught error:', e);
    return res.status(500).json({ error: e.message });
  }
}
