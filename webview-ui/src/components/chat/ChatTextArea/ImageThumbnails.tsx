import React from 'react';
import Thumbnails from '../../common/Thumbnails'; // Assuming path is correct

interface ImageThumbnailsProps {
  selectedImages: string[];
  setSelectedImages: React.Dispatch<React.SetStateAction<string[]>>;
  onHeightChange: (height: number) => void;
}

const ImageThumbnails: React.FC<ImageThumbnailsProps> = ({
  selectedImages,
  setSelectedImages,
  onHeightChange,
}) => {
  // Logic for handling height change might be needed here or passed down
  return (
    <>
      {selectedImages.length > 0 && (
        <Thumbnails
          images={selectedImages}
          setImages={setSelectedImages}
          onHeightChange={onHeightChange}
          style={{
            // Styles might need adjustment based on context
            position: "absolute",
            paddingTop: 4,
            bottom: 14, // Example style, adjust as needed
            left: 22,  // Example style, adjust as needed
            right: 47, // Example style, adjust as needed
            zIndex: 2,
          }}
        />
      )}
    </>
  );
};

export default ImageThumbnails;
