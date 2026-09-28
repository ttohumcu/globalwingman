import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { Resend } from 'resend';

let resendClient: Resend | null = null;

function getResend() {
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error('RESEND_API_KEY environment variable is required to send emails');
    }
    resendClient = new Resend(key);
  }
  return resendClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---
  
  app.post('/api/email/welcome', async (req, res) => {
    try {
      const { email, name } = req.body;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid recipient email' });
      }

      const resend = getResend();
      
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
        console.error('Welcome Email Error Details:', JSON.stringify(error, null, 2));
        console.error('Payload attempted:', { email, name });
        return res.status(400).json({ error });
      }
      console.log('Welcome Email Sent Successfully:', data);
      res.json({ success: true, data });
    } catch (e: any) {
      console.error('Welcome Email caught error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/email/meetup', async (req, res) => {
    try {
      const { senderName, receiverEmail, receiverName, message } = req.body;
      
      if (!receiverEmail || typeof receiverEmail !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid receiver email' });
      }

      const resend = getResend();
      
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
        console.error('Meetup Email Error Details:', JSON.stringify(error, null, 2));
        console.error('Payload attempted:', { receiverEmail, senderName, receiverName });
        return res.status(400).json({ error });
      }
      console.log('Meetup Email Sent Successfully:', data);
      res.json({ success: true, data });
    } catch (e: any) {
      console.error('Meetup Email caught error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // --- Vite Middleware (Development) or Static Serving (Production) ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
