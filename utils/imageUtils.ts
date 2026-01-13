/**
 * Compresses an image file to a specified maximum size in MB.
 * @param file The original image File object.
 * @param maxSizeMB The maximum size in MB (default 0.1 MB = 100KB).
 * @returns A Promise that resolves to the compressed File object.
 */
export const compressImage = async (file: File, maxSizeMB: number = 0.1): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                // Initial dimensions
                let width = img.width;
                let height = img.height;

                // Resize if too large (e.g., max 1920px width/height to start with)
                const MAX_DIMENSION = 1920;
                if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                    if (width > height) {
                        height *= MAX_DIMENSION / width;
                        width = MAX_DIMENSION;
                    } else {
                        width *= MAX_DIMENSION / height;
                        height = MAX_DIMENSION;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                // Compression loop
                let quality = 0.7; // Start with 70% quality
                let dataUrl = canvas.toDataURL('image/jpeg', quality);

                // Function to check size
                const checkSize = (url: string) => {
                    const head = 'data:image/jpeg;base64,';
                    const sizeInBytes = Math.round((url.length - head.length) * 3 / 4);
                    return sizeInBytes / (1024 * 1024); // Convert to MB
                };

                let currentSize = checkSize(dataUrl);

                // Reduce quality iteratively if size is too big
                while (currentSize > maxSizeMB && quality > 0.1) {
                    quality -= 0.1;
                    dataUrl = canvas.toDataURL('image/jpeg', quality);
                    currentSize = checkSize(dataUrl);
                }

                // If still too big, scale down dimensions
                while (currentSize > maxSizeMB && width > 300) {
                    width *= 0.8;
                    height *= 0.8;
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    dataUrl = canvas.toDataURL('image/jpeg', quality);
                    currentSize = checkSize(dataUrl);
                }

                // Helper to convert DataURL to File
                const dataURLtoFile = (dataurl: string, filename: string) => {
                    const arr = dataurl.split(',');
                    const mime = arr[0].match(/:(.*?);/)?.[1];
                    const bstr = atob(arr[1]);
                    let n = bstr.length;
                    const u8arr = new Uint8Array(n);
                    while (n--) {
                        u8arr[n] = bstr.charCodeAt(n);
                    }
                    return new File([u8arr], filename, { type: mime });
                };

                const compressedFile = dataURLtoFile(dataUrl, file.name);
                resolve(compressedFile);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};
