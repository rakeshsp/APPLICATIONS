import os
import sys
import img2pdf
from PIL import Image
import argparse

def convert_images_to_pdf(input_dir, output_file):
    print(f"Searching for images in: {input_dir}")
    
    # Supported image extensions
    valid_extensions = ('.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.gif')
    
    # Get all image files
    images = []
    for filename in os.listdir(input_dir):
        if filename.lower().endswith(valid_extensions):
            images.append(os.path.join(input_dir, filename))
    
    # Sort images naturally/alphabetically
    images.sort()
    
    if not images:
        print("No images found in the specified directory.")
        return False
    
    print(f"Found {len(images)} images. Converting...")
    
    try:
        # Convert to PDF
        with open(output_file, "wb") as f:
            f.write(img2pdf.convert(images))
        print(f"Successfully created PDF: {output_file}")
        return True
    except Exception as e:
        print(f"Error converting images: {e}")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Convert images in a folder to a single PDF.')
    parser.add_argument('--input', required=True, help='Input directory containing images')
    parser.add_argument('--output', required=True, help='Output PDF file path')
    
    args = parser.parse_args()
    
    if not os.path.isdir(args.input):
        print(f"Error: Input directory '{args.input}' does not exist.")
        sys.exit(1)
        
    convert_images_to_pdf(args.input, args.output)
