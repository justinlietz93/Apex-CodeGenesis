from PIL import Image
import numpy as np

# Load the AI circuit face icon (middle image)
# For this example, assume the images are named as 'ai_circuit_face.png', 'robot_top.png', 'robot_bottom.png'
# In a real scenario, these would be the uploaded images
ai_circuit_face = Image.open('ai_circuit_face.png').convert('L')  # Convert to grayscale

# Resize the AI circuit face to 32x32 pixels using nearest-neighbor to preserve pixelation
ai_circuit_face_resized = ai_circuit_face.resize((32, 32), Image.NEAREST)

# Ensure the image is binary (white-on-black) by thresholding
ai_circuit_array = np.array(ai_circuit_face_resized)
ai_circuit_array = (ai_circuit_array > 128) * 255  # Threshold to make it strictly white-on-black
ai_circuit_face_binary = Image.fromarray(ai_circuit_array.astype(np.uint8))

# Save the resized AI circuit face to replace the smaller robot icons
ai_circuit_face_binary.save('ai_circuit_face_resized.png')

# Load the smaller robot icons (for context, we just need their dimensions)
robot_top = Image.open('robot_top.png')
robot_bottom = Image.open('robot_bottom.png')

# Replace the smaller robot icons with the resized AI circuit face
# Since they are already 32x32 and white-on-black, we can directly use the resized AI circuit face
robot_top_replaced = ai_circuit_face_binary
robot_bottom_replaced = ai_circuit_face_binary

# Save the replaced images
robot_top_replaced.save('robot_top_replaced.png')
robot_bottom_replaced.save('robot_bottom_replaced.png')

# Output: The new images are 'robot_top_replaced.png' and 'robot_bottom_replaced.png'