import axios from 'axios';

export async function fetchCoverImageUrl({ title, author, isbn }) {
  const fallbackSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const fallbackUrl = `https://cdn.bookbank.com/covers/${fallbackSlug}.jpg`;

  // 1. Try Google Books API
  try {
    const query = isbn ? `isbn:${isbn}` : `intitle:${title} inauthor:${author}`;
    const res = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`);
    const items = res.data?.items;
    const image = items?.[0]?.volumeInfo?.imageLinks?.thumbnail;
    if (image) {
      return image.replace('http://', 'https://'); // enforce https
    }
  } catch (err) {
    console.warn('📕 Google Books API failed:', err.message);
  }

  // 2. Try Open Library Covers API
  if (isbn) {
    return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
  }

  // 3. Fallback to CDN pattern
  return fallbackUrl;
}