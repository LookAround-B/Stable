import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Resend } from 'resend';

const resend = new Resend('re_aMP7Lvtj_FJ4SJ4aS1jxTgK7K31tduQZx');
const NOTIFICATION_EMAIL = 'saiakhil066@gmail.com';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verify authentication
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    if (req.method === 'GET') {
      return handleGetReminderStatus(req, res);
    } else if (req.method === 'POST') {
      const { action } = req.body;
      if (action === 'snooze') {
        return handleSnooze(req, res);
      }
      return handleSendReminder(req, res);
    }
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Reminder API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: String(error) });
  }
}

// GET — check if there are pending shoeings and if reminders are snoozed
async function handleGetReminderStatus(_req: NextApiRequest, res: NextApiResponse) {
  // Check snooze status
  const snoozeSetting = await prisma.systemSettings.findUnique({
    where: { key: 'shoeing_reminder_snoozed_until' },
  });

  const now = new Date();
  const isSnoozed = snoozeSetting && new Date(snoozeSetting.value) > now;
  const snoozedUntil = isSnoozed ? snoozeSetting!.value : null;

  // Last sent timestamp
  const lastSentSetting = await prisma.systemSettings.findUnique({
    where: { key: 'shoeing_reminder_last_sent' },
  });
  const lastSent = lastSentSetting?.value || null;

  // Count pending/overdue horses
  const pendingHorses = await getPendingHorses();

  return res.status(200).json({
    pendingCount: pendingHorses.length,
    pendingHorses: pendingHorses.map((h) => ({
      name: h.horseName,
      daysOverdue: h.daysOverdue,
      neverShoed: h.neverShoed,
    })),
    isSnoozed,
    snoozedUntil,
    lastSent,
  });
}

// POST — send reminder email
async function handleSendReminder(_req: NextApiRequest, res: NextApiResponse) {
  // Check snooze
  const snoozeSetting = await prisma.systemSettings.findUnique({
    where: { key: 'shoeing_reminder_snoozed_until' },
  });

  const now = new Date();
  if (snoozeSetting && new Date(snoozeSetting.value) > now) {
    return res.status(200).json({
      sent: false,
      message: `Reminder is snoozed until ${snoozeSetting.value}`,
    });
  }

  const pendingHorses = await getPendingHorses();

  if (pendingHorses.length === 0) {
    return res.status(200).json({
      sent: false,
      message: 'No pending shoeing tasks found',
    });
  }

  // Build email content
  const horseListHtml = pendingHorses
    .map((h) => {
      if (h.neverShoed) {
        return `<li><strong>${h.horseName}</strong> — Never shoed</li>`;
      }
      return `<li><strong>${h.horseName}</strong> — ${h.daysOverdue} day${h.daysOverdue !== 1 ? 's' : ''} overdue (last: ${h.lastDate})</li>`;
    })
    .join('\n');

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #dc3545; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">🔨 Pending Horse Shoeing Reminder</h2>
      </div>
      <div style="padding: 20px; background: #fff; border: 1px solid #e5e7eb;">
        <p>You have <strong>${pendingHorses.length}</strong> pending horse shoeing task${pendingHorses.length !== 1 ? 's' : ''}. Please complete them.</p>
        <h3 style="color: #dc3545;">Overdue Horses:</h3>
        <ul style="line-height: 1.8;">${horseListHtml}</ul>
        <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
          Horses must be shoed every 21 days. Please schedule shoeing at the earliest.
        </p>
      </div>
      <div style="padding: 15px; background: #f9fafb; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; text-align: center; color: #9ca3af; font-size: 12px;">
        Equine Facility Manager — Automated Reminder
      </div>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: 'Stable Manager <onboarding@resend.dev>',
      to: NOTIFICATION_EMAIL,
      subject: `⚠️ ${pendingHorses.length} Horse${pendingHorses.length !== 1 ? 's' : ''} Pending Shoeing`,
      html: emailHtml,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ sent: false, error: error.message || 'Email send failed' });
    }

    // Store last sent timestamp
    await prisma.systemSettings.upsert({
      where: { key: 'shoeing_reminder_last_sent' },
      update: { value: now.toISOString() },
      create: { key: 'shoeing_reminder_last_sent', value: now.toISOString(), description: 'Last time shoeing reminder email was sent' },
    });

    return res.status(200).json({
      sent: true,
      message: `Reminder sent for ${pendingHorses.length} horse(s)`,
      emailId: data?.id,
    });
  } catch (err: any) {
    console.error('Email send error:', err);
    return res.status(500).json({ sent: false, error: String(err) });
  }
}

// POST { action: 'snooze' } — snooze for 24 hours
async function handleSnooze(_req: NextApiRequest, res: NextApiResponse) {
  const snoozeUntil = new Date();
  snoozeUntil.setHours(snoozeUntil.getHours() + 24);

  await prisma.systemSettings.upsert({
    where: { key: 'shoeing_reminder_snoozed_until' },
    update: { value: snoozeUntil.toISOString() },
    create: {
      key: 'shoeing_reminder_snoozed_until',
      value: snoozeUntil.toISOString(),
      description: 'Shoeing reminder snoozed until this timestamp',
    },
  });

  return res.status(200).json({
    snoozed: true,
    snoozedUntil: snoozeUntil.toISOString(),
    message: 'Reminder snoozed for 24 hours',
  });
}

// Helper: get all overdue/never-shoed horses
async function getPendingHorses() {
  const allHorses = await prisma.horse.findMany({
    where: { status: 'Active' },
    select: { id: true, name: true, stableNumber: true },
    orderBy: { name: 'asc' },
  });

  const shoeingRecords = await prisma.farrierShoeing.findMany({
    select: { horseId: true, shoeingDate: true, nextDueDate: true },
    orderBy: { shoeingDate: 'desc' },
  });

  // Build map of latest shoeing per horse
  const latestMap: Record<string, { shoeingDate: Date; nextDueDate: Date }> = {};
  for (const rec of shoeingRecords) {
    if (!latestMap[rec.horseId] || rec.shoeingDate > latestMap[rec.horseId].shoeingDate) {
      latestMap[rec.horseId] = { shoeingDate: rec.shoeingDate, nextDueDate: rec.nextDueDate };
    }
  }

  const now = new Date();
  const pending: Array<{
    horseName: string;
    daysOverdue: number;
    neverShoed: boolean;
    lastDate: string;
  }> = [];

  for (const horse of allHorses) {
    const latest = latestMap[horse.id];
    if (!latest) {
      pending.push({
        horseName: horse.name + (horse.stableNumber ? ` (${horse.stableNumber})` : ''),
        daysOverdue: 0,
        neverShoed: true,
        lastDate: '',
      });
    } else if (latest.nextDueDate <= now) {
      const daysOverdue = Math.floor((now.getTime() - latest.nextDueDate.getTime()) / (1000 * 60 * 60 * 24));
      pending.push({
        horseName: horse.name + (horse.stableNumber ? ` (${horse.stableNumber})` : ''),
        daysOverdue,
        neverShoed: false,
        lastDate: latest.shoeingDate.toLocaleDateString('en-GB'),
      });
    }
  }

  return pending;
}
