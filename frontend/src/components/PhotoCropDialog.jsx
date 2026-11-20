import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Crop, Loader2 } from 'lucide-react';

const OUTPUT_SIZE = 512;

export function PhotoCropDialog({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
}) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const dragRef = useRef(null);

  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Muat foto baru setiap kali dialog dibuka.
  useEffect(() => {
    if (!open || !imageSrc) {
      return undefined;
    }

    let cancelled = false;
    const image = new Image();

    setLoaded(false);
    setError('');
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    imageRef.current = null;

    // Diperlukan bila foto lama berasal dari URL berbeda.
    // Server penyimpanan foto juga harus mengizinkan CORS.
    if (!imageSrc.startsWith('data:') && !imageSrc.startsWith('blob:')) {
      image.crossOrigin = 'anonymous';
    }

    image.onload = () => {
      if (cancelled) return;

      if (!image.naturalWidth || !image.naturalHeight) {
        setError('Ukuran foto tidak valid.');
        return;
      }

      imageRef.current = image;
      setLoaded(true);
    };

    image.onerror = () => {
      if (cancelled) return;
      setError(
        'Foto tidak bisa dibuka. Jika ini foto lama, coba pilih ulang foto dari perangkat.'
      );
    };

    image.src = imageSrc;

    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [open, imageSrc]);

  // Hitung bagian foto yang terlihat dalam kotak persegi.
  const getCropArea = (image, currentZoom, currentPosition) => {
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    const side = Math.min(width, height) / currentZoom;

    const maxOffsetX = (width - side) / 2;
    const maxOffsetY = (height - side) / 2;

    return {
      x: (width - side) / 2 + currentPosition.x * maxOffsetX,
      y: (height - side) / 2 + currentPosition.y * maxOffsetY,
      side,
    };
  };

  // Gambar preview crop ke canvas.
  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;

    if (!open || !loaded || !canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Browser tidak mendukung canvas.');
      return;
    }

    const area = getCropArea(image, zoom, position);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      image,
      area.x,
      area.y,
      area.side,
      area.side,
      0,
      0,
      canvas.width,
      canvas.height
    );
  }, [open, loaded, zoom, position]);

  const handlePointerDown = (event) => {
    if (!loaded || !canvasRef.current) return;

    event.preventDefault();

    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      positionX: position.x,
      positionY: position.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    const image = imageRef.current;

    if (!drag || drag.pointerId !== event.pointerId || !canvas || !image) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;

    const area = getCropArea(image, zoom, position);
    const maxOffsetX = (image.naturalWidth - area.side) / 2;
    const maxOffsetY = (image.naturalHeight - area.side) / 2;

    // Menggeser gambar ke kanan membuat area crop bergerak ke kiri.
    const imageDeltaX = ((event.clientX - drag.x) / rect.width) * area.side;
    const imageDeltaY = ((event.clientY - drag.y) / rect.width) * area.side;

    const clamp = (value) => Math.max(-1, Math.min(1, value));

    setPosition({
      x: maxOffsetX
        ? clamp(drag.positionX - imageDeltaX / maxOffsetX)
        : 0,
      y: maxOffsetY
        ? clamp(drag.positionY - imageDeltaY / maxOffsetY)
        : 0,
    });
  };

  const handlePointerEnd = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  };

  const handleCrop = () => {
    const image = imageRef.current;
    if (!image || !loaded) return;

    try {
      const output = document.createElement('canvas');
      output.width = OUTPUT_SIZE;
      output.height = OUTPUT_SIZE;

      const ctx = output.getContext('2d');
      if (!ctx) {
        setError('Browser tidak mendukung canvas.');
        return;
      }

      const area = getCropArea(image, zoom, position);

      // Latar putih untuk foto transparan sebelum diubah menjadi JPEG.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      ctx.drawImage(
        image,
        area.x,
        area.y,
        area.side,
        area.side,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE
      );

      const croppedImage = output.toDataURL('image/jpeg', 0.9);
      onCropComplete(croppedImage);
      onOpenChange(false);
    } catch (err) {
      console.error('Gagal memotong foto:', err);
      setError(
        'Foto tidak bisa dipotong. Untuk foto lama, coba pilih ulang dari perangkat.'
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crop Foto Profil</DialogTitle>
          <DialogDescription>
            Geser foto dan atur zoom. Area persegi akan disimpan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative mx-auto w-full max-w-[320px] overflow-hidden rounded-lg bg-muted">
            <canvas
              ref={canvasRef}
              width={OUTPUT_SIZE}
              height={OUTPUT_SIZE}
              className="block aspect-square w-full cursor-move touch-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              aria-label="Area crop foto profil"
            />

            {!loaded && !error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          {error && (
            <p className="text-center text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <label htmlFor="photo-crop-zoom">Zoom</label>
              <span>{Math.round(zoom * 100)}%</span>
            </div>

            <input
              id="photo-crop-zoom"
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              disabled={!loaded}
              className="w-full"
            />
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Geser foto dengan mouse atau jari untuk mengatur posisi.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>

          <Button onClick={handleCrop} disabled={!loaded || !!error}>
            <Crop className="mr-2 h-4 w-4" />
            Simpan Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}