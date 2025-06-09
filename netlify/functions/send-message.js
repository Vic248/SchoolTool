// netlify/functions/send-message.js
import { set } from '@netlify/blobs';

export default async (req, res) => {
  const { username, text } = JSON.parse(req.body);

  const timestamp = Date.now();
  const message = { username, text, timestamp };

  // Sauvegarder sous forme de tableau JSON
  const existing = await fetch(`${process.env.URL}/.netlify/functions/get-messages`);
  const oldMessages = await existing.json();

  const newMessages = [...oldMessages, message];

  await set('chat/messages', JSON.stringify(newMessages), { contentType: 'application/json' });

  return res.status(200).json({ success: true });
};
