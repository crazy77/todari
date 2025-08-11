import { Router } from 'express';
import QRCode from 'qrcode';

export const router = Router();

router.get('/:roomId', async (req, res) => {
  const { roomId } = req.params;
  const url = `${req.protocol}://${req.get('host')}/join?room=${roomId}`;
  try {
    const dataUrl = await QRCode.toDataURL(url, { width: 256, margin: 1 });
    res.json({ roomId, url, qr: dataUrl });
  } catch (e) {
    res.status(500).json({ error: 'qr_failed' });
  }
});
