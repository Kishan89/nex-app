const axios = require('axios');

class YouTubeService {
  /**
   * Extract YouTube video ID from various YouTube URL formats
   */
  extractVideoId(url) {
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  /**
   * Check if a URL is a YouTube URL
   */
  isYouTubeUrl(url) {
    return this.extractVideoId(url) !== null;
  }

  /**
   * Get YouTube video metadata using oEmbed API (no API key required)
   */
  async getVideoMetadata(url) {
    try {
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      // Use YouTube oEmbed API (no API key required)
      const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      
      const response = await axios.get(oEmbedUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const data = response.data;

      // Extract additional info from thumbnail URL
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      const thumbnailHQ = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

      return {
        videoId,
        title: data.title || 'YouTube Video',
        author: data.author_name || 'Unknown',
        authorUrl: data.author_url || '',
        thumbnail: thumbnailUrl,
        thumbnailHQ: thumbnailHQ,
        duration: this.formatDuration(data.duration || 0),
        url: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        width: data.width || 1280,
        height: data.height || 720,
        provider: 'YouTube'
      };
    } catch (error) {
      console.error('Error fetching YouTube metadata:', error);
      
      // Fallback metadata if API fails
      const videoId = this.extractVideoId(url);
      if (videoId) {
        return {
          videoId,
          title: 'YouTube Video',
          author: 'YouTube',
          authorUrl: '',
          thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          thumbnailHQ: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          duration: '',
          url: `https://www.youtube.com/watch?v=${videoId}`,
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
          width: 1280,
          height: 720,
          provider: 'YouTube'
        };
      }
      
      throw error;
    }
  }

  /**
   * Format duration from seconds to MM:SS or HH:MM:SS
   */
  formatDuration(seconds) {
    if (!seconds || seconds === 0) return '';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Detect and extract YouTube links from text content
   */
  detectYouTubeLinks(text) {
    const urlPattern = /(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)[\w\-_]+(?:\S+)?)/gi;
    const matches = text.match(urlPattern) || [];
    
    return matches.map(url => ({
      url: url.trim(),
      videoId: this.extractVideoId(url.trim())
    })).filter(item => item.videoId);
  }

  /**
   * Process post content and extract YouTube metadata
   */
  async processPostContent(content) {
    const youtubeLinks = this.detectYouTubeLinks(content);
    
    if (youtubeLinks.length === 0) {
      return { content, youtubeData: null };
    }

    // Process the first YouTube link found
    const firstLink = youtubeLinks[0];
    
    try {
      const metadata = await this.getVideoMetadata(firstLink.url);
      
      // Remove the YouTube URL from content to avoid duplication
      const cleanContent = content.replace(firstLink.url, '').trim();
      
      return {
        content: cleanContent,
        youtubeData: metadata
      };
    } catch (error) {
      console.error('Error processing YouTube content:', error);
      return { content, youtubeData: null };
    }
  }
}

module.exports = new YouTubeService();
