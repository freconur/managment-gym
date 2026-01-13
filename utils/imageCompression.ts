/**
 * Compresses an image file to be under a specified size in MB.
 * @param file The original image File object.
 * @param maxSizeMB The maximum size in MB (default 0.1 MB = 100KB).
 * @param initialQuality The starting quality for compression (0 to 1).
 * @returns A Promise that resolves to the compressed File object.
 */
export const compressImage = async (
    file: File,
    maxSizeMB: number = 0.1,
    initialQuality: number = 0.9
): Promise<File> => {
    // If file is already smaller than maxSize, return it
    if (file.size / 1024 / 1024 <= maxSizeMB) {
        return file;
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Optional: Resize image if it's too large dimensions-wise to help with size
                const MAX_WIDTH = 1920;
                const MAX_HEIGHT = 1080;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);

                let quality = initialQuality;

                const compress = () => {
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error('Canvas to Blob conversion failed'));
                                return;
                            }

                            if (blob.size / 1024 / 1024 <= maxSizeMB || quality <= 0.1) {
                                // Return the compressed file
                                const compressedFile = new File([blob], file.name, {
                                    type: 'image/jpeg',
                                    lastModified: Date.now(),
                                });
                                resolve(compressedFile);
                            } else {
                                // Reduce quality and try again
                                quality -= 0.1;
                                compress();
                            }
                        },
                        'image/jpeg',
                        quality
                    );
                };

                compress();
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};
