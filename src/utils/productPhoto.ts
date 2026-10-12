// Resize phone photos before saving them with the listing; no temporary server files.
export async function prepareProductPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') throw new Error('Choose a photo in JPEG, PNG, or WebP format.');
  if (file.size > 20 * 1024 * 1024) throw new Error('Choose a photo smaller than 20 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    try { await image.decode(); }
    catch { throw new Error('This photo could not be opened. Try a JPEG photo or choose another picture.'); }
    const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare the photo. Please try another browser.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.7, 0.55, 0.4]) {
      const photo = canvas.toDataURL('image/jpeg', quality);
      if (photo.length <= 350000) return photo;
    }
    throw new Error('This photo is too detailed to upload. Try a smaller or cropped picture.');
  } finally { URL.revokeObjectURL(url); }
}
