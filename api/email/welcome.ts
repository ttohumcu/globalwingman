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

    const { email, name } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid recipient email' });
    }

    const resend = new Resend(key);

    const { data, error } = await resend.emails.send({
      from: 'Global Wingman <noreply@globalwingman.org>',
      to: email,
      subject: 'Welcome to Global Wingman - Drone Pilot Network!',
      html: `
        <h1>Welcome, ${name}!</h1>
        <p>We are thrilled to have you join the Global Wingman community.</p>
        <p>Introduce yourself in the forum, explore the global map for safe flight spots, and connect with local drone pilots when you travel!</p>
        <br/>
        <p>Safe flying,</p>
        <p>The Global Wingman Team</p>
      `
    });

    // Send Admin Notification Email
    await resend.emails.send({
      from: 'Global Wingman <noreply@globalwingman.org>',
      to: 'ttohumcu@gmail.com',
      subject: 'New Pilot Registration',
      html: `
        <h3>New Pilot Registered</h3>
        <p>A new pilot has just joined the Global Wingman platform.</p>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
      `
    }).catch(err => console.error('Failed to send admin notification email:', err));

    if (error) {
      console.error('Welcome Email Error Details:', error);
      return res.status(400).json({ error });
    }

    return res.status(200).json({ success: true, data });
  } catch (e: any) {
    console.error('Welcome Email caught error:', e);
    return res.status(500).json({ error: e.message });
  }
}
