
/**
 * Processes an image file: resizes it to a max width and converts to compressed Base64.
 * This is crucial for local storage performance to avoid hitting quota limits.
 */
export const processImageFile = (file: File, maxWidth: number = 500): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!file.type.match(/image.*/)) {
            reject(new Error("الملف المختار ليس صورة."));
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            
            img.onload = () => {
                const elem = document.createElement('canvas');
                
                // Calculate new dimensions
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = height * (maxWidth / width);
                    width = maxWidth;
                }
                
                elem.width = width;
                elem.height = height;
                
                const ctx = elem.getContext('2d');
                if (!ctx) {
                    reject(new Error("Could not get canvas context"));
                    return;
                }
                
                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                
                // Export as JPEG with 0.7 quality
                const dataUrl = elem.toDataURL('image/jpeg', 0.7);
                resolve(dataUrl);
            };
            
            img.onerror = () => reject(new Error("Failed to load image"));
        };
        
        reader.onerror = () => reject(new Error("Failed to read file"));
    });
};
