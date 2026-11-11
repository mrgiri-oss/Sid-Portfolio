SIDDHESHWAR PATI PORTFOLIO — EASY EDIT GUIDE

FOLDER STRUCTURE
- index.html       Website content + SEO + image links
- css/style.css    All design and responsive styling
- js/script.js     Animations and interactive effects
- assets/images/  Optional place to store local images

HOW TO ADD YOUR OWN IMAGE LINKS
Open index.html in Notepad or VS Code and search for these three phrases:

1) PASTE_YOUR_BLACK_AND_WHITE_IMAGE_URL_HERE
   Replace it with the direct URL of your black-and-white portrait.
   This image is used for the hero portrait reveal effect.

2) PASTE_YOUR_COLOUR_IMAGE_URL_HERE
   Replace it with the direct URL of your colour portrait.
   Use a matching crop/pose to make the reveal effect align properly.

3) PASTE_YOUR_ABOUT_IMAGE_URL_HERE
   Replace it with the direct URL of the image for the About section.
   The same URL is also used for the social sharing preview (og:image).

Example format (replace with your real image URL):
https://yourdomain.com/images/siddheshwar-portrait.jpg

IMPORTANT
- Use a direct image URL ending in .jpg, .jpeg, .png or .webp where possible.
- If images are on your own website, upload them into assets/images/ and use paths such as:
  assets/images/siddheshwar-bw.jpg
- Do not paste a Google Drive sharing page URL; use a direct publicly accessible image URL.
- For the animated hero reveal, image hosts must allow cross-origin image loading (CORS). Hosting the images on the same domain as the portfolio is the most reliable option.
- Keep the black-and-white and colour hero images framed similarly for the mouse reveal effect.
- Upload the complete folder structure to your hosting. Do not upload only index.html.

SEO NOTES
The page keeps its visible text as HTML, has a descriptive title and meta description, social sharing metadata, and Person structured data. A clean folder structure helps maintenance; SEO depends mainly on useful page content, crawlability, performance, and correct metadata—not on splitting CSS/JS alone.
