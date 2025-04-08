import React from "react"; // Import React
import apexLogoPNG from './ApexLogoWhite.png'; // Import the local PNG

// Define props for an img tag instead of SVG
interface ImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {}

const ApexLogoWhite = (props: ImgProps) => (
	// Render an img tag using the imported PNG
	// Pass down any props like className, style, etc.
	// Add alt text for accessibility
	<img src={apexLogoPNG} alt="Apex Logo" {...props} />
)
export default ApexLogoWhite
