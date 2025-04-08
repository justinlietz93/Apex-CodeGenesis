const sharp = require('sharp');
const path = require('path');

const inputIconPath = path.join(__dirname, '../assets/icons/icon.png');
const outputDarkPath = path.join(__dirname, '../assets/icons/robot_panel_dark.png'); // White icon for dark theme
const outputLightPath = path.join(__dirname, '../assets/icons/robot_panel_light.png'); // Black icon for light theme
const size = 30;

async function generateVariants() {
  try {
    console.log(`Reading input icon from: ${inputIconPath}`);
    const image = sharp(inputIconPath);

    // Generate dark theme variant (white icon)
    console.log(`Generating ${size}x${size} white variant for dark theme...`);
    await image
      .clone()
      .resize(size, size)
      .grayscale() // Convert to grayscale first
      .negate({ alpha: false }) // Invert colors (black -> white, white -> black), keep alpha
      // Optional: Add thresholding after negate if needed to force pure white/black
      // .threshold(128) 
      .toFile(outputDarkPath);
    console.log(`Saved dark theme icon (white) to: ${outputDarkPath}`);

    // Generate light theme variant (black icon)
    console.log(`Generating ${size}x${size} black variant for light theme...`);
    await image
      .clone()
      .resize(size, size)
      .grayscale() // Convert to grayscale
      .threshold(128) // Make pixels darker than mid-gray black, lighter ones white
      .toFile(outputLightPath);
    console.log(`Saved light theme icon (black) to: ${outputLightPath}`);

    console.log('Icon variants generated successfully.');

  } catch (error) {
    console.error('Error generating icon variants:', error);
    process.exit(1); // Exit with error code
  }
}

generateVariants();
